// The core neo-brutalist building block: a thick-bordered panel with a hard, flat
// offset "shadow" (no blur/elevation glow) — a solid black block behind the panel,
// offset bottom-right. Used everywhere instead of ad-hoc <View> + shadow styles.
import { View } from "react-native";
import { border, colors, hardShadow, radius } from "../theme";

export default function Panel({ children, style, contentStyle, bg = colors.surface, shadow = true, borderColor = colors.border, borderWidth = border.thick }) {
  const offset = hardShadow.offset;
  return (
    <View style={[{ position: "relative" }, style]}>
      {shadow && (
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            top: offset,
            left: offset,
            right: -offset,
            bottom: -offset,
            backgroundColor: colors.ink,
            borderRadius: radius.sm,
          }}
        />
      )}
      <View
        style={[
          {
            backgroundColor: bg,
            borderWidth,
            borderColor,
            borderRadius: radius.sm,
          },
          contentStyle,
        ]}
      >
        {children}
      </View>
    </View>
  );
}
