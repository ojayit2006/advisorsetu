"""Orchestrator - Gemini tool-calling loop over the 7 engines + RAG."""
import json, os
from typing import Any
import google.generativeai as genai
from config import GEMINI_API_KEY, GEMINI_MODEL
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

MAX_ITER = 8

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

def run_advisor_turn(customer_id, message):
    model = genai.GenerativeModel(model_name=GEMINI_MODEL, system_instruction=SYSTEM_PROMPT, tools=[{"function_declarations": FUNCTIONS}])
    chat = model.start_chat()
    cache, cards, audit_id, tag, rationale = {}, [], None, None, None
    msg = message
    for _ in range(MAX_ITER):
        try: resp = chat.send_message(msg)
        except Exception as e: return {"reply": f"Error: {str(e)[:200]}", "cards": cards, "rationale": rationale, "suitability_tag": tag, "audit_id": audit_id}
        fcs = [p for p in resp.parts if p.function_call]
        if not fcs: return {"reply": resp.text or "Not sure.", "cards": cards, "rationale": rationale, "suitability_tag": tag, "audit_id": audit_id}
        parts = []
        for p in fcs:
            fn = p.function_call; result = _exec(fn.name, {k:v for k,v in fn.args.items()}, customer_id, cache)
            if fn.name in ("surplus","scenario","suitability","life_event","behaviour"): cards.append({"type": fn.name, "data": result.get("value",result)})
            if fn.name == "explain": rationale = result["value"]["rationale"]; tag = result["value"]["suitability_tag"]; audit_id = result["value"]["audit_id"]
            parts.append(genai.protos.Part(function_response=genai.protos.FunctionResponse(name=fn.name, response={"result": json.loads(json.dumps(result, default=str))})))
        msg = genai.protos.Content(parts=parts, role="user")
    return {"reply": "Still thinking - ask again?", "cards": cards, "rationale": rationale, "suitability_tag": tag, "audit_id": audit_id}
