"""
Orchestrator — Claude tool-calling loop over the 7 engines + RAG.
Manual loop (not the beta tool runner) because several tools have side effects
(explain writes an audit log) and we want a synchronous FastAPI handler.
"""
import json
import os

import anthropic

from config import ANTHROPIC_API_KEY, ANTHROPIC_MODEL
from engines import behaviour, explain, life_event, scenario, suitability, surplus, unification
from rag.retrieval import search_products, search_reg_rules
from recommendations_store import persist_recommendations

client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)

with open(os.path.join(os.path.dirname(__file__), "prompts", "system_advisor.md"), encoding="utf-8") as f:
    SYSTEM_PROMPT = f.read()

TOOLS = [
    {"name": "unification", "description": "Net worth, cash, holdings, institutions for the customer.",
     "input_schema": {"type": "object", "properties": {}, "required": []}},
    {"name": "surplus", "description": "Monthly investable surplus with a breakdown of income/outflows.",
     "input_schema": {"type": "object", "properties": {}, "required": []}},
    {"name": "scenario", "description": "Monte Carlo goal probability, and what-if deltas against a named goal.",
     "input_schema": {"type": "object", "properties": {
         "goal_name": {"type": "string", "description": "Substring of the goal name, e.g. 'home' or 'car'."},
         "extra_monthly_contribution": {"type": "number", "description": "Additional monthly investment to simulate."},
         "one_time_delta": {"type": "number", "description": "One-time inflow (positive) or expense (negative)."},
     }, "required": []}},
    {"name": "behaviour", "description": "Spend-creep nudges and a panic-selling proxy flag.",
     "input_schema": {"type": "object", "properties": {}, "required": []}},
    {"name": "life_event", "description": "Merchant-signal life events (e.g. wedding) and idle-cash opportunities.",
     "input_schema": {"type": "object", "properties": {}, "required": []}},
    {"name": "suitability", "description": "Ranked, risk-matched product recommendations given surplus + triggers.",
     "input_schema": {"type": "object", "properties": {}, "required": []}},
    {"name": "search_products", "description": "Keyword search over the product catalog.",
     "input_schema": {"type": "object", "properties": {"query": {"type": "string"}}, "required": ["query"]}},
    {"name": "search_reg_rules", "description": "Keyword search over compliance ground rules.",
     "input_schema": {"type": "object", "properties": {"query": {"type": "string"}}, "required": ["query"]}},
    {"name": "explain", "description": "Wrap a recommendation with inputs->assumptions->reasoning->suitability_tag "
                                       "and write the audit log. Call this LAST, once, before your final reply.",
     "input_schema": {"type": "object", "properties": {
         "recommendation": {
             "type": "object",
             "description": "The specific answer/recommendation being explained.",
             "properties": {
                 "reason": {"type": "string"}, "message": {"type": "string"},
                 "suitability_tag": {"type": "string", "enum": ["suitable", "needs_review", "not_suitable"]},
                 "product_name": {"type": "string"},
             },
         },
     }, "required": ["recommendation"]}},
]

MAX_ITERATIONS = 8


def _execute_tool(name: str, tool_input: dict, customer_id: str, engine_cache: dict) -> dict:
    if name == "unification":
        result = unification.run(customer_id)
    elif name == "surplus":
        result = surplus.run(customer_id)
    elif name == "scenario":
        result = scenario.run(customer_id, tool_input.get("goal_name"),
                               tool_input.get("extra_monthly_contribution", 0),
                               tool_input.get("one_time_delta", 0))
    elif name == "behaviour":
        result = behaviour.run(customer_id)
    elif name == "life_event":
        result = life_event.run(customer_id)
    elif name == "suitability":
        result = suitability.run(customer_id)
        persist_recommendations(customer_id, result["value"]["recommendations"])
    elif name == "search_products":
        return {"products": search_products(tool_input["query"])}
    elif name == "search_reg_rules":
        return {"rules": search_reg_rules(tool_input["query"])}
    elif name == "explain":
        result = explain.run(customer_id, engine_cache, tool_input["recommendation"])
    else:
        return {"error": f"Unknown tool {name}"}

    engine_cache[name] = result
    return result


def run_advisor_turn(customer_id: str, message: str) -> dict:
    messages = [{"role": "user", "content": message}]
    engine_cache = {}
    cards = []
    audit_id = None
    suitability_tag = None
    rationale = None

    for _ in range(MAX_ITERATIONS):
        response = client.messages.create(
            model=ANTHROPIC_MODEL,
            max_tokens=1024,
            system=SYSTEM_PROMPT,
            tools=TOOLS,
            thinking={"type": "adaptive"},
            output_config={"effort": "medium"},
            messages=messages,
        )

        if response.stop_reason != "tool_use":
            reply = next((b.text for b in response.content if b.type == "text"), "")
            return {
                "reply": reply, "cards": cards, "rationale": rationale,
                "suitability_tag": suitability_tag, "audit_id": audit_id,
            }

        messages.append({"role": "assistant", "content": response.content})
        tool_results = []
        for block in response.content:
            if block.type != "tool_use":
                continue
            result = _execute_tool(block.name, block.input, customer_id, engine_cache)
            if block.name in ("surplus", "scenario", "suitability", "life_event", "behaviour"):
                cards.append({"type": block.name, "data": result.get("value", result)})
            if block.name == "explain":
                rationale = result["value"]["rationale"]
                suitability_tag = result["value"]["suitability_tag"]
                audit_id = result["value"]["audit_id"]
            tool_results.append({
                "type": "tool_result", "tool_use_id": block.id, "content": json.dumps(result, default=str),
            })
        messages.append({"role": "user", "content": tool_results})

    return {
        "reply": "I'm still working through that — could you ask again in a moment?",
        "cards": cards, "rationale": rationale, "suitability_tag": suitability_tag, "audit_id": audit_id,
    }
