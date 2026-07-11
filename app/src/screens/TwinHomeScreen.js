// Demo beat 1 ("1:00 'How much can I invest?' -> Rs 18,200 + Why", PLAN.md section 13).
// Dashboard: net worth, cash/investments/protection snapshot, goal progress, the
// "You can invest ₹X this month" callout (recommendations.value.surplus_used), and the
// recommendation list split into a Monthly Plan (cadence: monthly, from the surplus
// engine) and Nudges & Opportunities (cadence: lumpsum, from the life-event engine —
// idle cash / wedding signals). See README "Known gaps" for why nudges are derived
// this way instead of a dedicated /behaviour or /life-event endpoint (none exists in
// CONTRACT.md — only reachable today via MIA's /advisor-turn tool calls).
import { useCallback, useEffect, useState } from "react";
import { Text, View } from "react-native";
import Button from "../components/Button";
import { ErrorState, LoadingState } from "../components/LoadingState";
import Panel from "../components/Panel";
import ProgressBar from "../components/ProgressBar";
import ScreenContainer from "../components/ScreenContainer";
import SuitabilityBadge from "../components/SuitabilityBadge";
import { api } from "../api";
import { useApp } from "../context/AppContext";
import { colors, formatDate, formatINR, spacing, type } from "../theme";

export default function TwinHomeScreen({ navigation }) {
  const { customerId } = useApp();
  const [twin, setTwin] = useState(null);
  const [recoEnvelope, setRecoEnvelope] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(
    async ({ silent } = {}) => {
      if (!customerId) return;
      if (silent) setRefreshing(true);
      else setLoading(true);
      setError(null);
      try {
        const [twinData, recoData] = await Promise.all([
          api.getTwin(customerId),
          api.getRecommendations(customerId),
        ]);
        setTwin(twinData);
        setRecoEnvelope(recoData);
      } catch (e) {
        setError(e.message || "Failed to load your Financial Twin.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [customerId]
  );

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <ScreenContainer>
        <LoadingState label="Building your Financial Twin…" />
      </ScreenContainer>
    );
  }

  if (error) {
    return (
      <ScreenContainer>
        <ErrorState message={error} onRetry={load} />
      </ScreenContainer>
    );
  }

  const customer = twin?.customer;
  const goals = twin?.goals || [];
  const recommendations = recoEnvelope?.value?.recommendations || [];
  const surplusUsed = recoEnvelope?.value?.surplus_used;
  const riskProfile = recoEnvelope?.value?.risk_profile;

  const monthlyPlan = recommendations.filter((r) => r.cadence === "monthly");
  const nudges = recommendations.filter((r) => r.cadence !== "monthly");

  function openDetail(item) {
    navigation.navigate("RecommendationDetail", {
      source: "recommendation",
      item,
      envelope: {
        inputs_used: recoEnvelope?.inputs_used || [],
        assumptions: recoEnvelope?.assumptions || [],
        confidence: recoEnvelope?.confidence,
        risk_profile: riskProfile,
        surplus_used: surplusUsed,
      },
    });
  }

  return (
    <ScreenContainer onRefresh={() => load({ silent: true })} refreshing={refreshing}>
      <View style={{ gap: 2 }}>
        <Text style={type.label}>MY FINANCIAL TWIN</Text>
        <Text style={type.display}>Hi {customer?.name?.split(" ")[0] || "there"}</Text>
        {riskProfile && (
          <Text style={type.bodyMuted}>Risk profile: {riskProfile.toUpperCase()}</Text>
        )}
      </View>

      <Panel bg={colors.maroon} borderColor={colors.border}>
        <View style={{ padding: spacing.lg, gap: spacing.xs }}>
          <Text style={[type.label, { color: colors.goldSoft }]}>NET WORTH</Text>
          <Text style={[type.display, { color: colors.white, fontSize: 36 }]}>
            {formatINR(twin?.net_worth)}
          </Text>
        </View>
      </Panel>

      <View style={{ flexDirection: "row", gap: spacing.md }}>
        <StatTile label="Cash" value={formatINR(twin?.cash)} flex={1} />
        <StatTile label="Investments" value={formatINR(twin?.investable_holdings_value)} flex={1} />
      </View>
      <StatTile label="Protection cover" value={formatINR(twin?.protection_cover)} />

      {typeof surplusUsed === "number" && (
        <Panel bg={colors.goldSoft} borderColor={colors.gold}>
          <View style={{ padding: spacing.lg, gap: spacing.xs }}>
            <Text style={type.label}>MONTHLY SURPLUS</Text>
            <Text style={[type.display, { fontSize: 26 }]}>
              You can invest {formatINR(surplusUsed)} this month
            </Text>
            <Text style={type.bodyMuted}>
              After recurring expenses and a safety buffer, this is what's free to invest — tap a plan below for the full "Why?".
            </Text>
          </View>
        </Panel>
      )}

      <SectionHeading title="Goals" />
      {goals.length === 0 && <Text style={type.bodyMuted}>No goals on file yet.</Text>}
      {goals.map((g) => {
        const fraction = g.target_amount ? g.funded_amount / g.target_amount : 0;
        return (
          <Panel key={g.id}>
            <View style={{ padding: spacing.lg, gap: spacing.sm }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Text style={type.h3}>{g.name}</Text>
                <PriorityPill priority={g.priority} />
              </View>
              <ProgressBar fraction={fraction} />
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Text style={type.bodyMuted}>{formatINR(g.funded_amount)} funded</Text>
                <Text style={type.bodyMuted}>Target {formatINR(g.target_amount)}</Text>
              </View>
              <Text style={type.mono}>By {formatDate(g.target_date)}</Text>
            </View>
          </Panel>
        );
      })}

      <SectionHeading title="Your monthly investment plan" subtitle="Suggested deployment of this month's surplus" />
      {monthlyPlan.length === 0 && <Text style={type.bodyMuted}>No surplus available to deploy this month.</Text>}
      {monthlyPlan.map((r, i) => (
        <RecommendationCard key={`${r.product_name}-${i}`} item={r} onPress={() => openDetail(r)} />
      ))}

      <SectionHeading title="Nudges & opportunities" subtitle="Signals MIA spotted in your accounts" />
      {nudges.length === 0 && <Text style={type.bodyMuted}>Nothing flagged right now.</Text>}
      {nudges.map((r, i) => (
        <RecommendationCard key={`${r.product_name}-nudge-${i}`} item={r} onPress={() => openDetail(r)} />
      ))}

      <Button title="Refresh Twin" variant="outline" onPress={() => load({ silent: true })} />
    </ScreenContainer>
  );
}

function StatTile({ label, value, flex }) {
  return (
    <Panel style={flex ? { flex } : undefined}>
      <View style={{ padding: spacing.md, gap: 2 }}>
        <Text style={type.label}>{label}</Text>
        <Text style={type.h2}>{value}</Text>
      </View>
    </Panel>
  );
}

function SectionHeading({ title, subtitle }) {
  return (
    <View style={{ marginTop: spacing.sm, gap: 2 }}>
      <Text style={type.h1}>{title}</Text>
      {subtitle && <Text style={type.bodyMuted}>{subtitle}</Text>}
    </View>
  );
}

function PriorityPill({ priority }) {
  const bg = priority === "high" ? colors.maroonSoft : colors.bg;
  const fg = priority === "high" ? colors.maroon : colors.inkSoft;
  return (
    <View style={{ backgroundColor: bg, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 }}>
      <Text style={{ color: fg, fontWeight: "800", fontSize: 11, textTransform: "uppercase" }}>{priority}</Text>
    </View>
  );
}

function RecommendationCard({ item, onPress }) {
  return (
    <Panel>
      <View style={{ padding: spacing.lg, gap: spacing.sm }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
          <Text style={[type.h3, { flex: 1, marginRight: spacing.sm }]}>{item.product_name}</Text>
          <SuitabilityBadge tag={item.suitability_tag} />
        </View>
        <Text style={type.bodyMuted}>{item.reason}</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.md }}>
          <MiniStat label="Amount" value={formatINR(item.amount)} />
          <MiniStat label="Cadence" value={item.cadence} />
          {item.expected_return != null && <MiniStat label="Exp. return" value={`${item.expected_return}%`} />}
          <MiniStat label="Risk" value={item.risk_level} />
        </View>
        <Button title="Why this recommendation?" variant="outline" onPress={onPress} />
      </View>
    </Panel>
  );
}

function MiniStat({ label, value }) {
  return (
    <View>
      <Text style={type.label}>{label}</Text>
      <Text style={type.body}>{String(value)}</Text>
    </View>
  );
}
