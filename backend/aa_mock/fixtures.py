"""
Deterministic demo dataset for "Rahul Verma" — used when MOCK_MODE is on (default
whenever Supabase isn't configured). Dates are relative to today so the story always
reads as "recent" no matter when the demo runs, but the shape/amounts never change —
this is what makes the numbers reproducible run to run (see PLAN.md risk register).

Same underlying story as shared/supabase/seed.py (kept as a separate, simpler
generator there since that one targets real Supabase rows with server-generated ids).
"""
from datetime import date, datetime, timedelta

CUSTOMER_ID = "00000000-0000-0000-0000-000000000001"
ACC_IDBI_SAVINGS = "00000000-0000-0000-0000-000000000002"
ACC_HDFC_CURRENT = "00000000-0000-0000-0000-000000000003"
ACC_ICICI_MF = "00000000-0000-0000-0000-000000000004"
ACC_LIC_INSURANCE = "00000000-0000-0000-0000-000000000005"

TODAY = date.today()


def _months_ago(n, day=1):
    y, m = TODAY.year, TODAY.month - n
    while m <= 0:
        m += 12
        y -= 1
    return date(y, m, min(day, 28))


def _iso(d, hour=10, minute=0):
    return datetime(d.year, d.month, d.day, hour, minute).isoformat() + "Z"


def _months_from_now(n, day=1):
    y, m = TODAY.year, TODAY.month + n
    while m > 12:
        m -= 12
        y += 1
    return date(y, m, min(day, 28))


def build_customer():
    return {
        "id": CUSTOMER_ID, "name": "Rahul Verma", "dob": "1990-04-12",
        "risk_profile": "moderate", "monthly_income_est": 95000,
        "created_at": _iso(_months_ago(24)),
    }


def build_accounts():
    return [
        {"id": ACC_IDBI_SAVINGS, "customer_id": CUSTOMER_ID, "institution": "IDBI Bank",
         "source": "idbi", "type": "savings", "balance": 210000, "currency": "INR"},
        {"id": ACC_HDFC_CURRENT, "customer_id": CUSTOMER_ID, "institution": "HDFC Bank",
         "source": "aa", "type": "current", "balance": 45000, "currency": "INR"},
        {"id": ACC_ICICI_MF, "customer_id": CUSTOMER_ID, "institution": "ICICI Prudential MF",
         "source": "aa", "type": "mutual_fund", "balance": 240000, "currency": "INR"},
        {"id": ACC_LIC_INSURANCE, "customer_id": CUSTOMER_ID, "institution": "LIC",
         "source": "aa", "type": "insurance", "balance": 500000, "currency": "INR"},
    ]


def build_holdings():
    return [
        {"id": "10000000-0000-0000-0000-000000000001", "customer_id": CUSTOMER_ID, "account_id": ACC_ICICI_MF,
         "asset_class": "equity", "name": "Axis Bluechip Fund", "units": 1180.32, "value": 180000, "as_of": str(TODAY)},
        {"id": "10000000-0000-0000-0000-000000000002", "customer_id": CUSTOMER_ID, "account_id": ACC_ICICI_MF,
         "asset_class": "debt", "name": "HDFC Corporate Bond Fund", "units": 2400.5, "value": 60000, "as_of": str(TODAY)},
        {"id": "10000000-0000-0000-0000-000000000003", "customer_id": CUSTOMER_ID, "account_id": ACC_LIC_INSURANCE,
         "asset_class": "insurance", "name": "LIC Jeevan Anand (sum assured)", "units": None, "value": 500000, "as_of": str(TODAY)},
    ]


DINING_BY_MONTH = [4000, 4500, 5200, 6800, 8200, 9500]  # oldest -> newest, visible creep


def build_transactions():
    txns = []
    tid = 0

    def add(**kw):
        nonlocal tid
        tid += 1
        txns.append({"id": f"20000000-0000-0000-0000-{tid:012d}", **kw})

    for i in range(6, 0, -1):
        add(customer_id=CUSTOMER_ID, account_id=ACC_HDFC_CURRENT, ts=_iso(_months_ago(i, 1), 9, 0),
            amount=95000, direction="credit", category="salary", merchant="Employer Pvt Ltd", is_recurring=True)
        add(customer_id=CUSTOMER_ID, account_id=ACC_HDFC_CURRENT, ts=_iso(_months_ago(i, 3), 11, 0),
            amount=22000, direction="debit", category="rent", merchant="Landlord", is_recurring=True)
        add(customer_id=CUSTOMER_ID, account_id=ACC_HDFC_CURRENT, ts=_iso(_months_ago(i, 5), 10, 0),
            amount=8000, direction="debit", category="emi", merchant="HDFC Auto Loan", is_recurring=True)
        add(customer_id=CUSTOMER_ID, account_id=ACC_ICICI_MF, ts=_iso(_months_ago(i, 5), 10, 30),
            amount=12000, direction="debit", category="investment_sip", merchant="Axis Bluechip Fund SIP", is_recurring=True)
        add(customer_id=CUSTOMER_ID, account_id=ACC_HDFC_CURRENT, ts=_iso(_months_ago(i, 7), 18, 0),
            amount=2200, direction="debit", category="utilities", merchant="Electricity Board", is_recurring=True)
        add(customer_id=CUSTOMER_ID, account_id=ACC_HDFC_CURRENT, ts=_iso(_months_ago(i, 7), 18, 5),
            amount=1500, direction="debit", category="utilities", merchant="Airtel Broadband", is_recurring=True)
        add(customer_id=CUSTOMER_ID, account_id=ACC_HDFC_CURRENT, ts=_iso(_months_ago(i, 8), 20, 0),
            amount=800, direction="debit", category="subscriptions", merchant="Netflix+Hotstar", is_recurring=True)
        add(customer_id=CUSTOMER_ID, account_id=ACC_HDFC_CURRENT, ts=_iso(_months_ago(i, 9), 12, 0),
            amount=3800, direction="debit", category="insurance_premium", merchant="LIC Jeevan Anand", is_recurring=True)

        month_total = DINING_BY_MONTH[6 - i]
        merchants = ["Swiggy", "Zomato", "Barbeque Nation", "Cafe Coffee Day", "Domino's", "Local Restaurant"]
        n_meals = 6
        per_meal = round(month_total / n_meals)
        for k in range(n_meals):
            day = min(2 + k * 4, 28)
            add(customer_id=CUSTOMER_ID, account_id=ACC_HDFC_CURRENT, ts=_iso(_months_ago(i, day), 20, 30),
                amount=per_meal, direction="debit", category="dining", merchant=merchants[k % len(merchants)], is_recurring=False)

        add(customer_id=CUSTOMER_ID, account_id=ACC_HDFC_CURRENT, ts=_iso(_months_ago(i, 6), 17, 0),
            amount=4200, direction="debit", category="groceries", merchant="BigBasket", is_recurring=False)
        add(customer_id=CUSTOMER_ID, account_id=ACC_HDFC_CURRENT, ts=_iso(_months_ago(i, 20), 17, 0),
            amount=3600, direction="debit", category="groceries", merchant="D-Mart", is_recurring=False)
        add(customer_id=CUSTOMER_ID, account_id=ACC_HDFC_CURRENT, ts=_iso(_months_ago(i, 20), 15, 0),
            amount=2800, direction="debit", category="shopping", merchant="Amazon", is_recurring=False)

    # Life-event signal: jewellery + banquet booking in the most recent month.
    add(customer_id=CUSTOMER_ID, account_id=ACC_HDFC_CURRENT, ts=_iso(_months_ago(0, 10), 16, 0),
        amount=85000, direction="debit", category="jewellery", merchant="Tanishq", is_recurring=False)
    add(customer_id=CUSTOMER_ID, account_id=ACC_HDFC_CURRENT, ts=_iso(_months_ago(0, 12), 16, 0),
        amount=45000, direction="debit", category="events", merchant="Grand Banquet Hall", is_recurring=False)

    return txns


def build_goals():
    # Target dates are relative to "today" (not fixed calendar years) so the demo's Monte
    # Carlo horizon — and therefore the goal-probability numbers — stay stable no matter
    # when the demo actually runs. Amounts are tuned so the "invest the recommended
    # surplus" plan lands a healthy (~80%) probability, and a lumpsum shock (e.g. a car
    # down payment) drops it to a dramatic-but-not-zero (~45-55%) probability — see
    # backend/engines/scenario.py.
    return [
        {"id": "30000000-0000-0000-0000-000000000001", "customer_id": CUSTOMER_ID, "name": "Home Down Payment",
         "target_amount": 1800000, "target_date": str(_months_from_now(48)), "priority": "high", "funded_amount": 750000},
        {"id": "30000000-0000-0000-0000-000000000002", "customer_id": CUSTOMER_ID, "name": "Car Upgrade",
         "target_amount": 1200000, "target_date": str(_months_from_now(30)), "priority": "medium", "funded_amount": 300000},
    ]


def build_consent():
    return {
        "id": "40000000-0000-0000-0000-000000000001", "customer_id": CUSTOMER_ID,
        "aa_handle": "rahulverma@onemoney-aa", "status": "active",
        "fip_list": ["HDFC Bank", "ICICI Prudential MF", "LIC"],
        "scope": "profile,summary,transactions",
        "expiry": (datetime.now() + timedelta(days=365)).isoformat() + "Z",
    }


PRODUCT_CATALOG = [
    {"id": "50000000-0000-0000-0000-000000000001", "name": "Axis Bluechip Fund", "type": "mutual_fund",
     "risk_level": "moderate", "min_amount": 500, "expected_return": 12.0, "doc_ref": "SID: axis-bluechip-2024"},
    {"id": "50000000-0000-0000-0000-000000000002", "name": "Parag Parikh Flexi Cap Fund", "type": "mutual_fund",
     "risk_level": "high", "min_amount": 1000, "expected_return": 14.0, "doc_ref": "SID: ppfas-flexicap-2024"},
    {"id": "50000000-0000-0000-0000-000000000003", "name": "HDFC Corporate Bond Fund", "type": "debt_fund",
     "risk_level": "low", "min_amount": 5000, "expected_return": 7.5, "doc_ref": "SID: hdfc-corp-bond-2024"},
    {"id": "50000000-0000-0000-0000-000000000004", "name": "Nifty 50 Index Fund", "type": "mutual_fund",
     "risk_level": "moderate", "min_amount": 500, "expected_return": 11.0, "doc_ref": "SID: nifty50-index-2024"},
    {"id": "50000000-0000-0000-0000-000000000005", "name": "Sovereign Gold Bond Series", "type": "gold_bond",
     "risk_level": "low", "min_amount": 1000, "expected_return": 6.5, "doc_ref": "RBI-SGB-2024-25"},
    {"id": "50000000-0000-0000-0000-000000000006", "name": "ICICI Pru iProtect Term Plan", "type": "insurance",
     "risk_level": "low", "min_amount": 12000, "expected_return": None, "doc_ref": "UIN: iciciterm2024"},
    {"id": "50000000-0000-0000-0000-000000000007", "name": "IDBI Fixed Deposit 3yr", "type": "fixed_deposit",
     "risk_level": "low", "min_amount": 10000, "expected_return": 7.1, "doc_ref": "IDBI-FD-3Y"},
    {"id": "50000000-0000-0000-0000-000000000008", "name": "SBI Balanced Advantage Fund", "type": "mutual_fund",
     "risk_level": "moderate", "min_amount": 500, "expected_return": 10.0, "doc_ref": "SID: sbi-baf-2024"},
]


def build_all():
    return {
        "customer": build_customer(),
        "accounts": build_accounts(),
        "holdings": build_holdings(),
        "transactions": build_transactions(),
        "goals": build_goals(),
        "consent": build_consent(),
        "product_catalog": PRODUCT_CATALOG,
    }
