"""Thin Supabase REST (PostgREST) client shared by main.py + all engines."""
import requests

from config import SUPABASE_KEY, SUPABASE_URL

HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=representation",
}


def select(table, params=None, timeout=15):
    resp = requests.get(f"{SUPABASE_URL}/rest/v1/{table}", headers=HEADERS, params=params or {}, timeout=timeout)
    resp.raise_for_status()
    return resp.json()


def insert(table, rows, timeout=15):
    resp = requests.post(f"{SUPABASE_URL}/rest/v1/{table}", headers=HEADERS, json=rows, timeout=timeout)
    resp.raise_for_status()
    return resp.json()


def update(table, params, patch, timeout=15):
    resp = requests.patch(f"{SUPABASE_URL}/rest/v1/{table}", headers=HEADERS, params=params, json=patch, timeout=timeout)
    resp.raise_for_status()
    return resp.json()


def rpc(name, payload, timeout=15):
    resp = requests.post(f"{SUPABASE_URL}/rest/v1/rpc/{name}", headers=HEADERS, json=payload, timeout=timeout)
    resp.raise_for_status()
    return resp.json()
