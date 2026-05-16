import os
import json
from groq import Groq
from dotenv import load_dotenv

load_dotenv()

# ── Initialize Groq client ────────────────────────────────────────
client = Groq(api_key=os.getenv("GROQ_API_KEY"))

MODEL = "llama-3.1-8b-instant"

# ── Category and case type definitions ───────────────────────────
PRIMARY_CATEGORIES = ["Physical", "Verbal", "Virtual"]

CASE_TYPES = [
    "Sexual harassment",
    "Online sexual harassment",
    "Non-consensual sharing of intimate images/videos",
    "Sexual assault / unwanted sexual touching",
    "Rape / attempted rape",
    "Child sexual abuse",
    "Sexual exploitation / trafficking-related sexual abuse",
    "Stalking with sexual nature or intent",
    "Gender-based sexual harassment in institutions",
]

# ── Prompt builders ───────────────────────────────────────────────
def build_classification_prompt(processed_text):
    return f"""You are an assistant helping a gender-based violence support organization analyze incident reports.

Your task is to suggest possible classifications for the following incident description.
These are SUGGESTIONS ONLY to guide case officers — not definitive legal determinations.

PRIMARY CATEGORIES (can be multiple):
- Physical: Involves incidents with physical contact
- Verbal: Involves spoken or written language intended to harm, threaten, or intimidate
- Virtual: Involves incidents through digital platforms, mobile apps, or internet-based communication

CASE TYPES (can be multiple):
- Sexual harassment
- Online sexual harassment
- Non-consensual sharing of intimate images/videos
- Sexual assault / unwanted sexual touching
- Rape / attempted rape
- Child sexual abuse
- Sexual exploitation / trafficking-related sexual abuse
- Stalking with sexual nature or intent
- Gender-based sexual harassment in institutions

INCIDENT DESCRIPTION:
{processed_text}

Respond ONLY with a valid JSON object, no explanation, no markdown, no extra text:
{{
  "primary_categories": ["category1", "category2"],
  "case_types": ["case type 1", "case type 2"],
  "classification_notes": "Brief explanation of why these categories were suggested"
}}"""


def build_summary_prompt(anonymized_text):
    return f"""You are an assistant helping a gender-based violence support organization.

Summarize the following incident report in 2-3 sentences.
- Write clearly and factually
- Do not include any personally identifiable information
- Use neutral, professional language
- Focus on what happened, where, and the nature of the incident

INCIDENT DESCRIPTION:
{anonymized_text}

Respond ONLY with a valid JSON object, no explanation, no markdown, no extra text:
{{
  "summary": "Your 2-3 sentence summary here"
}}"""


def build_recommendation_prompt(anonymized_text, primary_categories, case_types):
    return f"""You are an assistant helping case officers at a gender-based violence support organization.

Based on the incident description and suggested classifications below, provide guidance on possible next steps.
These are SUGGESTIONS ONLY — the case officer makes all final decisions.

The organization's general process is:
1. Verify the report and the complainant
2. Interview the complainant to understand what outcome they want
3. Assess whether the case can be resolved internally (mediation, counseling, legal aid)
4. If unresolvable (e.g. minor without parental consent, severe cases), consider referral to the Women and Children Protection Desk (WCPD) or other appropriate agencies

SUGGESTED PRIMARY CATEGORIES: {", ".join(primary_categories)}
SUGGESTED CASE TYPES: {", ".join(case_types)}

INCIDENT DESCRIPTION:
{anonymized_text}

Respond ONLY with a valid JSON object, no explanation, no markdown, no extra text:
{{
  "recommended_steps": [
    "Step 1 suggestion",
    "Step 2 suggestion",
    "Step 3 suggestion"
  ],
  "referral_suggested": true or false,
  "referral_notes": "Explain why referral may or may not be appropriate, if relevant"
}}"""


# ── Groq API caller ───────────────────────────────────────────────
def call_groq(prompt):
    """Send a prompt to Groq and return parsed JSON response."""
    response = client.chat.completions.create(
        model=MODEL,
        messages=[{"role": "user", "content": prompt}],
        temperature=0.2,   # low temperature = more consistent outputs
        max_tokens=1000,
    )

    raw_text = response.choices[0].message.content.strip()

    # Strip markdown code fences if present
    if raw_text.startswith("```"):
        raw_text = raw_text.split("```")[1]
        if raw_text.startswith("json"):
            raw_text = raw_text[4:]
        raw_text = raw_text.strip()

    return json.loads(raw_text)


# ── Main analysis function ────────────────────────────────────────
def analyze(processed_text, anonymized_text):
    """
    Run all three Groq tasks:
    1. Classification
    2. Summarization
    3. Recommendations

    Returns combined result dict.
    """
    # Task 1 — Classification
    classification = call_groq(build_classification_prompt(processed_text))

    primary_categories = classification.get("primary_categories", [])
    case_types         = classification.get("case_types", [])

    # Task 2 — Summary
    summary_result = call_groq(build_summary_prompt(anonymized_text))

    # Task 3 — Recommendations
    recommendation_result = call_groq(
        build_recommendation_prompt(anonymized_text, primary_categories, case_types)
    )

    return {
        "model_used":           MODEL,
        "primary_categories":   primary_categories,
        "case_types":           case_types,
        "classification_notes": classification.get("classification_notes", ""),
        "summary":              summary_result.get("summary", ""),
        "recommended_steps":    recommendation_result.get("recommended_steps", []),
        "referral_suggested":   recommendation_result.get("referral_suggested", False),
        "referral_notes":       recommendation_result.get("referral_notes", ""),
    }