// Demo beat 0 ("0:00 AA consent -> 'complete picture'", PLAN.md section 13).
// Explains Account Aggregator data-sharing consent in plain language, then calls
// GET /customers/default -> POST /aa/consent and shows the returned consent artefact
// (consentHandle, fip_list, status, expiry) as proof the Twin has a complete picture.
import { useState } from "react";
import { Text, View } from "react-native";
import Button from "../components/Button";
import { ErrorState, LoadingState } from "../components/LoadingState";
import Panel from "../components/Panel";
import ScreenContainer from "../components/ScreenContainer";
import { useApp } from "../context/AppContext";
import { api } from "../api";
import { colors, formatDate, spacing, type } from "../theme";

const FIP_LIST = ["HDFC Bank", "ICICI Prudential MF", "LIC"];

const CONSENT_POINTS = [
  "MIA links your accounts across banks, mutual funds and insurers into one Financial Twin.",
  "Only account summaries, holdings and transactions are shared — never your login credentials.",
  "You choose which institutions to share, for how long, and can revoke access anytime.",
  "This mirrors the RBI Account Aggregator (AA) framework used across Indian banking.",
];

export default function OnboardingScreen({ navigation }) {
  const { completeOnboarding } = useApp();
  const [step, setStep] = useState("intro"); // intro | loading | error | granted
  const [error, setError] = useState(null);
  const [customerId, setCustomerId] = useState(null);
  const [consent, setConsent] = useState(null);

  async function handleGiveConsent() {
    setStep("loading");
    setError(null);
    try {
      const { customer_id } = await api.getDefaultCustomer();
      const artefact = await api.postAaConsent({ customerId: customer_id, fipList: FIP_LIST });
      setCustomerId(customer_id);
      setConsent(artefact);
      setStep("granted");
    } catch (e) {
      setError(e.message || "Failed to fetch consent artefact.");
      setStep("error");
    }
  }

  function handleContinue() {
    completeOnboarding(customerId, consent);
    navigation.replace("Main");
  }

  return (
    <ScreenContainer>
      <View style={{ paddingTop: spacing.lg, gap: spacing.xs }}>
        <Text style={type.label}>MIA WEALTH</Text>
        <Text style={type.display}>Your whole financial{"\n"}life. One Twin.</Text>
        <Text style={type.bodyMuted}>
          Before MIA can build your Financial Twin, we need your consent to pull data from your
          linked institutions via the Account Aggregator (AA) network.
        </Text>
      </View>

      <Panel>
        <View style={{ padding: spacing.lg, gap: spacing.md }}>
          <Text style={type.h2}>What you're agreeing to</Text>
          {CONSENT_POINTS.map((point, i) => (
            <View key={i} style={{ flexDirection: "row", gap: spacing.sm }}>
              <Text style={[type.h3, { color: colors.gold }]}>{i + 1}.</Text>
              <Text style={[type.body, { flex: 1 }]}>{point}</Text>
            </View>
          ))}
        </View>
      </Panel>

      <Panel bg={colors.maroonSoft} borderColor={colors.maroon}>
        <View style={{ padding: spacing.lg, gap: spacing.sm }}>
          <Text style={type.label}>DATA SOURCES REQUESTED</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
            {FIP_LIST.map((fip) => (
              <View
                key={fip}
                style={{
                  borderWidth: 2,
                  borderColor: colors.maroon,
                  borderRadius: 999,
                  paddingVertical: 6,
                  paddingHorizontal: 12,
                  backgroundColor: colors.surface,
                }}
              >
                <Text style={[type.h3, { fontSize: 13 }]}>{fip}</Text>
              </View>
            ))}
          </View>
        </View>
      </Panel>

      {step === "loading" && <LoadingState label="Requesting AA consent…" />}
      {step === "error" && (
        <ErrorState message={error} onRetry={handleGiveConsent} />
      )}

      {step === "granted" && consent && (
        <Panel bg={colors.greenSoft} borderColor={colors.green}>
          <View style={{ padding: spacing.lg, gap: spacing.sm }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Text style={type.h2}>Consent granted</Text>
              <View
                style={{
                  backgroundColor: colors.green,
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                  borderRadius: 999,
                }}
              >
                <Text style={{ color: colors.white, fontWeight: "900", fontSize: 11 }}>{consent.status}</Text>
              </View>
            </View>
            <Row label="Consent handle" value={consent.consentHandle} mono />
            <Row label="Purpose" value={consent.purpose} />
            <Row label="Scope" value={(consent.scope || []).join(", ")} />
            <Row label="Institutions (FIPs)" value={(consent.fip_list || []).join(", ")} />
            <Row label="Valid until" value={formatDate(consent.consentExpiry)} />
            <Row label="Created" value={formatDate(consent.createdAt)} />
            <Text style={[type.bodyMuted, { marginTop: spacing.xs }]}>
              MIA now has a complete picture across all {FIP_LIST.length} institutions.
            </Text>
          </View>
        </Panel>
      )}

      <View style={{ marginTop: spacing.sm }}>
        {step === "granted" ? (
          <Button title="Continue to My Financial Twin" variant="gold" onPress={handleContinue} />
        ) : (
          <Button
            title="Give Consent & Build My Twin"
            onPress={handleGiveConsent}
            loading={step === "loading"}
            disabled={step === "loading"}
          />
        )}
      </View>
    </ScreenContainer>
  );
}

function Row({ label, value, mono }) {
  return (
    <View style={{ gap: 2 }}>
      <Text style={type.label}>{label}</Text>
      <Text style={mono ? type.mono : type.body}>{value || "—"}</Text>
    </View>
  );
}
