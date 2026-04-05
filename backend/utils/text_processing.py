import json
import re
from pathlib import Path


CONCEPT_TYPE_KEYWORDS = {
    "Definition": [
        "means",
        "is a",
        "refers to",
        "defined as",
        "definition",
        "we define",
    ],
    "Algorithm": [
        "algorithm",
        "procedure",
        "compute",
        "recursion",
        "step 1",
        "dynamic programming",
        "decoding",
        "training loop",
    ],
    "Example": [
        "for example",
        "example",
        "consider the sentence",
        "let us consider",
        "illustration",
    ],
    "Theory": [
        "theorem",
        "proof",
        "intuition",
        "assume that",
        "probability of",
        "formal",
        "distribution",
        "likelihood",
    ],
}


def clean_text(text: str) -> str:
    text = text.strip()
    text = re.sub(r"\s+", " ", text)
    text = re.sub(r"[^\w\s\-.,;:!?()/]", "", text)
    return text


def normalize_label(value: str) -> str:
    return clean_text(value).strip()


def make_snippet(content: str, max_chars: int = 200) -> str:
    content = clean_text(content)
    if len(content) <= max_chars:
        return content
    cut = content[:max_chars].rsplit(" ", 1)[0]
    return cut + "..."


def load_json_data(path: str) -> list[dict]:
    data_path = Path(path)
    if not data_path.exists():
        raise FileNotFoundError(f"Data file not found: {path}")
    with open(data_path, "r", encoding="utf-8") as f:
        data = json.load(f)
    if not isinstance(data, list):
        raise ValueError("JSON data must be a list of documents")
    return data


def infer_concept_type(doc: dict) -> str:
    existing = normalize_label(doc.get("concept_type", ""))
    if existing:
        return existing

    haystack = " ".join(
        [
            doc.get("title", ""),
            doc.get("topic", ""),
            " ".join(doc.get("tags", [])),
            doc.get("content", "")[:1800],
        ]
    ).lower()

    title = clean_text(doc.get("title", "")).lower()

    if title.startswith(("what is ", "what are ")) or any(
        phrase in title for phrase in [" definition", " overview", " introduction"]
    ):
        return "Definition"
    if any(phrase in title for phrase in ["algorithm", "decoding", "training", "parsing"]):
        return "Algorithm"
    if any(phrase in title for phrase in ["example", "examples", "case study"]):
        return "Example"

    for concept_type, keywords in CONCEPT_TYPE_KEYWORDS.items():
        if any(keyword in haystack for keyword in keywords):
            return concept_type

    return "Theory"


def preprocess_document(doc: dict) -> dict:
    tags = [normalize_label(t) for t in doc.get("tags", []) if normalize_label(t)]

    return {
        "id": doc.get("id", ""),
        "title": clean_text(doc.get("title", "")),
        "chapter": normalize_label(doc.get("chapter", "")),
        "topic": normalize_label(doc.get("topic", "")),
        "difficulty": normalize_label(doc.get("difficulty", "")),
        "concept_type": infer_concept_type(doc),
        "content": clean_text(doc.get("content", "")),
        "snippet": doc.get("snippet") or make_snippet(doc.get("content", "")),
        "tags": tags,
    }
