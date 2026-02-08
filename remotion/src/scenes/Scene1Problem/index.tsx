import React from "react";
import {
  AbsoluteFill,
  Video,
  staticFile,
  Sequence,
  useCurrentFrame,
  interpolate,
  Easing,
} from "remotion";
import { FocusHighlight } from "../../components/FocusHighlight";
import { DimOverlay } from "../../components/DimOverlay";

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

  // ノイズ商品の位置（3商品のみ：衣装、テクスチャ、ギミック）
  const noiseProducts = [
    { x: 1039, y: 395, label: "衣装", width: 340, height: 560 },
    { x: 1195, y: 395, label: "テクスチャ", width: 340, height: 560 },
    { x: 1450, y: 395, label: "ギミック", width: 340, height: 560 },
  ];

  // 検索窓の位置（動画に合わせて調整）
  const searchBoxX = 260;
  const searchBoxY = 0;

  // ズームアニメーション（プロフェッショナルなイージング適用）
  // 0-30f: 1倍、30-60f: 1→3倍（ease-out）、60-120f: 3倍維持、120-150f: 3→1倍（ease-in-out）
  const zoomIn = interpolate(
    frame,
    [30, 60],
    [1, 3],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.out(Easing.cubic), // 最初速く、終わりゆっくり
    }
  );

  const zoomOut = interpolate(
    frame,
    [120, 150],
    [3, 1],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.inOut(Easing.cubic), // なめらかな開始と終了
    }
  );

  // フレームに応じてズームスケールを決定
  let zoomScale: number;
  if (frame < 30) {
    zoomScale = 1;
  } else if (frame < 60) {
    zoomScale = zoomIn;
  } else if (frame < 120) {
    zoomScale = 3;
  } else if (frame < 150) {
    zoomScale = zoomOut;
  } else {
    zoomScale = 1;
  }

  // ズーム時のトランスレート（検索窓を中心に）- イージング適用
  const centerX = 960; // 画面中央X
  const centerY = 540; // 画面中央Y
  const maxTranslateX = (centerX - searchBoxX) * (3 - 1);
  const maxTranslateY = (centerY - searchBoxY) * (3 - 1);

  const translateInX = interpolate(
    frame,
    [30, 60],
    [0, maxTranslateX],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.out(Easing.cubic),
    }
  );

  const translateOutX = interpolate(
    frame,
    [120, 150],
    [maxTranslateX, 0],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.inOut(Easing.cubic),
    }
  );

  const translateInY = interpolate(
    frame,
    [30, 60],
    [0, maxTranslateY],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.out(Easing.cubic),
    }
  );

  const translateOutY = interpolate(
    frame,
    [120, 150],
    [maxTranslateY, 0],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.inOut(Easing.cubic),
    }
  );

  // フレームに応じてトランスレートを決定
  let translateX: number;
  let translateY: number;
  if (frame < 30) {
    translateX = 0;
    translateY = 0;
  } else if (frame < 60) {
    translateX = translateInX;
    translateY = translateInY;
  } else if (frame < 120) {
    translateX = maxTranslateX;
    translateY = maxTranslateY;
  } else if (frame < 150) {
    translateX = translateOutX;
    translateY = translateOutY;
  } else {
    translateX = 0;
    translateY = 0;
  }

  // フォーカス開始フレーム（スキップ分を調整）
  const focusStartFrame = 240 - SKIP_DURATION;
  const focusDuration = 60; // 各商品のフォーカス時間
  const totalFocusDuration = focusDuration * noiseProducts.length;
  const focusEndFrame = focusStartFrame + totalFocusDuration;

  // 商品フォーカス時のズーム（1.5倍）- パン方式
  const PRODUCT_ZOOM_SCALE = 1.5;
  const zoomInDuration = 12; // 0.4秒でズームイン
  const zoomOutDuration = 12; // 0.4秒でズームアウト
  const panDuration = 15; // 0.5秒でパン移動

  // 現在フォーカス中の商品を判定
  const localFocusFrame = frame - focusStartFrame;
  const currentProductIndex = Math.min(
    Math.floor(localFocusFrame / focusDuration),
    noiseProducts.length - 1
  );
  const isInFocusPhase = frame >= focusStartFrame && frame < focusEndFrame;

  // 商品フォーカス時のズームとパンアニメーション
  let productZoomScale = 1;
  let productTranslateX = 0;
  let productTranslateY = 0;

  if (isInFocusPhase) {
    // フォーカスフェーズ全体でのズーム（最初にズームイン、最後にズームアウト）
    productZoomScale = interpolate(
      localFocusFrame,
      [0, zoomInDuration, totalFocusDuration - zoomOutDuration, totalFocusDuration],
      [1, PRODUCT_ZOOM_SCALE, PRODUCT_ZOOM_SCALE, 1],
      {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
        easing: Easing.inOut(Easing.cubic),
      }
    );

    // 各商品へのパン（視点移動）
    // 商品を画面中央に持ってくるためのトランスレート値を計算（ズーム倍率を考慮）
    // 黒縁が見えないように境界内に制限
    const screenWidth = 1920;
    const screenHeight = 1080;

    // ズーム時に黒縁が見えない最大トランスレート値を計算
    const maxTranslateX = (screenWidth * PRODUCT_ZOOM_SCALE - screenWidth) / 2;
    const maxTranslateY = (screenHeight * PRODUCT_ZOOM_SCALE - screenHeight) / 2;

    const productPositions = noiseProducts.map((p) => {
      // 理想的な移動量（商品を中央に）
      const idealX = (centerX - p.x) * PRODUCT_ZOOM_SCALE;
      const idealY = (centerY - p.y) * PRODUCT_ZOOM_SCALE;

      // 境界内に制限（黒縁が見えないように）
      return {
        x: Math.max(-maxTranslateX, Math.min(maxTranslateX, idealX)),
        y: Math.max(-maxTranslateY, Math.min(maxTranslateY, idealY)),
      };
    });

    // 各商品のフォーカス開始フレームを計算
    const keyframes: number[] = [];
    const xValues: number[] = [];
    const yValues: number[] = [];

    noiseProducts.forEach((_, i) => {
      const productStart = i * focusDuration;
      if (i === 0) {
        // 最初の商品：ズームインと同時に移動
        keyframes.push(0, zoomInDuration);
        xValues.push(0, productPositions[0].x);
        yValues.push(0, productPositions[0].y);
      } else {
        // 2番目以降：前の商品から次の商品へパン
        const panStart = productStart;
        const panEnd = productStart + panDuration;
        keyframes.push(panStart, panEnd);
        xValues.push(productPositions[i - 1].x, productPositions[i].x);
        yValues.push(productPositions[i - 1].y, productPositions[i].y);
      }
    });

    // 最後にズームアウト時の移動
    keyframes.push(totalFocusDuration - zoomOutDuration, totalFocusDuration);
    xValues.push(productPositions[noiseProducts.length - 1].x, 0);
    yValues.push(productPositions[noiseProducts.length - 1].y, 0);

    productTranslateX = interpolate(localFocusFrame, keyframes, xValues, {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.inOut(Easing.cubic),
    });

    productTranslateY = interpolate(localFocusFrame, keyframes, yValues, {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.inOut(Easing.cubic),
    });
  }

  // 最終的なズームとトランスレート（検索窓ズーム + 商品フォーカスズーム）
  const finalZoomScale = zoomScale * productZoomScale;
  const finalTranslateX = translateX + productTranslateX;
  const finalTranslateY = translateY + productTranslateY;

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
          transform: `scale(${finalZoomScale}) translate(${finalTranslateX / finalZoomScale}px, ${finalTranslateY / finalZoomScale}px)`,
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
          {/* 暗転オーバーレイ（フォーカス商品以外を暗く） */}
          {noiseProducts.map((product, i) => {
            // 最初の商品はズームイン後、それ以降はパン移動後に表示
            const delay = i === 0 ? zoomInDuration : panDuration;
            return (
              <DimOverlay
                key={`dim-${i}`}
                focusX={product.x}
                focusY={product.y}
                focusWidth={product.width + 20}
                focusHeight={product.height + 20}
                startFrame={i * focusDuration + delay}
                duration={focusDuration - delay}
                dimOpacity={0.5}
              />
            );
          })}
          {/* ラベル表示（カメラ移動完了後に表示） */}
          {noiseProducts.map((product, i) => {
            // 最初の商品はズームイン後、それ以降はパン移動後に表示
            const delay = i === 0 ? zoomInDuration : panDuration;
            return (
              <FocusHighlight
                key={i}
                x={product.x}
                y={product.y}
                width={product.width}
                height={product.height}
                label={product.label}
                startFrame={i * focusDuration + delay}
                duration={focusDuration - delay}
              />
            );
          })}
        </AbsoluteFill>
      </Sequence>
    </AbsoluteFill>
  );
};
