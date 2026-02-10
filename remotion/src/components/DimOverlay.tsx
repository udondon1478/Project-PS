import React from "react";
import { useCurrentFrame, interpolate, Easing } from "remotion";

interface DimOverlayProps {
  /** フォーカス領域の中心X座標 */
  focusX: number;
  /** フォーカス領域の中心Y座標 */
  focusY: number;
  /** フォーカス領域の幅 */
  focusWidth: number;
  /** フォーカス領域の高さ */
  focusHeight: number;
  /** 開始フレーム */
  startFrame: number;
  /** 継続フレーム数 */
  duration: number;
  /** 暗転の強さ（0-1） */
  dimOpacity?: number;
}

/**
 * フォーカス領域以外を暗くするオーバーレイ
 * SVGマスクを使用してフォーカス領域を切り抜く
 */
export const DimOverlay: React.FC<DimOverlayProps> = ({
  focusX,
  focusY,
  focusWidth,
  focusHeight,
  startFrame,
  duration,
  dimOpacity = 0.5,
}) => {
  const frame = useCurrentFrame();

  const isVisible = frame >= startFrame && frame < startFrame + duration;
  if (!isVisible) return null;

  const localFrame = frame - startFrame;

  // フェードイン・アウト（0.3秒 = 9フレーム）
  const fadeFrames = 9;
  const opacity = interpolate(
    localFrame,
    [0, fadeFrames, duration - fadeFrames, duration],
    [0, dimOpacity, dimOpacity, 0],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.inOut(Easing.cubic),
    }
  );

  // フォーカス領域の左上座標を計算
  const left = focusX - focusWidth / 2;
  const top = focusY - focusHeight / 2;

  return (
    <svg
      style={{
        position: "absolute",
        top: -2,
        left: -2,
        width: "calc(100% + 4px)",
        height: "calc(100% + 4px)",
        pointerEvents: "none",
      }}
    >
      <defs>
        <mask id={`dim-mask-${startFrame}`}>
          {/* 全体を白（表示） - サブピクセルギャップ防止のため余裕を持たせる */}
          <rect x="0" y="0" width="1924" height="1084" fill="white" />
          {/* フォーカス領域を黒（非表示=暗転しない） */}
          <rect
            x={left}
            y={top}
            width={focusWidth}
            height={focusHeight}
            rx={12}
            ry={12}
            fill="black"
          />
        </mask>
      </defs>
      {/* 暗転レイヤー - サブピクセルギャップ防止のため余裕を持たせる */}
      <rect
        x="0"
        y="0"
        width="1924"
        height="1084"
        fill="black"
        opacity={opacity}
        mask={`url(#dim-mask-${startFrame})`}
      />
    </svg>
  );
};
