// Demo beat 2 ("2:00 'What if I buy a Rs 15L car?' -> home goal 71%->52% live",
// PLAN.md section 13). Sliders for extra_monthly_contribution / one_time_delta call
// GET /customers/{id}/scenario live (debounced) and render prob_before vs prob_after
// plus timeline_shift_months as a clear before/after comparison.
import { useCallback, useEffect, useRef, useState } from "react";
import { Pressable, Text, View } from "react-native";
import Slider from "@react-native-community/slider";
import { ErrorState, LoadingState } from "../components/LoadingState";
import Panel from "../components/Panel";
import ProgressBar from "../components/ProgressBar";
import ScreenContainer from "../components/ScreenContainer";
import { api } from "../api";
import { useApp } from "../context/AppContext";
import { colors, formatINR, formatPct, spacing, type } from "../theme";

const MONTHLY_MIN = 0;
const MONTHLY_MAX = 50000;
const MONTHLY_STEP = 500;

const ONE_TIME_MIN = -2000000; // e.g. "what if I buy a Rs 15L car" -> -1,500,000
const ONE_TIME_MAX = 500000;
const ONE_TIME_STEP = 25000;

const DEBOUNCE_MS = 400;

export default function SimulateScreen() {
  const { customerId } = useApp();

  const [goals, setGoals] = useState([]);
  const [goalsLoading, setGoalsLoading] = useState(true);
  const [goalsError, setGoalsError] = useState(null);
  const [selectedGoalName, setSelectedGoalName] = useState(null);

  const [extraMonthly, setExtraMonthly] = useState(0);
  const [oneTimeDelta, setOneTimeDelta] = useState(0);

  const [scenario, setScenario] = useState(null);
  const [scenarioLoading, setScenarioLoading] = useState(false);
  const [scenarioError, setScenarioError] = useState(null);

  const debounceRef = useRef(null);

  useEffect(() => {
    if (!customerId) return;
    (async () => {
      setGoalsLoading(true);
      setGoalsError(null);
      try {
        const { goals: fetchedGoals } = await api.getGoals(customerId);
        setGoals(fetchedGoals || []);
        if (fetchedGoals?.length) setSelectedGoalName(fetchedGoals[0].name);
      } catch (e) {
        setGoalsError(e.message || "Failed to load goals.");
      } finally {
        setGoalsLoading(false);
      }
    })();
  }, [customerId]);

  const runScenario = useCallback(
    async (goalName, monthly, oneTime) => {
      if (!customerId || !goalName) return;
      setScenarioLoading(true);
      setScenarioError(null);
      try {
        const result = await api.getScenario(customerId, {
          goalName,
          extraMonthlyContribution: monthly,
          oneTimeDelta: oneTime,
        });
        setScenario(result);
      } catch (e) {
        setScenarioError(e.message || "Failed to run scenario.");
      } finally {
        setScenarioLoading(false);
      }
    },
    [customerId]
  );

  // Debounced live re-run whenever goal or slider values change.
  useEffect(() => {
    if (!selectedGoalName) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      runScenario(selectedGoalName, extraMonthly, oneTimeDelta);
    }, DEBOUNCE_MS);
    return () => clearTimeout(debounceRef.current);
  }, [selectedGoalName, extraMonthly, oneTimeDelta, runScenario]);

  const value = scenario?.value;

  return (
    <ScreenContainer>
      <View style={{ gap: 2 }}>
        <Text style={type.label}>SIMULATE</Text>
        <Text style={type.h1}>What if…?</Text>
        <Text style={type.bodyMuted}>Drag the sliders to see how a decision moves your goal probability, live.</Text>
      </View>

      {goalsLoading && <LoadingState label="Loading goals…" />}
      {goalsError && <ErrorState message={goalsError} />}

      {!goalsLoading && !goalsError && (
        <>
          <Panel>
            <View style={{ padding: spacing.lg, gap: spacing.sm }}>
              <Text style={type.h3}>Goal</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
                {goals.map((g) => {
                  const selected = g.name === selectedGoalName;
                  return (
                    <GoalChip key={g.id} label={g.name} selected={selected} onPress={() => setSelectedGoalName(g.name)} />
                  );
                })}
              </View>
            </View>
          </Panel>

          <Panel>
            <View style={{ padding: spacing.lg, gap: spacing.sm }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Text style={type.h3}>Extra monthly contribution</Text>
                <Text style={type.h3}>{formatINR(extraMonthly)}</Text>
              </View>
              <Slider
                minimumValue={MONTHLY_MIN}
                maximumValue={MONTHLY_MAX}
                step={MONTHLY_STEP}
                value={extraMonthly}
                onValueChange={setExtraMonthly}
                minimumTrackTintColor={colors.maroon}
                maximumTrackTintColor={colors.bg}
                thumbTintColor={colors.maroon}
              />
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Text style={type.mono}>{formatINR(MONTHLY_MIN)}</Text>
                <Text style={type.mono}>{formatINR(MONTHLY_MAX)}</Text>
              </View>
            </View>
          </Panel>

          <Panel>
            <View style={{ padding: spacing.lg, gap: spacing.sm }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Text style={type.h3}>One-time inflow / expense</Text>
                <Text style={type.h3}>{formatINR(oneTimeDelta)}</Text>
              </View>
              <Slider
                minimumValue={ONE_TIME_MIN}
                maximumValue={ONE_TIME_MAX}
                step={ONE_TIME_STEP}
                value={oneTimeDelta}
                onValueChange={setOneTimeDelta}
                minimumTrackTintColor={colors.gold}
                maximumTrackTintColor={colors.bg}
                thumbTintColor={colors.gold}
              />
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Text style={type.mono}>{formatINR(ONE_TIME_MIN)}</Text>
                <Text style={type.mono}>{formatINR(ONE_TIME_MAX)}</Text>
              </View>
              <Text style={type.bodyMuted}>
                Negative = an expense (e.g. a ₹15,00,000 car down payment is −₹15,00,000). Positive = a windfall.
              </Text>
            </View>
          </Panel>

          {scenarioError && <ErrorState message={scenarioError} onRetry={() => runScenario(selectedGoalName, extraMonthly, oneTimeDelta)} />}

          {value && Object.keys(value).length > 0 && (
            <Panel bg={colors.maroonSoft} borderColor={colors.maroon}>
              <View style={{ padding: spacing.lg, gap: spacing.md, opacity: scenarioLoading ? 0.6 : 1 }}>
                <Text style={type.label}>{value.goal}</Text>
                <View style={{ flexDirection: "row", gap: spacing.lg }}>
                  <View style={{ flex: 1, gap: spacing.xs }}>
                    <Text style={type.label}>BEFORE</Text>
                    <Text style={[type.display, { fontSize: 30 }]}>{formatPct(value.prob_before)}</Text>
                    <ProgressBar fraction={value.prob_before} fillColor={colors.muted} />
                    <Text style={type.mono}>
                      80% by {value.months_to_80pct_before != null ? `${value.months_to_80pct_before}mo` : "—"}
                    </Text>
                  </View>
                  <View style={{ flex: 1, gap: spacing.xs }}>
                    <Text style={type.label}>AFTER</Text>
                    <Text style={[type.display, { fontSize: 30, color: colors.maroon }]}>{formatPct(value.prob_after)}</Text>
                    <ProgressBar fraction={value.prob_after} fillColor={colors.maroon} />
                    <Text style={type.mono}>
                      80% by {value.months_to_80pct_after != null ? `${value.months_to_80pct_after}mo` : "—"}
                    </Text>
                  </View>
                </View>

                {typeof value.timeline_shift_months === "number" && (
                  <Panel bg={colors.surface} borderColor={colors.border} shadow={false}>
                    <View style={{ padding: spacing.md }}>
                      <Text style={type.h3}>
                        {value.timeline_shift_months === 0
                          ? "No change to your timeline."
                          : value.timeline_shift_months < 0
                          ? `Reaches 80% funded ${Math.abs(value.timeline_shift_months)} month(s) sooner.`
                          : `Reaches 80% funded ${value.timeline_shift_months} month(s) later.`}
                      </Text>
                    </View>
                  </Panel>
                )}

                <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                  <MiniStat label="Target" value={formatINR(value.target_amount)} />
                  <MiniStat label="Funded" value={formatINR(value.funded_amount)} />
                  <MiniStat label="Months left" value={String(value.months_remaining)} />
                </View>
              </View>
            </Panel>
          )}

          {(!value || Object.keys(value).length === 0) && !scenarioLoading && !scenarioError && (
            <Text style={type.bodyMuted}>Pick a goal above to run a scenario.</Text>
          )}
          {scenarioLoading && !value && <LoadingState label="Running Monte Carlo simulation…" />}
        </>
      )}
    </ScreenContainer>
  );
}

function GoalChip({ label, selected, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        borderWidth: 2,
        borderColor: colors.border,
        borderRadius: 999,
        paddingVertical: 8,
        paddingHorizontal: 14,
        backgroundColor: selected ? colors.maroon : colors.surface,
      }}
    >
      <Text style={{ color: selected ? colors.white : colors.ink, fontWeight: "800" }}>{label}</Text>
    </Pressable>
  );
}

function MiniStat({ label, value }) {
  return (
    <View>
      <Text style={type.label}>{label}</Text>
      <Text style={type.body}>{value}</Text>
    </View>
  );
}
