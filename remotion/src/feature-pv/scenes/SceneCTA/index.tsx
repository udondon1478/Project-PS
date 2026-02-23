import React from "react";
import {
  AbsoluteFill,
  Img,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { notoSansJP } from "../../../fonts";
import { BRAND_COLORS, FEATURE_COLORS, SPRING_CONFIGS } from "../../featureConstants";

export const SceneCTA: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Logo bounce in (frame 30)
  const logoScale = spring({
    frame: frame - 30,
    fps,
    config: SPRING_CONFIGS.bouncy,
  });

  // Slogan slide up (frame 60)
  const sloganSpring = spring({
    frame: frame - 60,
    fps,
    config: SPRING_CONFIGS.snappy,
  });
  const sloganOpacity = interpolate(frame - 60, [0, 20], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const sloganY = interpolate(sloganSpring, [0, 1], [20, 0]);

  // Search bar (frame 120)
  const searchBarSpring = spring({
    frame: frame - 120,
    fps,
    config: SPRING_CONFIGS.heavy,
  });
  const searchBarWidth = interpolate(searchBarSpring, [0, 1], [0, 700]);
  const searchBarOpacity = interpolate(frame - 120, [0, 20], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // URL typewriter
  const urlText = "polyseek.jp";
  const typeProgress = interpolate(frame - 140, [0, 60], [0, urlText.length], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const currentText = urlText.slice(0, Math.floor(typeProgress));
  const showCursor =
    frame > 140 && frame < 220 && Math.floor(frame / 10) % 2 === 0;

  // Search button pulse after typing
  const typingDone = frame > 210;
  const pulseCycle = (frame - 210) / 60;
  const pulseScale = typingDone
    ? 1 + Math.sin(pulseCycle * Math.PI * 2) * 0.03
    : 1;
  const pulseGlow = typingDone
    ? `0 0 ${12 + Math.sin(pulseCycle * Math.PI * 2) * 8}px ${FEATURE_COLORS.gold}80`
    : "none";

  // VOICEVOX credit (frame 260)
  const creditOpacity = interpolate(frame, [260, 290], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Final fadeout
  const fadeOut = interpolate(frame, [320, 360], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        background: "linear-gradient(180deg, #f0faf0 0%, #ffffff 40%, #f8fff8 100%)",
        justifyContent: "center",
        alignItems: "center",
        fontFamily: notoSansJP,
        opacity: fadeOut,
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 40,
          width: "100%",
        }}
      >
        {/* Logo */}
        <div
          style={{
            transform: `scale(${logoScale})`,
            display: "flex",
            alignItems: "center",
            gap: 36,
          }}
        >
          <Img
            src={staticFile("images/PolySeek_10_export_icon.svg")}
            style={{ height: 140, width: "auto" }}
          />
          <Img
            src={staticFile("images/PolySeek_logo_type.svg")}
            style={{ height: 100, width: "auto" }}
          />
        </div>

        {/* Slogan */}
        <div
          style={{
            opacity: sloganOpacity,
            transform: `translateY(${sloganY}px)`,
            fontSize: 44,
            fontWeight: 900,
            color: "#333",
            letterSpacing: "0.05em",
            textAlign: "center",
          }}
        >
          もっと見つかる検索体験を
        </div>

        {/* Search bar */}
        <div
          style={{
            width: searchBarWidth,
            height: 72,
            backgroundColor: "#f3f4f6",
            borderRadius: 36,
            display: "flex",
            alignItems: "center",
            padding: "0 24px",
            opacity: searchBarOpacity,
            boxShadow: "0 4px 15px rgba(0,0,0,0.05)",
            overflow: "hidden",
            position: "relative",
          }}
        >
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

          <div
            style={{
              fontSize: 32,
              color: "#1f2937",
              fontFamily: "monospace",
              letterSpacing: "0.05em",
              display: "flex",
              alignItems: "center",
            }}
          >
            {currentText}
            <span
              style={{
                width: 3,
                height: 36,
                backgroundColor: BRAND_COLORS.green2,
                marginLeft: 4,
                opacity: showCursor ? 1 : 0,
              }}
            />
          </div>

          {/* Search button with gold accent */}
          <div
            style={{
              position: "absolute",
              right: 8,
              top: 8,
              bottom: 8,
              width: 90,
              background: `linear-gradient(135deg, ${BRAND_COLORS.green2}, ${BRAND_COLORS.green1})`,
              borderRadius: 28,
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              color: "white",
              fontWeight: 700,
              fontSize: 18,
              transform: `scale(${pulseScale})`,
              boxShadow: pulseGlow,
            }}
          >
            検索
          </div>
        </div>
      </div>

      {/* VOICEVOX credit */}
      <div
        style={{
          position: "absolute",
          bottom: 40,
          right: 60,
          opacity: creditOpacity,
          fontSize: 20,
          fontWeight: 300,
          color: "#999",
          letterSpacing: "0.02em",
        }}
      >
        VOICEVOX:四国めたん
      </div>
    </AbsoluteFill>
  );
};
