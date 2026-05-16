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
    2. Preprocess (normalize, tokenize, lemmatize)
    3. Anonymize PII (Presidio)
    4. Send to Groq (classify, summarize, recommend)
    5. Return structured results
    """
    try:
        # Step 1 — Combine relevant text fields into one input
        combined_text = report.incident_description
        if report.action_requested:
            combined_text += f" {report.action_requested}"

        if not combined_text.strip():
            raise HTTPException(
                status_code=400,
                detail="Incident description is required for analysis."
            )

        # Step 2 — Preprocess
        preprocessed = preprocess(combined_text)

        # Step 3 — Anonymize the ORIGINAL text (not preprocessed)
        # We anonymize original so the summary reads naturally
        # We send processed tokens to classifier for better accuracy
        anonymized = anonymize(
            preprocessed["original"],
            language=preprocessed["language"],
        )

        # Step 4 — Run Groq analysis
        # Run in thread pool since Groq SDK is synchronous
        result = await asyncio.get_event_loop().run_in_executor(
            None,
            lambda: analyze(
                preprocessed["processed_text"],
                anonymized["anonymized_text"],
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