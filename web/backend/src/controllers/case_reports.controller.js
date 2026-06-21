const CaseReports = require('../models/case_reports.model')
const { findOrCreateOrganization } = require("../models/organizations.model");
const { getComplainantId, createReport, getReportsByUserId, getAllReports,  getCaseById: fetchCaseById, getHeatmapReports } = require("../models/case_reports.model");
const { runNLPAnalysis } = require('../services/nlp.service');
const { generateCityHeatmapData, generateRegionHeatmapData, generateCouncilHeatmapData, getFilteredReports } = require('../services/heatmap.service');
const { randomUUID } = require('crypto');

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

    incident_location_type:   incident.locationType           || null,
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

    case_status_id:           2,  // Reports immediately enter "For Verification"
    version_number:           1,
    is_current:               true,
  };
}

async function submitReport(req, res) {
  try {
    const complainant = JSON.parse(req.body.complainant);
    const incident     = JSON.parse(req.body.incident);
    const evidence     = JSON.parse(req.body.evidence || '{}');
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated. Please log in to submit a report.' });
    }

    const complainantId = await getComplainantId(userId);

    const org = await findOrCreateOrganization(complainant);
    if (!org?.organization_id) {
      throw new Error('Failed to save organization details.');
    }

    const payload   = buildPayload(complainantId, org.organization_id, complainant, incident, evidence);
    const newReport = await createReport(payload);

    let uploadedFiles = [];
    try {
      uploadedFiles = await uploadEvidenceFiles(newReport.case_report_id, req.files, userId);
    } catch (fileErr) {
      console.error('[submitReport] evidence upload error:', fileErr.message);
      return res.status(201).json({
        data: newReport,
        warning: 'Report submitted, but some evidence files failed to upload. Please contact support to add them.',
      });
    }

    runNLPAnalysis({
      case_report_id:       newReport.case_report_id,
      incident_description: newReport.incident_description,
      incident_location:    newReport.incident_location,
      incident_city:        newReport.incident_city,
      action_requested:     newReport.action_requested,
    });

    return res.status(201).json({ data: newReport, files: uploadedFiles });
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
    // Log the full error object so Supabase PostgREST details are visible
    console.error('[getAllCases] Error details:', JSON.stringify(err, null, 2));
    console.error('[getAllCases] message:', err?.message);
    console.error('[getAllCases] hint:', err?.hint);
    console.error('[getAllCases] details:', err?.details);
    return res.status(500).json({ 
      error: 'Failed to fetch cases.',
      details: err?.message || String(err),
    });
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

// ── GET /api/case_reports/heatmap/data ────────────────────────────────────
async function getHeatmapData(req, res) {
  try {
    const { aggregation = 'city', city, region, council, status, verification, victim_gender, perpetrator_gender } = req.query;

    // Fetch only incident_city and case_status_id for the heatmap
    const allReports = await getHeatmapReports();

    // Apply filters
    const filters = {};
    if (city) filters.city = city;
    if (region) filters.region = region;
    if (council) filters.council = council;
    if (status) filters.status = status;
    if (verification) filters.verification = verification;
    if (victim_gender) filters.victim_gender = victim_gender;
    if (perpetrator_gender) filters.perpetrator_gender = perpetrator_gender;

    const filteredReports = getFilteredReports(allReports, filters);

    // Generate heatmap data based on aggregation type
    let heatmapData;
    if (aggregation === 'region') {
      heatmapData = generateRegionHeatmapData(filteredReports);
    } else if (aggregation === 'council') {
      heatmapData = generateCouncilHeatmapData(filteredReports);
    } else {
      heatmapData = generateCityHeatmapData(filteredReports);
    }

    return res.json({
      data: heatmapData,
      filters,
      totalReports: filteredReports.length,
      aggregation,
    });
  } catch (err) {
    console.error('[getHeatmapData]', err.message);
    return res.status(500).json({ error: 'Failed to fetch heatmap data.' });
  }
}

// ── GET /api/case_reports/heatmap/meta ────────────────────────────────────
// Returns regions, cities and councils from the backend geography config.
// This lets the frontend build its filter dropdowns without duplicating data.
async function getHeatmapMeta(req, res) {
  try {
    const {
      NCR_GEOGRAPHY,
      getAllNCRCities,
      getAllNCRCouncils,
    } = require('../config/ncr-geography');

    const regions = Object.entries(NCR_GEOGRAPHY.regions).map(([key, data]) => ({
      key,
      label: data.label,
      cities: Object.keys(data.cities),
    }));

    const cities = getAllNCRCities().map((c) => c.name);
    const councils = getAllNCRCouncils();

    return res.json({ regions, cities, councils });
  } catch (err) {
    console.error('[getHeatmapMeta]', err.message);
    return res.status(500).json({ error: 'Failed to fetch heatmap metadata.' });
  }
}

const updateItem = async (req, res) => {
  try {
    const { id } = req.params
    const data = await CaseReports.update(id, req.body)
    res.json({ data })
  } catch (err) {
    // 400 for "No valid fields" since it's a client error,
    // 500 for everything else (DB failures)
    const status = err.message === 'No valid fields to update' ? 400 : 500
    res.status(status).json({ error: err.message })
  }
}

const withdrawCase = async (req, res) => {
  try {
    const { id } = req.params;
    const supabase = require('../config/supabase');
    
    // 1. Get the case report
    const { data: caseReport, error: fetchErr } = await supabase
      .from('case_reports')
      .select('*')
      .eq('case_report_id', id)
      .single();
      
    if (fetchErr || !caseReport) throw new Error('Case report not found');

    const complainantId = await getComplainantId(req.user?.id);
    if (caseReport.complainant_id !== complainantId) {
      return res.status(403).json({ error: 'You can only withdraw your own case report.' });
    }

    if (![2, 3].includes(Number(caseReport.case_status_id))) {
      return res.status(409).json({
        error: 'This report can only be withdrawn during verification or review.',
      });
    }
    
    // 2. Insert into case_status_history
    const { error: histErr } = await supabase
      .from('case_status_history')
      .insert([{
        case_report_id: id,
        case_status_id: 13, // Withdrawn
        changed_by_id: req.user?.id || req.user?.user_id,
        changed_by_role: 'complainant',
        notes: 'Complainant withdrew the case',
        approval_status: 'approved',
        approved_at: new Date().toISOString()
      }]);
      
    if (histErr) throw histErr;
    
    // 3. Update case_reports
    const { data: updatedCase, error: updateErr } = await supabase
      .from('case_reports')
      .update({ case_status_id: 13 })
      .eq('case_report_id', id)
      .select()
      .single();
      
    if (updateErr) throw updateErr;
    
    res.json({ message: 'Case withdrawn successfully', data: updatedCase });
  } catch (err) {
    console.error('[withdrawCase]', err.message);
    res.status(500).json({ error: err.message });
  }
};

const undoWithdrawCase = async (req, res) => {
  try {
    const { id } = req.params;
    const supabase = require('../config/supabase');
    
    // 1. Find the latest status history before it was withdrawn
    const { data: historyList, error: histErr } = await supabase
      .from('case_status_history')
      .select('*')
      .eq('case_report_id', id)
      .order('created_at', { ascending: false });
      
    if (histErr) throw histErr;

    const { data: caseReport, error: caseErr } = await supabase
      .from('case_reports')
      .select('complainant_id, case_status_id')
      .eq('case_report_id', id)
      .single();

    if (caseErr || !caseReport) throw new Error('Case report not found');

    const complainantId = await getComplainantId(req.user?.id);
    if (caseReport.complainant_id !== complainantId) {
      return res.status(403).json({ error: 'You can only restore your own case report.' });
    }

    if (Number(caseReport.case_status_id) !== 13) {
      return res.status(409).json({ error: 'This report is not currently withdrawn.' });
    }
    
    // Find the latest non-Withdrawn status
    const previousStatusRow = historyList.find(h => h.case_status_id !== 13);
    const prevStatusId = previousStatusRow ? previousStatusRow.case_status_id : 2; // default to 'For Verification' if none found
    
    // 2. Delete the withdrawn history rows
    const withdrawnRows = historyList.filter(h => h.case_status_id === 13).map(h => h.history_id);
    if (withdrawnRows.length > 0) {
      await supabase
        .from('case_status_history')
        .delete()
        .in('history_id', withdrawnRows);
    }
    
    // 3. Revert case_reports status
    const { data: updatedCase, error: updateErr } = await supabase
      .from('case_reports')
      .update({ case_status_id: prevStatusId })
      .eq('case_report_id', id)
      .select()
      .single();
      
    if (updateErr) throw updateErr;
    
    res.json({ message: 'Withdrawal undone successfully', data: updatedCase });
  } catch (err) {
    console.error('[undoWithdrawCase]', err.message);
    res.status(500).json({ error: err.message });
  }
};

const EVIDENCE_BUCKET = 'case-evidence';

function getEvidenceType(mimetype) {
  if (mimetype === 'application/pdf') return 'document';
  if (mimetype.startsWith('image/'))  return 'photo';
  if (mimetype.startsWith('video/'))  return 'video';
  return 'other';
}

async function uploadEvidenceFiles(caseReportId, files, uploadedById) {
  if (!files || files.length === 0) return [];

  const supabase = require('../config/supabase');
  const uploaded = [];

  for (const file of files) {
    const ext = file.originalname.split('.').pop();
    const storagePath = `${caseReportId}/${randomUUID()}.${ext}`;

    const { error: uploadErr } = await supabase
      .storage
      .from(EVIDENCE_BUCKET)
      .upload(storagePath, file.buffer, {
        contentType: file.mimetype,
        upsert: false,
      });

    if (uploadErr) {
      console.error('[uploadEvidenceFiles] storage upload failed:', uploadErr.message);
      throw new Error(`Failed to upload ${file.originalname}: ${uploadErr.message}`);
    }

    const { data: row, error: insertErr } = await supabase
      .from('evidences')
      .insert([{
        case_report_id: caseReportId,
        evidence_type:  getEvidenceType(file.mimetype),
        file_path:      storagePath,
        original_name:  file.originalname,
        mime_type:      file.mimetype,
        size_bytes:     file.size,
        uploaded_by_id: uploadedById ?? null,
      }])
      .select()
      .single();

    if (insertErr) {
      console.error('[uploadEvidenceFiles] metadata insert failed:', insertErr.message);
      throw new Error(`Failed to save metadata for ${file.originalname}.`);
    }

    uploaded.push(row);
  }

  return uploaded;
}

module.exports = { getItems, createItem, submitReport, getUserReports, getAllCases, getCaseById, getNLPAnalysis, getHeatmapData, getHeatmapMeta, updateItem, withdrawCase, undoWithdrawCase, uploadEvidenceFiles }
