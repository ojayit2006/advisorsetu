// Single source of truth for the MIA Wealth neo-brutalist design language.
// Thick black borders, hard flat drop shadows (no blur), bold blocky sans headings,
// high contrast. IDBI-adjacent palette: deep maroon/red primary, off-white/cream
// background, amber/gold accent, near-black text/ink. Every screen imports from here —
// never hardcode a color/border/shadow value inline.

export const colors = {
  // Base
  bg: "#F4ECDC", // off-white / cream background
  surface: "#FFFFFF",
  ink: "#1C1410", // near-black text
  inkSoft: "#4A3F36",

  // Brand
  maroon: "#7A1B1B", // primary
  maroonDark: "#4E1010",
  maroonSoft: "#F4DCDC",
  gold: "#E3A028", // accent / CTAs
  goldDark: "#B87A12",
  goldSoft: "#FBEBC9",

  // Suitability semantics
  green: "#1E7A34",
  greenSoft: "#DCEEDD",
  amber: "#B8790A",
  amberSoft: "#FBE9C8",
  red: "#A32A22",
  redSoft: "#F6DAD6",

  // Utility
  border: "#141010",
  white: "#FFFFFF",
  muted: "#8A7B6C",
};

export const suitabilityStyles = {
  suitable: { label: "SUITABLE", bg: colors.greenSoft, fg: colors.green, border: colors.green },
  needs_review: { label: "NEEDS REVIEW", bg: colors.amberSoft, fg: colors.amber, border: colors.amber },
  not_suitable: { label: "NOT SUITABLE", bg: colors.redSoft, fg: colors.red, border: colors.red },
};

export function suitabilityStyle(tag) {
  return suitabilityStyles[tag] || suitabilityStyles.needs_review;
}

export const border = {
  thin: 2,
  thick: 3,
  extraThick: 4,
};

export const radius = {
  none: 0,
  sm: 2,
  md: 4,
};

// Hard offset "shadow" used by <Panel> — no blur, a flat black block offset
// bottom-right of the panel, the classic neo-brutalist card treatment.
export const hardShadow = {
  offset: 6,
  offsetSm: 4,
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

export const type = {
  display: { fontSize: 32, fontWeight: "900", color: colors.ink, letterSpacing: 0.2 },
  h1: { fontSize: 24, fontWeight: "900", color: colors.ink },
  h2: { fontSize: 19, fontWeight: "800", color: colors.ink },
  h3: { fontSize: 16, fontWeight: "800", color: colors.ink },
  body: { fontSize: 15, fontWeight: "500", color: colors.ink },
  bodyMuted: { fontSize: 14, fontWeight: "500", color: colors.inkSoft },
  label: { fontSize: 12, fontWeight: "800", color: colors.inkSoft, letterSpacing: 0.8, textTransform: "uppercase" },
  mono: { fontSize: 12, fontWeight: "600", color: colors.inkSoft, fontFamily: "monospace" },
};

export function formatINR(amount) {
  const n = Number(amount);
  if (!Number.isFinite(n)) return "₹0";
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(n);
  } catch (e) {
    // Fallback if Intl/ICU data isn't available on the JS engine.
    const rounded = Math.round(n);
    return `₹${rounded.toLocaleString("en-IN")}`;
  }
}

export function formatDate(isoString) {
  if (!isoString) return "—";
  try {
    const d = new Date(isoString);
    if (Number.isNaN(d.getTime())) return isoString;
    return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  } catch (e) {
    return isoString;
  }
}

export function formatPct(fraction) {
  const n = Number(fraction);
  if (!Number.isFinite(n)) return "—";
  return `${Math.round(n * 100)}%`;
}
