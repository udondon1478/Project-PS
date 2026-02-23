import React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { notoSansJP } from "../../../fonts";
import { FEATURE_COLORS, SPRING_CONFIGS } from "../../featureConstants";
import { TagLink } from "../../components/TagLink";

export const SceneCause: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // "トップス" ≠ "上着" pair (frames 30-150)
  const showFirstPair = frame >= 30;
  const neqOpacity = interpolate(frame, [120, 150], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const neqScale = spring({
    frame: frame - 120,
    fps,
    config: SPRING_CONFIGS.bouncy,
  });

  // VRChat variations (frames 150-270)
  const showVRChatGroup = frame >= 150;
  const vrChatSlideUp = interpolate(frame, [150, 180], [0, -120], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const vrTag1Spring = spring({
    frame: frame - 170,
    fps,
    config: SPRING_CONFIGS.bouncy,
  });
  const vrTag2Spring = spring({
    frame: frame - 190,
    fps,
    config: SPRING_CONFIGS.bouncy,
  });
  const vrTag3Spring = spring({
    frame: frame - 210,
    fps,
    config: SPRING_CONFIGS.bouncy,
  });

  // Disconnection visualization with crossfade (frames 190-220)
  const showDisconnected = frame >= 190;
  const disconnectOpacity = interpolate(frame, [190, 220], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const neqFadeOut = interpolate(frame, [190, 220], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Explanation text (frames 270-330)
  const textOpacity = interpolate(frame, [270, 300], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const textSpring = spring({
    frame: frame - 270,
    fps,
    config: SPRING_CONFIGS.snappy,
  });
  const textY = interpolate(textSpring, [0, 1], [30, 0]);

  // Fadeout at end
  const fadeOut = interpolate(frame, [350, 390], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(180deg, ${FEATURE_COLORS.bgMidDark} 0%, #1a1f2e 100%)`,
        justifyContent: "center",
        alignItems: "center",
        fontFamily: notoSansJP,
        opacity: fadeOut,
      }}
    >
      {/* First pair container - slides up when VRChat group appears */}
      <div
        style={{
          position: "absolute",
          width: "100%",
          height: "100%",
          transform: showVRChatGroup ? `translateY(${vrChatSlideUp}px)` : "none",
        }}
      >
        {showFirstPair && (
          <TagLink
            leftLabel="トップス"
            rightLabel="上着"
            centerX={960}
            centerY={420}
            leftDelay={30}
            rightDelay={50}
            connectionDelay={Infinity}
            connected={false}
            disconnected={showDisconnected}
            disconnectOpacity={disconnectOpacity}
            id="cause-pair1"
          />
        )}

        {/* ≠ mark between tags */}
        {showFirstPair && frame >= 120 && (
          <div
            style={{
              position: "absolute",
              left: "50%",
              top: 440,
              transform: `translate(-50%, -50%) scale(${neqScale})`,
              opacity: neqOpacity * neqFadeOut,
              fontSize: 48,
              fontWeight: 900,
              color: FEATURE_COLORS.danger,
              textShadow: `0 0 15px ${FEATURE_COLORS.danger}80`,
            }}
          >
            ≠
          </div>
        )}
      </div>

      {/* VRChat variations */}
      {showVRChatGroup && (
        <div
          style={{
            position: "absolute",
            top: 570,
            width: "100%",
            display: "flex",
            justifyContent: "center",
            gap: 30,
          }}
        >
          {[
            { label: "VRChat", spring: vrTag1Spring },
            { label: "vrchat", spring: vrTag2Spring },
            { label: "Vrchat", spring: vrTag3Spring },
          ].map((tag) => (
            <div
              key={tag.label}
              style={{
                transform: `scale(${tag.spring})`,
                background: "rgba(255, 255, 255, 0.1)",
                border: "2px solid rgba(255,255,255,0.3)",
                borderRadius: 30,
                padding: "12px 28px",
                fontSize: 28,
                fontWeight: 700,
                color: FEATURE_COLORS.white,
                boxShadow: "0 4px 15px rgba(0,0,0,0.3)",
              }}
            >
              {tag.label}
            </div>
          ))}
        </div>
      )}

      {/* Disconnection lines between VRChat tags */}
      {showDisconnected && (
        <div
          style={{
            position: "absolute",
            top: 640,
            left: "50%",
            transform: "translateX(-50%)",
            opacity: disconnectOpacity,
          }}
        >
          <svg width="500" height="30" style={{ overflow: "visible" }}>
            <line
              x1="60"
              y1="15"
              x2="200"
              y2="15"
              stroke={FEATURE_COLORS.danger}
              strokeWidth="2"
              strokeDasharray="6 4"
              opacity="0.5"
            />
            <text x="215" y="22" fill={FEATURE_COLORS.danger} fontSize="20" fontWeight="bold">
              ✕
            </text>
            <line
              x1="240"
              y1="15"
              x2="380"
              y2="15"
              stroke={FEATURE_COLORS.danger}
              strokeWidth="2"
              strokeDasharray="6 4"
              opacity="0.5"
            />
            <text x="395" y="22" fill={FEATURE_COLORS.danger} fontSize="20" fontWeight="bold">
              ✕
            </text>
          </svg>
        </div>
      )}

      {/* Explanation text */}
      <div
        style={{
          position: "absolute",
          bottom: 120,
          width: "100%",
          textAlign: "center",
          opacity: textOpacity,
          transform: `translateY(${textY}px)`,
        }}
      >
        <span
          style={{
            fontSize: 40,
            fontWeight: 700,
            color: FEATURE_COLORS.white,
            letterSpacing: "0.05em",
            textShadow: "0 2px 10px rgba(0,0,0,0.5)",
          }}
        >
          表記が違うだけで
          <span style={{ color: FEATURE_COLORS.danger }}>別のタグ扱い</span>
        </span>
      </div>
    </AbsoluteFill>
  );
};
