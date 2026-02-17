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
  /** カメラスケールの補正倍率（デフォルト: 1） */
  renderScale?: number;
  /** ラベルのX方向オフセット（視覚ピクセル、正=右）デフォルト: 0 */
  labelOffsetX?: number;
  /** ラベルのY方向オフセット（視覚ピクセル、正=上＝商品に近づく）デフォルト: 0 */
  labelOffsetY?: number;
}

export const FocusHighlight: React.FC<FocusHighlightProps> = ({
  x,
  y,
  width = 200,
  height = 250,
  label,
  startFrame,
  duration,
  renderScale = 1,
  labelOffsetX = 0,
  labelOffsetY = 0,
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
          bottom: (-70 + labelOffsetY) / renderScale,
          left: `calc(50% + ${labelOffsetX / renderScale}px)`,
          transform: `translateX(-50%) scale(${scaleIn})`,
          transformOrigin: "center center",
          backgroundColor: "#ff4444",
          color: "#fff",
          padding: `${12 / renderScale}px ${28 / renderScale}px`,
          borderRadius: 12 / renderScale,
          fontSize: 48 / renderScale,
          fontWeight: "bold",
          whiteSpace: "nowrap",
        }}
      >
        {label}
      </div>
    </div>
  );
};
