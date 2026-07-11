"""Unification/KG engine — normalizes AA + IDBI feed into one Financial Twin state."""
from twin_data import get_accounts, get_holdings, get_transactions, get_goals, get_customer

INVESTABLE_ASSET_CLASSES = {"equity", "debt", "gold", "real_estate"}


def build_twin_state(customer_id: str) -> dict:
    accounts = get_accounts(customer_id)
    holdings = get_holdings(customer_id)
    transactions = get_transactions(customer_id)
    goals = get_goals(customer_id)
    customer = get_customer(customer_id)

    cash = sum(a["balance"] for a in accounts if a["type"] in ("savings", "current"))
    investable_holdings_value = sum(h["value"] for h in holdings if h["asset_class"] in INVESTABLE_ASSET_CLASSES)
    protection_cover = sum(h["value"] for h in holdings if h["asset_class"] == "insurance")
    liabilities = sum(a["balance"] for a in accounts if a["type"] in ("loan", "credit_card"))

    net_worth = cash + investable_holdings_value - liabilities

    by_institution = {}
    for a in accounts:
        by_institution.setdefault(a["institution"], {"accounts": [], "total": 0.0})
        by_institution[a["institution"]]["accounts"].append(a["id"])
        by_institution[a["institution"]]["total"] += a["balance"]

    return {
        "customer": customer,
        "accounts": accounts,
        "holdings": holdings,
        "transactions": transactions,
        "goals": goals,
        "net_worth": net_worth,
        "cash": cash,
        "investable_holdings_value": investable_holdings_value,
        "protection_cover": protection_cover,
        "liabilities": liabilities,
        "by_institution": by_institution,
    }


def run(customer_id: str) -> dict:
    twin = build_twin_state(customer_id)
    return {
        "value": {
            "net_worth": twin["net_worth"],
            "cash": twin["cash"],
            "investable_holdings_value": twin["investable_holdings_value"],
            "protection_cover": twin["protection_cover"],
            "institutions": list(twin["by_institution"].keys()),
            "num_accounts": len(twin["accounts"]),
        },
        "inputs_used": ["accounts", "holdings"],
        "assumptions": [
            "Net worth = liquid cash + investable holdings (equity/debt/gold/real estate) - liabilities.",
            "Insurance sum assured tracked as protection cover, excluded from investable net worth.",
        ],
        "confidence": 0.97,
    }
