import React from "react";
import {
  AbsoluteFill,
  Img,
  staticFile,
  Sequence,
  useCurrentFrame,
  interpolate,
  spring,
  useVideoConfig,
  Easing,
} from "remotion";
import { BRAND_COLORS } from "../../constants";

// ユーザーとタグの定義
const TAG_ACTIONS = [
  {
    id: 1,
    userPos: { x: 200, y: 300 }, // 左上
    tagText: "うさぎ",
    delay: 30,
    angle: -10,
    endOffset: { x: -120, y: -180 }
  },
  {
    id: 2,
    userPos: { x: 1720, y: 300 }, // 右上
    tagText: "宇宙服",
    delay: 50,
    angle: 8,
    endOffset: { x: 140, y: -100 }
  },
  {
    id: 3,
    userPos: { x: 300, y: 800 }, // 左下
    tagText: "SF",
    delay: 70,
    angle: -5,
    endOffset: { x: -100, y: 150 }
  },
  {
    id: 4,
    userPos: { x: 1600, y: 850 }, // 右下
    tagText: "異形頭",
    delay: 90,
    angle: 12,
    endOffset: { x: 130, y: 200 }
  },
  {
    id: 5,
    userPos: { x: 960, y: 150 }, // 上中央
    tagText: "メカ",
    delay: 100,
    angle: 0,
    endOffset: { x: 0, y: -250 }
  }
];

export const Scene3SocialTagging: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

    // 背景：Scene2からの遷移（ダークモード化してコントラストを確保）
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

      // 商品出現アニメーション（イージングをスマートに調整）
      const productAppear = spring({
        frame: frame - 10,
        fps,
        config: { damping: 20, stiffness: 90, mass: 1 }, // バウンスを抑えて上品に
      });

      // スクロール演出: 画面詳細を見せるために画像をゆっくりスクロール
      const scrollStart = 60;
      // アドレスバー回避のため初期位置をオフセットし、タグエリアまでスクロール
      const scrollY = interpolate(
        frame,
        [scrollStart, scrollStart + 150],
        [0, -150], // 初期位置を-250pxにしてアドレスバーを隠す
        { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.bezier(0.25, 0.1, 0.25, 1) } // スマートなイージング
      );

      // メッセージ表示タイミング
      const messageStart = 220;

      return (
        <AbsoluteFill style={{ backgroundColor: "#000" }}>
          {/* 背景：ダークモード（コントラスト重視） */}
          <AbsoluteFill
            style={{
              opacity: bgOpacity,
              background: `radial-gradient(ellipse at center, #222 0%, #111 60%, #000 100%)`, // 緑要素を排除し黒ベースへ
            }}
          />

          {/* 中央の商品（PolySeek画面） */}
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
                    borderRadius: 16,
                    boxShadow: "0 20px 50px rgba(0, 0, 0, 0.5)", // 緑の光彩を黒い影に変更して立体感を出す
                    border: "1px solid rgba(255, 255, 255, 0.15)",
                    backgroundColor: "#fff",
                }}>
                    {/* PolySeek画面画像（スクロール） */}
                    <div style={{
                        width: "100%",
                        transform: `translateY(${scrollY}px)`,
                    }}>
                        <Img
                            src={staticFile("images/PolySeek_product_detail_mobile_with_image.png")}
                            style={{ width: "100%", height: "auto", display: "block" }}
                        />
                    </div>

                    {/* 薄いオーバーレイ（タグの視認性確保用） */}
                    <div style={{
                        position: "absolute",
                        top: 0, left: 0,
                        width: "100%",
                        height: "100%",
                        backgroundColor: "rgba(0,0,0,0.1)", // 少し暗くしてタグを浮き立たせる
                        pointerEvents: "none",
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
                config: { stiffness: 100, damping: 15 } // 少し落ち着かせる
            });

            // タグ発射（ユーザーから商品へ）
            const flightStart = action.delay + 15;
            const flightDuration = 30; // 少しゆっくりに

            const tagProgress = interpolate(
                frame,
                [flightStart, flightStart + flightDuration],
                [0, 1],
                { extrapolateRight: "clamp", easing: Easing.bezier(0.22, 1, 0.36, 1) } // スマートな到着
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
            // 着弾時のバウンス（控えめに）
            const bounce = tagProgress >= 1 ?
                Math.sin((frame - (flightStart + flightDuration)) * 0.4) * 0.03 * Math.max(0, 1 - (frame - (flightStart + flightDuration)) * 0.1)
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
                            boxShadow: "0 4px 15px rgba(0,0,0,0.6)", // シャドウを濃く
                            border: `2px solid ${BRAND_COLORS.lightGreen}`, // 枠線を少し細く上品に
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
                            backgroundColor: "#fff", // 完全不透明な白
                            color: "#000", // 真っ黒でコントラスト最大化
                            borderRadius: 50,
                            fontSize: 28,
                            fontWeight: "bold",
                            boxShadow: "0 10px 30px rgba(0,0,0,0.4)", // 強いシャドウで浮かせる
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                            whiteSpace: "nowrap",
                            // border: "none", // ボーダー削除
                        }}>
                            <span style={{ color: BRAND_COLORS.green2, fontSize: "1.2em" }}>#</span>
                            {action.tagText}
                        </div>
                    </div>
                </React.Fragment>
            );
          })}

      {/* メッセージ表示 */}
      <Sequence from={messageStart}>
        <div style={{
            position: "absolute",
            bottom: 120,
            width: "100%",
            textAlign: "center",
            opacity: interpolate(frame, [messageStart, messageStart + 20], [0, 1]),
            transform: `translateY(${interpolate(frame, [messageStart, messageStart + 20], [20, 0], { extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) })}px)`,
            zIndex: 100,
        }}>
            <h2 style={{
                color: "#fff",
                fontSize: 52,
                fontWeight: "bold",
                // ドロップシャドウを強化し、背景との分離を明確化
                textShadow: "0 4px 30px rgba(0,0,0,0.9), 0 2px 10px rgba(0,0,0,0.8)",
                margin: 0,
                lineHeight: 1.4,
            }}>
                検索だけでは見えない価値が<br/>
                <span style={{
                    color: "#fff",
                    // 発光も少し上品に、しかし強く
                    textShadow: "0 0 25px rgba(0, 0, 0, 0.9)"
                }}>PolySeek</span>で見つかる
            </h2>
        </div>
      </Sequence>
    </AbsoluteFill>
  );
};
