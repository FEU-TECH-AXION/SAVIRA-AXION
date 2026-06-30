import os
import json
import time
from concurrent.futures import ThreadPoolExecutor
from json import JSONDecodeError
from groq import Groq
from dotenv import load_dotenv

load_dotenv()

MODEL = "llama-3.1-8b-instant"
MAX_TOKENS = 2500

# ── Initialize Groq client (lazy-loaded on first use) ──────────────
_client = None

def get_client():
    global _client
    if _client is None:
        api_key = os.getenv("GROQ_API_KEY")
        if not api_key:
            raise ValueError("GROQ_API_KEY not set in environment")
        _client = Groq(api_key=api_key, timeout=20.0, max_retries=2)
    return _client


def _strip_code_fence(raw_text):
    text = raw_text.strip()
    if not text.startswith("```"):
        return text

    parts = text.split("```")
    if len(parts) < 2:
        return text

    fenced = parts[1].strip()
    if fenced.startswith("json"):
        fenced = fenced[4:].strip()
    return fenced


def _extract_json_object(raw_text):
    text = _strip_code_fence(raw_text)
    start = text.find("{")
    end = text.rfind("}")
    if start == -1 or end == -1 or end <= start:
        return text
    return text[start:end + 1]


def parse_json_response(raw_text, task_name="Groq"):
    """Parse model JSON and include a compact snippet when the model returns invalid JSON."""
    json_text = _extract_json_object(raw_text)
    try:
        return json.loads(json_text)
    except JSONDecodeError as err:
        snippet_start = max(err.pos - 120, 0)
        snippet_end = min(err.pos + 120, len(json_text))
        snippet = json_text[snippet_start:snippet_end].replace("\n", "\\n")
        raise ValueError(
            f"{task_name} returned invalid JSON: {err.msg} at line {err.lineno} "
            f"column {err.colno}. Near: {snippet}"
        ) from err

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
    return f"""You are a case officer of a Philippine-based youth-led advocacy and helpdesk network that takes reports of sexual harassment, abuse, and safeguarding concerns seriously.
            You are trained to accept, handle, and manage cases in compliance with organizational policies, legal requirements (Data Privacy Act of 2012), and ethical standards.

            Your task is to suggest possible classifications AND assess the quality of the following incident description.
            These are SUGGESTIONS ONLY to guide case officers — not definitive legal determinations.

            PRIMARY CATEGORIES (select ALL that clearly or partially apply):
            - Physical: Involves incidents with physical contact
            - Verbal: Involves spoken or written language intended to harm, threaten, or intimidate
            - Virtual: Involves incidents through digital platforms, mobile apps, or internet-based communication

            CASE TYPES (select ALL that clearly or partially apply):
            - Sexual harassment
            - Online sexual harassment
            - Non-consensual sharing of intimate images/videos
            - Sexual assault / unwanted sexual touching
            - Rape / attempted rape
            - Child sexual abuse
            - Sexual exploitation / trafficking-related sexual abuse
            - Stalking with sexual nature or intent
            - Gender-based sexual harassment in institutions

            CONFIDENCE TIERS:
            - high: The report clearly and directly describes this category or type
            - moderate: The report implies or partially describes this category or type with some supporting detail
            - low: The report vaguely suggests this but lacks any clear indicators

            CRITICAL RULES:
            - Only include a category or case type if there is GENUINE evidence in the report text
            - Do NOT suggest a category or type just because it cannot be ruled out
            - Do NOT include "low" confidence items unless there is at least one specific word or phrase that points to it
            - If the report is too vague to classify reliably, return EMPTY arrays for primary_categories and case_types
            - It is better to return nothing than to return a hallucinated suggestion
            - A report that simply lists names or repeats the same sentence is NOT classifiable

            REPORT STRUCTURE ASSESSMENT:
            Evaluate whether the report contains:
            - Introduction: Does it establish who is involved and basic context?
            - Body: Does it describe what happened, when, where, and how with specific details?
            - Conclusion: Does it state what the complainant wants or the outcome/impact?

            VAGUENESS ASSESSMENT:
            Rate clarity from 1 (very vague) to 5 (very clear and detailed).
            Only return empty arrays if the report GENUINELY lacks content
            - Lacks specific details about what happened
            - Does not identify the nature of the incident clearly
            - Is missing key information (who, what, when, where)
            - Is repetitive without adding new information
            - Is a single sentence or repeated sentences
            - Is one sentence, repetitive, or contains no describable incident.
            - A report with names masked as [PERSON] but with clear narrative details 
                about what happened SHOULD still be classified.

            INCIDENT DESCRIPTION:
            {processed_text}

            Respond ONLY with a valid JSON object, no explanation, no markdown, no extra text.
            If the report is too vague, primary_categories and case_types must be empty arrays:
            {{
            "primary_categories": [
                {{
                "category": "Physical",
                "confidence": "high",
                "basis": "Specific quote or detail from the report that supports this"
                }}
            ],
            "case_types": [
                {{
                "type": "Sexual harassment",
                "confidence": "high",
                "basis": "Specific quote or detail from the report that supports this"
                }}
            ],
            "classification_notes": "If arrays are empty, explain why the report could not be classified. Otherwise, briefly explain the suggested classifications.",
            "report_structure": {{
                "has_introduction": false,
                "has_body": false,
                "has_conclusion": false,
                "introduction_notes": "What is present or missing",
                "body_notes": "What is present or missing",
                "conclusion_notes": "What is present or missing"
            }},
            "clarity_score": 1,
            "needs_clarification": true,
            "clarification_reason": "List the specific details missing: who was involved, what specifically happened, when, where, and what outcome the complainant is seeking"
}}"""

def build_summary_prompt(anonymized_text):
    return f"""You are an assistant helping a gender-based violence support organization.

        Summarize the following incident report in 2-3 sentences.

        STRICT RULES:
        - Write ONLY what is explicitly stated in the report — do not infer, assume, or add details
        - If the report is vague, say so directly instead of filling in gaps
        - Do NOT mention locations, injury types, number of people, or outcomes unless explicitly stated
        - Do NOT use phrases like "currently being investigated" or "exact nature is unknown" — these are filler
        - Use neutral, professional language
        - If the report is too vague to summarize meaningfully, state: "The report is too vague to summarize. Key details such as what happened, when, where, and who was involved are missing."

    INCIDENT DESCRIPTION:
    {anonymized_text}

    Respond ONLY with a valid JSON object, no explanation, no markdown, no extra text:
    {{
    "summary": "Your 2-3 sentence summary here, or the vagueness statement if applicable"
    }}"""


def build_recommendation_prompt(anonymized_text, primary_categories, case_types):
    # If no categories or types were suggested, the report is too vague to classify
    is_vague = len(primary_categories) == 0 and len(case_types) == 0

    if is_vague:
        return f"""You are an assistant helping case officers at a gender-based violence support organization.

The following incident report was submitted but could not be classified due to insufficient information.
Provide guidance on how to handle an unclassifiable or vague report.

INCIDENT DESCRIPTION:
{anonymized_text}

Respond ONLY with a valid JSON object, no explanation, no markdown, no extra text:
{{
  "recommended_steps": [
    "Contact the complainant to request a more detailed account of what happened",
    "Ask the complainant to provide specific details: what occurred, when, where, who was involved, and what outcome they are seeking",
    "Do not proceed with case evaluation until sufficient information is provided",
    "Document the follow-up attempt and the complainant's response in the case log"
  ],
  "referral_suggested": false,
  "referral_notes": "Cannot assess referral appropriateness until the report is clarified. Follow up with the complainant first."
}}"""

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
def call_groq(prompt, task_name="Groq"):
    """Send a prompt to Groq and return parsed JSON response."""
    client = get_client()
    response = client.chat.completions.create(
        model=MODEL,
        messages=[{"role": "user", "content": prompt}],
        temperature=0.2,   # low temperature = more consistent outputs
        max_tokens=MAX_TOKENS,
    )

    raw_text = response.choices[0].message.content.strip()
    return parse_json_response(raw_text, task_name)


def timed_call_groq(prompt, task_name="Groq"):
    started = time.perf_counter()
    try:
        return call_groq(prompt, task_name)
    finally:
        print(f"[NLP][timing] {task_name} completed in {time.perf_counter() - started:.2f}s")


# ── Main analysis function ────────────────────────────────────────
def analyze(processed_text, anonymized_text):
    # Task 1 + 2: classification and summary are independent.
    with ThreadPoolExecutor(max_workers=2) as executor:
        classification_future = executor.submit(
            timed_call_groq,
            build_classification_prompt(processed_text),
            "Case classification",
        )
        summary_future = executor.submit(
            timed_call_groq,
            build_summary_prompt(anonymized_text),
            "Case summary",
        )

        classification = classification_future.result()
        summary_result = summary_future.result()

    primary_categories = classification.get("primary_categories", [])
    case_types         = classification.get("case_types", [])

    # Task 3 — Recommendations
    # Extract just the category/type names for the recommendation prompt
    category_names = [c.get("category", c) if isinstance(c, dict) else c for c in primary_categories]
    type_names     = [t.get("type", t)     if isinstance(t, dict) else t for t in case_types]

    recommendation_result = timed_call_groq(
        build_recommendation_prompt(anonymized_text, category_names, type_names),
        "Case recommendation",
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
        "report_structure":     classification.get("report_structure", {}),
        "clarity_score":        classification.get("clarity_score", 3),
        "needs_clarification":  classification.get("needs_clarification", False),
        "clarification_reason": classification.get("clarification_reason", ""),
    }
