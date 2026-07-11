"""
Minimal keyword-scored retrieval over product_catalog + reg_rules.md.

The plan calls for pgvector embeddings (product_catalog.embedding). In 24h we ship
keyword scoring instead — same call signature, so swapping in real embeddings later
(embed query, cosine-search the `embedding` column) is a drop-in replacement here.
"""
import os

from twin_data import get_product_catalog

_REG_RULES_PATH = os.path.join(os.path.dirname(__file__), "reg_rules.md")


def _score(text: str, query_terms: list[str]) -> int:
    text_l = text.lower()
    return sum(text_l.count(term) for term in query_terms)


def search_products(query: str, top_k: int = 5) -> list[dict]:
    terms = [t for t in query.lower().split() if len(t) > 2]
    catalog = get_product_catalog()
    scored = [(p, _score(f"{p['name']} {p['type']} {p['risk_level']}", terms)) for p in catalog]
    scored = [ps for ps in scored if ps[1] > 0] or [(p, 0) for p in catalog]
    scored.sort(key=lambda ps: -ps[1])
    return [p for p, _ in scored[:top_k]]


def search_reg_rules(query: str, top_k: int = 3) -> list[str]:
    terms = [t for t in query.lower().split() if len(t) > 2]
    with open(_REG_RULES_PATH, encoding="utf-8") as f:
        bullets = [line.strip("- ").strip() for line in f if line.strip().startswith("-")]
    scored = [(b, _score(b, terms)) for b in bullets]
    scored.sort(key=lambda bs: -bs[1])
    top = [b for b, s in scored[:top_k] if s > 0]
    return top or bullets[:top_k]
