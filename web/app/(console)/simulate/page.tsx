"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import type { Goal, ScenarioValue } from "@/lib/types";
import { formatINR } from "@/lib/format";
import PageState from "@/components/PageState";

const MONTHLY_MAX = 50000;
const MONTHLY_STEP = 1000;
const ONE_TIME_MIN = -1000000;
const ONE_TIME_MAX = 1000000;
const ONE_TIME_STEP = 10000;
const DEBOUNCE_MS = 250;

function pct(n: number) {
  return `${Math.round(n * 100)}%`;
}

export default function SimulatePage() {
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [goalName, setGoalName] = useState<string | null>(null);
  const [extraMonthly, setExtraMonthly] = useState(0);
  const [oneTimeDelta, setOneTimeDelta] = useState(0);
  const [result, setResult] = useState<ScenarioValue | null>(null);
  const [loading, setLoading] = useState(true);
  const [simulating, setSimulating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const { customer_id } = await api.getDefaultCustomer();
        const goalsRes = await api.getGoals(customer_id);
        setCustomerId(customer_id);
        setGoals(goalsRes.goals ?? []);
        setGoalName(goalsRes.goals?.[0]?.name ?? null);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load goals");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const runSimulation = useCallback(
    (cid: string, goal: string | null, monthly: number, oneTime: number) => {
      setSimulating(true);
      api
        .getScenario(cid, {
          goal_name: goal ?? undefined,
          extra_monthly_contribution: monthly,
          one_time_delta: oneTime,
        })
        .then((res) => setResult(res.value))
        .catch((e) => setError(e instanceof Error ? e.message : "Simulation failed"))
        .finally(() => setSimulating(false));
    },
    []
  );

  useEffect(() => {
    if (!customerId || !goalName) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      runSimulation(customerId, goalName, extraMonthly, oneTimeDelta);
    }, DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerId, goalName, extraMonthly, oneTimeDelta]);

  function reset() {
    setExtraMonthly(0);
    setOneTimeDelta(0);
  }

  if (loading) return <PageState text="Loading goals…" />;
  if (error && !result) return <PageState text={error} isError />;

  const delta = result ? result.prob_after - result.prob_before : 0;
  const deltaColor = delta > 0 ? "text-ok" : delta < 0 ? "text-danger" : "text-ink/50";

  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="text-xs font-semibold uppercase tracking-widest text-maroon">Simulate</div>
        <h1 className="font-display font-bold text-3xl mt-1">What-if scenario planner</h1>
        <p className="text-sm text-ink/70 mt-1 max-w-2xl">
          Move the levers live in front of the customer — every result is a real Monte Carlo run against
          their goal, not a canned number.
        </p>
      </div>

      {goals.length === 0 ? (
        <PageState text="No goals on record for this customer." />
      ) : (
        <div className="grid lg:grid-cols-[380px_minmax(0,1fr)] gap-6 items-start">
          <div className="neo-card p-5 flex flex-col gap-6">
            <div>
              <div className="text-xs font-semibold uppercase tracking-widest text-ink/50 mb-2">Goal</div>
              <div className="flex flex-wrap gap-2">
                {goals.map((g) => (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => setGoalName(g.name)}
                    className={`neo-btn px-3 py-1.5 text-xs ${
                      goalName === g.name ? "neo-btn-ink" : "neo-btn-accent"
                    }`}
                  >
                    {g.name}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-baseline justify-between mb-2">
                <span className="text-xs font-semibold uppercase tracking-widest text-ink/50">
                  Extra monthly SIP
                </span>
                <span className="font-mono font-semibold tabular-nums text-maroon">
                  +{formatINR(extraMonthly, { compact: true })}/mo
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={MONTHLY_MAX}
                step={MONTHLY_STEP}
                value={extraMonthly}
                onChange={(e) => setExtraMonthly(Number(e.target.value))}
                className="w-full accent-[var(--color-maroon)]"
                aria-label="Extra monthly contribution"
              />
            </div>

            <div>
              <div className="flex items-baseline justify-between mb-2">
                <span className="text-xs font-semibold uppercase tracking-widest text-ink/50">
                  One-time expense / windfall
                </span>
                <span className="font-mono font-semibold tabular-nums text-maroon">
                  {oneTimeDelta >= 0 ? "+" : ""}
                  {formatINR(oneTimeDelta, { compact: true })}
                </span>
              </div>
              <input
                type="range"
                min={ONE_TIME_MIN}
                max={ONE_TIME_MAX}
                step={ONE_TIME_STEP}
                value={oneTimeDelta}
                onChange={(e) => setOneTimeDelta(Number(e.target.value))}
                className="w-full accent-[var(--color-maroon)]"
                aria-label="One-time expense or windfall"
              />
              <div className="flex justify-between text-[10px] text-ink/40 mt-1 font-mono">
                <span>Expense</span>
                <span>Windfall</span>
              </div>
            </div>

            <button type="button" onClick={reset} className="neo-btn neo-btn-accent px-4 py-2 text-xs self-start">
              Reset levers
            </button>
          </div>

          <div className="neo-card p-6 relative">
            {simulating && (
              <div className="absolute top-4 right-4 text-[10px] font-mono uppercase tracking-widest text-ink/40">
                Simulating…
              </div>
            )}
            {result ? (
              <div className="flex flex-col gap-6">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-widest text-ink/50">
                    {result.goal} · probability of hitting target
                  </div>
                  <div className="flex items-end gap-4 mt-2">
                    <div className="font-mono font-semibold text-5xl tabular-nums text-ink">
                      {pct(result.prob_after)}
                    </div>
                    <div className={`font-mono font-semibold text-lg tabular-nums pb-1 ${deltaColor}`}>
                      {delta > 0 ? "▲" : delta < 0 ? "▼" : "—"} {pct(Math.abs(delta))} vs. baseline (
                      {pct(result.prob_before)})
                    </div>
                  </div>
                  <div className="progress-track mt-4">
                    <div
                      className="progress-fill"
                      style={{ width: `${Math.min(100, result.prob_after * 100)}%` }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-2 border-t border-line">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-widest text-ink/50">
                      Months to 80% confidence
                    </div>
                    <div className="font-mono font-semibold text-2xl tabular-nums mt-1">
                      {result.months_to_80pct_after ?? "—"}
                      <span className="text-sm text-ink/40 ml-2">
                        (was {result.months_to_80pct_before ?? "—"})
                      </span>
                    </div>
                  </div>
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-widest text-ink/50">
                      Target amount
                    </div>
                    <div className="font-mono font-semibold text-2xl tabular-nums mt-1">
                      {formatINR(result.target_amount, { compact: true })}
                    </div>
                  </div>
                </div>

                <p className="text-xs text-ink/50">
                  Moderate-profile market assumption, 2,000-path Monte Carlo simulation, deterministic seed.
                  Educational, not investment advice.
                </p>
              </div>
            ) : (
              <div className="text-sm text-ink/50">Move a lever to run the simulation.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
