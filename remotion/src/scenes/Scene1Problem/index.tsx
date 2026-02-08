import React from "react";
import {
  AbsoluteFill,
  Video,
  staticFile,
  Sequence,
  useCurrentFrame,
  interpolate,
} from "remotion";
import { FocusHighlight } from "../../components/FocusHighlight";

/**
 * Scene 1: 問題提起 - BOOTHの検索ノイズを視覚化
 *
 * 動画タイムライン (booth_samples.mov):
 * - 00:00-05:25 (0-162f): トップページ
 * - 05:26-05:29 (163-176f): BOOTH商品表示（スキップ）
 * - 05:30以降 (177f-): 検索結果
 *
 * Remotionタイムライン:
 * - 0-1秒 (0-30f): 動画開始（通常表示）
 * - 1-3秒 (30-90f): 検索窓に3倍ズームイン
 * - 3-5.4秒 (90-162f): 通常表示（動画05:25まで）
 * - 5.4秒以降 (162f-): 動画05:30から再開（スキップ後）
 * - 8秒以降 (240f-): ノイズ商品にフォーカス
 */

// 動画フレーム定義（30fps）
const VIDEO_FREEZE_FRAME = 177; // 動画05:25 - フリーズポイント
const VIDEO_RESUME_FRAME = 180; // 動画05:30 - 再開ポイント
const SKIP_DURATION = VIDEO_RESUME_FRAME - VIDEO_FREEZE_FRAME; // スキップするフレーム数

export const Scene1Problem: React.FC = () => {
  const frame = useCurrentFrame();

  // ノイズ商品の位置（動画に合わせて調整してください）
  const noiseProducts = [
    { x: 1088, y: 300, label: "衣装", width: 220, height: 380 },
    { x: 1350, y: 300, label: "テクスチャ", width: 240, height: 380 },
    { x: 900, y: 450, label: "ギミック", width: 220, height: 280 },
    { x: 1200, y: 450, label: "3Dキャラクター", width: 220, height: 280 },
    { x: 1500, y: 450, label: "背景", width: 220, height: 280 },
  ];

  // 検索窓の位置（動画に合わせて調整）
  const searchBoxX = 260;
  const searchBoxY = 0;

  // ズームアニメーション
  // 0-30f: 1倍、30-60f: 1→3倍、60-120f: 3倍維持、120-150f: 3→1倍
  const zoomScale = interpolate(
    frame,
    [0, 30, 60, 120, 150],
    [1, 1, 3, 3, 1],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }
  );

  // ズーム時のトランスレート（検索窓を中心に）
  const centerX = 960; // 画面中央X
  const centerY = 540; // 画面中央Y
  const translateX = interpolate(
    frame,
    [0, 30, 60, 120, 150],
    [0, 0, (centerX - searchBoxX) * (3 - 1), (centerX - searchBoxX) * (3 - 1), 0],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }
  );
  const translateY = interpolate(
    frame,
    [0, 30, 60, 120, 150],
    [0, 0, (centerY - searchBoxY) * (3 - 1), (centerY - searchBoxY) * (3 - 1), 0],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }
  );

  // フォーカス開始フレーム（スキップ分を調整）
  const focusStartFrame = 240 - SKIP_DURATION;
  const focusDuration = 60; // 各商品のフォーカス時間

  // 動画の共通スタイル
  const videoStyle: React.CSSProperties = {
    width: "100%",
    height: "100%",
    objectFit: "cover",
  };

  return (
    <AbsoluteFill style={{ backgroundColor: "#000", overflow: "hidden" }}>
      {/* BOOTH録画動画（ズームアニメーション付き） */}
      <div
        style={{
          width: "100%",
          height: "100%",
          transform: `scale(${zoomScale}) translate(${translateX / zoomScale}px, ${translateY / zoomScale}px)`,
          transformOrigin: "center center",
        }}
      >
        {/* Part 1: 動画開始から05:25まで（0-162フレーム） */}
        <Sequence from={0} durationInFrames={VIDEO_FREEZE_FRAME}>
          <Video
            src={staticFile("booth_samples.mov")}
            style={videoStyle}
          />
        </Sequence>

        {/* Part 2: 動画05:30から再開（177フレームから開始） */}
        <Sequence from={VIDEO_FREEZE_FRAME}>
          <Video
            src={staticFile("booth_samples.mov")}
            startFrom={VIDEO_RESUME_FRAME}
            style={videoStyle}
          />
        </Sequence>
      </div>

      {/* ノイズ商品へのフォーカスオーバーレイ */}
      <Sequence from={focusStartFrame}>
        <AbsoluteFill>
          {noiseProducts.map((product, i) => (
            <FocusHighlight
              key={i}
              x={product.x}
              y={product.y}
              width={product.width}
              height={product.height}
              label={product.label}
              startFrame={i * focusDuration}
              duration={focusDuration}
            />
          ))}
        </AbsoluteFill>
      </Sequence>
    </AbsoluteFill>
  );
};
