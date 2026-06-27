const {
    createAnalysis,
    updateAnalysisByApplicationId,
    updateAnalysisByPrimaryKey,
} = require('../models/volunteer_application_analysis.model');

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
            console.warn(`[VolunteerNLP] Skipping missing analysis column "${missingColumn}" and retrying save.`);
        }
    }

    throw new Error('Failed to save volunteer NLP analysis after removing missing columns.');
}

/**
 * Calls the Python NLP service and saves the result to the DB.
 * Runs in the background and does not block application submission.
 */
async function runVolunteerEssayAnalysis(application) {
    const { volunteer_application_id, essay_response } = application;

    if (!essay_response || essay_response.trim().length < 20) {
        return;
    }

    const sanitizedEssay = essay_response
        .replace(/[\u0000-\u001F\u007F]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

    let pendingAnalysis = null;

    try {
        pendingAnalysis = await createAnalysis({ volunteer_application_id, status: 'pending' });

        const response = await fetch(`${NLP_URL}/analyze/essay`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ volunteer_application_id, essay_response: sanitizedEssay }),
        });

        if (!response.ok) {
            const err = await response.json().catch(() => null);
            throw new Error(err?.detail || `NLP service error: ${response.status}`);
        }

        const result = await response.json();

        const updates = {
            mission_alignment_score:   result.mission_alignment_score   ?? null,
            maturity_judgment_score:   result.maturity_judgment_score   ?? null,
            commitment_score:          result.commitment_score          ?? null,
            writing_clarity_score:     result.writing_clarity_score     ?? null,
            relevant_experience_score: result.relevant_experience_score ?? null,
            mission_alignment_notes:   result.mission_alignment_notes   || null,
            maturity_judgment_notes:   result.maturity_judgment_notes   || null,
            commitment_notes:          result.commitment_notes          || null,
            writing_clarity_notes:     result.writing_clarity_notes     || null,
            relevant_experience_notes: result.relevant_experience_notes || null,
            essay_weighted_total:      result.essay_weighted_total      ?? null,
            essay_score_out_of_50:     result.essay_score_out_of_50     ?? null,
            recommendation:            result.recommendation            || null,
            recommendation_notes:      result.recommendation_notes?.trim() || null,
            threshold_passed:          result.threshold_passed          ?? null,
            model_used:                result.model_used                || null,
            language_detected:         result.language_detected         || null,
            anonymized_essay:          result.anonymized_essay          || null,
            detected_pii:              result.detected_pii              || null,
            status:                    'completed',
            analyzed_at:               new Date().toISOString(),
        };

        if (pendingAnalysis) {
            await updateWithSchemaFallback(
                (payload) => updateAnalysisByPrimaryKey(pendingAnalysis, payload),
                updates
            );
        } else {
            await updateWithSchemaFallback(
                (payload) => updateAnalysisByApplicationId(volunteer_application_id, payload),
                updates
            );
        }

        console.log(`[VolunteerNLP] Analysis completed for application ${volunteer_application_id}`);
    } catch (err) {
        console.error(`[VolunteerNLP] Analysis failed for application ${volunteer_application_id}:`, err.message);

        try {
            if (pendingAnalysis) {
                await updateAnalysisByPrimaryKey(pendingAnalysis, { status: 'failed' });
            } else {
                await updateAnalysisByApplicationId(volunteer_application_id, { status: 'failed' });
            }
        } catch (statusErr) {
            console.error(`[VolunteerNLP] Failed to mark application ${volunteer_application_id} analysis as failed:`, statusErr.message);
        }
    }
}

module.exports = { runVolunteerEssayAnalysis };
