"""
build_dataset.py
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Reads the Jurafsky & Manning textbook PDF, extracts all
chapters and sections, builds a structured JSON dataset,
and indexes everything into Elasticsearch automatically.

Usage:
    python build_dataset.py --pdf path/to/ed3book.pdf
    python build_dataset.py --pdf path/to/ed3book.pdf --index   # also push to ES
    python build_dataset.py --pdf path/to/ed3book.pdf --preview # show extracted data only
"""

import re
import json
import uuid
import argparse
import logging
from pathlib import Path
from dataclasses import dataclass, asdict, field

import pdfplumber

logging.basicConfig(level=logging.INFO, format="%(levelname)s | %(message)s")
log = logging.getLogger(__name__)


# ─── Data model ──────────────────────────────────────────────────────────────

@dataclass
class Section:
    id: str
    title: str
    chapter: str
    chapter_num: int
    section_num: str        # e.g. "3.2"
    topic: str
    difficulty: str
    content: str
    snippet: str
    tags: list[str] = field(default_factory=list)


# ─── Chapter patterns for Jurafsky & Manning ─────────────────────────────────

# Matches: "2 Regular Expressions, Text Normalization, Edit Distance"
CHAPTER_HEADING = re.compile(
    r"^(\d{1,2})\s{1,4}([A-Z][A-Za-z ,\-:&'/]+)$"
)

# Matches: "2.1 Regular Expressions"  or  "2.1.3 Basic Regular Expressions"
SECTION_HEADING = re.compile(
    r"^(\d{1,2}\.\d{1,2}(?:\.\d{1,2})?)\s{1,4}([\(A-Z][A-Za-z ,\-:&'/()]+)$"
)

# Skip pages that are mostly references / exercises / index
SKIP_PATTERNS = re.compile(
    r"(Bibliographical and Historical Notes|Exercises|Bibliography"
    r"|References|Index|Contents|Preface|Acknowledgments)",
    re.I,
)

# NLP keyword vocabulary for auto-tagging
NLP_KEYWORDS: dict[str, list[str]] = {
    "Language Models":     ["n-gram", "ngram", "language model", "perplexity", "smoothing", "kneser", "laplace"],
    "Sequence Labeling":   ["pos tagging", "part-of-speech", "ner", "named entity", "bio tag", "sequence label", "hmm", "hidden markov", "viterbi", "crf"],
    "Word Embeddings":     ["word2vec", "embedding", "glove", "fasttext", "word vector", "semantic space", "tfidf", "tf-idf", "distributional"],
    "Deep Learning":       ["neural", "lstm", "rnn", "recurrent", "backpropagation", "gradient", "feedforward", "activation"],
    "Transformers":        ["transformer", "self-attention", "multi-head", "bert", "gpt", "positional encoding", "attention mechanism"],
    "Pretrained Models":   ["pretraining", "fine-tuning", "bert", "gpt", "masked language", "transfer learning", "llm"],
    "Parsing":             ["parsing", "parse tree", "cfg", "grammar", "constituency", "dependency", "cyk", "earley"],
    "Semantics":           ["semantic", "meaning", "wordnet", "frame", "semantic role", "framenet", "propbank"],
    "Machine Translation": ["translation", "mt", "bleu", "alignment", "parallel corpus", "encoder decoder"],
    "Text Classification": ["classification", "naive bayes", "logistic regression", "sentiment", "spam", "bag of words"],
    "Information Retrieval": ["retrieval", "tf-idf", "bm25", "inverted index", "ranking", "query"],
    "Dialogue":            ["dialogue", "chatbot", "intent", "slot", "conversation"],
    "Summarization":       ["summarization", "summarize", "rouge", "extractive", "abstractive"],
    "NLP Basics":          ["tokenization", "regular expression", "stemming", "lemmatization", "edit distance", "normalization"],
    "Probabilistic":       ["probability", "bayesian", "markov", "hmm", "em algorithm", "forward algorithm"],
}

DIFFICULTY_MAP: dict[int, str] = {
    **{i: "Beginner"     for i in range(1,  5)},
    **{i: "Intermediate" for i in range(5,  11)},
    **{i: "Advanced"     for i in range(11, 30)},
}

TOPIC_MAP: dict[int, str] = {
    1:  "Introduction",
    2:  "Text Processing",
    3:  "Language Models",
    4:  "Text Classification",
    5:  "Text Classification",
    6:  "Word Embeddings",
    7:  "Neural Networks",
    8:  "Sequence Labeling",
    9:  "Sequence Labeling",
    10: "Transformers",
    11: "Pretrained Models",
    12: "Parsing",
    13: "Parsing",
    14: "Semantics",
    15: "Discourse",
    16: "Information Extraction",
    17: "Machine Translation",
    18: "Information Retrieval",
    19: "Dialogue",
    20: "Summarization",
}


# ─── Text cleaning ────────────────────────────────────────────────────────────

def clean_line(line: str) -> str:
    line = line.strip()
    # Remove page number artifacts like "42" alone on a line
    if re.fullmatch(r"\d{1,4}", line):
        return ""
    # Remove header/footer repetitions
    if re.search(r"chapter \d|jurafsky|martin|draft", line, re.I) and len(line) < 60:
        return ""
    return line


def clean_content(text: str) -> str:
    lines = [clean_line(l) for l in text.splitlines()]
    lines = [l for l in lines if l]
    # Collapse multiple blanks
    out, prev_blank = [], False
    for l in lines:
        if l == "":
            if not prev_blank:
                out.append(l)
            prev_blank = True
        else:
            out.append(l)
            prev_blank = False
    return " ".join(out).strip()


def make_snippet(text: str, max_chars: int = 220) -> str:
    text = re.sub(r"\s+", " ", text).strip()
    if len(text) <= max_chars:
        return text
    return text[:max_chars].rsplit(" ", 1)[0] + "…"


# ─── Auto-tagging ─────────────────────────────────────────────────────────────

def extract_tags(title: str, content: str) -> list[str]:
    haystack = (title + " " + content).lower()
    tags = set()
    for tag, keywords in NLP_KEYWORDS.items():
        if any(kw in haystack for kw in keywords):
            tags.add(tag)
    # Add specific term tags from title
    for word in re.findall(r"[A-Z][A-Za-z0-9\-]+", title):
        if len(word) > 3:
            tags.add(word)
    return sorted(tags)[:8]      # cap at 8 tags


# ─── PDF Extraction ───────────────────────────────────────────────────────────

def extract_pages(pdf_path: str) -> list[tuple[int, str]]:
    """Return list of (page_number, text) tuples."""
    pages = []
    with pdfplumber.open(pdf_path) as pdf:
        log.info("PDF has %d pages.", len(pdf.pages))
        for i, page in enumerate(pdf.pages, start=1):
            try:
                text = page.extract_text(x_tolerance=2, y_tolerance=3) or ""
                pages.append((i, text))
            except Exception as e:
                log.warning("Failed to extract page %d: %s", i, e)
    return pages


def parse_structure(pages: list[tuple[int, str]]) -> list[Section]:
    """
    Walk through each line of every page and detect chapter/section headings.
    Accumulates content until the next heading is found.
    """
    sections: list[Section] = []

    current_chapter_num  = 0
    current_chapter_name = "Introduction"
    current_section_num  = ""
    current_section_name = ""
    current_content_lines: list[str] = []

    def flush(chap_num, chap_name, sec_num, sec_name, lines):
        """Save accumulated content as a Section."""
        if not sec_name or len(lines) < 5:
            return

        content = clean_content("\n".join(lines))
        if len(content) < 80:           # skip tiny fragments
            return

        sec_id = f"ch{chap_num}-{re.sub(r'[^a-z0-9]', '-', sec_name.lower())[:40]}"
        sec_id = re.sub(r"-+", "-", sec_id).strip("-")

        section = Section(
            id          = sec_id,
            title       = sec_name.strip(),
            chapter     = f"Chapter {chap_num}" if chap_num else chap_name,
            chapter_num = chap_num,
            section_num = sec_num,
            topic       = TOPIC_MAP.get(chap_num, "NLP"),
            difficulty  = DIFFICULTY_MAP.get(chap_num, "Intermediate"),
            content     = content,
            snippet     = make_snippet(content),
            tags        = extract_tags(sec_name, content),
        )
        sections.append(section)

    for page_num, raw_text in pages:
        if not raw_text:
            continue

        for raw_line in raw_text.splitlines():
            line = raw_line.strip()

            # Skip reference/exercise pages
            if SKIP_PATTERNS.search(line) and len(line) < 60:
                continue

            # Detect chapter heading
            ch_match = CHAPTER_HEADING.match(line)
            if ch_match:
                # Flush previous section
                flush(current_chapter_num, current_chapter_name,
                      current_section_num, current_section_name, current_content_lines)
                current_content_lines = []

                current_chapter_num  = int(ch_match.group(1))
                current_chapter_name = ch_match.group(2).strip()
                current_section_num  = str(current_chapter_num)
                current_section_name = current_chapter_name
                continue

            # Detect section heading  (e.g. "3.1 N-Grams")
            sec_match = SECTION_HEADING.match(line)
            if sec_match:
                flush(current_chapter_num, current_chapter_name,
                      current_section_num, current_section_name, current_content_lines)
                current_content_lines = []

                current_section_num  = sec_match.group(1)
                current_section_name = sec_match.group(2).strip()
                continue

            # Accumulate content
            cleaned = clean_line(line)
            if cleaned:
                current_content_lines.append(cleaned)

    # Flush final section
    flush(current_chapter_num, current_chapter_name,
          current_section_num, current_section_name, current_content_lines)

    return sections


# ─── Deduplication ───────────────────────────────────────────────────────────

def deduplicate(sections: list[Section]) -> list[Section]:
    """Remove duplicate section IDs (keep first occurrence)."""
    seen, out = set(), []
    for s in sections:
        if s.id not in seen:
            seen.add(s.id)
            out.append(s)
    return out


# ─── Save JSON ────────────────────────────────────────────────────────────────

def save_dataset(sections: list[Section], out_path: str) -> None:
    data = [asdict(s) for s in sections]
    Path(out_path).parent.mkdir(parents=True, exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    log.info("Saved %d sections to %s", len(data), out_path)


# ─── Elasticsearch indexing ───────────────────────────────────────────────────

def push_to_elasticsearch(sections: list[Section]) -> dict:
    """Index the extracted sections directly into Elasticsearch."""
    import sys
    sys.path.insert(0, str(Path(__file__).parent))

    from elastic.index import get_es_client, create_index
    from utils.config import settings

    es = get_es_client()
    create_index(es, force=True)

    operations = []
    for s in sections:
        doc = asdict(s)
        operations.append({"index": {"_index": settings.es_index, "_id": doc["id"]}})
        operations.append(doc)

    response = es.bulk(operations=operations, refresh=True)
    indexed = sum(1 for item in response["items"] if item["index"]["result"] in ("created", "updated"))
    failed  = sum(1 for item in response["items"] if "error" in item["index"])

    log.info("Indexed %d | Failed %d", indexed, failed)
    return {"indexed": indexed, "failed": failed}


# ─── CLI ──────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(
        description="Extract Jurafsky & Manning textbook → JSON → Elasticsearch"
    )
    parser.add_argument("--pdf",     required=True, help="Path to ed3book.pdf")
    parser.add_argument("--out",     default="data/textbook.json", help="Output JSON path")
    parser.add_argument("--index",   action="store_true", help="Push to Elasticsearch after extraction")
    parser.add_argument("--preview", action="store_true", help="Print first 5 sections and exit")
    parser.add_argument("--min-words", type=int, default=30, help="Min words per section (default 30)")
    args = parser.parse_args()

    if not Path(args.pdf).exists():
        log.error("PDF not found: %s", args.pdf)
        return

    print(f"\n{'─'*55}")
    print("  NLP Search Engine — PDF Dataset Builder")
    print(f"{'─'*55}")
    print(f"  Input  : {args.pdf}")
    print(f"  Output : {args.out}")
    print(f"  Index  : {args.index}")
    print(f"{'─'*55}\n")

    # 1. Extract raw pages
    log.info("Step 1/4 — Extracting pages from PDF…")
    pages = extract_pages(args.pdf)

    # 2. Parse structure
    log.info("Step 2/4 — Detecting chapters and sections…")
    sections = parse_structure(pages)
    sections = deduplicate(sections)

    # 3. Filter very short sections
    before = len(sections)
    sections = [s for s in sections if len(s.content.split()) >= args.min_words]
    log.info("Step 3/4 — Filtered %d short sections. Kept %d/%d sections.",
             before - len(sections), len(sections), before)

    if args.preview:
        print("\n── Preview: first 5 extracted sections ──\n")
        for s in sections[:5]:
            print(f"  [{s.chapter}] {s.section_num} — {s.title}")
            print(f"  Tags    : {s.tags}")
            print(f"  Snippet : {s.snippet[:120]}…")
            print()
        return

    # 4. Save JSON
    log.info("Step 4/4 — Saving dataset to %s…", args.out)
    save_dataset(sections, args.out)

    # 5. Index into ES (optional)
    if args.index:
        log.info("Indexing into Elasticsearch…")
        try:
            result = push_to_elasticsearch(sections)
            print(f"\n✅  Done! Indexed {result['indexed']} sections into Elasticsearch.")
        except Exception as e:
            log.error("Elasticsearch indexing failed: %s", e)
            print("⚠️  Dataset saved to JSON but ES indexing failed.")
            print("    Run:  python ingest.py  to retry indexing later.")
    else:
        print(f"\n✅  Done! {len(sections)} sections saved to {args.out}")
        print("    To index into Elasticsearch, run:")
        print(f"    python build_dataset.py --pdf {args.pdf} --index")
        print("    or:")
        print("    python ingest.py")


if __name__ == "__main__":
    main()
