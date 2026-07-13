"""
Persists computed suitability recommendations into the `recommendations` table so the
web console's Postgres Realtime feed has something to subscribe to. In MOCK_MODE this
is a no-op (mock mode has no Supabase project) — the console falls back to polling the
REST endpoint in that case, which already returns live-computed recommendations.
"""
from config import MOCK_MODE
from db import insert


def persist_recommendations(customer_id: str, recommendations: list[dict]) -> None:
    if MOCK_MODE or not recommendations:
        return
    rows = [{
        "customer_id": customer_id,
        "type": rec["type"],
        "title": rec["product_name"],
        "body": rec["reason"],
        "action_payload": {
            "cadence": rec["cadence"], "amount": rec["amount"],
            "expected_return": rec.get("expected_return"), "risk_level": rec["risk_level"],
        },
        "suitability_tag": rec["suitability_tag"],
    } for rec in recommendations]
    try:
        insert("recommendations", rows)
    except Exception:
        pass  # best-effort — never let a persistence hiccup break the live response
