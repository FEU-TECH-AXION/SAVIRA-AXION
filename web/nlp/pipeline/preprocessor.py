import re
import spacy
import nltk
from nltk.corpus import stopwords
from spellchecker import SpellChecker
from langdetect import detect, LangDetectException

SPACY_MODEL = "xx_ent_wiki_sm"

# Load spaCy model
_nlp = None

def get_nlp():
    global _nlp
    if _nlp is None:
        _nlp = spacy.load(SPACY_MODEL)
    return _nlp

# Download NLTK data if not already downloaded
nltk.download("stopwords", quiet=True)
nltk.download("wordnet", quiet=True)
nltk.download("punkt", quiet=True)
nltk.download("punkt_tab", quiet=True)

# ── Custom stopword list ──────────────────────────────────────────
# Start with NLTK's standard English stopwords
BASE_STOPWORDS = set(stopwords.words("english"))

# Remove legally significant words so they are NOT filtered out
LEGAL_TERMS_TO_KEEP = {
    "forced", "force", "forcing",
    "minor", "minors",
    "threat", "threats", "threatened", "threatening",
    "weapon", "weapons",
    "consent", "consented", "consenting",
    "coercion", "coerced", "coerce",
    "victim", "victims",
    "assault", "assaulted",
    "abuse", "abused", "abusing",
    "violence", "violent",
    "harassment", "harassed", "harassing",
    "rape", "raped",
    "touched", "touching", "touch",
    "grooming", "groomed",
    "exploit", "exploited", "exploitation",
    "penetration", "penetrated",
    "against", "without",
    "no", "not", "never",
}

CUSTOM_STOPWORDS = BASE_STOPWORDS - LEGAL_TERMS_TO_KEEP

# ── Spell checker ─────────────────────────────────────────────────
_spell = None

def get_spell():
    global _spell
    if _spell is None:
        _spell = SpellChecker()
    return _spell

def detect_language(text):
    """Detect if text is English, Filipino, or mixed (Taglish)."""
    try:
        lang = detect(text)
        return lang  # 'en', 'tl', etc.
    except LangDetectException:
        return "unknown"

def normalize_text(text):
    """Convert to lowercase, remove special characters, fix spacing."""
    text = text.lower()
    text = re.sub(r"[^\w\s]", " ", text)   # remove punctuation
    text = re.sub(r"\s+", " ", text)        # remove extra whitespace
    text = text.strip()
    return text

def correct_spelling(text):
    """Correct spelling errors while preserving legal terms."""
    words = text.split()
    corrected = []
    for word in words:
        # Don't correct legal terms or short words
        if word in LEGAL_TERMS_TO_KEEP or len(word) <= 3:
            corrected.append(word)
        else:
            corrected.append(get_spell().correction(word) or word)
    return " ".join(corrected)

def tokenize_and_lemmatize(text):
    """Tokenize, remove stopwords, and lemmatize using spaCy."""
    doc = get_nlp()(text)
    tokens = []
    for token in doc:
        # Skip stopwords, punctuation, spaces, and very short tokens
        if (
            token.text in CUSTOM_STOPWORDS or
            token.is_punct or
            token.is_space or
            len(token.text) <= 1
        ):
            continue
        # The multilingual NER model may not include a lemmatizer, so keep text when lemma is unavailable.
        tokens.append(token.lemma_ if token.lemma_ and token.lemma_ != "-PRON-" else token.text)
    return tokens

def preprocess(text):
    """
    Full preprocessing pipeline:
    1. Language detection
    2. Text normalization
    3. Spelling correction
    4. Tokenization + stopword removal + lemmatization
    """
    if not text or not text.strip():
        return {
            "original": text,
            "language": "unknown",
            "processed_text": "",
            "tokens": [],
        }

    # Step 1 — Detect language
    language = detect_language(text)

    # Step 2 — Normalize
    normalized = normalize_text(text)

    # Step 3 — Correct spelling (English only — skip for Taglish)
    if language == "en":
        normalized = correct_spelling(normalized)

    # Step 4 — Tokenize, remove stopwords, lemmatize
    tokens = tokenize_and_lemmatize(normalized)

    # Rejoin tokens into processed text for the prompt
    processed_text = " ".join(tokens)

    return {
        "original":       text,
        "language":       language,
        "processed_text": processed_text,
        "tokens":         tokens,
    }
