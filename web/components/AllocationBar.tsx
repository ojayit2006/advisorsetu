import type { Holding } from "@/lib/types";
import { formatINR } from "@/lib/format";

const COLORS: Record<string, string> = {
  equity: "#7a1b26",
  debt: "#9c7a3d",
  hybrid: "#b3934f",
  gold: "#c9a862",
  real_estate: "#5c4a2e",
  cash: "#2e6e48",
  insurance: "#4a4a48",
};

export default function AllocationBar({ holdings }: { holdings: Holding[] }) {
  const totals = new Map<string, number>();
  for (const h of holdings) {
    totals.set(h.asset_class, (totals.get(h.asset_class) ?? 0) + h.value);
  }
  const total = [...totals.values()].reduce((a, b) => a + b, 0);
  const entries = [...totals.entries()].sort((a, b) => b[1] - a[1]);

  if (total === 0) {
    return <p className="text-sm text-ink/50">No holdings on record.</p>;
  }

  return (
    <div>
      <div
        className="flex w-full h-2.5 rounded-full"
        style={{ border: "1px solid var(--color-line)", overflow: "hidden" }}
      >
        {entries.map(([cls, val]) => (
          <div
            key={cls}
            style={{ width: `${(val / total) * 100}%`, background: COLORS[cls] ?? "#999" }}
            title={`${cls}: ${formatINR(val)}`}
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-3 text-xs">
        {entries.map(([cls, val]) => (
          <div key={cls} className="flex items-center gap-1.5">
            <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: COLORS[cls] ?? "#999" }} />
            <span className="font-semibold capitalize">{cls.replace("_", " ")}</span>
            <span className="font-mono text-ink/50">{formatINR(val, { compact: true })}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
