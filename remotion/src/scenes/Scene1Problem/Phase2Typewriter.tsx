import React from "react";
import { AbsoluteFill, Img, staticFile } from "remotion";
import { TypewriterText } from "../../components/TypewriterText";

interface Phase2TypewriterProps {
  startFrame: number;
}

export const Phase2Typewriter: React.FC<Phase2TypewriterProps> = ({
  startFrame,
}) => {
  // 検索窓の位置（Phase1の最終状態と同じズーム）
  const scale = 3;
  const focusX = 960;
  const focusY = 150;

  const translateX = -(focusX - 960) * (scale - 1);
  const translateY = -(focusY - 540) * (scale - 1);

  return (
    <AbsoluteFill>
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
      {/* タイプライターオーバーレイ（検索窓位置に調整） */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          fontSize: 48,
          fontFamily: "sans-serif",
          color: "#333",
          backgroundColor: "rgba(255, 255, 255, 0.9)",
          padding: "16px 32px",
          borderRadius: 8,
        }}
      >
        <TypewriterText
          text="3Dキャラクター"
          startFrame={startFrame}
          charactersPerSecond={5}
        />
      </div>
    </AbsoluteFill>
  );
};
