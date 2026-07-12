"""
Thread-safe in-memory store for Tavus conversation turn data.

The Tavus webhook endpoint only returns text back to Tavus (which Olivia speaks).
The full advisor-turn response (cards, rationale, suitability_tag, audit_id) gets
stored here so the frontend can poll for it and render alongside the avatar.

Thread-safe via threading.Lock. Suitable for demo/hackathon — swap for Redis in prod.
"""
import time
import threading
from uuid import uuid4
from collections import defaultdict


class TurnStore:
    """In-memory store mapping conversation_id -> turns + metadata."""

    def __init__(self, max_age: float = 1800.0):
        self._lock = threading.Lock()
        self._max_age = max_age  # seconds before a conversation is considered stale
        self._convos: dict[str, dict] = {}
        self._turns: dict[str, list[dict]] = defaultdict(list)

    def register_conversation(self, conversation_id: str, customer_id: str) -> None:
        with self._lock:
            self._convos[conversation_id] = {
                "customer_id": customer_id,
                "created_at": time.time(),
            }

    def get_customer_id(self, conversation_id: str) -> str | None:
        with self._lock:
            meta = self._convos.get(conversation_id)
            return meta["customer_id"] if meta else None

    def conversation_exists(self, conversation_id: str) -> bool:
        with self._lock:
            return conversation_id in self._convos

    def remove_conversation(self, conversation_id: str) -> None:
        with self._lock:
            self._convos.pop(conversation_id, None)
            self._turns.pop(conversation_id, None)

    def append_turn(self, conversation_id: str, result: dict) -> str:
        turn_id = str(uuid4())
        entry = {
            "turn_id": turn_id,
            "reply": result.get("reply", ""),
            "cards": result.get("cards", []),
            "rationale": result.get("rationale"),
            "suitability_tag": result.get("suitability_tag"),
            "audit_id": result.get("audit_id"),
            "created_at": time.time(),
        }
        with self._lock:
            self._turns[conversation_id].append(entry)
            if conversation_id in self._convos:
                self._convos[conversation_id]["created_at"] = time.time()
        return turn_id

    def get_turns(self, conversation_id: str, since_turn_id: str | None = None) -> list[dict]:
        with self._lock:
            turns = list(self._turns.get(conversation_id, []))
        if since_turn_id is None:
            return turns
        for i, t in enumerate(turns):
            if t["turn_id"] == since_turn_id:
                return turns[i + 1:]
        return turns

    def get_conversation_status(self, conversation_id: str) -> dict | None:
        with self._lock:
            meta = self._convos.get(conversation_id)
            if meta is None:
                return None
            return {
                "conversation_id": conversation_id,
                "customer_id": meta["customer_id"],
                "created_at": meta["created_at"],
                "turn_count": len(self._turns.get(conversation_id, [])),
            }

    def cleanup_stale(self) -> int:
        now = time.time()
        stale = []
        with self._lock:
            for cid, meta in self._convos.items():
                if now - meta["created_at"] > self._max_age:
                    stale.append(cid)
            for cid in stale:
                self._convos.pop(cid, None)
                self._turns.pop(cid, None)
        return len(stale)
