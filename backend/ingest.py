"""
ingest.py — NLP Search Engine Data Ingestion
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
If data/textbook.json doesn't exist, pass --pdf to extract it first.

Usage:
    python ingest.py                             # index existing JSON
    python ingest.py --pdf path/to/ed3book.pdf  # extract PDF then index
    python ingest.py --force                     # wipe index and re-index
    python ingest.py --check                     # test connection only
"""
import argparse
import sys
import logging
from pathlib import Path

logging.basicConfig(level=logging.INFO, format="%(levelname)s | %(message)s")
log = logging.getLogger(__name__)
sys.path.insert(0, str(Path(__file__).parent))


def main():
    parser = argparse.ArgumentParser(description="NLP Search Engine — Ingestion")
    parser.add_argument("--pdf",   default=None,                 help="Extract this PDF before indexing")
    parser.add_argument("--data",  default=None,                  help="Path to JSON dataset")
    parser.add_argument("--force", action="store_true",          help="Delete and recreate ES index")
    parser.add_argument("--check", action="store_true",          help="Test ES connection only")
    args = parser.parse_args()

    from elastic.index import get_es_client, index_documents
    from utils.config import settings

    print(f"\n{'='*52}")
    print("  NLP Search Engine — Ingestion Pipeline")
    print(f"{'='*52}")

    # Step 1: Test ES connection
    try:
        es = get_es_client()
        info = es.info()
        print(f"OK  Elasticsearch {info['version']['number']} at {settings.es_host}")
    except ConnectionError as e:
        print(f"\nERROR Cannot connect to Elasticsearch:\n    {e}")
        print("\n  Start Elasticsearch with Docker:")
        print("  docker run -d --name elasticsearch \\")
        print("    -e discovery.type=single-node \\")
        print("    -e xpack.security.enabled=false \\")
        print("    -p 9200:9200 elasticsearch:8.13.0\n")
        sys.exit(1)

    if args.check:
        exists = es.indices.exists(index=settings.es_index)
        count  = es.count(index=settings.es_index)["count"] if exists else 0
        print(f"  Index '{settings.es_index}': {'exists' if exists else 'missing'}")
        print(f"  Documents: {count}\n")
        sys.exit(0)

    data_path = Path(args.data) if args.data else Path(settings.dataset_path)

    # Step 2: Extract PDF if requested
    if args.pdf:
        if not Path(args.pdf).exists():
            print(f"\nERROR PDF not found: {args.pdf}\n")
            sys.exit(1)

        print(f"\nExtracting dataset from PDF: {args.pdf}")
        from build_dataset import extract_pages, parse_structure, deduplicate, save_dataset

        pages    = extract_pages(args.pdf)
        sections = parse_structure(pages)
        sections = deduplicate(sections)
        sections = [s for s in sections if len(s.content.split()) >= 30]

        print(f"    Extracted {len(sections)} sections from PDF.")
        save_dataset(sections, str(data_path))

    elif not data_path.exists():
        print(f"\nWARN Dataset not found at: {data_path}")
        print("    Run: python ingest.py --pdf path/to/ed3book.pdf\n")
        sys.exit(1)

    # Step 3: Index into Elasticsearch
    print(f"\nIndexing {data_path} into '{settings.es_index}'...")
    result = index_documents(es, data_path=str(data_path), force_recreate=args.force)

    print(f"\nDone!")
    print(f"  Indexed : {result['indexed']} documents")
    print(f"  Failed  : {result['failed']} documents")
    print(f"\n  Verify: curl http://localhost:9200/{settings.es_index}/_count\n")


if __name__ == "__main__":
    main()
