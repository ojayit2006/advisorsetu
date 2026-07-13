"use client";

import { useState } from "react";
import type { AuditLog } from "@/lib/types";
import { formatDateTime } from "@/lib/format";

export default function AuditLogRow({ log }: { log: AuditLog }) {
  const [open, setOpen] = useState(false);
  const hasMetadata = log.metadata && Object.keys(log.metadata).length > 0;

  return (
    <div className="neo-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="badge bg-ink text-cream">{log.action}</span>
          <span className="text-sm font-bold capitalize">{log.entity_type}</span>
          {log.entity_id && (
            <span className="text-xs text-ink/50 font-mono">#{log.entity_id.slice(0, 8)}</span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {log.pii_accessed && <span className="badge bg-danger text-cream">PII accessed</span>}
          <span className="text-xs text-ink/50 font-mono">{formatDateTime(log.created_at)}</span>
        </div>
      </div>

      <div className="mt-2 text-xs text-ink/60">
        Actor: <span className="font-bold text-ink">{log.actor ?? "system"}</span>
      </div>

      {hasMetadata && (
        <div className="mt-2">
          <button type="button" className="why-toggle" onClick={() => setOpen((o) => !o)}>
            {open ? "▾ Hide metadata" : "▸ View metadata"}
          </button>
          {open && <pre className="why-panel text-xs overflow-x-auto">{JSON.stringify(log.metadata, null, 2)}</pre>}
        </div>
      )}
    </div>
  );
}
