from presidio_analyzer import AnalyzerEngine
from presidio_anonymizer import AnonymizerEngine
from presidio_anonymizer.entities import OperatorConfig

# ── Initialize Presidio engines ───────────────────────────────────
analyzer  = AnalyzerEngine()
anonymizer = AnonymizerEngine()

# ── PII entity types to detect and mask ──────────────────────────
PII_ENTITIES = [
    "PERSON",           # names
    "PHONE_NUMBER",     # contact numbers
    "EMAIL_ADDRESS",    # email addresses
    "LOCATION",         # addresses, cities, places
    "DATE_TIME",        # specific dates that could identify someone
    "URL",              # website links
    "IP_ADDRESS",       # IP addresses
    "CREDIT_CARD",      # financial info
    "IBAN_CODE",        # bank accounts
    "NRP",              # nationality, religion, political group
]

# ── Replacement labels ────────────────────────────────────────────
# Maps each entity type to a readable placeholder
REPLACEMENTS = {
    "PERSON":        OperatorConfig("replace", {"new_value": "[PERSON]"}),
    "PHONE_NUMBER":  OperatorConfig("replace", {"new_value": "[PHONE_NUMBER]"}),
    "EMAIL_ADDRESS": OperatorConfig("replace", {"new_value": "[EMAIL]"}),
    "LOCATION":      OperatorConfig("replace", {"new_value": "[LOCATION]"}),
    "DATE_TIME":     OperatorConfig("replace", {"new_value": "[DATE]"}),
    "URL":           OperatorConfig("replace", {"new_value": "[URL]"}),
    "IP_ADDRESS":    OperatorConfig("replace", {"new_value": "[IP_ADDRESS]"}),
    "CREDIT_CARD":   OperatorConfig("replace", {"new_value": "[FINANCIAL_INFO]"}),
    "IBAN_CODE":     OperatorConfig("replace", {"new_value": "[FINANCIAL_INFO]"}),
    "NRP":           OperatorConfig("replace", {"new_value": "[IDENTITY_GROUP]"}),
}

def anonymize(text, language="en"):
    """
    Detect and mask all PII in the text before sending to Groq.
    Compliant with RA 10173 (Data Privacy Act of 2012).

    Returns:
        dict with anonymized_text and list of detected PII types
    """
    if not text or not text.strip():
        return {
            "anonymized_text": text,
            "detected_pii":    [],
        }

    # Step 1 — Detect PII entities
    # Use 'en' for English, fall back to 'en' for Taglish
    # since Presidio performs best on English
    analysis_results = analyzer.analyze(
        text=text,
        entities=PII_ENTITIES,
        language="en",
    )

    # Step 2 — Anonymize detected entities
    anonymized = anonymizer.anonymize(
        text=text,
        analyzer_results=analysis_results,
        operators=REPLACEMENTS,
    )

    # Step 3 — Collect what was detected for logging
    detected_pii = list({result.entity_type for result in analysis_results})

    return {
        "anonymized_text": anonymized.text,
        "detected_pii":    detected_pii,
    }