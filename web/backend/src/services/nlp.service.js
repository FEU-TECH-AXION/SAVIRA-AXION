const { create, updateAnalysisByReportId, updateAnalysisById } = require('../models/case_report_analysis.model');

const NLP_URL = process.env.NLP_SERVICE_URL || 'http://localhost:8000';

function getMissingColumnName(error) {
    const message = error?.message || '';
    return (
        message.match(/Could not find the '([^']+)' column/)?.[1] ||
        message.match(/column "([^"]+)" of relation .* does not exist/)?.[1] ||
        null
    );
}

async function updateWithSchemaFallback(updateFn, updates) {
    const remainingUpdates = { ...updates };

    for (let attempt = 0; attempt < Object.keys(updates).length; attempt++) {
        try {
            return await updateFn(remainingUpdates);
        } catch (error) {
            const missingColumn = getMissingColumnName(error);
            if (!missingColumn || !(missingColumn in remainingUpdates)) throw error;

            delete remainingUpdates[missingColumn];
            console.warn(`[NLP] Skipping missing analysis column "${missingColumn}" and retrying save.`);
        }
    }

    throw new Error('Failed to save NLP analysis after removing missing columns.');
}

/**
 * Calls the Python NLP service and saves the result to the DB.
 * Runs in the background and does not block report submission.
 */
async function runNLPAnalysis(report) {
    const { case_report_id, incident_description, incident_location, incident_city, action_requested } = report;
    let pendingAnalysis = null;

    try {
        pendingAnalysis = await create({
            case_report_id,
            status: 'pending',
        });

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

        const updates = {
            model_used:           result.model_used           || null,
            language_detected:    result.language_detected    || null,
            anonymized_text:      result.anonymized_text      || null,
            detected_pii:         result.detected_pii         || null,
            primary_categories:   result.primary_categories   || [],
            case_types:           result.case_types           || [],
            classification_notes: result.classification_notes || null,
            summary:              result.summary              || null,
            recommended_steps:    result.recommended_steps    || [],
            referral_suggested:   result.referral_suggested   ?? false,
            referral_notes:       result.referral_notes       || null,
            clarity_score:        result.clarity_score        ?? null,
            needs_clarification:  result.needs_clarification  ?? false,
            clarification_reason: result.clarification_reason || null,
            report_structure:     result.report_structure     || null,
            status:               'completed',
            analyzed_at:          new Date().toISOString(),
        };

        if (pendingAnalysis?.analysis_id) {
            await updateWithSchemaFallback(
                (payload) => updateAnalysisById(pendingAnalysis.analysis_id, payload),
                updates
            );
        } else {
            await updateWithSchemaFallback(
                (payload) => updateAnalysisByReportId(case_report_id, payload),
                updates
            );
        }

        console.log(`[NLP] Analysis completed for report ${case_report_id}`);
    } catch (err) {
        console.error(`[NLP] Analysis failed for report ${case_report_id}:`, err.message);

        try {
            if (pendingAnalysis?.analysis_id) {
                await updateAnalysisById(pendingAnalysis.analysis_id, { status: 'failed' });
            } else {
                await updateAnalysisByReportId(case_report_id, { status: 'failed' });
            }
        } catch (statusErr) {
            console.error(`[NLP] Failed to mark report ${case_report_id} analysis as failed:`, statusErr.message);
        }
    }
}

module.exports = { runNLPAnalysis };
