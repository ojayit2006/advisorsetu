"use client";

import { useEffect, useState } from "react";
import { api, BACKEND_URL } from "@/lib/api";
import type { AdvisorTurnResponse, MiaAdvisorTurnMessage, TavusTurnResult } from "@/lib/types";
import SuitabilityPill from "@/components/SuitabilityPill";
import WhyPanel from "@/components/WhyPanel";

type Turn = AdvisorTurnResponse & { at: string; source: "avatar" | "chat" };

const POLL_MS = 2000;
const TAVUS_URL = "https://tavus.daily.co/cea5dac98a73f4d5";

export default function CopilotPage() {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [seenTurnIds, setSeenTurnIds] = useState<Set<string>>(new Set());
  const [avatarActive, setAvatarActive] = useState(false);

  useEffect(() => {
    api
      .getDefaultCustomer()
      .then((r) => setCustomerId(r.customer_id))
      .catch(() => {
        /* the text-fallback still works without a customer id — backend defaults it */
      });
  }, []);

  // ── Receive avatar turn data ──────────────────────────────────
  // 1. postMessage from the avatar iframe (fast path)
  // 2. Polling /tavus/latest-turn as fallback

  useEffect(() => {
    function handler(event: MessageEvent) {
      const data = event.data as Record<string, unknown>;
      if (data?.type === "mia-advisor-turn" && data.payload) {
        const p = data.payload as AdvisorTurnResponse;
        const turnId = p.audit_id || p.reply.slice(0, 20);
        setSeenTurnIds((prev) => new Set(prev).add(turnId));
        setTurns((prev) => [{ ...p, at: new Date().toISOString(), source: "avatar" }, ...prev]);
      }
      if (data?.type === "mia-conversation-started") {
        setAvatarActive(true);
      }
    }
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const poll = async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/tavus/latest-turn`);
        const data = await res.json();
        const turn: TavusTurnResult | null = data?.turn ?? null;
        if (turn && turn.turn_id && !seenTurnIds.has(turn.turn_id)) {
          setSeenTurnIds((prev) => new Set(prev).add(turn.turn_id!));
          setTurns((prev) => [
            {
              reply: turn.reply,
              cards: turn.cards ?? [],
              rationale: turn.rationale ?? null,
              suitability_tag: turn.suitability_tag ?? "needs_review",
              audit_id: turn.audit_id ?? "",
              at: new Date().toISOString(),
              source: "avatar",
            },
            ...prev,
          ]);
          setAvatarActive(true);
        }
      } catch {
        // backend might not have the endpoint — silently skip
      }
    };
    const interval = setInterval(poll, POLL_MS);
    poll(); // immediate first call
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [seenTurnIds]);

  async function sendMessage() {
    const trimmed = message.trim();
    if (!trimmed) return;
    setSending(true);
    try {
      const res = await api.postAdvisorTurn({ customer_id: customerId ?? undefined, message: trimmed });
      setTurns((prev) => [{ ...res, at: new Date().toISOString(), source: "chat" }, ...prev]);
      setMessage("");
    } catch (e) {
      setTurns((prev) => [
        {
          reply: `Error: ${e instanceof Error ? e.message : "advisor-turn failed"}`,
          cards: [],
          rationale: {},
          suitability_tag: "needs_review",
          audit_id: "",
          at: new Date().toISOString(),
          source: "chat",
        },
        ...prev,
      ]);
    } finally {
      setSending(false);
    }
  }

  function startAvatarConversation() {
    setAvatarActive(true);
    window.open(TAVUS_URL, "_blank", "noopener,noreferrer");
    try {
      const iframe = document.querySelector<HTMLIFrameElement>('iframe[title="MIA Avatar"]');
      iframe?.contentWindow?.postMessage({ type: "mia-conversation-started", url: TAVUS_URL }, "*");
    } catch (_) {}
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <div className="text-xs font-bold uppercase tracking-widest text-maroon">RM Co-pilot</div>
          <h1 className="font-display font-bold text-3xl mt-1">Talk to MIA alongside the customer</h1>
          <p className="text-sm text-ink/70 mt-1 max-w-2xl">
            The avatar handles voice end-to-end. Every turn&apos;s rationale and suitability tag renders live
            here, so the RM can see — and show the customer — exactly why MIA said what it said.
          </p>
        </div>
        <button
          type="button"
          className="neo-btn neo-btn-primary px-5 py-3 text-sm whitespace-nowrap flex items-center gap-2"
          onClick={startAvatarConversation}
        >
          {avatarActive ? (
            <>
              <span className="w-2 h-2 rounded-full bg-ok animate-pulse" />
              MIA active
            </>
          ) : (
            <>
              🎙️ Start conversation
            </>
          )}
        </button>
      </div>

      <div className="grid lg:grid-cols-[minmax(0,1fr)_420px] gap-6 items-start">
        <div className="neo-card overflow-hidden relative" style={{ aspectRatio: "16/10" }}>
          {avatarActive && (
            <div className="absolute top-2 right-2 z-10 flex items-center gap-1.5 bg-ok/20 text-ok text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border border-ok/30">
              <span className="w-1.5 h-1.5 rounded-full bg-ok animate-pulse" />
              MIA active
            </div>
          )}
          <iframe
            src={BACKEND_URL}
            title="MIA Avatar"
            className="w-full h-full border-0"
            allow="camera; microphone; autoplay"
          />
        </div>

        <div className="flex flex-col gap-4">
          <div className="neo-card p-4">
            <div className="text-xs font-bold uppercase tracking-widest text-ink/50 mb-2">Text fallback</div>
            <div className="flex gap-2">
              <input
                className="neo-input"
                placeholder="Ask MIA something…"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") sendMessage();
                }}
              />
              <button
                type="button"
                className="neo-btn neo-btn-primary px-4 whitespace-nowrap"
                onClick={sendMessage}
                disabled={sending}
              >
                {sending ? "…" : "Send"}
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-4 max-h-[60vh] overflow-y-auto pr-1">
            {turns.length === 0 && (
              <div className="neo-card p-4 text-sm text-ink/50">
                No turns yet. Click <strong>Start conversation</strong> above to open MIA, or use the text chat.
              </div>
            )}
            {turns.map((t, idx) => (
              <div key={idx} className="neo-card p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="badge">{t.source === "avatar" ? "Avatar turn" : "Text fallback"}</span>
                  <SuitabilityPill tag={t.suitability_tag} />
                </div>
                <p className="text-sm font-medium">{t.reply}</p>
                {t.cards?.length > 0 && (
                  <div className="flex flex-col gap-2 mt-3">
                    {t.cards.map((c, ci) => (
                      <div key={ci} className="border border-ink/15 rounded p-2 text-xs font-mono bg-cream-dark/40">
                        <div className="font-bold uppercase tracking-wide mb-1">{c.type}</div>
                        <pre className="whitespace-pre-wrap break-words">{JSON.stringify(c.data, null, 2)}</pre>
                      </div>
                    ))}
                  </div>
                )}
                <WhyPanel rationale={t.rationale} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
