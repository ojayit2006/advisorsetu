"""Shared audit-log writer. Reuses the create_audit_log RPC pattern from kumbhsaathi;
falls back to an in-memory log when running in MOCK_MODE so the compliance trail is
still visible in the demo without a live Supabase project."""
import uuid
from datetime import datetime

from config import DEMO_ACTOR, MOCK_MODE
from db import rpc, select

_MEMORY_LOG: list[dict] = []


def write_audit(action: str, entity_type: str, entity_id: str, pii_accessed: bool = False,
                 metadata: dict = None, actor: str = None) -> str:
    actor = actor or DEMO_ACTOR
    metadata = metadata or {}
    if MOCK_MODE:
        audit_id = str(uuid.uuid4())
        _MEMORY_LOG.insert(0, {
            "id": audit_id, "actor": actor, "action": action, "entity_type": entity_type,
            "entity_id": entity_id, "pii_accessed": pii_accessed, "metadata": metadata,
            "created_at": datetime.now().isoformat() + "Z",
        })
        return audit_id
    result = rpc("create_audit_log", {
        "p_actor": actor, "p_action": action, "p_entity_type": entity_type, "p_entity_id": entity_id,
        "p_pii_accessed": pii_accessed, "p_metadata": metadata,
    })
    return result if isinstance(result, str) else result.get("id") if isinstance(result, dict) else str(result)


def recent_audit_logs(limit: int = 50) -> list[dict]:
    if MOCK_MODE:
        return _MEMORY_LOG[:limit]
    return select("audit_logs", {"order": "created_at.desc", "limit": str(limit)})
