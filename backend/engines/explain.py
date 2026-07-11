"""Explainability/Compliance engine — the moat. Wraps any recommendation with a
structured inputs -> assumptions -> reasoning -> risk/suitability trail and writes it
to the audit log. Every recommendation shown to the customer or RM passes through here."""
from audit import write_audit

RISK_DISCLOSURE = (
    "This is educational, suitability-matched guidance from a distributor, not investment advice under "
    "SEBI's advice/distribution boundary. Returns are indicative, not guaranteed, and subject to market risk."
)


def run(customer_id: str, engine_envelopes: dict, recommendation: dict, actor: str = None) -> dict:
    """
    engine_envelopes: {engine_name: {"value", "inputs_used", "assumptions", "confidence"}, ...}
        — the raw engine outputs that fed this recommendation.
    recommendation: the specific recommendation/answer being explained (dict with at least
        a "reason" or "message" and optionally "suitability_tag").
    """
    inputs_used = sorted({i for env in engine_envelopes.values() for i in env.get("inputs_used", [])})
    assumptions = sorted({a for env in engine_envelopes.values() for a in env.get("assumptions", [])})
    avg_confidence = (
        round(sum(env.get("confidence", 0) for env in engine_envelopes.values()) / len(engine_envelopes), 2)
        if engine_envelopes else None
    )

    suitability_tag = recommendation.get("suitability_tag", "suitable")
    reasoning = recommendation.get("reason") or recommendation.get("message") or "No specific rationale provided."

    rationale = {
        "inputs": inputs_used,
        "assumptions": assumptions,
        "reasoning": reasoning,
        "engines_consulted": list(engine_envelopes.keys()),
        "confidence": avg_confidence,
        "risk_disclosure": RISK_DISCLOSURE,
    }

    audit_id = write_audit(
        action="explained_recommendation",
        entity_type="recommendation",
        entity_id=recommendation.get("id") or recommendation.get("product_name") or "unspecified",
        pii_accessed=True,
        metadata={"customer_id": customer_id, "suitability_tag": suitability_tag, "engines": list(engine_envelopes.keys())},
        actor=actor,
    )

    return {
        "value": {"rationale": rationale, "suitability_tag": suitability_tag, "audit_id": audit_id},
        "inputs_used": ["engine outputs consulted for this turn"],
        "assumptions": ["Suitability tag defaults to 'suitable' unless an upstream engine flags 'needs_review'."],
        "confidence": avg_confidence or 0.8,
    }
