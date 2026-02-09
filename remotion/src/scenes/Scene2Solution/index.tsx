import React from "react";
import {
  AbsoluteFill,
  Img,
  staticFile,
  useCurrentFrame,
  interpolate,
  Easing,
} from "remotion";

/**
 * Scene 2: 解決策の提示 - PolySeekの紹介
 *
 * Remotionタイムライン (150フレーム = 5秒):
 * - 0-30f (0-1秒): 暗転から明るいグラデーション背景へフェードイン
 * - 15-45f (0.5-1.5秒): ロゴがスケールインで登場
 * - 45-75f (1.5-2.5秒): キャッチコピー表示
 * - 75-105f (2.5-3.5秒): 説明文表示
 * - 105-150f (3.5-5秒): 全体表示維持
 */

// ブランドカラー
const BRAND_COLORS = {
  darkGreen: "#0a2818",
  green1: "#358C54",
  green2: "#3FA659",
  brightGreen: "#0DF205",
  lightGreen: "#54BF50",
};

export const Scene2Solution: React.FC = () => {
  const frame = useCurrentFrame();

  // 背景フェードイン (0-30f)
  const bgOpacity = interpolate(frame, [0, 30], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  // ロゴアニメーション (15-45f)
  const logoScale = interpolate(frame, [15, 45], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.back(1.5)),
  });

  const logoOpacity = interpolate(frame, [15, 30], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // ロゴタイプアニメーション (30-50f)
  const logoTypeOpacity = interpolate(frame, [30, 45], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const logoTypeY = interpolate(frame, [30, 50], [20, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  // キャッチコピーアニメーション (45-75f)
  const catchcopyOpacity = interpolate(frame, [45, 60], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const catchcopyY = interpolate(frame, [45, 65], [30, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  // 説明文アニメーション (75-105f)
  const descOpacity = interpolate(frame, [75, 90], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const descY = interpolate(frame, [75, 95], [20, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      {/* グラデーション背景 - ロゴが映えるように暗めに調整 */}
      <AbsoluteFill
        style={{
          opacity: bgOpacity,
          background: `radial-gradient(ellipse at center, #1a3a2a 0%, #0d1f16 40%, #000000 100%)`,
        }}
      />

      {/* コンテンツコンテナ - Sequenceを使わずに直接配置することでFlexboxを有効化 */}
      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "center",
          flexDirection: "column",
          width: "100%",
          height: "100%",
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
              transform: `scale(${logoScale})`,
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
            height: 160, // 高さを固定してレイアウト崩れを防ぐ
          }}
        >
          {/* キャッチコピー */}
          <p
            style={{
              opacity: catchcopyOpacity,
              transform: `translateY(${catchcopyY}px)`,
              color: "#fff",
              fontSize: 64,
              fontWeight: "bold",
              margin: "0 0 24px 0",
              textShadow:
                "0 0 20px rgba(255, 255, 255, 0.5), 0 4px 20px rgba(0, 0, 0, 0.3)",
              textAlign: "center",
              lineHeight: 1.2,
            }}
          >
            みんなで作るタグ検索
          </p>

          {/* 説明文 */}
          <p
            style={{
              opacity: descOpacity,
              transform: `translateY(${descY}px)`,
              color: "rgba(255, 255, 255, 0.9)",
              fontSize: 36,
              fontWeight: "normal",
              margin: 0,
              textShadow: "0 2px 10px rgba(0, 0, 0, 0.3)",
              textAlign: "center",
            }}
          >
            公式タグにない検索が可能
          </p>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
