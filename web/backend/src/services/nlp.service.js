const { create, updateAnalysisStatus } = require('../models/case_report_analysis.model');

const NLP_URL = process.env.NLP_SERVICE_URL || 'http://localhost:8000';

/**
 * Calls the Python NLP service and saves the result to the DB.
 * Runs in the background — does not block report submission.
 */
async function runNLPAnalysis(report) {
    const { case_report_id, incident_description, incident_location, incident_city, action_requested } = report;

    // Step 1 — Insert a pending row so admin knows analysis is in progress
    await create({
        case_report_id,
        status: 'pending',
    });

    try {
        // Step 2 — Call Python NLP service
        const response = await fetch(`${NLP_URL}/analyze`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                case_report_id,
                incident_description,
                incident_location: incident_location || null,
                incident_city:     incident_city     || null,
                action_requested:  action_requested  || null,
            }),
        });

        if (!response.ok) {
            const err = await response.json().catch(() => null);
            throw new Error(err?.detail || `NLP service error: ${response.status}`);
        }

        const result = await response.json();

        // Step 3 — Save full results to DB
        await create({
            case_report_id,
            model_used:           result.model_used,
            language_detected:    result.language_detected,
            anonymized_text:      result.anonymized_text,
            detected_pii:         result.detected_pii,
            primary_categories:   result.primary_categories,
            case_types:           result.case_types,
            classification_notes: result.classification_notes,
            summary:              result.summary,
            recommended_steps:    result.recommended_steps,
            referral_suggested:   result.referral_suggested,
            referral_notes:       result.referral_notes,
            status:               'completed',
        });

        console.log(`[NLP] Analysis completed for report ${case_report_id}`);

    } catch (err) {
        console.error(`[NLP] Analysis failed for report ${case_report_id}:`, err.message);

        // Step 4 — Mark as failed so admin knows
        await updateAnalysisStatus(case_report_id, 'failed');
    }
}

module.exports = { runNLPAnalysis };