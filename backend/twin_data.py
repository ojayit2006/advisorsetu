"""
Data access layer used by every engine. Hides MOCK_MODE vs. real-Supabase behind one
interface so engines never know which one they're talking to (same contract the plan's
AA mock section asks for: "Unification treats mock and live identically").
"""
from aa_mock.fixtures import build_all
from config import MOCK_MODE
from db import select

_MOCK = build_all()


def get_accounts(customer_id):
    if MOCK_MODE:
        return [a for a in _MOCK["accounts"] if a["customer_id"] == customer_id]
    return select("accounts", {"customer_id": f"eq.{customer_id}"})


def get_holdings(customer_id):
    if MOCK_MODE:
        return [h for h in _MOCK["holdings"] if h["customer_id"] == customer_id]
    return select("holdings", {"customer_id": f"eq.{customer_id}"})


def get_transactions(customer_id):
    if MOCK_MODE:
        return [t for t in _MOCK["transactions"] if t["customer_id"] == customer_id]
    return select("transactions", {"customer_id": f"eq.{customer_id}", "order": "ts.desc", "limit": "500"})


def get_goals(customer_id):
    if MOCK_MODE:
        return [g for g in _MOCK["goals"] if g["customer_id"] == customer_id]
    return select("goals", {"customer_id": f"eq.{customer_id}"})


def get_consent(customer_id):
    if MOCK_MODE:
        c = _MOCK["consent"]
        return c if c["customer_id"] == customer_id else None
    rows = select("consents", {"customer_id": f"eq.{customer_id}", "order": "created_at.desc", "limit": "1"})
    return rows[0] if rows else None


def get_product_catalog():
    if MOCK_MODE:
        return _MOCK["product_catalog"]
    return select("product_catalog", {})


def get_customer(customer_id):
    if MOCK_MODE:
        c = _MOCK["customer"]
        return c if c["id"] == customer_id else None
    rows = select("customers", {"id": f"eq.{customer_id}"})
    return rows[0] if rows else None


def default_customer_id():
    return _MOCK["customer"]["id"]
