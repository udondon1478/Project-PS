import React from "react";
import {
  AbsoluteFill,
  Video,
  staticFile,
  Sequence,
  useCurrentFrame,
  interpolate,
  spring,
  useVideoConfig,
  Easing,
} from "remotion";

// ブランドカラー（Scene2と共通化）
const BRAND_COLORS = {
  darkGreen: "#0a2818",
  green1: "#358C54",
  green2: "#3FA659",
  brightGreen: "#0DF205",
  lightGreen: "#54BF50",
  tagBg: "rgba(255, 255, 255, 0.95)",
  tagText: "#333",
};

// ユーザーとタグの定義
const TAG_ACTIONS = [
  {
    id: 1,
    userPos: { x: 200, y: 300 }, // 左上
    tagText: "高コスパ",
    delay: 30,
    angle: -10,
    endOffset: { x: -120, y: -180 }
  },
  {
    id: 2,
    userPos: { x: 1720, y: 300 }, // 右上
    tagText: "セットアップ簡単",
    delay: 50,
    angle: 8,
    endOffset: { x: 140, y: -100 }
  },
  {
    id: 3,
    userPos: { x: 300, y: 800 }, // 左下
    tagText: "改変しやすい",
    delay: 70,
    angle: -5,
    endOffset: { x: -100, y: 150 }
  },
  {
    id: 4,
    userPos: { x: 1600, y: 850 }, // 右下
    tagText: "サポート丁寧",
    delay: 90,
    angle: 12,
    endOffset: { x: 130, y: 200 }
  },
  {
    id: 5,
    userPos: { x: 960, y: 150 }, // 上中央
    tagText: "テクスチャ豊富",
    delay: 100,
    angle: 0,
    endOffset: { x: 0, y: -250 }
  }
];

export const Scene3SocialTagging: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // 背景フェードイン (Scene2からの遷移)
  const bgOpacity = interpolate(frame, [0, 20], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // 商品（ギミック）の表示設定
  // Scene1のギミック座標: x: 1450, y: 395, width: 340, height: 560
  // 中央(960, 540)に持ってくるためのオフセット
  const productX = 1450;
  const productY = 395;
  const productW = 340;
  const productH = 560;

  // 拡大率
  const scale = 1.8;

  // 中央寄せ計算
  // (画面中央 - 商品中心) * scale
  const translateX = (960 - (productX + productW / 2)) * scale;
  const translateY = (540 - (productY + productH / 2)) * scale;

  // 商品出現アニメーション
  const productAppear = spring({
    frame: frame - 10,
    fps,
    config: { damping: 15, stiffness: 100 },
  });

  // メッセージ表示タイミング
  const messageStart = 220;

  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      {/* 背景：Scene2のトーンを踏襲 */}
      <AbsoluteFill
        style={{
          opacity: bgOpacity,
          background: `radial-gradient(ellipse at center, #1a3a2a 0%, #0d1f16 60%, #000000 100%)`,
        }}
      />

      {/* 中央の商品（動画から切り抜き） */}
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: "100%",
          height: "100%",
          transform: `scale(${productAppear})`,
          opacity: Math.min(1, productAppear),
        }}
      >
        <div
            style={{
                position: "absolute",
                width: "100%",
                height: "100%",
                transform: `translate(${translateX}px, ${translateY}px) scale(${scale})`,
                transformOrigin: "center center",
            }}
        >
             {/* マスク用コンテナ */}
            <div style={{
                position: "absolute",
                left: productX,
                top: productY,
                width: productW,
                height: productH,
                overflow: "hidden",
                borderRadius: 20,
                boxShadow: "0 0 60px rgba(0, 0, 0, 0.5)",
                backgroundColor: "#000", // 動画ロード前の背景
            }}>
                {/* 動画本体を逆配置して、特定エリアだけ表示させる */}
                <div style={{
                    position: "absolute",
                    left: -productX,
                    top: -productY,
                    width: 1920,
                    height: 1080,
                }}>
                    <Video
                        src={staticFile("booth_samples.mov")}
                        startFrom={177} // 検索結果画面
                        style={{ width: 1920, height: 1080 }}
                        muted
                    />
                </div>

                {/* 商品上のオーバーレイ（少し暗くしてタグを目立たせる） */}
                <div style={{
                    position: "absolute",
                    width: "100%",
                    height: "100%",
                    backgroundColor: "rgba(0,0,0,0.2)",
                }} />
            </div>
        </div>
      </div>

      {/* タグ付けアクション */}
      {TAG_ACTIONS.map((action) => {
        // ユーザー出現
        const userAppear = spring({
            frame: frame - action.delay,
            fps,
            config: { stiffness: 120, damping: 14 }
        });

        // タグ発射（ユーザーから商品へ）
        const flightStart = action.delay + 15;
        const flightDuration = 25;

        const tagProgress = interpolate(
            frame,
            [flightStart, flightStart + flightDuration],
            [0, 1],
            { extrapolateRight: "clamp", easing: Easing.out(Easing.back(0.8)) }
        );

        // 始点と終点の計算
        const startX = action.userPos.x;
        const startY = action.userPos.y;

        // 商品中心からのオフセットを加算
        const endX = 960 + action.endOffset.x;
        const endY = 540 + action.endOffset.y;

        const currentX = startX + (endX - startX) * tagProgress;
        const currentY = startY + (endY - startY) * tagProgress;

        // 発射中は少し小さく、着弾で大きく
        const scaleBase = tagProgress < 0.1 ? 0.3 : 1;
        // 着弾時のバウンス
        const bounce = tagProgress >= 1 ?
            Math.sin((frame - (flightStart + flightDuration)) * 0.5) * 0.05 * Math.max(0, 1 - (frame - (flightStart + flightDuration)) * 0.1)
            : 0;

        const currentScale = scaleBase + bounce;

        return (
            <React.Fragment key={action.id}>
                {/* ユーザーアイコン */}
                <div style={{
                    position: "absolute",
                    left: action.userPos.x,
                    top: action.userPos.y,
                    transform: `translate(-50%, -50%) scale(${userAppear})`,
                    opacity: Math.min(1, userAppear),
                    zIndex: 10,
                }}>
                    <div style={{
                        width: 80,
                        height: 80,
                        borderRadius: "50%",
                        backgroundColor: "#fff",
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                        boxShadow: "0 4px 15px rgba(0,0,0,0.4)",
                        border: `3px solid ${BRAND_COLORS.green2}`,
                    }}>
                        {/* 簡易アイコン（SVG） */}
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="#333">
                            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                        </svg>
                    </div>
                </div>

                {/* 飛んでいくタグ */}
                <div style={{
                    position: "absolute",
                    left: currentX,
                    top: currentY,
                    transform: `translate(-50%, -50%) scale(${currentScale}) rotate(${action.angle}deg)`,
                    opacity: frame > flightStart ? 1 : 0,
                    zIndex: 20, // ユーザーより手前
                }}>
                    <div style={{
                        padding: "12px 28px",
                        backgroundColor: BRAND_COLORS.tagBg,
                        color: BRAND_COLORS.tagText,
                        borderRadius: 50,
                        fontSize: 28,
                        fontWeight: "bold",
                        boxShadow: "0 8px 20px rgba(0,0,0,0.25)",
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        whiteSpace: "nowrap",
                        border: "2px solid rgba(255,255,255,0.8)",
                    }}>
                        <span style={{ color: BRAND_COLORS.green1, fontSize: "1.2em" }}>#</span>
                        {action.tagText}
                    </div>
                </div>
            </React.Fragment>
        );
      })}

      {/* 価値の集約エフェクト（全タグ到着後） */}
      <Sequence from={180}>
         {/* 商品背面の光 */}
         <div style={{
             position: "absolute",
             left: "50%",
             top: "50%",
             transform: "translate(-50%, -50%)",
             width: 800,
             height: 800,
             background: `radial-gradient(circle, rgba(84, 191, 80, 0.4) 0%, transparent 70%)`,
             opacity: interpolate(frame, [180, 200], [0, 1]),
             pointerEvents: "none",
             zIndex: 0,
         }}/>

         {/* キラキラパーティクル（簡易版） */}
         {Array.from({ length: 12 }).map((_, i) => {
             const angle = (i / 12) * Math.PI * 2;
             const radius = 350;
             const x = Math.cos(angle) * radius + 960;
             const y = Math.sin(angle) * radius + 540;
             const delay = i * 2;

             const scale = interpolate(
                 frame - 180 - delay,
                 [0, 10, 30],
                 [0, 1, 0],
                 { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
             );

             return (
                 <div key={i} style={{
                     position: "absolute",
                     left: x,
                     top: y,
                     width: 20,
                     height: 20,
                     backgroundColor: BRAND_COLORS.brightGreen,
                     borderRadius: "50%",
                     transform: `scale(${scale})`,
                     boxShadow: `0 0 20px ${BRAND_COLORS.brightGreen}`,
                     zIndex: 5,
                 }}/>
             );
         })}
      </Sequence>

      {/* メッセージ表示 */}
      <Sequence from={messageStart}>
        <div style={{
            position: "absolute",
            bottom: 120,
            width: "100%",
            textAlign: "center",
            opacity: interpolate(frame, [messageStart, messageStart + 20], [0, 1]),
            transform: `translateY(${interpolate(frame, [messageStart, messageStart + 20], [30, 0], { extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) })}px)`,
            zIndex: 100,
        }}>
            <h2 style={{
                color: "#fff",
                fontSize: 52,
                fontWeight: "bold",
                textShadow: "0 2px 20px rgba(0,0,0,0.8)",
                margin: 0,
                lineHeight: 1.4,
            }}>
                検索だけでは見えない価値が<br/>
                <span style={{
                    color: BRAND_COLORS.brightGreen,
                    textShadow: "0 0 30px rgba(13, 242, 5, 0.4)"
                }}>PolySeek</span>で見つかる
            </h2>
        </div>
      </Sequence>
    </AbsoluteFill>
  );
};
