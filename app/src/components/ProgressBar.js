import { StyleSheet, View } from "react-native";
import { border, colors, radius } from "../theme";

export default function ProgressBar({ fraction, fillColor = colors.maroon, trackColor = colors.bg, height = 14 }) {
  const pct = Math.max(0, Math.min(1, Number.isFinite(fraction) ? fraction : 0));
  return (
    <View style={[styles.track, { backgroundColor: trackColor, height }]}>
      <View style={[styles.fill, { width: `${pct * 100}%`, backgroundColor: fillColor }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    width: "100%",
    borderWidth: border.thin,
    borderColor: colors.border,
    borderRadius: radius.sm,
    overflow: "hidden",
  },
  fill: {
    height: "100%",
  },
});
