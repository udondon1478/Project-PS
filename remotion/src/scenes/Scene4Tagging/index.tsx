import React from "react";
import {
  AbsoluteFill,
  Video,
  Img,
  staticFile,
  useCurrentFrame,
  interpolate,
  Easing,
  spring,
  useVideoConfig,
  Freeze,
  Sequence,
} from "remotion";
import { notoSansJP } from "../../fonts";

/**
 * Scene 4: 実際のタグ付け操作デモ (Easy Tagging)
 *
 * 設定方法:
 * 以下の「調整パラメータ」を変更して、4つのズーム地点を指定してください。
 */

export const Scene4Tagging: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const videoSrc = staticFile("polyseek_tag_adding.mov");
  const width = 1920;
  const height = 1080;

  // ビデオフリーズ設定（スクロールグリッチ288-342を隠す）
  const FREEZE_START = 288;
  const FREEZE_END = 342;
  const FREEZE_DURATION = FREEZE_END - FREEZE_START; // 54フレーム
  const VIDEO_RESUME_FRAME = FREEZE_END + 1; // フレーム343

  // ==========================================
  // ▼ ビデオカット設定
  // ==========================================
  // フリーズ解除後の不要な部分をスキップします
  // 例：元動画のフレーム343-500をカットする場合
  //   CUT_START = 343, CUT_END = 500 → 157フレームスキップ
  const CUT_START = 310;  // カット開始フレーム（元動画のこの位置から）310
  const CUT_END = 390;    // カット終了フレーム（元動画のこの位置の直前までスキップ）390
  const CUT_DURATION = CUT_END - CUT_START; // スキップするフレーム数

  // 実際のビデオ再開位置（カット分をスキップした位置）
  const ACTUAL_VIDEO_RESUME = VIDEO_RESUME_FRAME + CUT_DURATION;

  // ==========================================
  // ▼ セグメント2 スクリーンショット補完設定
  // ==========================================
  const SCREENSHOT_SRC = staticFile("images/segment3_screenshot.png");
  const SCREENSHOT_Y_OFFSET = 270; // スクリーンショットのY位置（プレビューで調整）

  // ==========================================
  // ▼ 調整パラメータ
  // ==========================================

  // ズーム倍率
  const ZOOM_LEVEL = 2.5;

  // 4つの注目ポイント（順番に移動します）
  // プレビュー画面で座標を確認してください
  const POINTS = [
    { x: 1200, y: 650 }, // 1. レーティング
    { x: 1200, y: 1050 }, // 2. カテゴリ
    { x: 1200, y: 1303.5 }, // 3. 公式タグ
    { x: 1200, y: 1050 }, // 4. タグ
  ];

  // Point 3B: フリーズ解除後の調整座標（フレーム343以降）
  // 初期値はPoint 3と同じ。視覚的ジャンプがある場合は微調整してください
  const POINT_3B = {
    x: 1200, // 必要に応じて ±50〜200px 調整
    y: 750,  // 必要に応じて ±50〜200px 調整
  };

  // ==========================================

  // タイムライン設定 (合計300フレーム想定)
  const ZOOM_IN_START = 60;
  const ZOOM_IN_DURATION = 40; // ズームイン時間

  // 各ポイントへの移動開始タイミング
  // ズームイン完了時点(70f)でPoint 1に到達
  const POINT_2_START = 140;
  const POINT_3_START = 288;
  const POINT_4_START = 780;
  const MOVE_DURATION = 30; // 移動にかかる時間

  const ZOOM_OUT_START = 1040;
  const ZOOM_OUT_DURATION = 40;

  // 1. ズーム倍率のアニメーション
  // 等倍 -> ズーム -> ズーム維持 -> 等倍
  const currentScale = interpolate(
    frame,
    [
      ZOOM_IN_START,
      ZOOM_IN_START + ZOOM_IN_DURATION,
      ZOOM_OUT_START,
      ZOOM_OUT_START + ZOOM_OUT_DURATION,
    ],
    [1, ZOOM_LEVEL, ZOOM_LEVEL, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.cubic) }
  );

  // 2. ターゲット座標のアニメーション
  // 画面中央(初期) -> Point 1 -> Point 2 -> Point 3 -> Point 4 -> 画面中央(最後)

  // X座標の推移
  const targetX = interpolate(
    frame,
    [
      ZOOM_IN_START, // 画面中央から開始
      ZOOM_IN_START + ZOOM_IN_DURATION, // Point 1
      POINT_2_START, POINT_2_START + MOVE_DURATION, // Point 1 -> 2
      POINT_3_START, POINT_3_START + MOVE_DURATION, // Point 2 -> 3 (318)
      FREEZE_END - 1,                                 // セグメント2の最終フレーム (341)
      FREEZE_END,                                     // セグメント3の開始フレーム (342)
      POINT_4_START, POINT_4_START + MOVE_DURATION, // Point 3B -> 4
      ZOOM_OUT_START, ZOOM_OUT_START + ZOOM_OUT_DURATION // Point 4 -> 画面中央
    ],
    [
      width / 2, // 初期位置は中央
      POINTS[0].x,
      POINTS[0].x, POINTS[1].x,
      POINTS[1].x, POINTS[2].x,
      POINTS[2].x,      // frame 341までPOINTS[2]を維持
      POINT_3B.x,       // frame 342からPOINT_3Bにシフト
      POINT_3B.x, POINTS[3].x,
      POINTS[3].x, width / 2 // 最後は中央に戻る
    ],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.cubic) }
  );

  // Y座標の推移
  const targetY = interpolate(
    frame,
    [
      ZOOM_IN_START,
      ZOOM_IN_START + ZOOM_IN_DURATION,
      POINT_2_START, POINT_2_START + MOVE_DURATION,
      POINT_3_START, POINT_3_START + MOVE_DURATION, // Point 2 -> 3 (318)
      FREEZE_END - 1,                                 // セグメント2の最終フレーム (341)
      FREEZE_END,                                     // セグメント3の開始フレーム (342)
      POINT_4_START, POINT_4_START + MOVE_DURATION,
      ZOOM_OUT_START, ZOOM_OUT_START + ZOOM_OUT_DURATION
    ],
    [
      height / 2,
      POINTS[0].y,
      POINTS[0].y, POINTS[1].y,
      POINTS[1].y, POINTS[2].y,
      POINTS[2].y,      // frame 341までPOINTS[2]を維持
      POINT_3B.y,       // frame 342からPOINT_3Bにシフト
      POINT_3B.y, POINTS[3].y,
      POINTS[3].y, height / 2
    ],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.cubic) }
  );

  // 3. トランスフォーム計算
  const centerX = width / 2;
  const centerY = height / 2;

  const currentTranslateX = (centerX - targetX) * (currentScale - 1);
  const currentTranslateY = (centerY - targetY) * (currentScale - 1);

  // テキスト表示アニメーション
  const textOpacity = interpolate(
    frame,
    [ZOOM_IN_START + 10, ZOOM_IN_START + 30],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const showSecondText = frame > 150;
  const showThirdText = frame > 564;
  const showFourthText = frame > 1266;

  // テキスト切り替え時のバウンスアニメーション
  // ベースの出現アニメーション - spring化
  const baseSpring = spring({
    frame: frame - ZOOM_IN_START,
    fps,
    config: { damping: 12, stiffness: 100 },
  });
  const baseScale = interpolate(baseSpring, [0, 1], [0.8, 1]);

  // 各切り替えタイミングでのバウンス - Snappy spring
  const bounce1Spring = spring({
    frame: frame - 150,
    fps,
    config: { damping: 20, stiffness: 200 },
  });
  const bounce1 = frame > 150 ? 1 + (1 - bounce1Spring) * 0.05 : 1;

  const bounce2Spring = spring({
    frame: frame - 564,
    fps,
    config: { damping: 20, stiffness: 200 },
  });
  const bounce2 = frame > 564 ? 1 + (1 - bounce2Spring) * 0.05 : 1;

  const bounce3Spring = spring({
    frame: frame - 1266,
    fps,
    config: { damping: 20, stiffness: 200 },
  });
  const bounce3 = frame > 1266 ? 1 + (1 - bounce3Spring) * 0.05 : 1;

  // すべてのスケール効果を合成
  const containerScale = baseScale * bounce1 * bounce2 * bounce3;

  // ビデオスタイル（3セグメント全体で共通）
  const videoStyle: React.CSSProperties = {
    width: "100%",
    height: "100%",
    objectFit: "contain",
  };

  return (
    <AbsoluteFill style={{ backgroundColor: "#fff" }}>
      {/* 動画レイヤー */}
      <div
        style={{
          width: "100%",
          height: "100%",
          overflow: "visible",
          backgroundColor: "#fff",
          transform: `translate(${currentTranslateX}px, ${currentTranslateY}px) scale(${currentScale})`,
          transformOrigin: "center center",
        }}
      >
        {/* セグメント2用: 下部空白を補完するスクリーンショット（背面レイヤー） */}
        <Sequence from={FREEZE_START} durationInFrames={FREEZE_DURATION} layout="none">
          <Img
            src={SCREENSHOT_SRC}
            style={{
              position: "absolute",
              top: SCREENSHOT_Y_OFFSET,
              left: 0,
              width: 1920,
              height: "auto",
              zIndex: -1,
            }}
          />
        </Sequence>

        {/* セグメント1: フリーズ前 - 通常再生（0-287） */}
        <Sequence from={0} durationInFrames={FREEZE_START} layout="none">
          <Video src={videoSrc} style={videoStyle} />
        </Sequence>

        {/* セグメント2: フリーズ中 - フレーム288で保持（288-342） */}
        <Sequence from={FREEZE_START} durationInFrames={FREEZE_DURATION} layout="none">
          {/* frame={0}: Sequence内の相対フレーム0（絶対フレーム288）を固定 */}
          <Freeze frame={0}>
            <Video src={videoSrc} startFrom={FREEZE_START} style={videoStyle} />
          </Freeze>
        </Sequence>

        {/* セグメント3: フリーズ後 - カット適用後に再開（343以降） */}
        <Sequence from={FREEZE_END} layout="none">
          <Video src={videoSrc} startFrom={ACTUAL_VIDEO_RESUME} style={videoStyle} />
        </Sequence>
      </div>

      {/* 動画下部の黒い領域を白で上書き（1266フレーム以降） */}
      {frame >= 1266 && (
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            width: "100%",
            height: "3%",
            backgroundColor: "#fff",
          }}
        />
      )}

      {/* テロップオーバーレイ */}
      <AbsoluteFill>
        <div style={{
          position: "absolute",
          bottom: 100,
          left: 0,
          width: "100%",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}>
          <div style={{
            backgroundColor: "rgba(255, 255, 255, 0.9)",
            padding: "20px 60px",
            borderRadius: 50,
            boxShadow: "0 10px 30px rgba(0,0,0,0.1)",
            transform: `scale(${containerScale})`,
            opacity: textOpacity,
          }}>
            <h2 style={{
              margin: 0,
              fontSize: 42,
              fontWeight: showFourthText ? 900 : 700,
              fontFamily: notoSansJP,
              color: "#333",
              textAlign: "center",
            }}>
              {showFourthText ? (
                <span style={{ color: "#0a2818" }}>登録が完了します</span>
              ) : showThirdText ? (
                <span>
                  追加の情報を入力
                </span>
              ) : showSecondText ? (
                <span style={{ color: "#0a2818" }}>ワンクリックで必要な情報を登録</span>
              ) : (
                <span>ワンクリックで必要な情報を登録</span>
              )}
            </h2>
          </div>
        </div>
      </AbsoluteFill>

    </AbsoluteFill>
  );
};
