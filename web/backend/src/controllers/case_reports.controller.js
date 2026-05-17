const CaseReports = require('../models/case_reports.model')
const { findOrCreateOrganization } = require("../models/organizations.model");
const { getComplainantId, createReport, getReportsByUserId, getAllReports,  getCaseById: fetchCaseById } = require("../models/case_reports.model");
const { runNLPAnalysis } = require('../services/nlp.service');

const getItems = async (req, res) => {
    try {
        const data = await CaseReports.getAll()
        res.json(data)
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
}

const createItem = async (req, res) => {
  try {
    const item = await CaseReports.create(req.body)
    res.status(201).json(item)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

// ── GET /api/case_reports/:id ─────────────────────────────────────────────────
async function getCaseById(req, res) {
  try {
    const { id } = req.params;
    const report = await fetchCaseById(id);
    if (!report) return res.status(404).json({ error: 'Case not found' });
    return res.json({ data: report });
  } catch (err) {
    console.error('[getCaseById]', err.message);
    return res.status(500).json({ error: 'Failed to fetch case.' });
  }
}

function buildPayload(complainantId, organizationId, complainant, incident, evidence) {
  return {
    complainant_id:           complainantId,
    organization_id:          organizationId,

    name:                     complainant.name?.trim() || "Anonymous",
    age:                      parseInt(complainant.age),
    gender_identity:          complainant.gender,
    email:                    complainant.email,
    contact_number:           complainant.contactNumber,
    is_willing_for_interview: complainant.interview === "Yes",

    incident_city:            incident.incidentCity,
    incident_province:        "Metro Manila",
    incident_location:        incident.incidentVenue        || null,
    incident_date:            incident.date,
    incident_time:            incident.time                 || null,
    incident_description:     incident.description,
    action_requested:         incident.outcome              || null,

    is_perpetrator_known:     incident.perpetratorKnown    === "Yes",
    has_witnesses:            incident.witnesses            === "Yes",
    reported_to_others:       incident.toldAnyone          === "Yes",
    reported_to_police:       incident.toldPolice          === "Yes",
    is_anonymous:             evidence.anonymous            ?? false,

    perpetrator_name:         incident.perpetratorKnown === "Yes" ? incident.perpetratorName         || null : null,
    perpetrator_gender:       incident.perpetratorKnown === "Yes" ? incident.perpetratorGender       || null : null,
    perpetrator_occupation:   incident.perpetratorKnown === "Yes" ? incident.perpetratorOccupation   || null : null,
    perpetrator_relationship: incident.perpetratorKnown === "Yes" ? incident.perpetratorRelationship || null : null,

    witness_name:             incident.witnesses === "Yes" ? incident.witnessName         || null : null,
    witness_contact:          incident.witnesses === "Yes" ? incident.witnessContact      || null : null,
    witness_relationship:     incident.witnesses === "Yes" ? incident.witnessRelationship || null : null,

    told_anyone_who:          incident.toldAnyone === "Yes" ? incident.toldAnyoneWho || null : null,
    police_station:           incident.toldPolice === "Yes" ? incident.policeStation  || null : null,

    case_status_id:           1,
    version_number:           1,
    is_current:               true,
  };
}

async function submitReport(req, res) {
  try {
    const { complainant, incident, evidence } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated. Please log in to submit a report.' });
    }

    const complainantId = await getComplainantId(userId);

    const org = await findOrCreateOrganization(complainant);
    if (!org?.organization_id) {
      throw new Error('Failed to save organization details.');
    }

    const payload    = buildPayload(complainantId, org.organization_id, complainant, incident, evidence);
    const newReport  = await createReport(payload);

    runNLPAnalysis({
      case_report_id:       newReport.case_report_id,
      incident_description: newReport.incident_description,
      incident_location:    newReport.incident_location,
      incident_city:        newReport.incident_city,
      action_requested:     newReport.action_requested,
    });

    return res.status(201).json({ data: newReport });
  } catch (err) {
    console.error('[submitReport]', err?.message ?? err, err?.stack ?? '');
    return res.status(500).json({ error: err?.message || 'Failed to submit report. Please try again.' });
  }
}

async function getUserReports(req, res) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Authentication required.' });

    const complainantId = await getComplainantId(userId);
    const reports = await getReportsByUserId(complainantId);
    return res.json({ data: reports });
  } catch (err) {
    console.error('[getUserReports]', err.message);
    return res.status(500).json({ error: 'Failed to fetch reports.' });
  }
}

async function getAllCases(req, res) {
  try {
    const reports = await getAllReports();
    return res.json({ data: reports });
  } catch (err) {
    console.error('[getAllCases]', err.message);
    return res.status(500).json({ error: 'Failed to fetch cases.' });
  }
}

async function getNLPAnalysis(req, res) {
  try {
    const { id } = req.params;
    const supabase = require('../config/supabase');

    const { data, error } = await supabase
      .from('case_report_analysis')
      .select('*')
      .eq('case_report_id', id)
      .order('analyzed_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('[getNLPAnalysis] Supabase error:', error.message);
      return res.status(500).json({ error: 'Failed to fetch NLP analysis.' });
    }

    // Null means the async NLP job hasn't finished yet — tell the frontend clearly.
    if (!data) return res.status(404).json({ error: 'NLP analysis is still processing. Please check back shortly.' });

    return res.json({ data });
  } catch (err) {
    console.error('[getNLPAnalysis] Unexpected error:', err.message);
    return res.status(500).json({ error: 'Failed to fetch NLP analysis.' });
  }
}

module.exports = { getItems, createItem, submitReport, getUserReports, getAllCases, getCaseById, getNLPAnalysis }