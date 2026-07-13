"""
Tavus AI Avatar API v2 client.

Handles conversation lifecycle (create, end, get status) with the Tavus API.
Used by backend/main.py to create avatar sessions and process webhooks.

API docs: https://docs.tavus.io/api-reference
Base URL: https://tavusapi.com/v2
"""
import logging
from typing import Any

import httpx

from config import TAVUS_API_KEY, TAVUS_REPLICA_ID, TAVUS_API_BASE

logger = logging.getLogger(__name__)


class TavusError(Exception):
    """Wraps a failed Tavus API call with status and detail."""

    def __init__(self, message: str, status: int | None = None, detail: str | None = None):
        super().__init__(message)
        self.status = status
        self.detail = detail


class TavusClient:
    """HTTP client for the Tavus API v2."""

    def __init__(
        self,
        api_key: str | None = None,
        replica_id: str | None = None,
        base_url: str | None = None,
        timeout: float = 15.0,
    ):
        self.api_key = api_key or TAVUS_API_KEY
        self.replica_id = replica_id or TAVUS_REPLICA_ID
        self.base_url = (base_url or TAVUS_API_BASE).rstrip("/")
        self._timeout = timeout
        self._headers = {
            "x-api-key": self.api_key,
            "Content-Type": "application/json",
        }

    # ── Public API ─────────────────────────────────────────────────────────

    async def create_conversation(
        self,
        webhook_url: str,
        customer_id: str | None = None,
        start_message: str = "Hi, I'm MIA, your wealth advisor. How can I help you today?",
    ) -> dict[str, Any]:
        """Create a new Tavus conversation and return its details.

        Args:
            webhook_url: Public URL Tavus will POST user transcripts to.
            customer_id: Optional identifier stored with the conversation.
            start_message: Greeting Olivia speaks when the conversation starts.

        Returns:
            dict with keys: conversation_id, conversation_url, status, created_at.

        Raises:
            TavusError: If the API call fails.
        """
        if not self.api_key:
            raise TavusError("TAVUS_API_KEY is not configured", status=401)
        if not self.replica_id:
            raise TavusError("TAVUS_REPLICA_ID is not configured", status=400)

        payload: dict[str, Any] = {
            "replica_id": self.replica_id,
            "conversation_name": f"mia-wealth-{customer_id or 'demo'}",
            "callback_url": webhook_url,
        }

        return await self._request("POST", "/conversations", json=payload)

    async def end_conversation(self, conversation_id: str) -> dict[str, Any]:
        """End a Tavus conversation.

        Returns:
            dict with status information.
        """
        return await self._request("POST", f"/conversations/{conversation_id}/end")

    async def get_conversation(self, conversation_id: str) -> dict[str, Any]:
        """Get the current status of a Tavus conversation."""
        return await self._request("GET", f"/conversations/{conversation_id}")

    # ── Internal HTTP helper ───────────────────────────────────────────────

    async def _request(self, method: str, path: str, **kwargs) -> dict[str, Any]:
        url = f"{self.base_url}{path}"
        try:
            async with httpx.AsyncClient(timeout=self._timeout) as client:
                resp = await client.request(
                    method, url, headers=self._headers, **kwargs
                )
        except httpx.TimeoutException as exc:
            logger.error("Tavus API timeout: %s %s", method, url)
            raise TavusError(
                f"Tavus API timed out after {self._timeout}s",
                status=504,
                detail=str(exc),
            ) from exc
        except httpx.RequestError as exc:
            logger.error("Tavus API request failed: %s %s — %s", method, url, exc)
            raise TavusError(
                f"Tavus API request failed: {exc}",
                status=502,
                detail=str(exc),
            ) from exc

        try:
            data: dict[str, Any] = resp.json()
        except Exception as exc:
            logger.error("Tavus API non-JSON response: %s %s — %s", method, url, resp.text[:200])
            raise TavusError(
                f"Tavus API returned non-JSON: {resp.text[:200]}",
                status=resp.status_code,
                detail=str(exc),
            ) from exc

        if resp.status_code >= 400:
            logger.error(
                "Tavus API error: %s %s → %s %s",
                method, url, resp.status_code, data,
            )
            detail = data.get("detail") or data.get("message") or str(data)
            raise TavusError(
                f"Tavus API error: {detail}",
                status=resp.status_code,
                detail=str(data),
            )

        return data
