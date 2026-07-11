import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { border, colors, hardShadow, radius, type } from "../theme";

const VARIANTS = {
  primary: { bg: colors.maroon, fg: colors.white, border: colors.border },
  gold: { bg: colors.gold, fg: colors.ink, border: colors.border },
  outline: { bg: colors.surface, fg: colors.ink, border: colors.border },
  ghost: { bg: "transparent", fg: colors.maroon, border: "transparent" },
};

export default function Button({ title, onPress, variant = "primary", loading = false, disabled = false, style, full = true }) {
  const palette = VARIANTS[variant] || VARIANTS.primary;
  const isGhost = variant === "ghost";
  const inactive = disabled || loading;

  return (
    <View style={[{ position: "relative" }, full && { width: "100%" }, style]}>
      {!isGhost && (
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            top: hardShadow.offsetSm,
            left: hardShadow.offsetSm,
            right: -hardShadow.offsetSm,
            bottom: -hardShadow.offsetSm,
            backgroundColor: colors.ink,
            borderRadius: radius.sm,
            opacity: inactive ? 0.35 : 1,
          }}
        />
      )}
      <Pressable
        onPress={inactive ? undefined : onPress}
        style={({ pressed }) => [
          styles.base,
          {
            backgroundColor: palette.bg,
            borderColor: palette.border,
            borderWidth: isGhost ? 0 : border.thick,
            opacity: inactive ? 0.55 : pressed ? 0.85 : 1,
          },
        ]}
      >
        {loading ? (
          <ActivityIndicator color={palette.fg} />
        ) : (
          <Text style={[type.h3, { color: palette.fg, textTransform: "uppercase", letterSpacing: 0.5 }]}>{title}</Text>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.sm,
  },
});
