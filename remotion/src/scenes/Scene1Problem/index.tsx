import React from "react";
import {
  AbsoluteFill,
  Video,
  staticFile,
  Sequence,
  useCurrentFrame,
  interpolate,
  Easing,
  spring,
  useVideoConfig,
} from "remotion";
import { FocusHighlight } from "../../components/FocusHighlight";
import { notoSansJP } from "../../fonts";

/**
 * Scene 1: 問題提起 - BOOTHの検索ノイズを視覚化
 *
 * 動画タイムライン (booth_samples.mov):
 * - 05:30以降 (360f-): 検索結果表示
 *
 * Remotionタイムライン (600フレーム = 10秒):
 * - 0-2秒 (0-119f): エスタブリッシングショット（検索結果表示）
 * - 2-3秒 (120-179f): 衣装フォーカス (60f)
 * - 3-4秒 (180-239f): テクスチャフォーカス (60f)
 * - 4-6秒 (240-359f): ギミックフォーカス (120f)
 * - 6-6.33秒 (360-379f): ズームアウト + 暗転 (20f)
 * - 6.33-10秒 (380-599f): 問題提起テキスト表示 (220f)
 */

// 動画フレーム定義（60fps）
const VIDEO_START_FROM = 360; // 動画05:30 - 検索結果表示開始

export const Scene1Problem: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // ノイズ商品の位置（3商品のみ：衣装、テクスチャ、ギミック）
  // labelOffsetX/Y: ラベル位置の個別微調整（視覚ピクセル、X正=右、Y正=上）
  const noiseProducts = [
    { x: 1039, y: 395, label: "衣装", width: 340, height: 560, labelOffsetX: 70, labelOffsetY: 250 },
    { x: 1195, y: 395, label: "テクスチャ", width: 340, height: 560, labelOffsetX: 233, labelOffsetY: 250 },
    { x: 1450, y: 395, label: "ギミック", width: 340, height: 560, labelOffsetX: 233, labelOffsetY: 250 },
  ];

  // 画面中央座標（商品フォーカスで使用）
  const centerX = 960;
  const centerY = 540;

  // フォーカス開始フレーム
  const focusStartFrame = 120; // 2秒のエスタブリッシングショット後

  // ナレーション同期：衣装1s、テクスチャ1s、ギミック2s
  const productDurations = [60, 60, 120];
  const totalFocusDuration = productDurations.reduce((a, b) => a + b, 0); // 240
  const productStartFrames = productDurations.reduce<number[]>(
    (acc, _, i) => [...acc, i === 0 ? 0 : acc[i - 1] + productDurations[i - 1]],
    []
  ); // [0, 60, 120]

  const focusEndFrame = focusStartFrame + totalFocusDuration;

  // フォーカス終了演出のタイミング
  const focusShrinkDuration = 20; // スポットライト縮小
  const zoomOutDuration = 20; // ズームアウト
  const dimFadeInDuration = 20; // テキスト前の暗転フェードイン

  // 最後の商品（ギミック）の位置
  const lastProduct = noiseProducts[noiseProducts.length - 1];

  // ズームアウト後の表示範囲調整（手動調整用）
  // 正の値: 右/下方向、負の値: 左/上方向にシフト
  const ZOOM_OUT_OFFSET_X = -245;
  const ZOOM_OUT_OFFSET_Y = -410;

  // 商品フォーカス時のズーム（1.5倍）- パン方式
  const PRODUCT_ZOOM_SCALE = 1.5;
  const zoomInDuration = 24; // 0.4秒でズームイン
  const panDuration = 30; // 0.5秒でパン移動

  // フォーカスフェーズのローカルフレーム
  const localFocusFrame = frame - focusStartFrame;
  const isInFocusPhase = frame >= focusStartFrame && frame < focusEndFrame;

  // 商品フォーカス時のズームとパンアニメーション
  // focusEndFrame以降もextrapolateRight: "clamp"で最後の値を維持するため、常に計算
  let productZoomScale = 1;
  let productTranslateX = 0;
  let productTranslateY = 0;

  if (frame >= focusStartFrame) {
    // フォーカスフェーズ全体でのズーム（最初にズームイン、終了後も維持）
    productZoomScale = interpolate(
      localFocusFrame,
      [0, zoomInDuration],
      [1, PRODUCT_ZOOM_SCALE],
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

    // 各商品のフォーカス開始フレームを使用してパンキーフレームを構築
    const keyframes: number[] = [];
    const xValues: number[] = [];
    const yValues: number[] = [];

    noiseProducts.forEach((_, i) => {
      const productStart = productStartFrames[i];
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

    // 最後の商品の位置を維持（ズームアウトなし）

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

  // フォーカス終了後のズームアウト（1.5倍 → 1.0倍、ギミックの位置を基準に）
  const zoomOutScale = interpolate(
    frame,
    [focusEndFrame, focusEndFrame + zoomOutDuration],
    [PRODUCT_ZOOM_SCALE, 1],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.out(Easing.cubic),
    }
  );

  // ズームアウト中、ギミックの画面上の位置を維持するためのパン調整
  const zoomOutTranslateX = interpolate(
    frame,
    [focusEndFrame, focusEndFrame + zoomOutDuration],
    [
      productTranslateX,
      lastProduct.x * (PRODUCT_ZOOM_SCALE - 1) + productTranslateX + ZOOM_OUT_OFFSET_X,
    ],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.out(Easing.cubic),
    }
  );

  const zoomOutTranslateY = interpolate(
    frame,
    [focusEndFrame, focusEndFrame + zoomOutDuration],
    [
      productTranslateY,
      lastProduct.y * (PRODUCT_ZOOM_SCALE - 1) + productTranslateY + ZOOM_OUT_OFFSET_Y,
    ],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.out(Easing.cubic),
    }
  );

  // フォーカス中またはフォーカス終了後のズーム・パン値を計算
  // focusEndFrame以降はズームアウトの値を使用
  const currentProductZoom = frame >= focusEndFrame ? zoomOutScale : productZoomScale;
  const currentProductTranslateX = frame >= focusEndFrame ? zoomOutTranslateX : productTranslateX;
  const currentProductTranslateY = frame >= focusEndFrame ? zoomOutTranslateY : productTranslateY;

  // 最終的なズームとトランスレート
  const finalZoomScale = currentProductZoom;
  const finalTranslateX = currentProductTranslateX;
  const finalTranslateY = currentProductTranslateY;

  // 動画の共通スタイル
  const videoStyle: React.CSSProperties = {
    width: "100%",
    height: "100%",
    objectFit: "cover",
  };

  // テキスト表示のタイミング
  const textStartFrame = focusEndFrame + zoomOutDuration; // ズームアウト終了後にテキスト表示

  // ズームアウト後の暗転オーバーレイ（BOOTHの背景を残しつつ暗くする）
  const dimOverlayOpacity = interpolate(
    frame,
    [textStartFrame, textStartFrame + dimFadeInDuration],
    [0, 0.7],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.out(Easing.quad),
    }
  );

  // === 持続暗転スポットライトの計算 ===
  // スポットライト中心座標（商品間をスムーズに移動）
  const spotlightKeyframes = [
    0,
    productStartFrames[1],
    productStartFrames[1] + panDuration,
    productStartFrames[2],
    productStartFrames[2] + panDuration,
    totalFocusDuration,
  ];
  const spotlightXValues = [
    noiseProducts[0].x, noiseProducts[0].x,
    noiseProducts[1].x, noiseProducts[1].x,
    noiseProducts[2].x, noiseProducts[2].x,
  ];
  const spotlightYValues = [
    noiseProducts[0].y, noiseProducts[0].y,
    noiseProducts[1].y, noiseProducts[1].y,
    noiseProducts[2].y, noiseProducts[2].y,
  ];

  const spotlightCenterX = interpolate(
    localFocusFrame, spotlightKeyframes, spotlightXValues,
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
  const spotlightCenterY = interpolate(
    localFocusFrame, spotlightKeyframes, spotlightYValues,
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // スポットライトサイズ（最後のfocusShrinkDurationで縮小→完全暗転へ）
  const spotlightShrinkScale = interpolate(
    localFocusFrame,
    [totalFocusDuration - focusShrinkDuration, totalFocusDuration],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.in(Easing.cubic) }
  );
  const spotlightW = (noiseProducts[0].width + 20) * spotlightShrinkScale;
  const spotlightH = (noiseProducts[0].height + 20) * spotlightShrinkScale;

  // 暗転のフェードイン（ズームイン中に1回だけフェードイン、以降0.5を維持）
  const focusDimOpacity = interpolate(
    localFocusFrame,
    [0, zoomInDuration],
    [0, 0.5],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  return (
    <AbsoluteFill style={{ backgroundColor: "#000", overflow: "hidden" }}>
      {/* BOOTH録画動画（商品フォーカスズーム付き） */}
      <div
        style={{
          width: "100%",
          height: "100%",
          transform: `scale(${finalZoomScale}) translate(${finalTranslateX / finalZoomScale}px, ${finalTranslateY / finalZoomScale}px)`,
          transformOrigin: "center center",
        }}
      >
        <Video
          src={staticFile("booth_samples.mov")}
          startFrom={VIDEO_START_FROM}
          style={videoStyle}
        />
      </div>

      {/* 持続暗転オーバーレイ + 移動スポットライト（フォーカスフェーズ全体） */}
      {isInFocusPhase && (
        <AbsoluteFill style={{ pointerEvents: "none" }}>
          <svg
            style={{
              position: "absolute",
              top: -2,
              left: -2,
              width: "calc(100% + 4px)",
              height: "calc(100% + 4px)",
            }}
          >
            <defs>
              <mask id="persistent-spotlight-mask">
                {/* 全体を白（表示=暗転する領域） */}
                <rect x="0" y="0" width="1924" height="1084" fill="white" />
                {/* スポットライト領域を黒（非表示=暗転しない） */}
                {spotlightW > 0 && spotlightH > 0 && (
                  <rect
                    x={spotlightCenterX - spotlightW / 2}
                    y={spotlightCenterY - spotlightH / 2}
                    width={spotlightW}
                    height={spotlightH}
                    rx={12}
                    ry={12}
                    fill="black"
                  />
                )}
              </mask>
            </defs>
            <rect
              x="0"
              y="0"
              width="1924"
              height="1084"
              fill="black"
              opacity={focusDimOpacity}
              mask="url(#persistent-spotlight-mask)"
            />
          </svg>
        </AbsoluteFill>
      )}

      {/* ラベル表示（フォーカスフェーズ中） — カメラ変換を適用して商品位置に追従 */}
      <div
        style={{
          position: "absolute",
          width: "100%",
          height: "100%",
          transform: `scale(${finalZoomScale}) translate(${finalTranslateX / finalZoomScale}px, ${finalTranslateY / finalZoomScale}px)`,
          transformOrigin: "center center",
          pointerEvents: "none",
        }}
      >
        <Sequence from={focusStartFrame} durationInFrames={totalFocusDuration}>
          <AbsoluteFill>
            {noiseProducts.map((product, i) => {
              const delay = i === 0 ? zoomInDuration : panDuration;
              return (
                <FocusHighlight
                  key={i}
                  x={product.x}
                  y={product.y}
                  width={product.width}
                  height={product.height}
                  label={product.label}
                  startFrame={productStartFrames[i] + delay}
                  duration={totalFocusDuration - (productStartFrames[i] + delay)}
                  renderScale={PRODUCT_ZOOM_SCALE}
                  labelOffsetX={product.labelOffsetX}
                  labelOffsetY={product.labelOffsetY}
                />
              );
            })}
          </AbsoluteFill>
        </Sequence>
      </div>

      {/* 完全暗転（スポットライト縮小完了後） */}
      <Sequence from={focusEndFrame}>
        <AbsoluteFill
          style={{
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            pointerEvents: "none",
          }}
        />
      </Sequence>

      {/* 暗転オーバーレイ（ズームアウト後、BOOTHの背景を残しつつさらに暗くする） */}
      <Sequence from={textStartFrame}>
        <AbsoluteFill
          style={{
            backgroundColor: `rgba(0, 0, 0, ${dimOverlayOpacity})`,
            pointerEvents: "none",
          }}
        />
      </Sequence>

      {/* 問題提起テキスト（ズームアウト終了後に表示） - スタッガーアニメーション */}
      <Sequence from={textStartFrame}>
        <AbsoluteFill
          style={{
            justifyContent: "center",
            alignItems: "center",
            pointerEvents: "none",
          }}
        >
          <div style={{ textAlign: "center" }}>
            {/* Line 1: Heavy spring + opacity fade */}
            <p
              style={{
                color: "#fff",
                fontSize: 48,
                fontWeight: 700,
                fontFamily: notoSansJP,
                margin: 0,
                textShadow: "0 0 20px rgba(255, 255, 255, 0.5), 0 0 40px rgba(255, 255, 255, 0.3), 0 4px 20px rgba(0, 0, 0, 0.5)",
                opacity: interpolate(
                  frame - textStartFrame,
                  [0, 40],
                  [0, 1],
                  { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
                ),
                transform: `translateY(${interpolate(
                  spring({
                    frame: frame - textStartFrame,
                    fps,
                    config: { damping: 15, stiffness: 80, mass: 2 },
                  }),
                  [0, 1],
                  [60, 0]
                )}px)`,
              }}
            >
              欲しい商品とは異なるものが表示されて
            </p>
            {/* Line 2: 20フレーム遅延スタッガー + scale 0.9→1 + Moderate bounce */}
            <p
              style={{
                color: "#ff6b6b",
                fontSize: 56,
                fontWeight: 900,
                fontFamily: notoSansJP,
                margin: "20px 0 0 0",
                textShadow: "0 0 30px rgba(255, 107, 107, 0.8), 0 0 60px rgba(255, 107, 107, 0.5), 0 4px 20px rgba(0, 0, 0, 0.5)",
                opacity: interpolate(
                  frame - textStartFrame - 20,
                  [0, 30],
                  [0, 1],
                  { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
                ),
                transform: `scale(${interpolate(
                  spring({
                    frame: frame - textStartFrame - 20,
                    fps,
                    config: { damping: 12, stiffness: 100 },
                  }),
                  [0, 1],
                  [0.9, 1]
                )})`,
              }}
            >
              困ったことはありませんか？
            </p>
          </div>
        </AbsoluteFill>
      </Sequence>

    </AbsoluteFill>
  );
};
