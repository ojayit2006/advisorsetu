"""Life-Event/Opportunity engine — merchant-signal rules + idle-cash rule."""
from engines.unification import build_twin_state

WEDDING_MERCHANT_CATEGORIES = {"jewellery", "events"}
IDLE_CASH_THRESHOLD = 150000  # sitting in a savings account earning ~3-4% vs FD/MF alternatives


def run(customer_id: str) -> dict:
    twin = build_twin_state(customer_id)
    transactions = twin["transactions"]
    accounts = twin["accounts"]
    triggers = []

    wedding_signals = [t for t in transactions if t["category"] in WEDDING_MERCHANT_CATEGORIES]
    if wedding_signals:
        total = sum(t["amount"] for t in wedding_signals)
        merchants = sorted({t["merchant"] for t in wedding_signals})
        triggers.append({
            "type": "life_event",
            "event": "wedding_in_family",
            "signal_merchants": merchants,
            "signal_total_spend": total,
            "message": "Recent jewellery + event-venue spend suggests a wedding in the family — "
                       "an opportunity to discuss short-term goal funding and gifting-related products.",
        })

    for a in accounts:
        if a["type"] == "savings" and a["balance"] >= IDLE_CASH_THRESHOLD:
            triggers.append({
                "type": "idle_cash",
                "account_id": a["id"],
                "institution": a["institution"],
                "idle_amount": a["balance"],
                "message": f"₹{a['balance']:,.0f} sitting idle in your {a['institution']} savings account, "
                           f"earning savings-rate interest instead of being invested.",
            })

    return {
        "value": {"triggers": triggers},
        "inputs_used": ["transactions (merchant/category signals)", "accounts (balances)"],
        "assumptions": [
            "Wedding signal = jewellery + event-venue spend co-occurring within the recent window.",
            f"Idle cash flagged when a savings account balance is >= ₹{IDLE_CASH_THRESHOLD:,.0f}.",
        ],
        "confidence": 0.65,
    }
