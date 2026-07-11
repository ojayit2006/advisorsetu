"use client";

import { useEffect, useState } from "react";
import { api, BACKEND_URL } from "@/lib/api";
import type { AdvisorTurnResponse, MiaAdvisorTurnMessage } from "@/lib/types";
import SuitabilityPill from "@/components/SuitabilityPill";
import WhyPanel from "@/components/WhyPanel";

type Turn = AdvisorTurnResponse & { at: string; source: "avatar" | "chat" };

export default function CopilotPage() {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [customerId, setCustomerId] = useState<string | null>(null);

  useEffect(() => {
    api
      .getDefaultCustomer()
      .then((r) => setCustomerId(r.customer_id))
      .catch(() => {
        /* the text-fallback still works without a customer id — backend defaults it */
      });
  }, []);

  useEffect(() => {
    function handler(event: MessageEvent) {
      const data = event.data as Partial<MiaAdvisorTurnMessage> | undefined;
      if (data?.type === "mia-advisor-turn" && data.payload) {
        setTurns((prev) => [{ ...data.payload!, at: new Date().toISOString(), source: "avatar" }, ...prev]);
      }
    }
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);

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

  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="text-xs font-bold uppercase tracking-widest text-maroon">RM Co-pilot</div>
        <h1 className="font-display font-bold text-3xl mt-1">Talk to MIA alongside the customer</h1>
        <p className="text-sm text-ink/70 mt-1 max-w-2xl">
          The avatar handles voice end-to-end. Every turn&apos;s rationale and suitability tag renders live
          here, so the RM can see — and show the customer — exactly why MIA said what it said.
        </p>
      </div>

      <div className="grid lg:grid-cols-[minmax(0,1fr)_420px] gap-6 items-start">
        <div className="neo-card overflow-hidden" style={{ aspectRatio: "16/10" }}>
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
                No turns yet. Speak to MIA in the avatar panel, or use the text fallback.
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
                      <div key={ci} className="border-2 border-ink/20 p-2 text-xs font-mono bg-cream-dark/40">
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
