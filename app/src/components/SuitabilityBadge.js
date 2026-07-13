// The compliance "moat" pill — must be visible everywhere a recommendation/answer is
// shown, never buried in a menu. green=suitable, amber=needs_review, red=not_suitable.
import { StyleSheet, Text, View } from "react-native";
import { border, suitabilityStyle } from "../theme";

export default function SuitabilityBadge({ tag, size = "md" }) {
  const s = suitabilityStyle(tag);
  const isLg = size === "lg";
  return (
    <View
      style={[
        styles.pill,
        {
          backgroundColor: s.bg,
          borderColor: s.border,
          paddingVertical: isLg ? 8 : 4,
          paddingHorizontal: isLg ? 14 : 10,
        },
      ]}
    >
      <View style={[styles.dot, { backgroundColor: s.fg }]} />
      <Text style={[styles.label, { color: s.fg, fontSize: isLg ? 14 : 11 }]}>{s.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    borderWidth: border.thick,
    borderRadius: 999,
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  label: {
    fontWeight: "900",
    letterSpacing: 0.6,
  },
});
