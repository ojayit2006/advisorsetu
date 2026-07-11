"use client";

import { useState } from "react";
import type { Rationale } from "@/lib/types";

// The single most important UX requirement per PLAN.md section 11: every
// recommendation / MIA answer must surface a "Why?" affordance revealing
// rationale.inputs / assumptions / reasoning / risk_disclosure. Falls back
// to envelope-level inputs_used/assumptions/confidence and a plain reason
// string when a per-item rationale isn't present, so it never renders empty
// without explanation.
export default function WhyPanel({
  rationale,
  fallbackReason,
  inputsUsed,
  assumptions,
  confidence,
}: {
  rationale?: Rationale;
  fallbackReason?: string;
  inputsUsed?: string[];
  assumptions?: string[];
  confidence?: number;
}) {
  const [open, setOpen] = useState(false);

  const inputs = rationale?.inputs ?? inputsUsed ?? [];
  const assump = rationale?.assumptions ?? assumptions ?? [];
  const reasoning = rationale?.reasoning ?? fallbackReason;
  const riskDisclosure = rationale?.risk_disclosure;
  const hasNothing = !reasoning && inputs.length === 0 && assump.length === 0 && !riskDisclosure;

  return (
    <div className="mt-3">
      <button type="button" className="why-toggle" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        {open ? "▾ Hide why" : "▸ Why?"}
      </button>
      {open && (
        <div className="why-panel">
          {reasoning && (
            <div className="why-block">
              <div className="why-label">Reasoning</div>
              <p>{reasoning}</p>
            </div>
          )}
          {inputs.length > 0 && (
            <div className="why-block">
              <div className="why-label">Inputs used</div>
              <ul>
                {inputs.map((i, idx) => (
                  <li key={idx}>{i}</li>
                ))}
              </ul>
            </div>
          )}
          {assump.length > 0 && (
            <div className="why-block">
              <div className="why-label">Assumptions</div>
              <ul>
                {assump.map((a, idx) => (
                  <li key={idx}>{a}</li>
                ))}
              </ul>
            </div>
          )}
          {riskDisclosure && (
            <div className="why-block why-risk">
              <div className="why-label">Risk disclosure</div>
              <p>{riskDisclosure}</p>
            </div>
          )}
          {typeof confidence === "number" && (
            <div className="why-confidence">Model confidence: {(confidence * 100).toFixed(0)}%</div>
          )}
          {hasNothing && <p className="text-xs text-ink/50">No structured rationale returned for this item.</p>}
        </div>
      )}
    </div>
  );
}
