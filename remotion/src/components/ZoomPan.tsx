import React from "react";
import { useCurrentFrame, interpolate, Img, staticFile } from "remotion";

interface ZoomPanProps {
  imageSrc: string;
  startFrame: number;
  endFrame: number;
  startScale: number;
  endScale: number;
  focusX: number;
  focusY: number;
}

export const ZoomPan: React.FC<ZoomPanProps> = ({
  imageSrc,
  startFrame,
  endFrame,
  startScale,
  endScale,
  focusX,
  focusY,
}) => {
  const frame = useCurrentFrame();

  const scale = interpolate(
    frame,
    [startFrame, endFrame],
    [startScale, endScale],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }
  );

  const translateX = interpolate(
    frame,
    [startFrame, endFrame],
    [0, -(focusX - 960) * (endScale - 1)],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }
  );

  const translateY = interpolate(
    frame,
    [startFrame, endFrame],
    [0, -(focusY - 540) * (endScale - 1)],
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
        src={staticFile(imageSrc)}
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
