import { BRAND_COLORS } from "../constants";

export { BRAND_COLORS };

export const FEATURE_COLORS = {
  gold: "#FFD700",
  goldLight: "#FFE44D",
  goldDark: "#DAA520",
  amber: "#FFBF00",
  bgDark: "#0a0f1a",
  bgMidDark: "#111827",
  white: "#ffffff",
  muted: "rgba(255, 255, 255, 0.7)",
  danger: "#ff6b6b",
} as const;

export const FEATURE_TIMING = {
  fps: 60,
  transitionFrames: 30,
  sceneProblem: 510,
  sceneCause: 390,
  sceneSolution: 630,
  sceneCTA: 360,
  totalFrames: 1800,
} as const;

export const SPRING_CONFIGS = {
  bouncy: { damping: 8 },
  snappy: { damping: 20, stiffness: 200 },
  heavy: { damping: 15, stiffness: 80, mass: 2 },
  smooth: { damping: 200 },
} as const;
