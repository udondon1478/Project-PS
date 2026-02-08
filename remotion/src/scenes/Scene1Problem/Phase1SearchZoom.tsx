import React from "react";
import { useCurrentFrame, interpolate, Img, staticFile } from "remotion";

interface Phase1SearchZoomProps {
  startFrame: number;
  endFrame: number;
}

export const Phase1SearchZoom: React.FC<Phase1SearchZoomProps> = ({
  startFrame,
  endFrame,
}) => {
  const frame = useCurrentFrame();

  const scale = interpolate(frame, [startFrame, endFrame], [1, 3], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // 検索窓の位置（スクリーンショット撮影後に調整）
  const focusX = 960;
  const focusY = 150;

  const translateX = interpolate(
    frame,
    [startFrame, endFrame],
    [0, -(focusX - 960) * (scale - 1)],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }
  );

  const translateY = interpolate(
    frame,
    [startFrame, endFrame],
    [0, -(focusY - 540) * (scale - 1)],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }
  );

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
        src={staticFile("booth-before.png")}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          transform: `scale(${scale}) translate(${translateX / scale}px, ${translateY / scale}px)`,
          transformOrigin: "center center",
        }}
      />
    </div>
  );
};
