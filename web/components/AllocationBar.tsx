import type { Holding } from "@/lib/types";
import { formatINR } from "@/lib/format";

const COLORS: Record<string, string> = {
  equity: "#7a1b1b",
  debt: "#d6a13c",
  hybrid: "#b3822a",
  gold: "#e4b84a",
  real_estate: "#4a3320",
  cash: "#1e7a45",
  insurance: "#3a3a3a",
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
      <div className="flex w-full h-6" style={{ border: "3px solid var(--color-ink)", overflow: "hidden" }}>
        {entries.map(([cls, val]) => (
          <div
            key={cls}
            style={{ width: `${(val / total) * 100}%`, background: COLORS[cls] ?? "#999" }}
            title={`${cls}: ${formatINR(val)}`}
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 text-xs">
        {entries.map(([cls, val]) => (
          <div key={cls} className="flex items-center gap-1.5">
            <span
              className="inline-block w-3 h-3"
              style={{ background: COLORS[cls] ?? "#999", border: "1px solid var(--color-ink)" }}
            />
            <span className="font-bold capitalize">{cls.replace("_", " ")}</span>
            <span className="text-ink/50">{formatINR(val, { compact: true })}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
