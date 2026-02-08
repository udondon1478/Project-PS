import React from "react";
import { AbsoluteFill, Img, staticFile } from "remotion";
import { FocusHighlight } from "../../components/FocusHighlight";

interface Phase4FocusNoiseProps {
  startFrame: number;
}

// ノイズ商品の位置（スクリーンショット撮影後に調整）
const noiseProducts = [
  { x: 300, y: 450, label: "衣装", width: 220, height: 280 },
  { x: 600, y: 450, label: "テクスチャ", width: 220, height: 280 },
  { x: 900, y: 450, label: "ギミック", width: 220, height: 280 },
  { x: 1200, y: 450, label: "衣装", width: 220, height: 280 },
  { x: 1500, y: 450, label: "背景", width: 220, height: 280 },
];

export const Phase4FocusNoise: React.FC<Phase4FocusNoiseProps> = ({
  startFrame,
}) => {
  const frameDuration = 45; // 各商品のフォーカス時間

  return (
    <AbsoluteFill>
      <Img
        src={staticFile("booth-after.png")}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
        }}
      />
      {noiseProducts.map((product, i) => (
        <FocusHighlight
          key={i}
          x={product.x}
          y={product.y}
          width={product.width}
          height={product.height}
          label={product.label}
          startFrame={startFrame + i * frameDuration}
          duration={frameDuration}
        />
      ))}
    </AbsoluteFill>
  );
};
