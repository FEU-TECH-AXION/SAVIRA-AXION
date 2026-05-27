import asyncio
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from dotenv import load_dotenv

from pipeline.preprocessor import preprocess
from pipeline.anonymizer import anonymize
from pipeline.groq_client import analyze

from pipeline.essay_grader import grade_essay
from pipeline.preprocessor import preprocess
from pipeline.anonymizer  import anonymize

load_dotenv()

app = FastAPI(title="SAVIRA NLP Service", version="1.0.0")

# ── Request schema ────────────────────────────────────────────────
class ReportRequest(BaseModel):
    case_report_id: int
    incident_description: str
    incident_location:    str | None = None
    incident_city:        str | None = None
    action_requested:     str | None = None

# ── Response schema ───────────────────────────────────────────────
class AnalysisResponse(BaseModel):
    case_report_id:       int
    model_used:           str
    language_detected:    str
    anonymized_text:      str
    detected_pii:         list[str]
    primary_categories:   list[str]
    case_types:           list[str]
    classification_notes: str
    summary:              str
    recommended_steps:    list[str]
    referral_suggested:   bool
    referral_notes:       str

# ── Health check ──────────────────────────────────────────────────
@app.get("/")
def root():
    return {"status": "SAVIRA NLP Service is running"}

@app.get("/health")
def health():
    return {"status": "ok"}

# ── Main analysis endpoint ────────────────────────────────────────
@app.post("/analyze", response_model=AnalysisResponse)
async def analyze_report(report: ReportRequest):
    """
    Full NLP pipeline:
    1. Combine relevant text fields
    2. Anonymize PII first on raw text (Presidio)
       — must run before preprocessing so names/PII are still capitalized and in context
    3. Preprocess the anonymized text (normalize, tokenize, lemmatize)
       — language detection only; processed tokens are NOT sent to Groq
    4. Send anonymized natural text to Groq (classify, summarize, recommend)
       — anonymized_text preserves sentence structure for better Groq output
    5. Return structured results
    """
    try:
        # Step 1 — Combine fields
        combined_text = report.incident_description
        if report.action_requested:
            combined_text += f" {report.action_requested}"

        if not combined_text.strip():
            raise HTTPException(
                status_code=400,
                detail="Incident description is required for analysis."
            )

        # Step 2 — Anonymize FIRST on raw text
        # Names/PII are still capitalized and in context here
        anonymized = anonymize(combined_text)

        # Step 3 — Preprocess the ANONYMIZED text
        # Now [PERSON], [LOCATION] placeholders go through preprocessing
        # Only language_detected is used from this result — processed_text is NOT sent to Groq
        preprocessed = preprocess(anonymized["anonymized_text"])

        # Step 4 — Run Groq analysis
        # Send anonymized_text (natural language) to BOTH summary and classifier
        # Do NOT send processed_text to Groq — it strips too much context
        result = await asyncio.get_event_loop().run_in_executor(
            None,
            lambda: analyze(
                anonymized["anonymized_text"],  # ← classification gets natural text
                anonymized["anonymized_text"],  # ← summary gets natural text
            )
        )

        # Step 5 — Return combined result
        return AnalysisResponse(
            case_report_id       = report.case_report_id,
            model_used           = result["model_used"],
            language_detected    = preprocessed["language"],
            anonymized_text      = anonymized["anonymized_text"],
            detected_pii         = anonymized["detected_pii"],
            primary_categories   = result["primary_categories"],
            case_types           = result["case_types"],
            classification_notes = result["classification_notes"],
            summary              = result["summary"],
            recommended_steps    = result["recommended_steps"],
            referral_suggested   = result["referral_suggested"],
            referral_notes       = result["referral_notes"],
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"NLP analysis failed: {str(e)}"
        )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

    # ── Volunteer Application ────────────────────────────────────────

    # ── Request schema ────────────────────────────────────────────────
class EssayRequest(BaseModel):
    volunteer_application_id: int
    essay_response:           str

# ── Response schema ───────────────────────────────────────────────
class EssayAnalysisResponse(BaseModel):
    volunteer_application_id: int
    # Scores
    mission_alignment_score:  float
    maturity_judgment_score:  float
    commitment_score:         float
    writing_clarity_score:    float
    relevant_experience_score: float
    essay_weighted_total:     float   # out of 100
    essay_score_out_of_50:    float   # scaled for aggregate
    # Notes
    mission_alignment_notes:  str
    maturity_judgment_notes:  str
    commitment_notes:         str
    writing_clarity_notes:    str
    relevant_experience_notes: str
    # Recommendation
    recommendation:           str     # RECOMMEND | REVIEW | REJECT
    recommendation_notes:     str
    threshold_passed:         bool
    # Meta
    anonymized_essay:         str
    language_detected:        str


@app.post("/analyze/essay", response_model=EssayAnalysisResponse)
async def analyze_essay(request: EssayRequest):
    """
    Essay NLP pipeline:
    1. Anonymize PII from raw essay text (Presidio)
    2. Preprocess anonymized text (normalize, language detect)
    3. Send to Groq for essay grading against SASHA criteria
    4. Compute weighted total server-side
    5. Return structured scores, notes, and recommendation
    """
    try:
        if not request.essay_response.strip():
            raise HTTPException(
                status_code=400,
                detail="Essay response is required for analysis."
            )

        # Step 1 — Anonymize PII first on raw essay
        anonymized = anonymize(request.essay_response)

        # Step 2 — Preprocess anonymized essay (language detection only)
        preprocessed = preprocess(anonymized["anonymized_text"])

        # Step 3 — Grade essay via Groq
        result = await asyncio.get_event_loop().run_in_executor(
            None,
            lambda: grade_essay(anonymized["anonymized_text"])
        )

        scores = result.get("scores", {})
        notes  = result.get("notes", {})

        # Step 4 — Determine if threshold passed
        # Essay must score at least 50/100 weighted to pass
        threshold_passed = result["essay_weighted_total"] >= 50.0

        # Step 5 — Return structured result
        return EssayAnalysisResponse(
            volunteer_application_id  = request.volunteer_application_id,

            # Scores for DB
            mission_alignment_score   = scores.get("mission_alignment", 0),
            maturity_judgment_score   = scores.get("maturity_judgment", 0),
            commitment_score          = scores.get("commitment", 0),
            writing_clarity_score     = scores.get("writing_clarity", 0),
            relevant_experience_score = scores.get("relevant_experience", 0),
            essay_weighted_total      = result["essay_weighted_total"],
            essay_score_out_of_50     = result["essay_score_out_of_50"],

            # Notes for DB
            mission_alignment_notes   = notes.get("mission_alignment", ""),
            maturity_judgment_notes   = notes.get("maturity_judgment", ""),
            commitment_notes          = notes.get("commitment", ""),
            writing_clarity_notes     = notes.get("writing_clarity", ""),
            relevant_experience_notes = notes.get("relevant_experience", ""),

            # NLPEssayTab fields
            summary                   = result.get("summary", ""),
            overall_score             = result.get("overall_score", 0),
            overall_label             = result.get("overall_label", ""),
            dimensions                = result.get("dimensions", {}),
            strengths                 = result.get("strengths", []),
            concerns                  = result.get("concerns", []),
            recommendation            = result.get("recommendation", ""),
            recommend_approve         = result.get("recommend_approve", False),

            # Meta
            anonymized_essay          = anonymized["anonymized_text"],
            language_detected         = preprocessed["language"],
            word_count                = len(request.essay_response.split()),
            threshold_passed          = result["essay_weighted_total"] >= 50.0,
            recommendation_label      = result.get("overall_label", ""),
            recommendation_notes      = notes.get("mission_alignment", ""),
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Essay analysis failed: {str(e)}"
        )