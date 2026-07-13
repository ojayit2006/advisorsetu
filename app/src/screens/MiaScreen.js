// Demo beats 1-4 all run through MIA. Embeds the avatar page (backend `/`, a
// self-contained page with its own mic/voice/avatar-video UI, CONTRACT.md "MIA avatar
// embed") via react-native-webview, and renders the structured turn payload
// ({reply, cards, rationale, suitability_tag, audit_id}) below it.
//
// IMPORTANT WebView bridging note: the avatar page posts turns via
// `window.parent?.postMessage({type:'mia-advisor-turn', payload}, '*')` (see
// avatar/index.html). Inside a React Native WebView there is no real parent frame —
// `window.parent === window` — so that call just dispatches a `message` event back
// onto the page's own `window`, it does NOT automatically reach RN's `onMessage`
// prop (which only fires for `window.ReactNativeWebView.postMessage(...)`). We can't
// edit avatar/index.html (out of scope), so we bridge it with
// `injectedJavaScriptBeforeContentLoaded`: a small shim that listens for `message`
// events on `window` and re-emits matching ones through
// `window.ReactNativeWebView.postMessage`. This is the standard fix for iframe-style
// postMessage code hosted in a top-level WebView.
//
// We also add a text-chat fallback (POST /advisor-turn directly) per PLAN.md's risk
// register ("Avatar/WebRTC fails on venue Wi-Fi -> text-chat fallback") — CONTRACT.md
// notes /advisor-turn is "also callable directly from a text-chat fallback".
import { useRef, useState } from "react";
import { KeyboardAvoidingView, Platform, Text, TextInput, View } from "react-native";
import { WebView } from "react-native-webview";
import Button from "../components/Button";
import Panel from "../components/Panel";
import ProgressBar from "../components/ProgressBar";
import ScreenContainer from "../components/ScreenContainer";
import SuitabilityBadge from "../components/SuitabilityBadge";
import { api } from "../api";
import { useApp } from "../context/AppContext";
import { colors, formatINR, formatPct, spacing, type } from "../theme";

const BRIDGE_SCRIPT = `
(function () {
  window.addEventListener('message', function (event) {
    try {
      var data = event && event.data;
      if (data && data.type === 'mia-advisor-turn' && window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify(data));
      }
    } catch (e) {}
  });
  true;
})();
`;

export default function MiaScreen({ navigation }) {
  const { customerId } = useApp();
  const [turn, setTurn] = useState(null); // last { reply, cards, rationale, suitability_tag, audit_id }
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [webviewError, setWebviewError] = useState(null);
  const webviewRef = useRef(null);

  function handleWebViewMessage(event) {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data?.type === "mia-advisor-turn" && data.payload) {
        setTurn(data.payload);
      }
    } catch (e) {
      // Not JSON / not our message shape — ignore.
    }
  }

  async function sendTextMessage() {
    const trimmed = message.trim();
    if (!trimmed || sending) return;
    setSending(true);
    try {
      const result = await api.postAdvisorTurn({ customerId, message: trimmed });
      setTurn(result);
      setMessage("");
    } catch (e) {
      setTurn({ reply: `(Could not reach MIA: ${e.message})`, cards: [], rationale: null, suitability_tag: null, audit_id: null });
    } finally {
      setSending(false);
    }
  }

  function openWhy() {
    if (!turn) return;
    navigation.navigate("RecommendationDetail", {
      source: "advisor-turn",
      reply: turn.reply,
      rationale: turn.rationale,
      suitabilityTag: turn.suitability_tag,
      auditId: turn.audit_id,
    });
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScreenContainer>
        <View style={{ gap: 2 }}>
          <Text style={type.label}>MIA</Text>
          <Text style={type.h1}>Your AI wealth advisor</Text>
        </View>

        <Panel shadow contentStyle={{ overflow: "hidden" }}>
          <View style={{ height: 320, backgroundColor: "#0f172a" }}>
            <WebView
              ref={webviewRef}
              source={{ uri: api.avatarUrl }}
              style={{ flex: 1, backgroundColor: "#0f172a" }}
              injectedJavaScriptBeforeContentLoaded={BRIDGE_SCRIPT}
              onMessage={handleWebViewMessage}
              javaScriptEnabled
              domStorageEnabled
              originWhitelist={["*"]}
              allowsInlineMediaPlayback
              mediaPlaybackRequiresUserAction={false}
              mediaCapturePermissionGrantType="grant"
              onPermissionRequest={(event) => event.grant?.(event.resources)}
              onError={(e) => setWebviewError(e?.nativeEvent?.description || "Failed to load MIA.")}
            />
          </View>
        </Panel>
        {webviewError && (
          <Text style={type.bodyMuted}>
            Couldn't load the avatar ({webviewError}). Backend reachable at {api.baseUrl}? Use the text box below as
            a fallback.
          </Text>
        )}

        <Panel>
          <View style={{ padding: spacing.md, flexDirection: "row", gap: spacing.sm }}>
            <TextInput
              value={message}
              onChangeText={setMessage}
              placeholder="Type a question instead (e.g. How much can I invest?)"
              placeholderTextColor={colors.muted}
              style={{ flex: 1, fontSize: 15, color: colors.ink }}
              onSubmitEditing={sendTextMessage}
              returnKeyType="send"
            />
            <Button title="Ask" onPress={sendTextMessage} loading={sending} full={false} />
          </View>
        </Panel>

        {turn && (
          <View style={{ gap: spacing.md }}>
            <Panel bg={colors.maroonSoft} borderColor={colors.maroon}>
              <View style={{ padding: spacing.lg, gap: spacing.sm }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                  <Text style={type.label}>MIA SAYS</Text>
                  {turn.suitability_tag && <SuitabilityBadge tag={turn.suitability_tag} />}
                </View>
                <Text style={type.body}>{turn.reply}</Text>
                {turn.rationale && (
                  <Button title="Why?" variant="outline" full={false} onPress={openWhy} />
                )}
              </View>
            </Panel>

            {(turn.cards || []).map((card, i) => (
              <CardRenderer key={i} card={card} />
            ))}
          </View>
        )}
      </ScreenContainer>
    </KeyboardAvoidingView>
  );
}

function CardRenderer({ card }) {
  switch (card.type) {
    case "surplus":
      return <SurplusCard data={card.data} />;
    case "scenario":
      return <ScenarioCard data={card.data} />;
    case "suitability":
      return <SuitabilityCard data={card.data} />;
    case "life_event":
      return <LifeEventCard data={card.data} />;
    case "behaviour":
      return <BehaviourCard data={card.data} />;
    default:
      return (
        <Panel>
          <View style={{ padding: spacing.lg }}>
            <Text style={type.h3}>{card.type}</Text>
            <Text style={type.mono}>{JSON.stringify(card.data)}</Text>
          </View>
        </Panel>
      );
  }
}

function CardShell({ title, children }) {
  return (
    <Panel>
      <View style={{ padding: spacing.lg, gap: spacing.sm }}>
        <Text style={type.label}>{title}</Text>
        {children}
      </View>
    </Panel>
  );
}

function SurplusCard({ data }) {
  return (
    <CardShell title="Monthly surplus">
      <Text style={type.h2}>{formatINR(data?.surplus)} investable</Text>
      <Text style={type.bodyMuted}>
        Income {formatINR(data?.avg_monthly_income)} − recurring outflow {formatINR(data?.total_recurring_outflow)} −
        safety buffer {formatINR(data?.safety_buffer)}
      </Text>
    </CardShell>
  );
}

function ScenarioCard({ data }) {
  return (
    <CardShell title={`Scenario · ${data?.goal || "goal"}`}>
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <View style={{ flex: 1 }}>
          <Text style={type.label}>BEFORE</Text>
          <Text style={type.h2}>{formatPct(data?.prob_before)}</Text>
          <ProgressBar fraction={data?.prob_before} fillColor={colors.muted} />
        </View>
        <View style={{ width: spacing.lg }} />
        <View style={{ flex: 1 }}>
          <Text style={type.label}>AFTER</Text>
          <Text style={type.h2}>{formatPct(data?.prob_after)}</Text>
          <ProgressBar fraction={data?.prob_after} fillColor={colors.maroon} />
        </View>
      </View>
      {typeof data?.timeline_shift_months === "number" && (
        <Text style={type.bodyMuted}>
          Timeline to 80% funded {data.timeline_shift_months <= 0 ? "moves up" : "slips"} by{" "}
          {Math.abs(data.timeline_shift_months)} month(s).
        </Text>
      )}
    </CardShell>
  );
}

function SuitabilityCard({ data }) {
  return (
    <CardShell title={`Recommendations · surplus ${formatINR(data?.surplus_used)}`}>
      {(data?.recommendations || []).map((r, i) => (
        <View key={i} style={{ gap: 2, marginTop: i > 0 ? spacing.sm : 0 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <Text style={type.h3}>{r.product_name}</Text>
            <SuitabilityBadge tag={r.suitability_tag} />
          </View>
          <Text style={type.bodyMuted}>{r.reason}</Text>
        </View>
      ))}
    </CardShell>
  );
}

function LifeEventCard({ data }) {
  return (
    <CardShell title="Life events & opportunities">
      {(data?.triggers || []).map((t, i) => (
        <Text key={i} style={[type.bodyMuted, { marginTop: i > 0 ? spacing.sm : 0 }]}>
          {t.message}
        </Text>
      ))}
    </CardShell>
  );
}

function BehaviourCard({ data }) {
  return (
    <CardShell title="Spending behaviour">
      {(data?.nudges || []).map((n, i) => (
        <Text key={i} style={[type.bodyMuted, { marginTop: i > 0 ? spacing.sm : 0 }]}>
          {n.message}
        </Text>
      ))}
      {data?.panic_flagged && <Text style={[type.body, { color: colors.red }]}>Panic-selling pattern flagged.</Text>}
    </CardShell>
  );
}
