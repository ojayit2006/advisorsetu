export default function StatCard({
  label,
  value,
  sublabel,
  accent,
}: {
  label: string;
  value: string;
  sublabel?: string;
  accent?: "maroon" | "gold" | "ink";
}) {
  const accentClass =
    accent === "gold" ? "text-gold-dark" : accent === "ink" ? "text-ink" : "text-maroon";

  return (
    <div className="neo-card p-5">
      <div className="text-xs font-semibold uppercase tracking-widest text-ink/50">{label}</div>
      <div className={`font-mono font-semibold text-3xl tabular-nums mt-2 ${accentClass}`}>{value}</div>
      {sublabel && <div className="text-xs text-ink/60 mt-1">{sublabel}</div>}
    </div>
  );
}
