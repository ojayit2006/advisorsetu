import { ActivityIndicator, Text, View } from "react-native";
import { colors, spacing, type } from "../theme";

export function LoadingState({ label = "Loading…" }) {
  return (
    <View style={{ paddingVertical: spacing.xxl, alignItems: "center", gap: spacing.sm }}>
      <ActivityIndicator size="large" color={colors.maroon} />
      <Text style={type.bodyMuted}>{label}</Text>
    </View>
  );
}

export function ErrorState({ message, onRetry }) {
  const Button = require("./Button").default;
  return (
    <View style={{ paddingVertical: spacing.lg, gap: spacing.md }}>
      <Text style={[type.h3, { color: colors.red }]}>Something went wrong</Text>
      <Text style={type.bodyMuted}>{message}</Text>
      {onRetry && <Button title="Retry" variant="outline" onPress={onRetry} full={false} />}
    </View>
  );
}
