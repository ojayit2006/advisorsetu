"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { TwinResponse, Goal } from "@/lib/types";
import { formatINR } from "@/lib/format";
import StatCard from "@/components/StatCard";
import GoalCard from "@/components/GoalCard";
import AllocationBar from "@/components/AllocationBar";
import PageState from "@/components/PageState";

export default function CustomerPage() {
  const [twin, setTwin] = useState<TwinResponse | null>(null);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const { customer_id } = await api.getDefaultCustomer();
        const [twinRes, goalsRes] = await Promise.all([
          api.getTwin(customer_id),
          api.getGoals(customer_id),
        ]);
        if (cancelled) return;
        setTwin(twinRes);
        setGoals(goalsRes.goals?.length ? goalsRes.goals : twinRes.goals ?? []);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load customer data");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) return <PageState text="Loading Financial Twin…" />;
  if (error) return <PageState text={error} isError />;
  if (!twin) return <PageState text="No twin data available." />;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="text-xs font-bold uppercase tracking-widest text-maroon">Customer 360</div>
        <h1 className="font-display font-bold text-3xl mt-1">{twin.customer?.name ?? "Demo customer"}</h1>
        <div className="flex gap-2 mt-2 flex-wrap">
          {twin.customer?.risk_profile && (
            <span className="badge bg-ink text-cream capitalize">{twin.customer.risk_profile} risk</span>
          )}
          {twin.customer?.monthly_income_est != null && (
            <span className="badge">
              Est. income {formatINR(twin.customer.monthly_income_est, { compact: true })}/mo
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Net worth" value={formatINR(twin.net_worth, { compact: true })} accent="maroon" />
        <StatCard label="Cash" value={formatINR(twin.cash, { compact: true })} />
        <StatCard
          label="Investable holdings"
          value={formatINR(twin.investable_holdings_value, { compact: true })}
        />
        <StatCard label="Protection cover" value={formatINR(twin.protection_cover, { compact: true })} accent="gold" />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="neo-card p-5">
          <h2 className="font-display font-bold text-lg mb-4">Accounts</h2>
          <div className="flex flex-col gap-2">
            {twin.accounts?.length ? (
              twin.accounts.map((a) => (
                <div
                  key={a.id}
                  className="flex items-center justify-between border-b border-ink/10 pb-2 last:border-0 last:pb-0"
                >
                  <div>
                    <div className="font-semibold text-sm">{a.institution}</div>
                    <div className="text-xs text-ink/50 capitalize">
                      {a.type.replace("_", " ")} · {a.source.toUpperCase()}
                    </div>
                  </div>
                  <div className="font-mono font-semibold text-sm tabular-nums">{formatINR(a.balance)}</div>
                </div>
              ))
            ) : (
              <p className="text-sm text-ink/50">No accounts on record.</p>
            )}
          </div>
        </div>

        <div className="neo-card p-5">
          <h2 className="font-display font-bold text-lg mb-4">Asset allocation</h2>
          <AllocationBar holdings={twin.holdings ?? []} />
        </div>
      </div>

      <div>
        <h2 className="font-display font-bold text-xl mb-4">Goals</h2>
        <div className="grid md:grid-cols-2 gap-4">
          {goals.length ? (
            goals.map((g) => <GoalCard key={g.id} goal={g} />)
          ) : (
            <p className="text-sm text-ink/50">No goals on record.</p>
          )}
        </div>
      </div>
    </div>
  );
}
