import asyncio
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from dotenv import load_dotenv

from pipeline.preprocessor import preprocess
from pipeline.anonymizer import anonymize
from pipeline.groq_client import analyze

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