import React from "react";
import { useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";

interface FocusHighlightProps {
  x: number;
  y: number;
  width?: number;
  height?: number;
  label: string;
  startFrame: number;
  duration: number;
}

export const FocusHighlight: React.FC<FocusHighlightProps> = ({
  x,
  y,
  width = 200,
  height = 250,
  label,
  startFrame,
  duration,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const isVisible = frame >= startFrame && frame < startFrame + duration;

  if (!isVisible) return null;

  const localFrame = frame - startFrame;

  const scaleIn = spring({
    frame: localFrame,
    fps,
    config: {
      damping: 12,
      stiffness: 100,
    },
  });

  const opacity = interpolate(
    localFrame,
    [0, 10, duration - 10, duration],
    [0, 1, 1, 0],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }
  );

  return (
    <div
      style={{
        position: "absolute",
        left: x - width / 2,
        top: y - height / 2,
        width,
        height,
        transform: `scale(${scaleIn})`,
        opacity,
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          width: "100%",
          height: "100%",
          border: "4px solid #ff4444",
          borderRadius: 12,
          boxShadow: "0 0 20px rgba(255, 68, 68, 0.5)",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: -40,
          left: "50%",
          transform: "translateX(-50%)",
          backgroundColor: "#ff4444",
          color: "#fff",
          padding: "8px 16px",
          borderRadius: 8,
          fontSize: 24,
          fontWeight: "bold",
          whiteSpace: "nowrap",
        }}
      >
        {label}
      </div>
    </div>
  );
};
