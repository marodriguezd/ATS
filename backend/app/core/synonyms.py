"""Lexical alias/normalization engine for keyword matching.

Terminology is intentionally lexical, NOT semantic/NLP: aliases map
surface variants (abbreviations, punctuation, accents) to a canonical
form. ``RELATED`` covers a small set of genuinely adjacent terms and is
weighted lower than EXACT/ALIAS matches.

Precision rules enforced here:
  - ``Git`` and ``GitHub`` are DISTINCT canonicals (version control vs
    hosting platform). A resume mentioning only ``git`` does not earn an
    EXACT match for a ``github`` requirement (at most RELATED).
  - ``CI`` alone does not equal ``CI/CD``.
  - Short aliases (<=2 chars: js/ts/py/k8s...) only match on exact
    token boundaries to avoid false positives.
"""
import re
import unicodedata
from typing import Dict, Set, Tuple

def strip_accents(text: str) -> str:
    return "".join(c for c in unicodedata.normalize("NFD", text) if unicodedata.category(c) != "Mn")


def normalize_tech_token(text: str) -> str:
    t = strip_accents(text.lower().strip())
    t = t.replace("–", "-").replace("—", "-")
    t = re.sub(r"\s+", " ", t)
    # canonical punctuation variants
    t = t.replace("react.js", "reactjs").replace("react js", "reactjs")
    t = t.replace("node.js", "nodejs").replace("node js", "nodejs")
    t = t.replace("next.js", "nextjs").replace("next js", "nextjs")
    t = t.replace("ci-cd", "ci/cd")
    t = t.replace("restful apis", "rest api").replace("restful api", "rest api")
    t = t.replace("rest apis", "rest api")
    return t.strip(" .")


# canonical -> exact/alias surface forms (precision-first)
TECH_SYNONYMS: Dict[str, Set[str]] = {
    "kubernetes": {"kubernetes", "k8s", "kube"},
    "postgresql": {"postgresql", "postgres", "psql"},
    "javascript": {"javascript", "js", "ecmascript"},
    "typescript": {"typescript", "ts"},
    "python": {"python", "py"},
    "react": {"react", "reactjs", "react.js"},
    "node": {"node", "nodejs", "node.js"},
    "spring": {"spring boot", "springboot", "spring", "spring framework"},
    "docker": {"docker"},
    "aws": {"aws", "amazon web services"},
    "gcp": {"gcp", "google cloud platform", "google cloud"},
    "azure": {"azure", "microsoft azure"},
    "ci/cd": {"ci/cd", "ci-cd", "continuous integration", "continuous delivery"},
    "rest": {"rest", "rest api", "api rest", "apis rest", "restful"},
    "sql": {"sql"},
    "nosql": {"nosql"},
    "mongodb": {"mongodb", "mongo"},
    "machine learning": {"machine learning", "ml", "aprendizaje automatico"},
    "deep learning": {"deep learning", "dl", "aprendizaje profundo"},
    "artificial intelligence": {"artificial intelligence", "ai", "ia", "inteligencia artificial"},
    "generative ai": {"generative ai", "genai", "gen ai", "ia generativa"},
    "llm": {"llm", "llms", "large language models", "modelos de lenguaje"},
    "dam": {"dam", "desarrollo de aplicaciones multiplataforma"},
    "daw": {"daw", "desarrollo de aplicaciones web"},
    "git": {"git", "control de versiones", "version control"},
    "github": {"github"},
    "gitlab": {"gitlab"},
    "linux": {"linux", "gnu/linux", "ubuntu", "debian"},
    "bash": {"bash"},
    "scrum": {"scrum", "kanban"},
    "agile": {"agile", "metodologias agiles", "metodologia agil"},
    "testing": {"testing", "test", "tests", "pruebas unitarias", "pytest", "unit testing", "jest"},
    "fastapi": {"fastapi", "fast api"},
    "redis": {"redis"},
    "microservices": {"microservices", "microservicios"},
}

# Adjacent-but-not-equivalent canonicals (lower weight).
RELATED: Dict[str, Set[str]] = {
    "github": {"git"},
    "gitlab": {"git"},
    "ci/cd": {"ci", "cd"},
    "rest": {"graphql", "api"},
    "postgresql": {"sql", "mysql"},
}

CANONICAL_INDEX: Dict[str, str] = {}
for canonical, aliases in TECH_SYNONYMS.items():
    for alias in aliases:
        CANONICAL_INDEX[normalize_tech_token(alias)] = canonical

def get_canonical(term: str) -> str:
    return CANONICAL_INDEX.get(normalize_tech_token(term), normalize_tech_token(term))

def get_synonyms(term: str) -> Set[str]:
    canonical = get_canonical(term)
    return TECH_SYNONYMS.get(canonical, {term.lower().strip()})

def _token_present(syn_norm: str, text_norm: str) -> bool:
    # normalize separators so nodejs/node.js variants align
    norm_text = normalize_tech_token(text_norm)
    escaped = re.escape(normalize_tech_token(syn_norm))
    if "/" in escaped or " " in syn_norm.strip():
        return re.search(rf"(?:^|[\s.,;:\(\)]){escaped}(?:$|[\s.,;:\(\)])", norm_text) is not None
    # short tokens require strict boundaries (avoid 'ts' inside 'its')
    return re.search(rf"(?<![a-z0-9_]){escaped}(?![a-z0-9_])", norm_text) is not None

def match_keyword_semantically(keyword: str, text: str) -> bool:
    """Backwards-compatible boolean check (EXACT/ALIAS/NORMALIZED)."""
    cls, _ = classify_keyword_match(keyword, text)
    return cls in ("EXACT", "ALIAS", "NORMALIZED")

def classify_keyword_match(keyword: str, text: str) -> Tuple[str, str]:
    """Return (match_class, canonical). RELATED is deliberately weaker."""
    text_norm = strip_accents((text or "").lower())
    canonical = get_canonical(keyword)
    kw_norm = normalize_tech_token(keyword)
    # EXACT: canonical surface form present verbatim
    if _token_present(kw_norm, text_norm):
        if kw_norm == canonical or kw_norm in TECH_SYNONYMS.get(canonical, set()):
            # distinguish exact canonical vs alias
            if kw_norm == canonical:
                return "EXACT", canonical
            return "ALIAS", canonical
        return "NORMALIZED", canonical
    for syn in get_synonyms(keyword):
        if _token_present(normalize_tech_token(syn), text_norm):
            return "ALIAS", canonical
    # RELATED: adjacent canonical present
    for rel in RELATED.get(canonical, set()):
        if _token_present(normalize_tech_token(rel), text_norm):
            return "RELATED", canonical
    return "ABSENT", canonical
