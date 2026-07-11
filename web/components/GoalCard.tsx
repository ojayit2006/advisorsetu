import type { Goal } from "@/lib/types";
import { formatINR, formatDate } from "@/lib/format";

export default function GoalCard({ goal }: { goal: Goal }) {
  const pct =
    goal.target_amount > 0
      ? Math.min(100, Math.max(0, Math.round((goal.funded_amount / goal.target_amount) * 100)))
      : 0;

  const priorityClass =
    goal.priority === "high" ? "bg-maroon text-cream" : goal.priority === "medium" ? "bg-gold" : "bg-cream-dark";

  return (
    <div className="neo-card p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-display font-bold text-lg">{goal.name}</h3>
        <span className={`badge ${priorityClass}`}>{goal.priority}</span>
      </div>
      <div className="text-sm text-ink/70">
        Target <strong>{formatINR(goal.target_amount)}</strong> by {formatDate(goal.target_date)}
      </div>
      <div>
        <div className="progress-track">
          <div className="progress-fill" style={{ width: `${pct}%` }} />
        </div>
        <div className="flex justify-between text-xs font-bold mt-1">
          <span>{formatINR(goal.funded_amount)} funded</span>
          <span>{pct}%</span>
        </div>
      </div>
    </div>
  );
}
