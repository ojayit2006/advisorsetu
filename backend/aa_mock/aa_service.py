"""
Account Aggregator mock — simulates the RBI/ReBIT AA consent + FI-data-fetch flow so the
demo can show a real consent artefact + FIP list without a live AA sandbox in 24h.
Unification (engines/unification.py) consumes fetch_fi_data() the same way it would
consume a live AA response — swapping in a real AA client later is a drop-in change.
"""
from datetime import datetime, timedelta

from aa_mock.fixtures import ACC_HDFC_CURRENT, ACC_ICICI_MF, ACC_LIC_INSURANCE, CUSTOMER_ID, build_all

_DATA = build_all()

_CONSENTS = {}  # handle -> consent artefact, in-memory for the mock handshake


def create_consent(customer_id: str, fip_list: list[str]) -> dict:
    handle = f"aa-consent-{customer_id[-8:]}"
    consent = {
        "consentHandle": handle,
        "customer_id": customer_id,
        "status": "ACTIVE",
        "fip_list": fip_list or ["HDFC Bank", "ICICI Prudential MF", "LIC"],
        "scope": ["profile", "summary", "transactions"],
        "purpose": "Wealth management advisory (MIA)",
        "consentExpiry": (datetime.now() + timedelta(days=365)).isoformat() + "Z",
        "createdAt": datetime.now().isoformat() + "Z",
    }
    _CONSENTS[handle] = consent
    return consent


def _fi_deposit(account, transactions):
    acc_txns = [t for t in transactions if t["account_id"] == account["id"]]
    return {
        "fiType": "DEPOSIT",
        "linkedAccRef": account["id"],
        "maskedAccNumber": "XXXXXX" + account["id"][-4:],
        "fipName": account["institution"],
        "Summary": {
            "currentBalance": account["balance"],
            "currency": account["currency"],
            "type": account["type"].upper(),
        },
        "Transactions": [
            {"txnId": t["id"], "type": t["direction"].upper(), "amount": t["amount"],
             "narration": f"{t['merchant']} / {t['category']}", "valueDate": t["ts"]}
            for t in acc_txns
        ],
    }


def _fi_mutual_funds(account, holdings):
    acc_holdings = [h for h in holdings if h["account_id"] == account["id"] and h["asset_class"] in ("equity", "debt")]
    return {
        "fiType": "MUTUAL_FUNDS",
        "linkedAccRef": account["id"],
        "fipName": account["institution"],
        "Summary": {"currentValue": sum(h["value"] for h in acc_holdings)},
        "Schemes": [
            {"schemeName": h["name"], "assetClass": h["asset_class"].upper(), "units": h["units"], "nav_value": h["value"]}
            for h in acc_holdings
        ],
    }


def _fi_insurance(account, holdings):
    acc_holdings = [h for h in holdings if h["account_id"] == account["id"] and h["asset_class"] == "insurance"]
    return {
        "fiType": "INSURANCE_POLICIES",
        "linkedAccRef": account["id"],
        "fipName": account["institution"],
        "Policies": [
            {"policyName": h["name"], "sumAssured": h["value"]} for h in acc_holdings
        ],
    }


def fetch_fi_data(customer_id: str) -> dict:
    """Returns real-shaped ReBIT FI-schema JSON (Deposit / Mutual Funds / Insurance per FIP)."""
    accounts = _DATA["accounts"]
    holdings = _DATA["holdings"]
    transactions = _DATA["transactions"]

    fi_objects = []
    for acc in accounts:
        if acc["type"] in ("savings", "current"):
            fi_objects.append(_fi_deposit(acc, transactions))
        elif acc["type"] == "mutual_fund":
            fi_objects.append(_fi_mutual_funds(acc, holdings))
        elif acc["type"] == "insurance":
            fi_objects.append(_fi_insurance(acc, holdings))

    return {"customer_id": customer_id, "fetchedAt": datetime.now().isoformat() + "Z", "FI": fi_objects}
