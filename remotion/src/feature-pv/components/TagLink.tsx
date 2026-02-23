import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { notoSansJP } from "../../fonts";
import { FEATURE_COLORS, SPRING_CONFIGS } from "../featureConstants";

interface TagPillProps {
  label: string;
  x: number;
  y: number;
  delay: number;
  connected: boolean;
  fromDirection?: "left" | "right";
}

const TagPill: React.FC<TagPillProps> = ({
  label,
  x,
  y,
  delay,
  connected,
  fromDirection = "left",
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const enterSpring = spring({
    frame: frame - delay,
    fps,
    config: SPRING_CONFIGS.bouncy,
  });

  const offsetX = fromDirection === "left" ? -200 : 200;
  const translateX = interpolate(enterSpring, [0, 1], [offsetX, 0]);
  const opacity = interpolate(frame - delay, [0, 10], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const glowShadow = connected
    ? `0 0 20px ${FEATURE_COLORS.gold}80, 0 0 40px ${FEATURE_COLORS.gold}40`
    : "0 4px 15px rgba(0,0,0,0.3)";

  const borderColor = connected ? FEATURE_COLORS.gold : "rgba(255,255,255,0.3)";
  const bgColor = connected
    ? `linear-gradient(135deg, ${FEATURE_COLORS.goldDark}40, ${FEATURE_COLORS.gold}20)`
    : "rgba(255, 255, 255, 0.1)";

  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        transform: `translateX(${translateX}px)`,
        opacity,
        background: bgColor,
        border: `2px solid ${borderColor}`,
        borderRadius: 30,
        padding: "12px 32px",
        fontSize: 32,
        fontWeight: 700,
        fontFamily: notoSansJP,
        color: connected ? FEATURE_COLORS.gold : FEATURE_COLORS.white,
        boxShadow: glowShadow,
        whiteSpace: "nowrap",
        transition: "box-shadow 0.3s",
      }}
    >
      {label}
    </div>
  );
};

interface TagLinkProps {
  leftLabel: string;
  rightLabel: string;
  centerX: number;
  centerY: number;
  gapX?: number;
  leftDelay: number;
  rightDelay: number;
  connectionDelay: number;
  connected: boolean;
  disconnected?: boolean;
  disconnectOpacity?: number;
  id: string;
}

export const TagLink: React.FC<TagLinkProps> = ({
  leftLabel,
  rightLabel,
  centerX,
  centerY,
  gapX = 360,
  leftDelay,
  rightDelay,
  connectionDelay,
  connected,
  disconnected = false,
  disconnectOpacity = 1,
  id,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const leftX = centerX - gapX / 2 - 80;
  const rightX = centerX + gapX / 2 - 40;
  const arrowY = centerY + 20;

  // Arrow draw progress
  const drawProgress = connected
    ? interpolate(frame - connectionDelay, [0, 60], [0, 1], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      })
    : 0;

  // Glow after connection
  const connectionComplete = connected && frame >= connectionDelay + 60;
  const glowOpacity = connectionComplete
    ? 0.4 + Math.sin((frame - connectionDelay - 60) * 0.08) * 0.3
    : 0;

  const arrowPathLength = gapX - 120;
  const dashOffset = arrowPathLength * (1 - drawProgress);

  const gradientId = `feature-gold-grad-${id}`;

  return (
    <div style={{ position: "absolute", left: 0, top: 0, width: "100%", height: "100%" }}>
      <TagPill
        label={leftLabel}
        x={leftX}
        y={centerY}
        delay={leftDelay}
        connected={connectionComplete}
        fromDirection="left"
      />
      <TagPill
        label={rightLabel}
        x={rightX}
        y={centerY}
        delay={rightDelay}
        connected={connectionComplete}
        fromDirection="right"
      />

      {/* Connection arrow (SVG) */}
      {(connected || disconnected) && (
        <svg
          style={{
            position: "absolute",
            left: centerX - gapX / 2 + 60,
            top: arrowY,
            width: arrowPathLength + 40,
            height: 40,
            overflow: "visible",
          }}
        >
          <defs>
            <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop
                offset="0%"
                stopColor={disconnected ? FEATURE_COLORS.danger : FEATURE_COLORS.gold}
              />
              <stop
                offset="100%"
                stopColor={disconnected ? FEATURE_COLORS.danger : FEATURE_COLORS.goldLight}
              />
            </linearGradient>
          </defs>

          {disconnected ? (
            <g opacity={disconnectOpacity}>
              {/* Broken line segments */}
              <line
                x1="0"
                y1="20"
                x2={arrowPathLength * 0.4}
                y2="20"
                stroke={FEATURE_COLORS.danger}
                strokeWidth="3"
                strokeDasharray="8 6"
                opacity="0.6"
              />
              <line
                x1={arrowPathLength * 0.6}
                y1="20"
                x2={arrowPathLength}
                y2="20"
                stroke={FEATURE_COLORS.danger}
                strokeWidth="3"
                strokeDasharray="8 6"
                opacity="0.6"
              />
              {/* X mark in center */}
              <text
                x={arrowPathLength * 0.5}
                y="26"
                textAnchor="middle"
                fill={FEATURE_COLORS.danger}
                fontSize="28"
                fontWeight="bold"
              >
                ✕
              </text>
            </g>
          ) : (
            <>
              {/* Drawing arrow line */}
              <line
                x1="0"
                y1="20"
                x2={arrowPathLength}
                y2="20"
                stroke={`url(#${gradientId})`}
                strokeWidth="3"
                strokeDasharray={arrowPathLength}
                strokeDashoffset={dashOffset}
                strokeLinecap="round"
              />
              {/* Arrow head */}
              {drawProgress > 0.8 && (
                <polygon
                  points={`${arrowPathLength - 5},10 ${arrowPathLength + 10},20 ${arrowPathLength - 5},30`}
                  fill={FEATURE_COLORS.goldLight}
                  opacity={interpolate(drawProgress, [0.8, 1], [0, 1], {
                    extrapolateLeft: "clamp",
                    extrapolateRight: "clamp",
                  })}
                />
              )}
              {/* Glow effect */}
              {connectionComplete && (
                <line
                  x1="0"
                  y1="20"
                  x2={arrowPathLength}
                  y2="20"
                  stroke={FEATURE_COLORS.gold}
                  strokeWidth="6"
                  opacity={glowOpacity}
                  filter="blur(4px)"
                />
              )}
            </>
          )}
        </svg>
      )}
    </div>
  );
};
