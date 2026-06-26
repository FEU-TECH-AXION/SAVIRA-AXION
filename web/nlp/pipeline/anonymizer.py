import re

from presidio_analyzer import AnalyzerEngine
from presidio_anonymizer import AnonymizerEngine
from presidio_anonymizer.entities import OperatorConfig
from presidio_analyzer import Pattern, PatternRecognizer

# ── Initialize Presidio engines ───────────────────────────────────
from presidio_analyzer.nlp_engine import NlpEngineProvider

configuration = {
    "nlp_engine_name": "spacy",
    "models": [{"lang_code": "en", "model_name": "en_core_web_sm"}],
}
provider = NlpEngineProvider(nlp_configuration=configuration)
nlp_engine = provider.create_engine()

analyzer = AnalyzerEngine(nlp_engine=nlp_engine)

anonymizer = AnonymizerEngine()

# ── PII entity types to detect and mask ──────────────────────────
PII_ENTITIES = [
    "PERSON",           # names
    "PHONE_NUMBER",     # contact numbers
    "EMAIL_ADDRESS",    # email addresses
    "LOCATION",         # addresses, cities, places
    # "DATE_TIME",        # specific dates that could identify someone
    "URL",              # website links
    "IP_ADDRESS",       # IP addresses
    "CREDIT_CARD",      # financial info
    "IBAN_CODE",        # bank accounts
    "NRP",              # nationality, religion, political group
]

FILIPINO_FIRST_NAMES_FEMALE = [
    # PSA Top Baby Girl Names (2017–2023)
    "Althea", "Angel", "Samantha", "Princess", "Nathalie",
    "Sofia", "Sophia", "Angela", "Andrea", "Chloe",
    "Jasmine", "Alexa", "Ashley", "Janella", "Athena",
    "Ayesha", "Zia", "Zoey",
    # Classic / Traditional Filipino female names
    "Maria", "Rosa", "Ana", "Luisa", "Teresa",
    "Carmen", "Nena", "Ligaya", "Imelda", "Corazon",
    "Remedios", "Lourdes", "Rowena", "Maribel", "Maricel",
    "Maricris", "Marites", "Marilyn", "Rosario", "Rosalie",
    "Rosalinda", "Flordeliza", "Florencia", "Paz", "Fe",
    "Esperanza", "Caridad", "Milagros", "Adoracion", "Asuncion",
    "Concepcion", "Presentacion", "Encarnacion", "Visitacion",
    "Purificacion", "Soledad", "Gloria", "Felicidad", "Teresita",
    "Pilita", "Erlinda", "Natividad", "Leonor", "Elvira",
    "Divina", "Diwata", "Mutya", "Perla", "Stella",
    "Belen", "Eden", "Aileen", "Aiza", "Alicia",
    "Anabel", "Analiza", "Analyn", "Arlyn", "Arlene",
    "Armida", "Baby", "Babylyn", "Benilda", "Berna",
    "Bernarda", "Carla", "Carmela", "Charina", "Cherry",
    "Christine", "Christy", "Cynthia", "Daisy", "Dana",
    "Danielle", "Darlene", "Dolores", "Edna", "Elaine",
    "Elena", "Elisa", "Eliza", "Elizabeth", "Ella",
    "Ellen", "Emily", "Emma", "Erika", "Ester",
    "Eva", "Evelyn", "Fatima", "Felisa", "Gemma",
    "Grace", "Hannah", "Helen", "Irene", "Isabel",
    "Isabelita", "Jacqueline", "Jennifer", "Jessica", "Joanna",
    "Josephine", "Joyce", "Juanita", "Julie", "Juliet",
    "Karen", "Kathleen", "Katrina", "Lea", "Leah",
    "Leni", "Leticia", "Lilia", "Linda", "Lisa",
    "Liza", "Lorena", "Lorraine", "Lucila", "Luz",
    "Lydia", "Mae", "Magdalena", "Mara", "Margarita",
    "Marina", "Mary", "May", "Mercedes", "Michelle",
    "Mila", "Mildred", "Monica", "Myra", "Nilda",
    "Nina", "Nora", "Norma", "Ofelia", "Olive",
    "Olivia", "Patricia", "Paulita", "Rachel", "Rebecca",
    "Regina", "Rizalina", "Ruby", "Ruth", "Sandra",
    "Sarah", "Sharon", "Sheila", "Shirley", "Sonia",
    "Susan", "Susana", "Thelma", "Vanessa", "Veronica",
    "Victoria", "Virginia", "Vivian", "Wilhelmina", "Yolanda",
    "Zenaida",
]

FILIPINO_FIRST_NAMES_MALE = [
    # PSA Top Baby Boy Names (2017–2023)
    "Nathaniel", "Jacob", "Gabriel", "Nathan", "James",
    "Ethan", "Angelo", "Ezekiel", "Joshua", "Matthew",
    "Kyle", "Daniel", "Christian", "Liam", "Jayden",
    "Noah", "Zion",
    # Classic / Traditional Filipino male names
    "Juan", "Jose", "Pedro", "Carlos", "Manuel",
    "Antonio", "Francisco", "Miguel", "Ramon", "Ricardo",
    "Roberto", "Eduardo", "Ernesto", "Fernando", "Florentino",
    "Gregorio", "Guillermo", "Hernan", "Ignacio", "Isidro",
    "Jaime", "Joaquin", "Jorge", "Leonardo", "Lorenzo",
    "Luis", "Marcelo", "Mario", "Marcelino", "Maximino",
    "Modesto", "Nicolas", "Pablo", "Patricio", "Rafael",
    "Renato", "Rodrigo", "Rodolfo", "Rolando", "Romulo",
    "Salvador", "Samson", "Sergio", "Sixto", "Vicente",
    # Filipino nicknames / common call names
    "Bing", "Bong", "Boy", "Carding", "Dado",
    "Dodong", "Dodo", "Dong", "Eddie", "Efren",
    "Emil", "Erick", "Ernie", "Gary", "Gene",
    "George", "Gil", "Gino", "Greg", "Jay",
    "Jeff", "Jerry", "Jimmy", "Joel", "Joey",
    "Johnny", "Jon", "Jonjon", "Jomar", "Jun",
    "Junior", "Junjun", "Lando", "Leo", "Lito",
    "Louie", "Luke", "Manny", "Marco", "Mark",
    "Martin", "Max", "Mike", "Nelson", "Nestor",
    "Noel", "Nonoy", "Norman", "Obet", "Pong",
    "Rey", "Rico", "Ricky", "Roger", "Romy",
    "Ronnie", "Ruel", "Ryan", "Sam", "Sandy",
    "Sonny", "Teng", "Tito", "Toto", "Vic",
    "Vincent", "Willy", "Willie",
]

# ============================================================
# Filipino Last Names (PSA / Forebears / familysearch data)
# ============================================================

FILIPINO_LAST_NAMES = [
    # Top surnames by population
    "Dela Cruz", "De la Cruz", "Garcia", "Reyes", "Ramos",
    "Mendoza", "Santos", "Flores", "Del Rosario", "Bautista",
    "Villanueva", "Fernandez", "Cruz", "Gonzales", "Lopez",
    "Perez", "Castillo", "Francisco", "Rivera", "Aquino",
    "Castro", "Sanchez", "Torres", "De Leon", "Domingo",
    "Martinez", "Rodriguez", "Santiago", "Soriano", "Delos Santos",
    "Diaz", "Hernandez", "Tolentino", "Valdez", "Ocampo",
    "Lim", "Tan", "Sy", "Co", "Chua",
    "Go", "Uy", "Yu", "Ang", "Ong",
    # More common surnames
    "Aguilar", "Alcantara", "Alegre", "Alipio", "Alvarado",
    "Alvarez", "Ambrosio", "Andres", "Aragon", "Arceo",
    "Arellano", "Arias", "Arroyo", "Austria", "Avila",
    "Bacalso", "Balbuena", "Baluyot", "Barrientos", "Bartolome",
    "Belen", "Benitez", "Blanco", "Borja", "Briones",
    "Buenaventura", "Bustamante", "Caballero", "Cabrera", "Cadiz",
    "Calixto", "Calvo", "Camara", "Capili", "Cardenas",
    "Carmona", "Carpio", "Casas", "Casimiro", "Castaneda",
    "Catalan", "Cayabyab", "Celestino", "Cendana", "Cervantes",
    "Chavez", "Chua", "Clemente", "Concepcion", "Constantino",
    "Corpuz", "Cortez", "Cuevas", "Cunanan", "Dalisay",
    "David", "De Guzman", "De Jesus", "Dela Pena", "Delos Reyes",
    "Dichoso", "Dimalanta", "Dimaano", "Dionisio", "Dizon",
    "Drilon", "Dueñas", "Dumlao", "Duran", "Encarnacion",
    "Enriquez", "Escalante", "Escueta", "Espino", "Espiritu",
    "Estrada", "Evangelista", "Fajardo", "Felipe", "Ferrer",
    "Figueroa", "Fronda", "Fuentes", "Galang", "Gallardo",
    "Gallo", "Gatchalian", "Gatdula", "Gil", "Gomez",
    "Guevarra", "Guinto", "Gutierrez", "Guzman", "Herrera",
    "Hidalgo", "Ibarra", "Ilagan", "Imperial", "Jacinto",
    "Javier", "Jimenez", "Labrador", "Lacson", "Lagman",
    "Laguna", "Lara", "Laurel", "Lazaro", "Legarda",
    "Legazpi", "Lim", "Llanes", "Lloren", "Lobaton",
    "Luna", "Macapagal", "Macaraeg", "Macasaet", "Magno",
    "Magsaysay", "Mallari", "Malvar", "Manalo", "Manaloto",
    "Manansala", "Mangubat", "Manzano", "Maranan", "Marcos",
    "Marin", "Marasigan", "Marquez", "Mateo", "Medina",
    "Mercado", "Miranda", "Molina", "Montano", "Montenegro",
    "Montoya", "Moral", "Morales", "Moreno", "Moran",
    "Muñoz", "Navarro", "Nicolas", "Nieva", "Nisperos",
    "Natividad", "Obejas", "Obispo", "Ocfemia", "Olivares",
    "Oliveros", "Ong", "Ordonez", "Ortega", "Ortiz",
    "Padilla", "Palma", "Pangan", "Panganiban", "Pascual",
    "Pastor", "Paterno", "Pena", "Peralta", "Pimentel",
    "Pineda", "Policarpio", "Ponce", "Puno", "Quezon",
    "Quiambao", "Quimpo", "Quintos", "Quirino", "Ramirez",
    "Reroma", "Resurreccion", "Rico", "Rizal", "Robles",
    "Rojas", "Romero", "Rosales", "Roxas", "Ruiz",
    "Sabado", "Salazar", "Salcedo", "Salgado", "Salonga",
    "San Diego", "San Juan", "Sandoval", "Santa Maria", "Santillan",
    "Sarmiento", "Serrano", "Silva", "Sison", "Solis",
    "Suarez", "Sumulong", "Tablante", "Tagalog", "Tamayo",
    "Tinio", "Trinidad", "Tuazon", "Ty", "Umali",
    "Valdvia", "Valencia", "Valenzuela", "Vargas", "Velasco",
    "Velasquez", "Vera", "Vergara", "Victorino", "Villalobos",
    "Villanueva", "Villar", "Villarin", "Villaruel", "Villegas",
    "Vista", "Yacat", "Yamzon", "Yap", "Ybañez",
    "Yuchengco", "Zamora", "Zobel",
]

# ── FILIPINO NAMES ────────────────────────────────────────────────────────
FILIPINO_NAMES = (
    FILIPINO_FIRST_NAMES_FEMALE
    + FILIPINO_FIRST_NAMES_MALE
    + FILIPINO_LAST_NAMES
)

FILIPINO_NAMES_RECOGNIZER = PatternRecognizer(
        supported_entity="PERSON",
        deny_list=FILIPINO_NAMES
)

# Matches: "si Juan", "ni Maria", "kay Pedro" (Filipino name markers)
FILIPINO_NAME_PATTERN = Pattern(
    name="FILIPINO_NAME_PATTERN",
    regex=r"\b(si|ni|kay|kina|nina)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)",
    score=0.85
)

# Matches titles + names: "Ate Gloria", "Kuya Ben", "Aling Nena", "Mang Tomas"
FILIPINO_TITLE_NAME_PATTERN = Pattern(
    name="FILIPINO_TITLE_NAME_PATTERN",
    regex=r"\b(Ate|Kuya|Aling|Mang|Lola|Lolo|Tita|Tito|Dok|Ser|Ma\'am)\s+([A-Z][a-z]+)",
    score=0.90
)

FILIPINO_PATTERN_RECOGNIZER = PatternRecognizer(
    supported_entity="PERSON",
    patterns=[FILIPINO_NAME_PATTERN, FILIPINO_TITLE_NAME_PATTERN]
)

# Catches any two consecutive capitalized words as a potential name
CAPITALIZED_NAME_PATTERN = Pattern(
    name="capitalized_name_pattern",
    regex=r"\b(Professor|Prof|Dr|Mr|Ms|Mrs|Sir|Ma'am|Ate|Kuya|Aling|Mang)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\b",
    score=0.85
)

CAPITALIZED_NAME_RECOGNIZER = PatternRecognizer(
    supported_entity="PERSON",
    patterns=[CAPITALIZED_NAME_PATTERN],
    context=["name", "pangalan", "si", "ni", "kay", "sent by", "from", "by"]
)

analyzer.registry.add_recognizer(CAPITALIZED_NAME_RECOGNIZER)
analyzer.registry.add_recognizer(FILIPINO_NAMES_RECOGNIZER)
analyzer.registry.add_recognizer(FILIPINO_PATTERN_RECOGNIZER)

# ── Replacement labels ────────────────────────────────────────────
# Maps each entity type to a readable placeholder
REPLACEMENTS = {
    "PERSON":        OperatorConfig("replace", {"new_value": "[PERSON]"}),
    "PHONE_NUMBER":  OperatorConfig("replace", {"new_value": "[PHONE_NUMBER]"}),
    "EMAIL_ADDRESS": OperatorConfig("replace", {"new_value": "[EMAIL]"}),
    "LOCATION":      OperatorConfig("replace", {"new_value": "[LOCATION]"}),
    # "DATE_TIME":     OperatorConfig("replace", {"new_value": "[DATE]"}),
    "URL":           OperatorConfig("replace", {"new_value": "[URL]"}),
    "IP_ADDRESS":    OperatorConfig("replace", {"new_value": "[IP_ADDRESS]"}),
    "CREDIT_CARD":   OperatorConfig("replace", {"new_value": "[FINANCIAL_INFO]"}),
    "IBAN_CODE":     OperatorConfig("replace", {"new_value": "[FINANCIAL_INFO]"}),
    "NRP":           OperatorConfig("replace", {"new_value": "[IDENTITY_GROUP]"}),
}

def extract_names_from_quotes(text: str) -> str:
    """
    Temporarily un-quote embedded message transcripts so Presidio
    can see names inside them clearly.
    """
    # Remove surrounding single or double quotes from long embedded strings
    text = re.sub(r"'([^']{20,})'", r"\1", text)
    text = re.sub(r'"([^"]{20,})"', r"\1", text)
    return text

# ── Filipino text normalizer ──────────────────────────────────────
def preprocess_filipino(text: str) -> str:
    """Normalize Filipino name markers so Presidio regex can detect them."""
    replacements = {
        r"\bsi\b":   "si",    # name marker
        r"\bni\b":   "ni",    # possessive marker
        r"\bkay\b":  "kay",   # indirect marker
        r"\bkina\b": "kina",  # plural name marker
    }
    for pattern, replacement in replacements.items():
        text = re.sub(pattern, replacement, text, flags=re.IGNORECASE)
    return text

# ── Filipino text anonymizer ──────────────────────────────────────
def anonymize(text, language="en"):
    if not text or not text.strip():
        return {
            "anonymized_text": text,
            "detected_pii":    [],
        }

    # Step 0a — Remove quotes around embedded transcripts
    text = extract_names_from_quotes(text)   # ← ADD

    # Step 0b — Normalize Filipino name markers
    text = preprocess_filipino(text)

    # Step 1 — Detect PII
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

