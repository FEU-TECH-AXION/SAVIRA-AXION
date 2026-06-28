import json
from pipeline.groq_client import MAX_TOKENS, get_client, parse_json_response

MODEL = "llama-3.1-8b-instant"

CRITERIA = {
    "mission_alignment": {
        "weight": 0.30,
        "label": "Alignment with SASHA's Mission",
        "description": (
            "Does the applicant understand survivor-centered, "
            "gender-sensitive, and accountability-based work?"
        ),
    },
    "maturity_judgment": {
        "weight": 0.20,
        "label": "Maturity and Judgment",
        "description": (
            "Does the essay show discretion, empathy, and seriousness "
            "in handling sensitive matters?"
        ),
    },
    "commitment": {
        "weight": 0.20,
        "label": "Commitment and Reliability",
        "description": (
            "Does the applicant show realistic availability and "
            "willingness to do sustained work?"
        ),
    },
    "writing_clarity": {
        "weight": 0.15,
        "label": "Writing Clarity and Thoughtfulness",
        "description": (
            "Is the essay coherent, reflective, and understandable?"
        ),
    },
    "relevant_experience": {
        "weight": 0.15,
        "label": "Relevant Experience / Transferable Skills",
        "description": (
            "Advocacy, community work, peer support, writing, research, "
            "documentation, legal or psychosocial exposure."
        ),
    },
}


def build_essay_grading_prompt(processed_essay: str) -> str:
    criteria_block = "\n".join([
        f"- {key} ({int(meta['weight']*100)}% weight): {meta['label']}\n"
        f"  {meta['description']}"
        for key, meta in CRITERIA.items()
    ])

    return f"""You are a reviewing officer for SASHA, a civic service organization that helps people report sexual violence.

The organization is composed of approximately 80% women or members of the LGBTQ+ community, many of whom come from youth scouting organizations (BSP and GSP). You are evaluating a volunteer applicant's essay.

Your role is to assess the essay objectively and suggest a score for each criterion. These scores are SUGGESTIONS ONLY — the final decision remains with the human reviewing officer.

SCORING CRITERIA (rate each from 1 to 10):
{criteria_block}

ESSAY:
{processed_essay}

Instructions:
- Score each criterion from 1 (lowest) to 10 (highest)
- Provide a brief note (1-2 sentences) explaining each score
- Compute overall_score as the weighted average across all criteria (0-10 scale)
- overall_label: "Strong Applicant" if overall >= 7, "Needs Review" if >= 4, "Weak Applicant" if below 4
- List 2-4 specific strengths found in the essay
- List 2-4 specific concerns or gaps found in the essay
- Give recommendation_notes as 1-2 sentences of overall reasoning
- recommend_approve: true if overall_score >= 7, false otherwise

Respond ONLY with a valid JSON object, no explanation, no markdown, no extra text:
{{
  "scores": {{
    "mission_alignment":   <1-10>,
    "maturity_judgment":   <1-10>,
    "commitment":          <1-10>,
    "writing_clarity":     <1-10>,
    "relevant_experience": <1-10>
  }},
  "notes": {{
    "mission_alignment":   "...",
    "maturity_judgment":   "...",
    "commitment":          "...",
    "writing_clarity":     "...",
    "relevant_experience": "..."
  }},
  "overall_score":        <0.0-10.0>,
  "overall_label":        "Strong Applicant" | "Needs Review" | "Weak Applicant",
  "strengths":            ["...", "..."],
  "concerns":             ["...", "..."],
  "recommendation_notes": "...",
  "recommend_approve":    true | false
}}"""


def compute_weighted_total(scores: dict) -> float:
    """Compute weighted total from raw scores as a safeguard against Groq math errors."""
    total = 0.0
    for key, meta in CRITERIA.items():
        score = scores.get(key, 0)
        total += (score / 10) * meta["weight"] * 100
    return round(total, 2)


def grade_essay(processed_essay: str) -> dict:
    client = get_client()

    response = client.chat.completions.create(
        model=MODEL,
        messages=[{"role": "user", "content": build_essay_grading_prompt(processed_essay)}],
        temperature=0.2,
        max_tokens=MAX_TOKENS,
    )

    raw_text = response.choices[0].message.content.strip()
    result = parse_json_response(raw_text, "Essay grading")

    scores = result.get("scores", {})

    # Always recompute weighted total server-side
    essay_weighted_total = compute_weighted_total(scores)

    # Build the flat response shape that NLPEssayTab expects
    return {
        "model_used":              getattr(response, "model", None) or MODEL,

        # Scores
        "scores":                  scores,
        "notes":                   result.get("notes", {}),
        "essay_weighted_total":    essay_weighted_total,
        "essay_score_out_of_50":   round(essay_weighted_total / 2, 2),

        # NLPEssayTab fields
        "summary":                 result.get("recommendation_notes", ""),
        "overall_score":           result.get("overall_score", 0),
        "overall_label":           result.get("overall_label", ""),
        "dimensions": {
            "mission_alignment":   scores.get("mission_alignment", 0),
            "maturity_judgment":   scores.get("maturity_judgment", 0),
            "commitment":          scores.get("commitment", 0),
            "writing_clarity":     scores.get("writing_clarity", 0),
            "relevant_experience": scores.get("relevant_experience", 0),
        },
        "strengths":               result.get("strengths", []),
        "concerns":                result.get("concerns", []),
        "recommendation":          result.get("recommendation_notes", ""),
        "recommendation_notes":    result.get("recommendation_notes", ""),
        "recommend_approve":       result.get("recommend_approve", False),
    }
