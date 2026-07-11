"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import type { Recommendation } from "@/lib/types";
import { mapDbRecommendation, type DbRecommendationRow } from "@/lib/mappers";
import { formatINR } from "@/lib/format";
import RecommendationCard from "@/components/RecommendationCard";
import PageState from "@/components/PageState";

const POLL_MS = 5000;

export default function RecommendationsPage() {
  const [recs, setRecs] = useState<Recommendation[]>([]);
  const [riskProfile, setRiskProfile] = useState<string | null>(null);
  const [surplusUsed, setSurplusUsed] = useState<number | null>(null);
  const [envelope, setEnvelope] = useState<{ inputs?: string[]; assumptions?: string[]; confidence?: number }>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [live, setLive] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let pollId: ReturnType<typeof setInterval> | null = null;
    let channel: ReturnType<NonNullable<typeof supabase>["channel"]> | null = null;

    async function load(customerId: string) {
      const res = await api.getRecommendations(customerId);
      if (cancelled) return;
      setRecs(res.value?.recommendations ?? []);
      setRiskProfile(res.value?.risk_profile ?? null);
      setSurplusUsed(res.value?.surplus_used ?? null);
      setEnvelope({ inputs: res.inputs_used, assumptions: res.assumptions, confidence: res.confidence });
    }

    (async () => {
      try {
        const { customer_id } = await api.getDefaultCustomer();
        if (cancelled) return;
        await load(customer_id);
        if (cancelled) return;
        setLoading(false);

        if (isSupabaseConfigured && supabase) {
          setLive(true);
          channel = supabase
            .channel(`recommendations-${customer_id}`)
            .on(
              "postgres_changes",
              { event: "*", schema: "public", table: "recommendations", filter: `customer_id=eq.${customer_id}` },
              (payload) => {
                if (payload.eventType === "INSERT") {
                  const mapped = mapDbRecommendation(payload.new as DbRecommendationRow);
                  setRecs((prev) => [mapped, ...prev]);
                } else if (payload.eventType === "UPDATE") {
                  const mapped = mapDbRecommendation(payload.new as DbRecommendationRow);
                  setRecs((prev) => prev.map((r) => (r.id === mapped.id ? mapped : r)));
                }
              }
            )
            .subscribe();
        } else {
          pollId = setInterval(() => {
            load(customer_id).catch(() => {});
          }, POLL_MS);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load recommendations");
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
      if (pollId) clearInterval(pollId);
      if (channel && supabase) supabase.removeChannel(channel);
    };
  }, []);

  if (loading) return <PageState text="Loading recommendations…" />;
  if (error) return <PageState text={error} isError />;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <div className="text-xs font-bold uppercase tracking-widest text-maroon">Recommendation Feed</div>
          <h1 className="font-display font-bold text-3xl mt-1">Suitability-matched recommendations</h1>
        </div>
        <span className={`badge ${live ? "bg-ok text-cream" : "bg-cream-dark"}`}>
          {live ? "● Realtime" : `Polling every ${POLL_MS / 1000}s`}
        </span>
      </div>

      <div className="flex gap-3 flex-wrap text-xs">
        {riskProfile && <span className="badge bg-ink text-cream capitalize">Risk profile: {riskProfile}</span>}
        {surplusUsed !== null && <span className="badge">Surplus used: {formatINR(surplusUsed)}</span>}
      </div>

      <div className="grid md:grid-cols-2 gap-5">
        {recs.length ? (
          recs.map((r, idx) => (
            <RecommendationCard
              key={r.id ?? idx}
              rec={r}
              envelopeInputs={envelope.inputs}
              envelopeAssumptions={envelope.assumptions}
              envelopeConfidence={envelope.confidence}
            />
          ))
        ) : (
          <p className="text-sm text-ink/50">No recommendations yet.</p>
        )}
      </div>
    </div>
  );
}
