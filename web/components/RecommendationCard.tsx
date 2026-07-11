import type { Recommendation } from "@/lib/types";
import { formatINR } from "@/lib/format";
import SuitabilityPill from "./SuitabilityPill";
import WhyPanel from "./WhyPanel";

export default function RecommendationCard({
  rec,
  envelopeInputs,
  envelopeAssumptions,
  envelopeConfidence,
}: {
  rec: Recommendation;
  envelopeInputs?: string[];
  envelopeAssumptions?: string[];
  envelopeConfidence?: number;
}) {
  return (
    <div className="neo-card p-5 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs font-bold uppercase tracking-widest text-ink/50 capitalize">{rec.type}</div>
          <h3 className="font-display font-bold text-xl mt-1">{rec.product_name}</h3>
        </div>
        <SuitabilityPill tag={rec.suitability_tag} />
      </div>

      <div className="flex flex-wrap gap-2 text-xs">
        <span className="badge capitalize">Risk: {rec.risk_level}</span>
        {rec.cadence && <span className="badge capitalize">{rec.cadence}</span>}
        <span className="badge">Amount: {formatINR(rec.amount)}</span>
        {typeof rec.expected_return === "number" && (
          <span className="badge">Exp. return: {rec.expected_return}% p.a.</span>
        )}
      </div>

      <p className="text-sm text-ink/80">{rec.reason}</p>

      <WhyPanel
        rationale={rec.rationale}
        fallbackReason={rec.reason}
        inputsUsed={envelopeInputs}
        assumptions={envelopeAssumptions}
        confidence={envelopeConfidence}
      />
    </div>
  );
}
