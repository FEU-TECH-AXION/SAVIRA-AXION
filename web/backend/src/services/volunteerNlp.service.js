const { createAnalysis, updateAnalysisByApplicationId } = require('../models/volunteer_application_analysis.model');

const NLP_URL = process.env.NLP_SERVICE_URL || 'http://localhost:8000';

/**
 * Calls the Python NLP service and saves the result to the DB.
 * Runs in the background — does not block application submission.
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

    await createAnalysis({ volunteer_application_id, status: 'pending' });

    try {
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

        await updateAnalysisByApplicationId(volunteer_application_id, {
            // ── Essay dimension scores (numeric 1–10) ──────────────────────
            mission_alignment_score:   result.mission_alignment_score   ?? null,
            maturity_judgment_score:   result.maturity_judgment_score   ?? null,
            commitment_score:          result.commitment_score          ?? null,
            writing_clarity_score:     result.writing_clarity_score     ?? null,
            relevant_experience_score: result.relevant_experience_score ?? null,

            // ── Per-dimension notes ────────────────────────────────────────
            mission_alignment_notes:   result.mission_alignment_notes   || null,
            maturity_judgment_notes:   result.maturity_judgment_notes   || null,
            commitment_notes:          result.commitment_notes          || null,
            writing_clarity_notes:     result.writing_clarity_notes     || null,
            relevant_experience_notes: result.relevant_experience_notes || null,

            // ── Aggregate scores ───────────────────────────────────────────
            essay_weighted_total:      result.essay_weighted_total      ?? null,
            essay_score_out_of_50:     result.essay_score_out_of_50     ?? null,

            // ── Recommendation ─────────────────────────────────────────────
            recommendation:            result.recommendation            || null,
            // Treat empty string "" as null — NLP returns "" when no notes
            // recommendation_notes:      result.recommendation_notes?.trim() || null,
            threshold_passed:          result.threshold_passed          ?? null,

            // ── Metadata ───────────────────────────────────────────────────
            model_used:                result.model_used                || null,
            language_detected:         result.language_detected         || null,
            anonymized_essay:          result.anonymized_essay          || null,
            detected_pii:              result.detected_pii              || null,

            // ── Not set by NLP — left null in DB ───────────────────────────
            // nonnegotiables_score, nonnegotiables_passed,
            // negotiables_score, negotiables_passed,
            // interview_score, total_score, reviewed_by
            // → These are filled in manually by the reviewing officer, not here.

            status:      'completed',
            analyzed_at: new Date().toISOString(),
        });


    } catch (err) {
        console.error(`[VolunteerNLP] Analysis failed for application ${volunteer_application_id}:`, err.message);
        await updateAnalysisByApplicationId(volunteer_application_id, { status: 'failed' });
    }
}

module.exports = { runVolunteerEssayAnalysis };