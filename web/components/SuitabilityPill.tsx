import type { SuitabilityTag } from "@/lib/types";

const CONFIG: Record<SuitabilityTag, { label: string; className: string }> = {
  suitable: { label: "Suitable", className: "pill-suitable" },
  needs_review: { label: "Needs Review", className: "pill-needs-review" },
  not_suitable: { label: "Not Suitable", className: "pill-not-suitable" },
};

export default function SuitabilityPill({ tag }: { tag: SuitabilityTag | string }) {
  const cfg = CONFIG[tag as SuitabilityTag] ?? { label: tag || "Unknown", className: "pill-unknown" };
  return <span className={`suitability-pill ${cfg.className}`}>{cfg.label}</span>;
}
