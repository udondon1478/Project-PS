import React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
  Easing,
} from "remotion";
import { notoSansJP } from "../../../fonts";
import { FEATURE_COLORS, SPRING_CONFIGS } from "../../featureConstants";
import { TypewriterText } from "../../../components/TypewriterText";

export const SceneProblem: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Background fade in
  const bgOpacity = interpolate(frame, [0, 30], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Search bar slide in (Heavy spring)
  const searchBarSpring = spring({
    frame: frame - 30,
    fps,
    config: SPRING_CONFIGS.heavy,
  });
  const searchBarY = interpolate(searchBarSpring, [0, 1], [100, 0]);
  const searchBarOpacity = interpolate(frame, [30, 50], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // First search: "トップス" (frames 60-180)
  const firstSearchText = "トップス";
  const firstSearchDone = frame >= 180;

  // First search button pulse (frames 180-210)
  const firstPulseProgress = interpolate(frame, [180, 210], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  const showFirstPulse = frame >= 180 && frame < 270;

  // First "0件" display (frames 210-270)
  const firstResultOpacity = interpolate(frame, [210, 230], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const showFirstResult = frame >= 210 && frame < 270;
  // Shake effect for 0 results
  const firstShake =
    frame >= 210 && frame < 240
      ? Math.sin(frame * 2.5) * 8 * (1 - (frame - 210) / 30)
      : 0;

  // Clear and second search: "vrchat" (frames 300-390)
  const secondSearchActive = frame >= 270;
  const secondSearchText = "vrchat";

  // Second search button pulse (frames 390-420)
  const showSecondPulse = frame >= 390 && frame < 450;

  // Second "0件" display (frames 420-450)
  const secondResultOpacity = interpolate(frame, [420, 440], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const showSecondResult = frame >= 420;
  // Stronger shake
  const secondShake =
    frame >= 420 && frame < 455
      ? Math.sin(frame * 3) * 12 * (1 - (frame - 420) / 35)
      : 0;

  // Frustration text (frames 450-510)
  const frustrationOpacity = interpolate(frame, [450, 470], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const frustrationSpring = spring({
    frame: frame - 450,
    fps,
    config: SPRING_CONFIGS.snappy,
  });
  const showFrustration = frame >= 450;

  // Determine which search text to show
  const isFirstSearch = frame >= 60 && frame < 270;
  const isSecondSearch = frame >= 300;

  // Search button pulse animation
  const pulseScale =
    showFirstPulse || showSecondPulse
      ? 1 + Math.sin(frame * 0.3) * 0.05
      : 1;

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(180deg, ${FEATURE_COLORS.bgDark} 0%, #0d1520 100%)`,
        justifyContent: "center",
        alignItems: "center",
        fontFamily: notoSansJP,
        opacity: bgOpacity,
      }}
    >
      {/* Search bar */}
      <div
        style={{
          transform: `translateY(${searchBarY}px) translateX(${firstShake + secondShake}px)`,
          opacity: searchBarOpacity,
          width: 800,
          height: 80,
          backgroundColor: "rgba(255, 255, 255, 0.95)",
          borderRadius: 40,
          display: "flex",
          alignItems: "center",
          padding: "0 30px",
          boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
          position: "relative",
        }}
      >
        {/* Search icon */}
        <svg
          width="32"
          height="32"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#9ca3af"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ marginRight: 16, flexShrink: 0 }}
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>

        {/* Search text */}
        <div
          style={{
            fontSize: 32,
            color: "#1f2937",
            fontFamily: notoSansJP,
            flex: 1,
          }}
        >
          {isFirstSearch && (
            <TypewriterText
              text={firstSearchText}
              startFrame={60}
              charactersPerSecond={8}
              style={{ color: "#1f2937" }}
            />
          )}
          {isSecondSearch && (
            <TypewriterText
              text={secondSearchText}
              startFrame={300}
              charactersPerSecond={8}
              style={{ color: "#1f2937" }}
            />
          )}
        </div>

        {/* Search button */}
        <div
          style={{
            position: "absolute",
            right: 8,
            top: 8,
            bottom: 8,
            width: 100,
            backgroundColor:
              showFirstPulse || showSecondPulse
                ? "#22c55e"
                : "rgba(34, 197, 94, 0.8)",
            borderRadius: 32,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            color: "white",
            fontWeight: 700,
            fontSize: 20,
            transform: `scale(${pulseScale})`,
            boxShadow:
              showFirstPulse || showSecondPulse
                ? "0 0 15px rgba(34, 197, 94, 0.5)"
                : "none",
          }}
        >
          検索
        </div>
      </div>

      {/* Result count: 0件 (first) */}
      {showFirstResult && !secondSearchActive && (
        <div
          style={{
            marginTop: 30,
            opacity: firstResultOpacity,
            fontSize: 48,
            fontWeight: 900,
            color: FEATURE_COLORS.danger,
            textAlign: "center",
            textShadow: "0 0 20px rgba(255, 107, 107, 0.5)",
          }}
        >
          0 件
        </div>
      )}

      {/* Result count: 0件 (second) */}
      {showSecondResult && (
        <div
          style={{
            marginTop: 30,
            opacity: secondResultOpacity,
            fontSize: 48,
            fontWeight: 900,
            color: FEATURE_COLORS.danger,
            textAlign: "center",
            textShadow: "0 0 20px rgba(255, 107, 107, 0.5)",
          }}
        >
          0 件
        </div>
      )}

      {/* Frustration text */}
      {showFrustration && (
        <div
          style={{
            marginTop: 40,
            opacity: frustrationOpacity,
            transform: `scale(${frustrationSpring})`,
            fontSize: 36,
            fontWeight: 700,
            color: FEATURE_COLORS.muted,
            textAlign: "center",
            letterSpacing: "0.1em",
          }}
        >
          見つからない...
        </div>
      )}
    </AbsoluteFill>
  );
};
