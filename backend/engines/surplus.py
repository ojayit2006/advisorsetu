"""Surplus engine — investable surplus = avg income - recurring outflows - safety buffer."""
from collections import defaultdict

from engines.unification import build_twin_state

SAFETY_BUFFER_RATE = 0.15  # reserved for emergency fund / unplanned expense, not investable


def _monthly_avg_by_category(transactions, direction, recurring_only, months=6):
    totals = defaultdict(float)
    for t in transactions:
        if t["direction"] != direction:
            continue
        if recurring_only and not t["is_recurring"]:
            continue
        totals[t["category"]] += t["amount"]
    return {cat: round(amt / months, 2) for cat, amt in totals.items()}


def run(customer_id: str) -> dict:
    twin = build_twin_state(customer_id)
    transactions = twin["transactions"]

    income_by_cat = _monthly_avg_by_category(transactions, "credit", recurring_only=True)
    avg_income = sum(income_by_cat.values())

    recurring_outflows = _monthly_avg_by_category(transactions, "debit", recurring_only=True)
    total_recurring_outflow = sum(recurring_outflows.values())

    safety_buffer = round(avg_income * SAFETY_BUFFER_RATE, 2)
    surplus = round(avg_income - total_recurring_outflow - safety_buffer, 2)

    breakdown = [
        {"category": cat, "avg_monthly_amount": amt}
        for cat, amt in sorted(recurring_outflows.items(), key=lambda kv: -kv[1])
    ]

    return {
        "value": {
            "surplus": max(surplus, 0),
            "avg_monthly_income": round(avg_income, 2),
            "total_recurring_outflow": round(total_recurring_outflow, 2),
            "safety_buffer": safety_buffer,
            "breakdown": breakdown,
        },
        "inputs_used": ["transactions (trailing 6 months, recurring only)"],
        "assumptions": [
            "Safety buffer reserved at 15% of average monthly income before any surplus is called investable.",
            "Existing recurring investments (e.g. running SIPs) are treated as committed outflow, not surplus.",
            "Surplus computed over a trailing 6-month window of recurring credits/debits.",
        ],
        "confidence": 0.9,
    }
