// The explainability panel — "the moat" per PLAN.md section 11. First-class, not an
// afterthought: prominent suitability_tag badge + full inputs -> assumptions ->
// reasoning -> risk_disclosure trail.
//
// Two callers feed this screen with slightly different shapes (see route.params):
//  1) Twin Home's recommendation cards (source: "recommendation") — these come from
//     GET /customers/{id}/recommendations, whose items only carry a `reason` string
//     and `suitability_tag` (no per-item rationale object). We reconstruct a rationale
//     from the shared envelope's inputs_used/assumptions/confidence and the item's own
//     `reason`, and attach the same static SEBI risk-disclosure copy the backend's
//     explain engine uses (backend/engines/explain.py RISK_DISCLOSURE) since that
//     endpoint doesn't return it per-item. This is a client-side reconstruction, not
//     a live rationale from the explainability engine.
//  2) MIA's advisor-turn replies (source: "advisor-turn") — these carry the REAL
//     rationale object straight from POST /advisor-turn (inputs, assumptions,
//     reasoning, risk_disclosure, engines_consulted) plus an audit_id, exactly as
//     produced by the explain engine — the true "why" trail.
import { Text, View } from "react-native";
import Panel from "../components/Panel";
import ScreenContainer from "../components/ScreenContainer";
import SuitabilityBadge from "../components/SuitabilityBadge";
import { colors, formatINR, spacing, type } from "../theme";

// Mirrors backend/engines/explain.py RISK_DISCLOSURE — used only as a fallback display
// for recommendation-list items that don't carry a live rationale from the explain engine.
const STATIC_RISK_DISCLOSURE =
  "This is educational, suitability-matched guidance from a distributor, not investment advice under " +
  "SEBI's advice/distribution boundary. Returns are indicative, not guaranteed, and subject to market risk.";

function normalize(params) {
  if (params?.source === "advisor-turn") {
    const { reply, rationale, suitabilityTag, auditId } = params;
    return {
      title: "MIA's answer",
      subtitle: reply,
      suitabilityTag,
      inputs: rationale?.inputs || [],
      assumptions: rationale?.assumptions || [],
      reasoning: rationale?.reasoning,
      riskDisclosure: rationale?.risk_disclosure || STATIC_RISK_DISCLOSURE,
      confidence: rationale?.confidence,
      auditId,
      meta: null,
      live: true,
    };
  }

  const { item, envelope } = params || {};
  return {
    title: item?.product_name || "Recommendation",
    subtitle: null,
    suitabilityTag: item?.suitability_tag,
    inputs: envelope?.inputs_used || [],
    assumptions: envelope?.assumptions || [],
    reasoning: item?.reason,
    riskDisclosure: STATIC_RISK_DISCLOSURE,
    confidence: envelope?.confidence,
    auditId: null,
    meta: item
      ? [
          { label: "Type", value: item.type },
          { label: "Risk level", value: item.risk_level },
          { label: "Cadence", value: item.cadence },
          { label: "Amount", value: formatINR(item.amount) },
          item.expected_return != null && { label: "Expected return", value: `${item.expected_return}%` },
        ].filter(Boolean)
      : null,
    live: false,
  };
}

export default function RecommendationDetailScreen({ route }) {
  const data = normalize(route.params);

  return (
    <ScreenContainer>
      <View style={{ gap: spacing.xs }}>
        <SuitabilityBadge tag={data.suitabilityTag} size="lg" />
        <Text style={type.display}>{data.title}</Text>
        {data.subtitle && <Text style={type.body}>{data.subtitle}</Text>}
      </View>

      {data.meta && (
        <Panel>
          <View style={{ padding: spacing.lg, flexDirection: "row", flexWrap: "wrap", gap: spacing.lg }}>
            {data.meta.map((m) => (
              <View key={m.label} style={{ minWidth: 120 }}>
                <Text style={type.label}>{m.label}</Text>
                <Text style={type.h3}>{String(m.value ?? "—")}</Text>
              </View>
            ))}
          </View>
        </Panel>
      )}

      <Panel bg={colors.maroonSoft} borderColor={colors.maroon}>
        <View style={{ padding: spacing.lg, gap: spacing.sm }}>
          <Text style={type.label}>WHY THIS RECOMMENDATION</Text>
          <Text style={type.body}>{data.reasoning || "No specific rationale provided."}</Text>
        </View>
      </Panel>

      <SectionBlock title="Inputs used" items={data.inputs} emptyLabel="No inputs recorded." />
      <SectionBlock title="Assumptions" items={data.assumptions} emptyLabel="No assumptions recorded." />

      <Panel bg={colors.amberSoft} borderColor={colors.amber}>
        <View style={{ padding: spacing.lg, gap: spacing.sm }}>
          <Text style={[type.label, { color: colors.amber }]}>RISK DISCLOSURE</Text>
          <Text style={type.body}>{data.riskDisclosure}</Text>
        </View>
      </Panel>

      <View style={{ flexDirection: "row", justifyContent: "space-between", paddingTop: spacing.xs }}>
        {typeof data.confidence === "number" && (
          <Text style={type.mono}>Model confidence: {Math.round(data.confidence * 100)}%</Text>
        )}
        {data.auditId && <Text style={type.mono}>Audit ID: {data.auditId}</Text>}
      </View>
      {!data.live && (
        <Text style={[type.mono, { color: colors.muted }]}>
          Reconstructed from /recommendations (no live audit_id — ask MIA directly for a fully audited answer).
        </Text>
      )}
    </ScreenContainer>
  );
}

function SectionBlock({ title, items, emptyLabel }) {
  return (
    <Panel>
      <View style={{ padding: spacing.lg, gap: spacing.sm }}>
        <Text style={type.h3}>{title}</Text>
        {(!items || items.length === 0) && <Text style={type.bodyMuted}>{emptyLabel}</Text>}
        {(items || []).map((it, i) => (
          <View key={i} style={{ flexDirection: "row", gap: spacing.sm }}>
            <Text style={{ color: colors.gold, fontWeight: "900" }}>•</Text>
            <Text style={[type.bodyMuted, { flex: 1 }]}>{it}</Text>
          </View>
        ))}
      </View>
    </Panel>
  );
}
