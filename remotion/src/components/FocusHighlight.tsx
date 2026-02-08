import React from "react";
import { useCurrentFrame, interpolate, spring, useVideoConfig, Easing } from "remotion";

interface FocusHighlightProps {
  x: number;
  y: number;
  width?: number;
  height?: number;
  label: string;
  startFrame: number;
  duration: number;
  /** ズーム倍率（デフォルト: 1.3） */
  zoomScale?: number;
  /** ズームを適用するコールバック */
  onZoomChange?: (scale: number, translateX: number, translateY: number) => void;
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
        opacity,
        pointerEvents: "none",
      }}
    >
      {/* ラベルのみ表示（赤枠は削除） */}
      <div
        style={{
          position: "absolute",
          bottom: -40,
          left: "50%",
          transform: `translateX(-50%) scale(${scaleIn})`,
          transformOrigin: "center center",
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
