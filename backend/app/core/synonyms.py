import re
import unicodedata
from typing import Set, Dict, List

def strip_accents(text: str) -> str:
    """Removes diacritics/accents for robust Spanish/accent-insensitive keyword matching."""
    return "".join(c for c in unicodedata.normalize("NFD", text) if unicodedata.category(c) != "Mn")

# Dictionary of technical synonyms and standard abbreviations
TECH_SYNONYMS: Dict[str, Set[str]] = {
    "kubernetes": {"k8s", "kubernetes", "kube"},
    "postgresql": {"postgres", "postgresql", "psql"},
    "javascript": {"js", "javascript", "ecmascript"},
    "typescript": {"ts", "typescript"},
    "python": {"py", "python"},
    "react": {"reactjs", "react", "react.js"},
    "node": {"nodejs", "node.js", "node"},
    "spring": {"spring boot", "springboot", "spring", "spring framework"},
    "docker": {"docker", "contenedores", "containers", "containerization"},
    "aws": {"aws", "amazon web services"},
    "gcp": {"gcp", "google cloud platform", "google cloud"},
    "azure": {"azure", "microsoft azure"},
    "ci/cd": {"ci/cd", "ci-cd", "ci", "cd", "continuous integration", "continuous delivery", "integracion continua"},
    "rest": {"rest", "restful", "api rest", "apis rest", "rest api", "rest apis"},
    "sql": {"sql", "consultas sql", "t-sql", "pl/sql"},
    "nosql": {"nosql", "non-relational", "no relacional"},
    "mongodb": {"mongo", "mongodb"},
    "machine learning": {"ml", "machine learning", "aprendizaje automatico"},
    "deep learning": {"dl", "deep learning", "aprendizaje profundo"},
    "artificial intelligence": {"ai", "ia", "inteligencia artificial", "artificial intelligence"},
    "generative ai": {"genai", "ia generativa", "generative ai", "gen ai"},
    "llm": {"llm", "llms", "large language models", "modelos de lenguaje"},
    "dam": {"dam", "desarrollo de aplicaciones multiplataforma"},
    "daw": {"daw", "desarrollo de aplicaciones web"},
    "asir": {"asir", "administracion de sistemas informaticos en red"},
    "git": {"git", "control de versiones", "version control", "github", "gitlab"},
    "linux": {"linux", "gnu/linux", "ubuntu", "debian", "redhat", "centos", "bash"},
    "scrum": {"scrum", "agile", "metodologias agiles", "metodologia agil", "kanban"},
    "testing": {"testing", "test", "tests", "pruebas unitarias", "pytest", "unit testing", "jest"},
    "fastapi": {"fastapi", "fast api"},
    "redis": {"redis", "redis cache", "caching"},
    "poo": {"poo", "oop", "programacion orientada a objetos", "object oriented programming"},
    "microservices": {"microservices", "microservicios", "arquitectura de microservicios"},
}

# Reverse index: term -> canonical name
CANONICAL_INDEX: Dict[str, str] = {}
for canonical, aliases in TECH_SYNONYMS.items():
    for alias in aliases:
        CANONICAL_INDEX[strip_accents(alias.lower())] = canonical

def get_canonical(term: str) -> str:
    cleaned = strip_accents(term.lower().strip())
    return CANONICAL_INDEX.get(cleaned, cleaned)

def get_synonyms(term: str) -> Set[str]:
    canonical = get_canonical(term)
    return TECH_SYNONYMS.get(canonical, {term.lower().strip()})

def match_keyword_semantically(keyword: str, text: str) -> bool:
    """
    Checks whether a keyword or any of its synonyms exists in text with word boundary matching.
    Accent-insensitive.
    """
    text_norm = strip_accents(text.lower())
    synonyms = get_synonyms(keyword)

    for syn in synonyms:
        syn_norm = strip_accents(syn.lower())
        escaped = re.escape(syn_norm)
        # Handle cases with slash like ci/cd
        if "/" in escaped:
            pattern = rf"(?:^|\s|[.,;:\(\)]){escaped}(?:$|\s|[.,;:\(\)])"
        else:
            pattern = rf"(?:\b|_){escaped}(?:\b|_)"

        if re.search(pattern, text_norm):
            return True

    return False
