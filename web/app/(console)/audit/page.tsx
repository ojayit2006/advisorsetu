"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import type { AuditLog } from "@/lib/types";
import AuditLogRow from "@/components/AuditLogRow";
import PageState from "@/components/PageState";

const POLL_MS = 5000;

export default function AuditPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [live, setLive] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let pollId: ReturnType<typeof setInterval> | null = null;
    let channel: ReturnType<NonNullable<typeof supabase>["channel"]> | null = null;

    async function load() {
      const res = await api.getAuditLogs(50);
      if (!cancelled) setLogs(res.logs ?? []);
    }

    (async () => {
      try {
        await load();
        if (cancelled) return;
        setLoading(false);

        if (isSupabaseConfigured && supabase) {
          setLive(true);
          channel = supabase
            .channel("audit-logs-feed")
            .on("postgres_changes", { event: "INSERT", schema: "public", table: "audit_logs" }, (payload) => {
              setLogs((prev) => [payload.new as AuditLog, ...prev].slice(0, 100));
            })
            .subscribe();
        } else {
          pollId = setInterval(() => {
            load().catch(() => {});
          }, POLL_MS);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load audit logs");
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

  if (loading) return <PageState text="Loading audit trail…" />;
  if (error) return <PageState text={error} isError />;

  const piiCount = logs.filter((l) => l.pii_accessed).length;

  return (
    <div className="flex flex-col gap-6">
      <div className="neo-card-cream p-5" style={{ borderLeft: "8px solid var(--color-maroon)" }}>
        <div className="text-xs font-bold uppercase tracking-widest text-maroon">The moat</div>
        <h1 className="font-display font-bold text-2xl mt-1">Audit &amp; Compliance trail</h1>
        <p className="text-sm text-ink/70 mt-2 max-w-2xl">
          Every action MIA takes — every recommendation, every PII access — is written to an immutable
          audit log with actor, action, entity, and full metadata. This is what makes the advice
          defensible to a regulator, not just to a customer.
        </p>
      </div>

      <div className="flex items-center gap-3 flex-wrap text-xs">
        <span className={`badge ${live ? "bg-ok text-cream" : "bg-cream-dark"}`}>
          {live ? "● Realtime" : `Polling every ${POLL_MS / 1000}s`}
        </span>
        <span className="badge">{logs.length} entries</span>
        <span className="badge bg-danger text-cream">{piiCount} PII accesses</span>
      </div>

      <div className="flex flex-col gap-3">
        {logs.length ? (
          logs.map((l) => <AuditLogRow key={l.id} log={l} />)
        ) : (
          <p className="text-sm text-ink/50">No audit entries yet.</p>
        )}
      </div>
    </div>
  );
}
