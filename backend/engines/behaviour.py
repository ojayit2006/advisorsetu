"""Behaviour engine — spend creep vs trailing average, and a panic-selling proxy rule."""
from collections import defaultdict
from datetime import datetime

from engines.unification import build_twin_state

CREEP_THRESHOLD_PCT = 20.0
DISCRETIONARY_CATEGORIES = {"dining", "shopping", "groceries", "events", "jewellery"}


def _month_key(ts: str) -> str:
    return ts[:7]  # "YYYY-MM"


def _spend_by_month_category(transactions):
    by_month_cat = defaultdict(float)
    for t in transactions:
        if t["direction"] != "debit" or t["category"] not in DISCRETIONARY_CATEGORIES:
            continue
        by_month_cat[(_month_key(t["ts"]), t["category"])] += t["amount"]
    return by_month_cat


def run(customer_id: str) -> dict:
    twin = build_twin_state(customer_id)
    transactions = twin["transactions"]
    by_month_cat = _spend_by_month_category(transactions)

    months_sorted = sorted({m for m, _ in by_month_cat.keys()})
    nudges = []

    if len(months_sorted) >= 2:
        latest_month = months_sorted[-1]
        prior_months = months_sorted[:-1]
        categories = {c for _, c in by_month_cat.keys()}
        for cat in categories:
            latest_amt = by_month_cat.get((latest_month, cat), 0.0)
            prior_amts = [by_month_cat.get((m, cat), 0.0) for m in prior_months]
            prior_avg = sum(prior_amts) / len(prior_amts) if prior_amts else 0.0
            if prior_avg <= 0:
                continue
            creep_pct = round((latest_amt - prior_avg) / prior_avg * 100, 1)
            if creep_pct >= CREEP_THRESHOLD_PCT:
                nudges.append({
                    "type": "spend_creep",
                    "category": cat,
                    "latest_month_amount": round(latest_amt, 2),
                    "trailing_avg_amount": round(prior_avg, 2),
                    "creep_pct": creep_pct,
                    "message": f"{cat.title()} spend is up {creep_pct:.0f}% vs your trailing average "
                               f"(₹{latest_amt:,.0f} this month vs ₹{prior_avg:,.0f} average).",
                })

    # Panic-selling proxy: an outsized, non-recurring redemption/SIP-stoppage debit.
    sip_amounts = [t["amount"] for t in transactions if t["category"] == "investment_sip" and t["is_recurring"]]
    typical_sip = sum(sip_amounts) / len(sip_amounts) if sip_amounts else 0
    panic_flagged = False
    for t in transactions:
        if t["category"] == "investment_sip" and not t["is_recurring"] and typical_sip and t["amount"] > 2 * typical_sip:
            panic_flagged = True
            nudges.append({
                "type": "panic_proxy",
                "message": "Unusually large one-off investment withdrawal detected relative to your normal SIP pattern.",
            })

    return {
        "value": {"nudges": nudges, "panic_flagged": panic_flagged},
        "inputs_used": ["transactions (discretionary categories, trailing months)"],
        "assumptions": [
            f"Creep flagged when a category's latest month spend exceeds its trailing average by >={CREEP_THRESHOLD_PCT:.0f}%.",
            "Panic-selling proxy is a rule-based heuristic (no live market-drop correlation in this MVP).",
        ],
        "confidence": 0.7,
    }
