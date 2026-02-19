import React from "react";
import {
  AbsoluteFill,
  Img,
  staticFile,
  useCurrentFrame,
  interpolate,
  spring,
  useVideoConfig,
} from "remotion";
import { notoSansJP } from "../../fonts";


/**
 * Scene 2: 解決策の提示 - PolySeekの紹介
 *
 * Remotionタイムライン (540フレーム = 9秒 @60fps):
 * - 0-60f: 暗転から背景グラディエントへアニメーション遷移
 * - 40-100f: ロゴがspringバウンスで登場
 * - 80-140f: ロゴタイプがSnappy springでスライドイン
 * - 120-180f: キャッチコピーがスケールインで登場
 * - 200-260f: 説明文がスムースフェードアップ
 */

export const Scene2Solution: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // === 背景: 段階的グラディエントアニメーション ===
  const bgOpacity = interpolate(frame, [0, 60], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // グラディエント角度の微妙な回転 (135° → 155°)
  const gradientAngle = interpolate(frame, [0, 180], [135, 155], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // グラディエントカラーの変化 (dark → neutral系)
  const colorIntensity = interpolate(frame, [0, 180], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // === ロゴ: spring バウンスイン (40f→) ===
  const logoSpring = spring({
    frame: frame - 40,
    fps,
    config: { damping: 8 },
  });

  const logoOpacity = interpolate(frame, [40, 70], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // === ロゴタイプ: Snappy spring (80f→) ===
  const logoTypeSpring = spring({
    frame: frame - 80,
    fps,
    config: { damping: 20, stiffness: 200 },
  });

  const logoTypeOpacity = interpolate(frame, [80, 110], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const logoTypeY = interpolate(logoTypeSpring, [0, 1], [20, 0]);

  // === キャッチコピー: スケールインアニメーション (120f→) ===
  const catchcopySpring = spring({
    frame: frame - 120,
    fps,
    config: { damping: 12 },
  });

  const catchcopyOpacity = interpolate(frame, [120, 150], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const catchcopyScale = interpolate(catchcopySpring, [0, 1], [0.7, 1]);

  // === 説明文: スムースフェードアップ (200f→) ===
  const descSpring = spring({
    frame: frame - 200,
    fps,
    config: { damping: 200 },
  });

  const descOpacity = interpolate(frame, [200, 240], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const descY = interpolate(descSpring, [0, 1], [20, 0]);


  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      {/* グラディエント背景 - アニメーション付き */}
      <AbsoluteFill
        style={{
          opacity: bgOpacity,
          background: `linear-gradient(${gradientAngle}deg,
            ${interpolateColor(colorIntensity, "#0a0a0a", "#111111")} 0%,
            ${interpolateColor(colorIntensity, "#1a1a1a", "#222222")} 40%,
            ${interpolateColor(colorIntensity, "#000000", "#0a0a0a")} 100%)`,
        }}
      />

      {/* コンテンツコンテナ */}
      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "center",
          flexDirection: "column",
          fontFamily: notoSansJP,
        }}
      >
        {/* ロゴエリア */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            marginBottom: 60,
          }}
        >
          {/* ロゴアイコン */}
          <div
            style={{
              opacity: logoOpacity,
              transform: `scale(${logoSpring})`,
              marginBottom: 30,
            }}
          >
            <Img
              src={staticFile("images/PolySeek_icon.png")}
              style={{
                width: 180,
                height: 180,
                objectFit: "contain",
              }}
            />
          </div>

          {/* ロゴタイプ */}
          <div
            style={{
              opacity: logoTypeOpacity,
              transform: `translateY(${logoTypeY}px)`,
            }}
          >
            <Img
              src={staticFile("images/PolySeek_logo_type.svg")}
              style={{
                width: 400,
                height: "auto",
                objectFit: "contain",
              }}
            />
          </div>
        </div>

        {/* テキストエリア */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            height: 160,
          }}
        >
          {/* キャッチコピー - スケールイン */}
          <p
            style={{
              opacity: catchcopyOpacity,
              transform: `scale(${catchcopyScale})`,
              color: "#fff",
              fontSize: 64,
              fontWeight: 900,
              fontFamily: notoSansJP,
              margin: "0 0 24px 0",
              textShadow:
                "0 0 20px rgba(255, 255, 255, 0.5), 0 4px 20px rgba(0, 0, 0, 0.3)",
              textAlign: "center",
              lineHeight: 1.2,
            }}
          >
            みんなで作るタグ検索
          </p>

          {/* 説明文 - スムースフェードアップ */}
          <p
            style={{
              opacity: descOpacity,
              transform: `translateY(${descY}px)`,
              color: "rgba(255, 255, 255, 0.9)",
              fontSize: 36,
              fontWeight: 300,
              fontFamily: notoSansJP,
              margin: 0,
              textShadow: "0 2px 10px rgba(0, 0, 0, 0.3)",
              textAlign: "center",
            }}
          >
            正しい情報を付け足し、より詳細な検索を可能に
          </p>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// カラー補間ヘルパー（hex → hex）
function interpolateColor(t: number, from: string, to: string): string {
  const f = hexToRgb(from);
  const toRgb = hexToRgb(to);
  const r = Math.round(f.r + (toRgb.r - f.r) * t);
  const g = Math.round(f.g + (toRgb.g - f.g) * t);
  const b = Math.round(f.b + (toRgb.b - f.b) * t);
  return `rgb(${r}, ${g}, ${b})`;
}

function hexToRgb(hex: string) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : { r: 0, g: 0, b: 0 };
}
