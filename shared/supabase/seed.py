"""
Seed script — creates the flagship demo customer "Rahul Verma" with a deterministic
financial history so the demo hits consistent, explainable figures every run.

Usage:
    cd shared/supabase
    pip install requests python-dotenv
    python seed.py            # inserts into Supabase (reads .env for SUPABASE_URL / key)
    python seed.py --dry-run  # prints the payload instead of inserting (no Supabase needed)

Env vars (see backend/.env.example):
    SUPABASE_URL
    SUPABASE_SERVICE_KEY   (preferred — bypasses RLS cleanly)  or SUPABASE_ANON_KEY
"""
import argparse
import json
import os
import sys
from datetime import date, datetime, timedelta

import requests
from dotenv import load_dotenv

load_dotenv()
load_dotenv(os.path.join(os.path.dirname(__file__), "..", "..", "backend", ".env"))

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY") or os.getenv("SUPABASE_ANON_KEY", "")

HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=representation",
}

TODAY = date.today()


def months_ago(n, day=1):
    y, m = TODAY.year, TODAY.month - n
    while m <= 0:
        m += 12
        y -= 1
    return date(y, m, min(day, 28))


def months_from_now(n, day=1):
    y, m = TODAY.year, TODAY.month + n
    while m > 12:
        m -= 12
        y += 1
    return date(y, m, min(day, 28))


def iso(d, hour=10, minute=0):
    return datetime(d.year, d.month, d.day, hour, minute).isoformat() + "Z"


def insert(table, rows, dry_run):
    if dry_run:
        print(f"\n--- {table} ({len(rows)} rows) ---")
        print(json.dumps(rows[:3], indent=2, default=str), "..." if len(rows) > 3 else "")
        return rows
    resp = requests.post(f"{SUPABASE_URL}/rest/v1/{table}", headers=HEADERS, json=rows, timeout=30)
    if resp.status_code >= 300:
        print(f"FAILED inserting into {table}: {resp.status_code} {resp.text}", file=sys.stderr)
        resp.raise_for_status()
    return resp.json()


def build_transactions(customer_id, account_ids):
    idbi_savings, hdfc_current, icici_mf, lic_insurance = account_ids
    txns = []

    # 6 months of recurring salary / rent / EMI / SIP
    dining_by_month = [4000, 4500, 5200, 6800, 8200, 9500]  # visible creep, oldest -> newest
    for i in range(6, 0, -1):
        m = months_ago(i)
        txns.append(dict(customer_id=customer_id, account_id=hdfc_current, ts=iso(months_ago(i, 1), 9, 0),
                          amount=95000, direction="credit", category="salary", merchant="Employer Pvt Ltd",
                          is_recurring=True))
        txns.append(dict(customer_id=customer_id, account_id=hdfc_current, ts=iso(months_ago(i, 3), 11, 0),
                          amount=22000, direction="debit", category="rent", merchant="Landlord",
                          is_recurring=True))
        txns.append(dict(customer_id=customer_id, account_id=hdfc_current, ts=iso(months_ago(i, 5), 10, 0),
                          amount=8000, direction="debit", category="emi", merchant="HDFC Auto Loan",
                          is_recurring=True))
        txns.append(dict(customer_id=customer_id, account_id=icici_mf, ts=iso(months_ago(i, 5), 10, 30),
                          amount=12000, direction="debit", category="investment_sip", merchant="Axis Bluechip Fund SIP",
                          is_recurring=True))
        txns.append(dict(customer_id=customer_id, account_id=hdfc_current, ts=iso(months_ago(i, 7), 18, 0),
                          amount=2200, direction="debit", category="utilities", merchant="Electricity Board",
                          is_recurring=True))
        txns.append(dict(customer_id=customer_id, account_id=hdfc_current, ts=iso(months_ago(i, 7), 18, 5),
                          amount=1500, direction="debit", category="utilities", merchant="Airtel Broadband",
                          is_recurring=True))
        txns.append(dict(customer_id=customer_id, account_id=hdfc_current, ts=iso(months_ago(i, 8), 20, 0),
                          amount=800, direction="debit", category="subscriptions", merchant="Netflix+Hotstar",
                          is_recurring=True))
        txns.append(dict(customer_id=customer_id, account_id=hdfc_current, ts=iso(months_ago(i, 9), 12, 0),
                          amount=3800, direction="debit", category="insurance_premium", merchant="LIC Jeevan Anand",
                          is_recurring=True))

        # dining creep — several small txns per month, total rising toward present
        month_total = dining_by_month[6 - i]
        n_meals = 6
        per_meal = round(month_total / n_meals)
        merchants = ["Swiggy", "Zomato", "Barbeque Nation", "Cafe Coffee Day", "Domino's", "Local Restaurant"]
        for k in range(n_meals):
            txns.append(dict(customer_id=customer_id, account_id=hdfc_current,
                              ts=iso(months_ago(i, 2 + k * 4 if 2 + k * 4 <= 28 else 28), 20, 30),
                              amount=per_meal, direction="debit", category="dining",
                              merchant=merchants[k % len(merchants)], is_recurring=False))

        # groceries + misc shopping, roughly flat
        txns.append(dict(customer_id=customer_id, account_id=hdfc_current, ts=iso(months_ago(i, 6), 17, 0),
                          amount=4200, direction="debit", category="groceries", merchant="BigBasket",
                          is_recurring=False))
        txns.append(dict(customer_id=customer_id, account_id=hdfc_current, ts=iso(months_ago(i, 14), 17, 0),
                          amount=3600, direction="debit", category="groceries", merchant="D-Mart",
                          is_recurring=False))
        txns.append(dict(customer_id=customer_id, account_id=hdfc_current, ts=iso(months_ago(i, 20), 15, 0),
                          amount=2800, direction="debit", category="shopping", merchant="Amazon",
                          is_recurring=False))

    # Life-event signal: a jewellery purchase + banquet booking in the most recent month —
    # strong "wedding in the family" opportunity trigger.
    txns.append(dict(customer_id=customer_id, account_id=hdfc_current, ts=iso(months_ago(0, 10), 16, 0),
                      amount=85000, direction="debit", category="jewellery", merchant="Tanishq",
                      is_recurring=False))
    txns.append(dict(customer_id=customer_id, account_id=hdfc_current, ts=iso(months_ago(0, 12), 16, 0),
                      amount=45000, direction="debit", category="events", merchant="Grand Banquet Hall",
                      is_recurring=False))

    return txns


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()
    dry_run = args.dry_run or not (SUPABASE_URL and SUPABASE_KEY)
    if dry_run and not args.dry_run:
        print("SUPABASE_URL / key not set — running in --dry-run mode (prints payload only).")

    customer = insert("customers", [dict(
        name="Rahul Verma", dob="1990-04-12", risk_profile="moderate", monthly_income_est=95000,
    )], dry_run)
    customer_id = customer[0]["id"] if not dry_run else "00000000-0000-0000-0000-000000000001"

    accounts = insert("accounts", [
        dict(customer_id=customer_id, institution="IDBI Bank", source="idbi", type="savings", balance=210000),
        dict(customer_id=customer_id, institution="HDFC Bank", source="aa", type="current", balance=45000),
        dict(customer_id=customer_id, institution="ICICI Prudential MF", source="aa", type="mutual_fund", balance=240000),
        dict(customer_id=customer_id, institution="LIC", source="aa", type="insurance", balance=500000),
    ], dry_run)
    if dry_run:
        account_ids = [f"00000000-0000-0000-0000-00000000000{i}" for i in range(2, 6)]
    else:
        account_ids = [a["id"] for a in accounts]
    idbi_savings, hdfc_current, icici_mf, lic_insurance = account_ids

    insert("holdings", [
        dict(customer_id=customer_id, account_id=icici_mf, asset_class="equity", name="Axis Bluechip Fund",
             units=1180.32, value=180000, as_of=str(TODAY)),
        dict(customer_id=customer_id, account_id=icici_mf, asset_class="debt", name="HDFC Corporate Bond Fund",
             units=2400.5, value=60000, as_of=str(TODAY)),
        dict(customer_id=customer_id, account_id=lic_insurance, asset_class="insurance", name="LIC Jeevan Anand (sum assured)",
             units=None, value=500000, as_of=str(TODAY)),
    ], dry_run)

    insert("transactions", build_transactions(customer_id, account_ids), dry_run)

    insert("goals", [
        dict(customer_id=customer_id, name="Home Down Payment", target_amount=1800000,
             target_date=str(months_from_now(48)), priority="high", funded_amount=750000),
        dict(customer_id=customer_id, name="Car Upgrade", target_amount=1200000,
             target_date=str(months_from_now(30)), priority="medium", funded_amount=300000),
    ], dry_run)

    insert("consents", [
        dict(customer_id=customer_id, aa_handle="rahulverma@onemoney-aa", status="active",
             fip_list=["HDFC Bank", "ICICI Prudential MF", "LIC"],
             scope="profile,summary,transactions", expiry=(datetime.now() + timedelta(days=365)).isoformat() + "Z"),
    ], dry_run)

    insert("product_catalog", [
        dict(name="Axis Bluechip Fund", type="mutual_fund", risk_level="moderate", min_amount=500, expected_return=12.0,
             doc_ref="SID: axis-bluechip-2024"),
        dict(name="Parag Parikh Flexi Cap Fund", type="mutual_fund", risk_level="high", min_amount=1000, expected_return=14.0,
             doc_ref="SID: ppfas-flexicap-2024"),
        dict(name="HDFC Corporate Bond Fund", type="debt_fund", risk_level="low", min_amount=5000, expected_return=7.5,
             doc_ref="SID: hdfc-corp-bond-2024"),
        dict(name="Nifty 50 Index Fund", type="mutual_fund", risk_level="moderate", min_amount=500, expected_return=11.0,
             doc_ref="SID: nifty50-index-2024"),
        dict(name="Sovereign Gold Bond Series", type="gold_bond", risk_level="low", min_amount=1000, expected_return=6.5,
             doc_ref="RBI-SGB-2024-25"),
        dict(name="ICICI Pru iProtect Term Plan", type="insurance", risk_level="low", min_amount=12000, expected_return=None,
             doc_ref="UIN: iciciterm2024"),
        dict(name="IDBI Fixed Deposit 3yr", type="fixed_deposit", risk_level="low", min_amount=10000, expected_return=7.1,
             doc_ref="IDBI-FD-3Y"),
        dict(name="SBI Balanced Advantage Fund", type="mutual_fund", risk_level="moderate", min_amount=500, expected_return=10.0,
             doc_ref="SID: sbi-baf-2024"),
    ], dry_run)

    print(f"\nSeed complete. customer_id = {customer_id}" + ("  (dry run — nothing written)" if dry_run else ""))


if __name__ == "__main__":
    main()
