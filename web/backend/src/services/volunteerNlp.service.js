const { createAnalysis, updateAnalysisByApplicationId } = require('../models/volunteer_application_analysis.model');

const NLP_URL = process.env.NLP_SERVICE_URL || 'http://localhost:8000';

/**
 * Calls the Python NLP service and saves the result to the DB.
 * Runs in the background — does not block application submission.
 */
async function runVolunteerEssayAnalysis(application) {
    const { volunteer_application_id, essay_response } = application;

    if (!essay_response || essay_response.trim().length < 20) return;

    // Step 1 — Insert a pending row so staff knows analysis is in progress
    await createAnalysis({
        volunteer_application_id,
        status: 'pending',
    });

    try {
        // Step 2 — Call Python NLP service
        const response = await fetch(`${NLP_URL}/analyze_essay`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                volunteer_application_id,
                essay_response,
            }),
        });

        if (!response.ok) {
            const err = await response.json().catch(() => null);
            throw new Error(err?.detail || `NLP service error: ${response.status}`);
        }

        const result = await response.json();

        // Step 3 — Update the pending record with full results
        await updateAnalysisByApplicationId(volunteer_application_id, {
            // ── Essay dimension scores ──
            mission_alignment_score:   result.mission_alignment_score   ?? null,
            maturity_judgment_score:   result.maturity_judgment_score   ?? null,
            commitment_score:          result.commitment_score          ?? null,
            writing_clarity_score:     result.writing_clarity_score     ?? null,
            relevant_experience_score: result.relevant_experience_score ?? null,

            // ── Per-dimension notes ──
            mission_alignment_notes:   result.mission_alignment_notes   || null,
            maturity_judgment_notes:   result.maturity_judgment_notes   || null,
            commitment_notes:          result.commitment_notes          || null,
            writing_clarity_notes:     result.writing_clarity_notes     || null,
            relevant_experience_notes: result.relevant_experience_notes || null,

            // ── Computed totals ──
            essay_weighted_total:  result.essay_weighted_total  ?? null,
            essay_score_out_of_50: result.essay_score_out_of_50 ?? null,

            // ── Recommendation ──
            recommendation:       result.recommendation       || null,
            recommendation_notes: result.recommendation_notes || null,
            threshold_passed:     result.threshold_passed     ?? null,

            // ── NLP metadata ──
            model_used:       result.model_used        || null,
            language_detected: result.language_detected || null,
            anonymized_essay: result.anonymized_text    || null,
            detected_pii:     result.detected_pii       || null,

            status:      'completed',
            analyzed_at: new Date().toISOString(),
        });

        console.log(`[VolunteerNLP] Analysis completed for application ${volunteer_application_id}`);

    } catch (err) {
        console.error(`[VolunteerNLP] Analysis failed for application ${volunteer_application_id}:`, err.message);

        // Step 4 — Mark as failed so staff knows
        await updateAnalysisByApplicationId(volunteer_application_id, { status: 'failed' });
    }
}

module.exports = { runVolunteerEssayAnalysis };