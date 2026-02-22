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
import { notoSansJP } from "../../fonts";

export const Scene5CTA: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // タイミング（360fに圧縮）
  const logoDelay = 30;
  const sloganDelay = 60;
  const searchBarDelay = 100;
  const typingDelay = 150;

  // Logo: Bouncy spring
  const logoScale = spring({
    frame: frame - logoDelay,
    fps,
    config: { damping: 8 },
  });

  // Slogan: Snappy spring
  const sloganSpring = spring({
    frame: frame - sloganDelay,
    fps,
    config: { damping: 20, stiffness: 200 },
  });

  const sloganOpacity = interpolate(
    frame - sloganDelay,
    [0, 20],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
  const sloganTranslateY = interpolate(sloganSpring, [0, 1], [20, 0]);

  // Search Bar: Heavy spring
  const searchBarSpring = spring({
    frame: frame - searchBarDelay,
    fps,
    config: { damping: 15, stiffness: 80, mass: 2 },
  });

  const searchBarWidth = interpolate(searchBarSpring, [0, 1], [0, 800]);

  const searchBarOpacity = interpolate(
    frame - searchBarDelay,
    [0, 20],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // Typewriter effect
  const urlText = "polyseek.jp";
  const typeProgress = interpolate(
    frame - typingDelay,
    [0, 60],
    [0, urlText.length],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
  const currentText = urlText.slice(0, Math.floor(typeProgress));

  // Cursor blink
  const showCursor = frame > typingDelay && frame < typingDelay + 100 && Math.floor(frame / 10) % 2 === 0;

  // 検索ボタンのパルス（タイプライター完了後 ~frame 230）
  const typingDone = frame > typingDelay + 70;
  const pulseCycle = (frame - (typingDelay + 70)) / 60;
  const pulseScale = typingDone ? 1 + Math.sin(pulseCycle * Math.PI * 2) * 0.03 : 1;
  const pulseGlow = typingDone
    ? `0 0 ${12 + Math.sin(pulseCycle * Math.PI * 2) * 8}px rgba(34, 197, 94, ${0.4 + Math.sin(pulseCycle * Math.PI * 2) * 0.3})`
    : "none";

  return (
    <AbsoluteFill
      style={{
        background: "linear-gradient(180deg, #f0faf0 0%, #ffffff 40%, #f8fff8 100%)",
        justifyContent: "center",
        alignItems: "center",
        fontFamily: notoSansJP,
      }}
    >
      {/* Container for content */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 48,
          width: "100%",
        }}
      >

        {/* Logo */}
        <div style={{
          transform: `scale(${logoScale})`,
          display: "flex",
          alignItems: "center",
          gap: 40
        }}>
           <Img
            src={staticFile("images/PolySeek_10_export_icon.svg")}
            style={{ height: 160, width: "auto" }}
          />
           <Img
            src={staticFile("images/PolySeek_logo_type.svg")}
            style={{ height: 120, width: "auto" }}
          />
        </div>

        {/* Catchphrase */}
        <div
          style={{
            opacity: sloganOpacity,
            transform: `translateY(${sloganTranslateY}px)`,
            fontSize: 48,
            fontWeight: 900,
            fontFamily: notoSansJP,
            color: "#333",
            letterSpacing: "0.05em",
            textAlign: "center",
          }}
        >
          みんなで作る検索サイト
        </div>

        {/* Search Bar Visual */}
        <div
          style={{
            width: searchBarWidth,
            height: 80,
            backgroundColor: "#f3f4f6",
            borderRadius: 40,
            display: "flex",
            alignItems: "center",
            padding: "0 30px",
            opacity: searchBarOpacity,
            boxShadow: "0 4px 15px rgba(0,0,0,0.05)",
            overflow: "hidden",
            position: "relative",
          }}
        >
            {/* Search Icon (inline SVG) */}
            <svg
              width="36"
              height="36"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#9ca3af"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ marginRight: 20, flexShrink: 0 }}
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>

            {/* URL Text */}
            <div style={{
                fontSize: 36,
                color: "#1f2937",
                fontFamily: "monospace",
                letterSpacing: "0.05em",
                display: "flex",
                alignItems: "center"
            }}>
                {currentText}
                {/* Cursor */}
                <span style={{
                    width: 3,
                    height: 40,
                    backgroundColor: "#22c55e",
                    marginLeft: 4,
                    opacity: showCursor ? 1 : 0
                }} />
            </div>

            {/* "Search" Button with pulse */}
            <div style={{
                position: "absolute",
                right: 10,
                top: 10,
                bottom: 10,
                width: 100,
                backgroundColor: "#22c55e",
                borderRadius: 30,
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                color: "white",
                fontWeight: "bold",
                fontSize: 20,
                transform: `scale(${pulseScale})`,
                boxShadow: pulseGlow,
            }}>
                検索
            </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
