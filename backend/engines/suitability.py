"""Suitability/Reco engine — surplus + risk_profile -> filter catalog -> rank by impact."""
from engines.life_event import run as run_life_event
from engines.surplus import run as run_surplus
from engines.unification import build_twin_state
from twin_data import get_product_catalog

RISK_ORDER = {"conservative": 0, "moderate": 1, "aggressive": 2}
LEVEL_ORDER = {"low": 0, "moderate": 1, "high": 2}

# risk_profile -> [(product type preference, risk_level, allocation share)]
MONTHLY_MIX = {
    "conservative": [("debt_fund", "low", 1.0)],
    "moderate": [("mutual_fund", "moderate", 0.6), ("debt_fund", "low", 0.4)],
    "aggressive": [("mutual_fund", "high", 0.7), ("mutual_fund", "moderate", 0.3)],
}


def _eligible(products, risk_profile):
    cap = RISK_ORDER.get(risk_profile, 1)
    return [p for p in products if LEVEL_ORDER.get(p["risk_level"], 1) <= cap]


def _pick(products, product_type, risk_level):
    candidates = [p for p in products if p["type"] == product_type and p["risk_level"] == risk_level]
    if not candidates:
        candidates = [p for p in products if p["type"] == product_type]
    if not candidates:
        return None
    return max(candidates, key=lambda p: p.get("expected_return") or 0)


def run(customer_id: str) -> dict:
    twin = build_twin_state(customer_id)
    risk_profile = (twin["customer"] or {}).get("risk_profile", "moderate")
    surplus_result = run_surplus(customer_id)
    surplus = surplus_result["value"]["surplus"]
    life_event_result = run_life_event(customer_id)

    catalog = get_product_catalog()
    eligible = _eligible(catalog, risk_profile)
    recommendations = []

    if surplus > 0:
        for product_type, risk_level, share in MONTHLY_MIX.get(risk_profile, MONTHLY_MIX["moderate"]):
            product = _pick(eligible, product_type, risk_level)
            if not product:
                continue
            amount = round(surplus * share, 2)
            if amount < product["min_amount"]:
                continue
            recommendations.append({
                "product_name": product["name"], "type": product["type"], "risk_level": product["risk_level"],
                "cadence": "monthly", "amount": amount, "expected_return": product.get("expected_return"),
                "reason": f"Deploy {share*100:.0f}% of your ₹{surplus:,.0f} monthly investable surplus, "
                          f"matched to your {risk_profile} risk profile.",
                "suitability_tag": "suitable",
            })

    for trigger in life_event_result["value"]["triggers"]:
        if trigger["type"] == "idle_cash":
            product = _pick(eligible, "fixed_deposit", "low") or _pick(eligible, "debt_fund", "low")
            if product:
                lumpsum = min(trigger["idle_amount"] - 50000, trigger["idle_amount"])  # keep a cash cushion
                if lumpsum >= product["min_amount"]:
                    recommendations.append({
                        "product_name": product["name"], "type": product["type"], "risk_level": product["risk_level"],
                        "cadence": "lumpsum", "amount": round(lumpsum, 2), "expected_return": product.get("expected_return"),
                        "reason": f"Move idle cash from {trigger['institution']} savings (₹{trigger['idle_amount']:,.0f}) "
                                  f"into a low-risk product, keeping a ₹50,000 cushion.",
                        "suitability_tag": "suitable",
                    })
        elif trigger["type"] == "life_event" and trigger["event"] == "wedding_in_family":
            product = _pick(eligible, "gold_bond", "low")
            if product:
                recommendations.append({
                    "product_name": product["name"], "type": product["type"], "risk_level": product["risk_level"],
                    "cadence": "lumpsum", "amount": product["min_amount"] * 10, "expected_return": product.get("expected_return"),
                    "reason": "Signals suggest an upcoming family wedding — a short-horizon, low-risk product "
                              "for near-term liquidity fits better than locking funds long-term.",
                    "suitability_tag": "needs_review",
                })

    return {
        "value": {"recommendations": recommendations, "risk_profile": risk_profile, "surplus_used": surplus},
        "inputs_used": ["surplus engine", "life_event engine", "product_catalog", "customer.risk_profile"],
        "assumptions": [
            "Products filtered to risk_level at or below the customer's stated risk_profile (SEBI suitability boundary).",
            "Monthly surplus allocation mix is a fixed template per risk profile (conservative/moderate/aggressive), "
            "not portfolio-optimized in this MVP.",
        ],
        "confidence": 0.8,
    }
