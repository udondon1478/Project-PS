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
import { Search } from "lucide-react";

export const Scene5CTA: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, height } = useVideoConfig();

  // Transition: Slide up from bottom with spring
  // 0-30フレームで下からスライドイン
  const slideIn = spring({
    frame,
    fps,
    config: {
      damping: 20,
      stiffness: 90,
      mass: 1,
    },
  });

  const translateY = interpolate(slideIn, [0, 1], [height, 0]);

  // Elements animation triggers
  const logoDelay = 25;
  const sloganDelay = 45;
  const searchBarDelay = 70;
  const typingDelay = 100;

  // Logo: Pop in
  const logoScale = spring({
    frame: frame - logoDelay,
    fps,
    config: { damping: 12 },
  });

  // Slogan: Fade up
  const sloganOpacity = interpolate(
    frame - sloganDelay,
    [0, 15],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
  const sloganTranslateY = interpolate(
    spring({ frame: frame - sloganDelay, fps }),
    [0, 1],
    [20, 0]
  );

  // Search Bar: Expand width
  const searchBarWidth = interpolate(
    spring({ frame: frame - searchBarDelay, fps }),
    [0, 1],
    [0, 800] // Target width
  );

  const searchBarOpacity = interpolate(
    frame - searchBarDelay,
    [0, 10],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // Typewriter effect
  const urlText = "polyseek.jp";
  const typeProgress = interpolate(
    frame - typingDelay,
    [0, 40], // 40 frames to type
    [0, urlText.length],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
  const currentText = urlText.slice(0, Math.floor(typeProgress));

  // Cursor blink
  const showCursor = frame > typingDelay && frame < typingDelay + 60 && Math.floor(frame / 10) % 2 === 0;

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#ffffff",
        transform: `translateY(${translateY}px)`,
        justifyContent: "center",
        alignItems: "center",
        fontFamily: "'Noto Sans JP', sans-serif",
      }}
    >
      {/* Container for content */}
      <div className="flex flex-col items-center gap-12 w-full">

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
            alt="PolySeek Icon"
          />
           <Img
            src={staticFile("images/PolySeek_logo_type.svg")}
            style={{ height: 120, width: "auto" }}
            alt="PolySeek Type"
          />
        </div>

        {/* Catchphrase */}
        <div
          style={{
            opacity: sloganOpacity,
            transform: `translateY(${sloganTranslateY}px)`,
            fontSize: 48,
            fontWeight: "bold",
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
            {/* Search Icon */}
            <Search color="#9ca3af" size={36} strokeWidth={2.5} style={{ marginRight: 20 }} />

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
                    backgroundColor: "#22c55e", // Brand Green (Tailwind green-500)
                    marginLeft: 4,
                    opacity: showCursor ? 1 : 0
                }} />
            </div>

            {/* "Search" Button visual on the right */}
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
            }}>
                検索
            </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
