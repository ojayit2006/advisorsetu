"""Orchestrator - tool-calling loop over the 7 engines + RAG.

Primary: Gemini (google.generativeai). Fallback: Groq's OpenAI-compatible
API if Gemini raises (quota, outage, etc.) — same tool loop, same engines,
different wire format for the request/response.
"""
import json, os
from typing import Any
import httpx
import google.generativeai as genai
from config import GEMINI_API_KEY, GEMINI_MODEL, GROQ_API_KEY, GROQ_MODEL
from engines import behaviour, explain, life_event, scenario, suitability, surplus, unification
from rag.retrieval import search_products, search_reg_rules
from recommendations_store import persist_recommendations

genai.configure(api_key=GEMINI_API_KEY)

with open(os.path.join(os.path.dirname(__file__), "prompts", "system_advisor.md"), encoding="utf-8") as f:
    SYSTEM_PROMPT = f.read()

FUNCTIONS = [
    {"name": "unification", "description": "Net worth, cash, holdings, institutions", "parameters": {"type": "object", "properties": {}}},
    {"name": "surplus", "description": "Monthly investable surplus", "parameters": {"type": "object", "properties": {}}},
    {"name": "scenario", "description": "Monte Carlo goal probability", "parameters": {"type": "object", "properties": {"goal_name": {"type": "string"}, "extra_monthly_contribution": {"type": "number"}, "one_time_delta": {"type": "number"}}}},
    {"name": "behaviour", "description": "Spend-creep nudges", "parameters": {"type": "object", "properties": {}}},
    {"name": "life_event", "description": "Wedding, idle cash", "parameters": {"type": "object", "properties": {}}},
    {"name": "suitability", "description": "Ranked product recs", "parameters": {"type": "object", "properties": {}}},
    {"name": "search_products", "description": "Search catalog", "parameters": {"type": "object", "properties": {"query": {"type": "string"}}, "required": ["query"]}},
    {"name": "search_reg_rules", "description": "Search compliance", "parameters": {"type": "object", "properties": {"query": {"type": "string"}}, "required": ["query"]}},
    {"name": "explain", "description": "Add explanation + audit. Call LAST.", "parameters": {"type": "object", "properties": {"recommendation": {"type": "object", "properties": {"reason": {"type": "string"}, "suitability_tag": {"type": "string", "enum": ["suitable", "needs_review", "not_suitable"]}, "product_name": {"type": "string"}}, "required": ["reason", "suitability_tag"]}}, "required": ["recommendation"]}},
]

OPENAI_TOOLS = [{"type": "function", "function": f} for f in FUNCTIONS]

MAX_ITER = 8
GROQ_API_BASE = "https://api.groq.com/openai/v1"

EMPTY_TURN = {"reply": None, "cards": [], "rationale": None, "suitability_tag": None, "audit_id": None}


def _exec(name, inp, cid, cache):
    if name == "unification": r = unification.run(cid)
    elif name == "surplus": r = surplus.run(cid)
    elif name == "scenario": r = scenario.run(cid, inp.get("goal_name"), inp.get("extra_monthly_contribution",0), inp.get("one_time_delta",0))
    elif name == "behaviour": r = behaviour.run(cid)
    elif name == "life_event": r = life_event.run(cid)
    elif name == "suitability": r = suitability.run(cid); persist_recommendations(cid, r["value"]["recommendations"])
    elif name == "search_products": return {"products": search_products(inp["query"])}
    elif name == "search_reg_rules": return {"rules": search_reg_rules(inp["query"])}
    elif name == "explain": r = explain.run(cid, cache, inp["recommendation"])
    else: return {"error": f"Unknown {name}"}
    cache[name] = r
    return r


def _collect(fn_name, result, cache, cards, state):
    if fn_name in ("surplus", "scenario", "suitability", "life_event", "behaviour"):
        cards.append({"type": fn_name, "data": result.get("value", result)})
    if fn_name == "explain":
        state["rationale"] = result["value"]["rationale"]
        state["suitability_tag"] = result["value"]["suitability_tag"]
        state["audit_id"] = result["value"]["audit_id"]


def _run_gemini(customer_id, message):
    model = genai.GenerativeModel(model_name=GEMINI_MODEL, system_instruction=SYSTEM_PROMPT, tools=[{"function_declarations": FUNCTIONS}])
    chat = model.start_chat()
    cache, cards, state = {}, [], {"rationale": None, "suitability_tag": None, "audit_id": None}
    msg = message
    for _ in range(MAX_ITER):
        resp = chat.send_message(msg)
        fcs = [p for p in resp.parts if p.function_call]
        if not fcs:
            return {"reply": resp.text or "Not sure.", "cards": cards, **state}
        parts = []
        for p in fcs:
            fn = p.function_call
            result = _exec(fn.name, {k: v for k, v in fn.args.items()}, customer_id, cache)
            _collect(fn.name, result, cache, cards, state)
            parts.append(genai.protos.Part(function_response=genai.protos.FunctionResponse(name=fn.name, response={"result": json.loads(json.dumps(result, default=str))})))
        msg = genai.protos.Content(parts=parts, role="user")
    return {"reply": "Still thinking - ask again?", "cards": cards, **state}


def _run_groq(customer_id, message):
    if not GROQ_API_KEY:
        raise RuntimeError("GROQ_API_KEY not configured")
    messages = [{"role": "system", "content": SYSTEM_PROMPT}, {"role": "user", "content": message}]
    cache, cards, state = {}, [], {"rationale": None, "suitability_tag": None, "audit_id": None}
    headers = {"Authorization": f"Bearer {GROQ_API_KEY}", "Content-Type": "application/json"}
    for _ in range(MAX_ITER):
        resp = httpx.post(
            f"{GROQ_API_BASE}/chat/completions",
            headers=headers,
            json={"model": GROQ_MODEL, "messages": messages, "tools": OPENAI_TOOLS, "tool_choice": "auto"},
            timeout=30,
        )
        resp.raise_for_status()
        choice = resp.json()["choices"][0]["message"]
        tool_calls = choice.get("tool_calls")
        if not tool_calls:
            return {"reply": choice.get("content") or "Not sure.", "cards": cards, **state}
        messages.append(choice)
        for tc in tool_calls:
            fn_name = tc["function"]["name"]
            fn_args = json.loads(tc["function"].get("arguments") or "{}")
            result = _exec(fn_name, fn_args, customer_id, cache)
            _collect(fn_name, result, cache, cards, state)
            messages.append({
                "role": "tool",
                "tool_call_id": tc["id"],
                "content": json.dumps({"result": json.loads(json.dumps(result, default=str))}),
            })
    return {"reply": "Still thinking - ask again?", "cards": cards, **state}


def run_advisor_turn(customer_id, message):
    errors = []
    if GEMINI_API_KEY:
        try:
            return _run_gemini(customer_id, message)
        except Exception as e:
            errors.append(f"Gemini: {str(e)[:150]}")
    if GROQ_API_KEY:
        try:
            return _run_groq(customer_id, message)
        except Exception as e:
            errors.append(f"Groq: {str(e)[:150]}")
    if not errors:
        errors.append("No orchestrator LLM configured (set GEMINI_API_KEY or GROQ_API_KEY).")
    return {**EMPTY_TURN, "reply": f"Error: {' | '.join(errors)}"}
