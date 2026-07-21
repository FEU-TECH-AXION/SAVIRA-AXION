import os
import json
import re
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

def build_classification_prompt(processed_text):
    return f"""You are a multi-label classifier for sexual violence, harassment, and safeguarding reports written in English, Filipino, or Taglish.
Your output is a case-officer aid, not a legal determination.

Read the whole narrative. Check every primary category and every case-type label independently. More than one label may be correct.

PRIMARY LABEL RULES
- Physical: Select when the narrative describes touching, grabbing, kissing, following, waiting near someone, confinement, forced sexual activity, attempted intercourse, penetration, transport, or another physical act or movement.
- Verbal: Select when spoken, written, or communicated sexual remarks, threats, pressure, requests, jokes, commands, refusal, or intimidation are present.
- Virtual: Select when the incident involves chat, text messages, Messenger, social media, email, online accounts, group chats, DMs, digital images, videos, online recruitment, or other electronic communication. If messages were sent or saved, check Virtual.

CASE-TYPE RULES
- Sexual harassment: Select for unwanted sexual comments, jokes, questions, propositions, pressure, or sexualized conduct. Do not use this as a substitute for a more specific physical, image-sharing, rape, child-abuse, trafficking, stalking, or institutional label. Add it with online sexual harassment when the online conduct is sexual comments/messages.
- Online sexual harassment: Select when sexual harassment, sexual messages/comments, sexual threats, or repeated unwanted sexual contact occurs through chat, text, Messenger, IG, group chat, email, online posts, DMs, or another digital platform.
- Non-consensual sharing of intimate images/videos: Select when an intimate/private image or video is shared, uploaded, distributed, shown, used as a threat, or threatened to be shared without consent. A threat to send or upload a private/intimate photo or video qualifies.
- Sexual assault / unwanted sexual touching: Select when unwanted sexual touching, grabbing, kissing, waist/thigh/chest/private-area contact, or sexual body contact occurs. Do not reduce this to general sexual harassment. If attempted or completed penetration/intercourse is explicit, use rape / attempted rape instead.
- Rape / attempted rape: Select when the narrative explicitly describes forced, attempted, or completed sexual intercourse or penetration despite refusal or absence of consent. Signals include "forced sex", "attempted intercourse", "makipagtalik", "pumasok sa silid at sinubukan", "penetration", or "rape".
- Child sexual abuse: Select whenever the victim is described as a child, minor, underage, estudyanteng menor de edad, or below 18 and sexual touching, sexual messaging, grooming, exploitation, or another sexual act is involved.
- Sexual exploitation / trafficking-related sexual abuse: Select when a person recruits, controls, pressures, transports, profits from, arranges, or forces someone to provide sexual services or sexual acts, especially for money, clients, benefits, paid meetings, or online sexual services.
- Stalking with sexual nature or intent: Select when someone repeatedly follows, watches, waits for, tracks, appears near, or contacts the victim and the behavior has explicit sexual motive, sexual messages, sexual access, or comments about the body.
- Gender-based sexual harassment in institutions: Select when gender-based or sexual harassment occurs during official school, workplace, organization, training, scouting, volunteer, chapter, committee, or institutional activities, especially by staff, supervisors, advisers, officers, leaders, teachers, or authority figures.

CONTRADICTION CHECKS BEFORE FINAL OUTPUT
1. If a digital platform or online message is explicitly involved, include Virtual.
2. If online sexual comments/messages/threats are involved, include Online sexual harassment and usually Sexual harassment.
3. If a private/intimate image or video is shared or threatened, include Non-consensual sharing of intimate images/videos.
4. If unwanted sexual touching occurs without penetration/intercourse, include Sexual assault / unwanted sexual touching.
5. If forced or attempted intercourse/penetration is mentioned, include Rape / attempted rape.
6. If the victim is a minor and sexual conduct is involved, include Child sexual abuse.
7. If clients, payment, recruitment, control, arranging, or sexual services are mentioned, include Sexual exploitation / trafficking-related sexual abuse.
8. If repeated following/waiting/appearing near the victim is paired with sexual messages or body comments, include Stalking with sexual nature or intent.
9. If the setting is an official school/work/org/training activity with staff/adviser/officer/leader conduct, include Gender-based sexual harassment in institutions.
10. Never stop after one label. Prefer the most specific valid labels.

VAGUENESS AND STRUCTURE
Return empty arrays only when the report genuinely lacks a describable incident. A narrative with masked names like [PERSON] should still be classified if the incident details are clear.
Also assess whether the report has introduction, body, and conclusion, and rate clarity from 1 to 5.

ALLOWED PRIMARY LABELS: {json.dumps(PRIMARY_CATEGORIES)}
ALLOWED CASE-TYPE LABELS: {json.dumps(CASE_TYPES)}

INCIDENT DESCRIPTION:
{processed_text}

Respond ONLY with a valid JSON object, no markdown, no extra text:
{{
  "primary_categories": [
    {{
      "category": "Physical",
      "confidence": "high",
      "basis": "Specific quote or detail from the report"
    }}
  ],
  "case_types": [
    {{
      "type": "Sexual harassment",
      "confidence": "high",
      "basis": "Specific quote or detail from the report"
    }}
  ],
  "classification_notes": "Briefly explain the selected labels or why arrays are empty.",
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
  "clarification_reason": "List missing details, or empty string if clear enough"
}}"""


def _has_any(text, patterns):
    return any(re.search(pattern, text, re.IGNORECASE) for pattern in patterns)


def _append_label(items, key, label, confidence, basis):
    for item in items:
        existing = item.get(key, item) if isinstance(item, dict) else item
        if existing == label:
            return
    items.append({key: label, "confidence": confidence, "basis": basis})


def _remove_label(items, key, label):
    items[:] = [
        item for item in items
        if (item.get(key, item) if isinstance(item, dict) else item) != label
    ]


def _contains_label(items, key, label):
    return any(
        (item.get(key, item) if isinstance(item, dict) else item) == label
        for item in items
    )


def normalize_classification(classification, source_text):
    """Add high-precision labels that the LLM often under-predicts."""
    text = source_text or ""
    primary = classification.setdefault("primary_categories", [])
    cases = classification.setdefault("case_types", [])
    notes = []

    virtual = _has_any(text, [
        r"\b(chat|chats|group chat|gc|dm|dms|messenger|ig|instagram|online|social media|email|text|mensahe|posts?|account)\b",
        r"\b(pinadala|nagpadala|nag-send|send|sent|upload|uploaded|ipapakalat|ipost|shared?|ibinahagi)\b",
    ])
    verbal = _has_any(text, [
        r"\b(comment|comments|komento|joke|jokes|biro|tanong|question|remarks?|message|messages|mensahe|threat|threatened|sabi|sinabi|pressure|pinilit|tumanggi|stop)\b",
        r"\b(sexual|sekswal|malaswa|green joke|explicit|private|intimate)\b",
    ])
    physical = _has_any(text, [
        r"\b(touch|touched|touching|grabbed|grabbing|kiss|kissed|hinawakan|humawak|dibdib|bewang|waist|thigh|private area|pribadong bahagi|katawan|pumasok|silid|locked|bed|following|followed|sinusundan|waiting|waited|appearing near|sumama|meet clients)\b",
        r"\b(intercourse|penetration|rape|makipagtalik|forced sex|force sex|sexual activity|sexual services)\b",
    ])

    if virtual:
        _append_label(primary, "category", "Virtual", "high", "Digital platform, message, image, or online account is explicitly mentioned.")
    if verbal:
        _append_label(primary, "category", "Verbal", "high", "Sexual remarks, messages, threats, pressure, or refusals are explicitly mentioned.")
    if physical:
        _append_label(primary, "category", "Physical", "high", "Physical contact, following/waiting, confinement, or forced sexual activity is explicitly mentioned.")

    image_abuse = _has_any(text, [
        r"\b(private|pribado|intimate)\s+(photo|photos|image|images|picture|video|larawan)\b",
        r"\b(photo|photos|image|images|picture|video|larawan)\b.*\b(without consent|wala akong pahintulot|without permission|threat|threatened|upload|send|shared|ibinahagi|ipapakalat|ipost)\b",
    ])
    explicit_platform = _has_any(text, [
        r"\b(chat|chats|group chat|gc|dm|dms|messenger|ig|instagram|online|social media|email|text|mensahe|posts?|account)\b",
        r"\b(pinadala|nagpadala|nag-send|send|sent|upload|uploaded|ipapakalat|ipost|shared?|ibinahagi)\b",
    ])
    image_threat = image_abuse and _has_any(text, [
        r"\b(threat|threatened|used .* as a threat|upload|send|ipapakalat|ipost|unless|would send)\b",
    ])
    online_harassment = virtual and (_has_any(text, [
        r"\b(sexual|sekswal|malaswa|malaswang|explicit|green joke)\b",
        r"\b(sexually offensive|sexual comments?|sexual messages?|sekswal na mensahe|sexualized|sekswal na pahiwatig)\b",
    ]) or image_threat)
    unwanted_touching = _has_any(text, [
        r"\b(touched|touching|grabbed|kiss|kissed|hinawakan|humawak)\b.*\b(chest|dibdib|waist|bewang|thigh|private area|katawan|sexual way)\b",
        r"\b(chest|dibdib|waist|bewang|thigh|private area)\b",
        r"\btried to kiss\b",
    ])
    rape_attempt = _has_any(text, [
        r"\b(rape|forced sex|force sex|forced intercourse|attempted intercourse|sexual intercourse|penetration|attempted penetration|makipagtalik)\b",
        r"\bsinubukan.*makipagtalik\b",
        r"\b(pressured|threatened|pinilit)\b.*\bsexual activity\b",
    ])
    child_abuse = _has_any(text, [
        r"\b(child|minor|underage|below 18|menor de edad|bata)\b",
        r"\bestudyanteng menor\b",
    ]) and _has_any(text, [r"\b(sexual|sekswal|malaswa|touch|touched|touching|hinawakan|pribadong bahagi|message|groom|photo|video|abuse|harassment)\b"])
    exploitation = _has_any(text, [
        r"\b(recruit|recruited|recruitment|transport|transported|control|controlled|profits?|payment|paid|money|pera|clients?|sexual services?|meet clients|online meetings for sexual services|gawaing sekswal|sexual encounters)\b",
        r"\b(pinilit|nag-pressure|arranged?|forced)\b.*\b(sexual acts?|sexual services?|clients?|paid)\b",
        r"\b(kapalit ng pera|kinuha ng ibang tao|kept the payment|handler)\b",
    ])
    stalking = _has_any(text, [
        r"\b(following|followed|follows|sinusundan|waiting|waited|appearing near|appeared near|kept appearing|watches|watched|tracks|tracked)\b",
    ]) and _has_any(text, [r"\b(sexual|sekswal|body|katawan|access|pahiwatig|comments?|messages?)\b"])
    institutional = _has_any(text, [
        r"\b(school|workplace|office|organization|organisation|org|training|meeting|official|activity|staff|supervisor|adviser|advisor|officer|leader|teacher|chapter|committee)\b",
        r"\b(eskwela|paaralan|opisyal na gawain|official organization activities|school activity)\b",
    ]) and _has_any(text, [r"\b(gender|sexist|sexual|sekswal|malaswa|harassment|comments?|komento|remarks?)\b"])

    if image_abuse:
        _append_label(cases, "type", "Non-consensual sharing of intimate images/videos", "high", "Private/intimate image or video sharing or threat is explicitly mentioned.")
        notes.append("image-sharing rule")
    if online_harassment:
        _append_label(cases, "type", "Online sexual harassment", "high", "Sexual harassment occurs through a digital platform or message.")
        notes.append("online-harassment rule")
    if rape_attempt:
        _append_label(cases, "type", "Rape / attempted rape", "high", "Forced or attempted intercourse/penetration is explicitly mentioned.")
        notes.append("rape/attempt rule")
    elif unwanted_touching:
        _append_label(cases, "type", "Sexual assault / unwanted sexual touching", "high", "Unwanted sexual touching or kissing is explicitly mentioned.")
        notes.append("unwanted-touching rule")
    if child_abuse:
        _append_label(cases, "type", "Child sexual abuse", "high", "The victim is described as a minor/child and sexual conduct is involved.")
        notes.append("child-abuse rule")
    if exploitation:
        _append_label(cases, "type", "Sexual exploitation / trafficking-related sexual abuse", "high", "Recruitment, control, clients, payment, or sexual services are mentioned.")
        notes.append("exploitation rule")
    if stalking:
        _append_label(cases, "type", "Stalking with sexual nature or intent", "high", "Repeated following/waiting/appearing near the victim is paired with sexual intent or messages.")
        notes.append("stalking rule")
    if institutional:
        _append_label(cases, "type", "Gender-based sexual harassment in institutions", "moderate", "Sexual or gender-based harassment is tied to a school, workplace, organization, or official activity.")
        notes.append("institutional rule")
    if online_harassment or (verbal and _has_any(text, [r"\b(sexual|sekswal|malaswa|green joke|sexist|sexualized|explicit)\b"])):
        _append_label(cases, "type", "Sexual harassment", "high", "Unwanted sexual comments, messages, jokes, pressure, or sexualized conduct are explicitly mentioned.")

    if not image_abuse:
        _remove_label(cases, "type", "Non-consensual sharing of intimate images/videos")
    if not explicit_platform or not online_harassment:
        _remove_label(cases, "type", "Online sexual harassment")
    if rape_attempt:
        _remove_label(cases, "type", "Sexual assault / unwanted sexual touching")

    keep_general_harassment = (
        online_harassment
        or stalking
        or institutional
        or _has_any(text, [r"\b(sexual comments?|sexual remarks?|sexual questions?|green jokes?|malaswang (komento|mensahe)|sexist|sexualized)\b"])
    )
    has_exclusive_specific = any(
        _contains_label(cases, "type", label)
        for label in [
            "Non-consensual sharing of intimate images/videos",
            "Sexual assault / unwanted sexual touching",
            "Rape / attempted rape",
            "Sexual exploitation / trafficking-related sexual abuse",
        ]
    )
    if has_exclusive_specific and not keep_general_harassment:
        _remove_label(cases, "type", "Sexual harassment")

    if not explicit_platform:
        _remove_label(primary, "category", "Virtual")
    if (
        not physical
        and not _contains_label(cases, "type", "Sexual assault / unwanted sexual touching")
        and not _contains_label(cases, "type", "Rape / attempted rape")
        and not _contains_label(cases, "type", "Stalking with sexual nature or intent")
        and not _contains_label(cases, "type", "Sexual exploitation / trafficking-related sexual abuse")
    ):
        _remove_label(primary, "category", "Physical")

    if notes:
        existing_notes = classification.get("classification_notes", "")
        suffix = " Deterministic checks added: " + ", ".join(notes) + "."
        classification["classification_notes"] = (existing_notes + suffix).strip()

    return classification


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

        classification = normalize_classification(
            classification_future.result(),
            processed_text,
        )
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
