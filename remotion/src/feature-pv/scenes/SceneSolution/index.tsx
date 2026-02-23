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
import {
  BRAND_COLORS,
  FEATURE_COLORS,
  SPRING_CONFIGS,
} from "../../featureConstants";
import { TagLink } from "../../components/TagLink";
import { TypewriterText } from "../../../components/TypewriterText";

export const SceneSolution: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // "NEW" badge (frames 30-60)
  const newBadgeSpring = spring({
    frame: frame - 30,
    fps,
    config: SPRING_CONFIGS.bouncy,
  });

  // First pair connection (frames 60-210)
  const showFirstPair = frame >= 60;
  const firstPairConnected = frame >= 120;

  // Second pair connection (frames 210-330)
  const showSecondPair = frame >= 210;
  const secondPairConnected = frame >= 270;

  // Transition to search demo (frames 330-390)
  const tagsOpacity = interpolate(frame, [330, 360], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Search bar slide in (frames 330-390)
  const searchPhase = frame >= 330;
  const searchBarSpring = spring({
    frame: frame - 350,
    fps,
    config: SPRING_CONFIGS.heavy,
  });
  const searchBarY = interpolate(searchBarSpring, [0, 1], [80, 0]);
  const searchBarOpacity = interpolate(frame, [350, 380], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Result counter: 0 -> 15 (frames 480-570)
  const showResult = frame >= 480;
  const resultCount = Math.floor(
    interpolate(frame, [480, 570], [0, 15], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.out(Easing.cubic),
    }),
  );

  // Celebration (frames 570-630)
  const showCelebration = frame >= 570;
  const celebrationScale = spring({
    frame: frame - 570,
    fps,
    config: SPRING_CONFIGS.bouncy,
  });

  // Slide up for second pair
  const firstPairSlideUp =
    frame >= 210
      ? interpolate(frame, [210, 240], [0, -80], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        })
      : 0;

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(180deg, ${FEATURE_COLORS.bgMidDark} 0%, #1a1f2e 100%)`,
        justifyContent: "center",
        alignItems: "center",
        fontFamily: notoSansJP,
      }}
    >
      {/* "NEW" badge */}
      <div
        style={{
          position: "absolute",
          top: 80,
          left: "50%",
          transform: `translate(-50%, 0) scale(${newBadgeSpring})`,
          background: `linear-gradient(135deg, ${FEATURE_COLORS.gold}, ${FEATURE_COLORS.amber})`,
          borderRadius: 20,
          padding: "8px 32px",
          fontSize: 28,
          fontWeight: 900,
          color: BRAND_COLORS.darkGreen,
          letterSpacing: "0.15em",
          boxShadow: `0 4px 20px ${FEATURE_COLORS.gold}60`,
        }}
      >
        NEW
      </div>

      {/* Tags area (fades out when search comes in) */}
      <div
        style={{
          opacity: tagsOpacity,
          position: "absolute",
          width: "100%",
          height: "100%",
        }}
      >
        {/* First pair: トップス ↔ 上着 */}
        {showFirstPair && (
          <div style={{ transform: `translateY(${firstPairSlideUp}px)` }}>
            <TagLink
              leftLabel="トップス"
              rightLabel="上着"
              centerX={960}
              centerY={380}
              leftDelay={60}
              rightDelay={80}
              connectionDelay={120}
              connected={firstPairConnected}
              id="sol-pair1"
            />
          </div>
        )}

        {/* Second pair: vrchat ↔ VRChat */}
        {showSecondPair && (
          <TagLink
            leftLabel="vrchat"
            rightLabel="VRChat"
            centerX={960}
            centerY={520}
            leftDelay={210}
            rightDelay={230}
            connectionDelay={270}
            connected={secondPairConnected}
            id="sol-pair2"
          />
        )}
      </div>

      {/* Search demo phase */}
      {searchPhase && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 30,
            opacity: searchBarOpacity,
            transform: `translateY(${searchBarY}px)`,
          }}
        >
          {/* Search bar */}
          <div
            style={{
              width: 700,
              height: 72,
              backgroundColor: "rgba(255, 255, 255, 0.95)",
              borderRadius: 36,
              display: "flex",
              alignItems: "center",
              padding: "0 24px",
              boxShadow: `0 4px 20px rgba(0,0,0,0.3), 0 0 30px ${FEATURE_COLORS.gold}30`,
              position: "relative",
            }}
          >
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#9ca3af"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ marginRight: 14, flexShrink: 0 }}
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>

            <div style={{ fontSize: 28, color: "#1f2937", flex: 1 }}>
              <TypewriterText
                text="トップス"
                startFrame={390}
                charactersPerSecond={6}
                style={{ color: "#1f2937", fontFamily: notoSansJP }}
              />
            </div>

            <div
              style={{
                position: "absolute",
                right: 6,
                top: 6,
                bottom: 6,
                width: 90,
                backgroundColor: BRAND_COLORS.green2,
                borderRadius: 30,
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                color: "white",
                fontWeight: 700,
                fontSize: 18,
              }}
            >
              検索
            </div>
          </div>

          {/* Result counter */}
          {showResult && (
            <div
              style={{
                display: "flex",
                alignItems: "baseline",
                gap: 12,
              }}
            >
              <span
                style={{
                  fontSize: 72,
                  fontWeight: 900,
                  color: FEATURE_COLORS.gold,
                  textShadow: `0 0 20px ${FEATURE_COLORS.gold}60`,
                  transform: showCelebration
                    ? `scale(${celebrationScale})`
                    : "none",
                }}
              >
                {resultCount}
              </span>
              <span
                style={{
                  fontSize: 36,
                  fontWeight: 700,
                  color: FEATURE_COLORS.white,
                }}
              >
                件ヒット!
              </span>
            </div>
          )}

          {/* Celebration sparkles */}
          {showCelebration && (
            <div style={{ position: "relative", width: 400, height: 40 }}>
              {[...Array(6)].map((_, i) => {
                const sparkleDelay = i * 5;
                const sparkleFrame = frame - 570 - sparkleDelay;
                const sparkleOpacity =
                  sparkleFrame > 0
                    ? interpolate(sparkleFrame, [0, 15, 30], [0, 1, 0], {
                        extrapolateLeft: "clamp",
                        extrapolateRight: "clamp",
                      })
                    : 0;
                const sparkleY = sparkleFrame > 0 ? -sparkleFrame * 1.5 : 0;
                const sparkleX = (i - 2.5) * 70;

                return (
                  <div
                    key={i}
                    style={{
                      position: "absolute",
                      left: `calc(50% + ${sparkleX}px)`,
                      top: 0,
                      transform: `translateY(${sparkleY}px)`,
                      opacity: sparkleOpacity,
                      fontSize: 24,
                      color: FEATURE_COLORS.gold,
                    }}
                  >
                    ✦
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </AbsoluteFill>
  );
};
