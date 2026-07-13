"""Scenario Sim engine — Monte Carlo goal probability + what-if deltas."""
from datetime import date, datetime

import numpy as np

from engines.unification import build_twin_state

RISK_PROFILE_ASSUMPTIONS = {
    "conservative": {"annual_return": 0.08, "volatility": 0.08},
    "moderate": {"annual_return": 0.11, "volatility": 0.13},
    "aggressive": {"annual_return": 0.14, "volatility": 0.20},
}


def _months_between(today: date, target: date) -> int:
    return max(0, (target.year - today.year) * 12 + (target.month - today.month))


def _simulate_final_values(current, months, monthly_contribution, annual_return, volatility, n_sims=2000, seed=42):
    if months <= 0:
        return np.full(n_sims, float(current))
    rng = np.random.default_rng(seed)
    monthly_mean = annual_return / 12
    monthly_std = volatility / np.sqrt(12)
    returns = rng.normal(monthly_mean, monthly_std, size=(n_sims, months))
    values = np.full(n_sims, float(current))
    for m in range(months):
        values = values * (1 + returns[:, m]) + monthly_contribution
    return values


def probability_to_reach(current, target, months, monthly_contribution, annual_return, volatility, n_sims=2000, seed=42):
    if months <= 0:
        return 1.0 if current >= target else 0.0
    finals = _simulate_final_values(current, months, monthly_contribution, annual_return, volatility, n_sims, seed)
    return float((finals >= target).mean())


def months_to_reach_probability(current, target, monthly_contribution, annual_return, volatility,
                                 target_prob=0.8, max_months=84, step=3, n_sims=1500, seed=42):
    for months in range(step, max_months + 1, step):
        p = probability_to_reach(current, target, months, monthly_contribution, annual_return, volatility, n_sims, seed)
        if p >= target_prob:
            return months
    return None


def _find_goal(goals, goal_name):
    if not goal_name:
        return sorted(goals, key=lambda g: {"high": 0, "medium": 1, "low": 2}.get(g["priority"], 1))[0]
    goal_name_l = goal_name.lower()
    for g in goals:
        if goal_name_l in g["name"].lower():
            return g
    return goals[0]


def run(customer_id: str, goal_name: str = None, extra_monthly_contribution: float = 0,
        one_time_delta: float = 0) -> dict:
    twin = build_twin_state(customer_id)
    goals = twin["goals"]
    if not goals:
        return {"value": {}, "inputs_used": ["goals"], "assumptions": ["No goals on file."], "confidence": 0.0}

    goal = _find_goal(goals, goal_name)
    risk_profile = (twin["customer"] or {}).get("risk_profile", "moderate")
    assumptions_market = RISK_PROFILE_ASSUMPTIONS.get(risk_profile, RISK_PROFILE_ASSUMPTIONS["moderate"])
    annual_return, volatility = assumptions_market["annual_return"], assumptions_market["volatility"]

    target_date = datetime.strptime(goal["target_date"], "%Y-%m-%d").date()
    months_remaining = _months_between(date.today(), target_date)
    target_amount = goal["target_amount"]
    funded_amount = goal["funded_amount"]

    prob_before = probability_to_reach(funded_amount, target_amount, months_remaining, 0, annual_return, volatility)
    prob_after = probability_to_reach(funded_amount + one_time_delta, target_amount, months_remaining,
                                       extra_monthly_contribution, annual_return, volatility)

    months_before_80 = months_to_reach_probability(funded_amount, target_amount, 0, annual_return, volatility)
    months_after_80 = months_to_reach_probability(funded_amount + one_time_delta, target_amount,
                                                   extra_monthly_contribution, annual_return, volatility)
    timeline_shift = None
    if months_before_80 is not None and months_after_80 is not None:
        timeline_shift = months_after_80 - months_before_80

    return {
        "value": {
            "goal": goal["name"],
            "target_amount": target_amount,
            "funded_amount": funded_amount,
            "months_remaining": months_remaining,
            "prob_before": round(prob_before, 3),
            "prob_after": round(prob_after, 3),
            "months_to_80pct_before": months_before_80,
            "months_to_80pct_after": months_after_80,
            "timeline_shift_months": timeline_shift,
            "extra_monthly_contribution": extra_monthly_contribution,
            "one_time_delta": one_time_delta,
        },
        "inputs_used": ["goals", f"risk_profile={risk_profile}"],
        "assumptions": [
            f"Market assumption for {risk_profile} profile: {annual_return*100:.0f}% expected annual return, "
            f"{volatility*100:.0f}% annual volatility.",
            "Monte Carlo over monthly compounding with 2,000 simulated paths, deterministic seed for demo repeatability.",
            "one_time_delta applied against the single goal specified (or highest-priority goal by default), "
            "not split across all goals.",
        ],
        "confidence": 0.75,
    }
