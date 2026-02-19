import React from "react";
import { useCurrentFrame, interpolate, Img, staticFile } from "remotion";

interface Phase3ResultsProps {
  startFrame: number;
  endFrame: number;
}

export const Phase3Results: React.FC<Phase3ResultsProps> = ({
  startFrame,
  endFrame,
}) => {
  const frame = useCurrentFrame();

  // ズームアウト: 3 → 1
  const scale = interpolate(frame, [startFrame, endFrame], [3, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // 画像切り替え（ズームアウト中盤で切り替え）
  const switchFrame = startFrame + (endFrame - startFrame) / 2;
  const showAfterImage = frame >= switchFrame;

  const imageSrc = showAfterImage ? "booth-after.png" : "booth-before.png";

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        overflow: "hidden",
        position: "relative",
      }}
    >
      <Img
        src={staticFile(imageSrc)}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          transform: `scale(${scale})`,
          transformOrigin: "center center",
        }}
      />
    </div>
  );
};
