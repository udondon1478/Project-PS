import React from "react";
import { useCurrentFrame, interpolate, Easing } from "remotion";

interface ParticleDissolveProps {
  /** 対象となる画像のソース */
  imageSrc: string;
  /** パーティクルのグリッドサイズ */
  gridSize?: { cols: number; rows: number };
  /** アニメーション開始フレーム */
  startFrame: number;
  /** アニメーション持続時間（フレーム数） */
  duration: number;
  /** 画像の幅 */
  width?: number;
  /** 画像の高さ */
  height?: number;
  /** パーティクルの速度ランダム係数 */
  randomness?: number;
}

export const ParticleDissolve: React.FC<ParticleDissolveProps> = ({
  imageSrc,
  gridSize = { cols: 20, rows: 12 },
  startFrame,
  duration,
  width = 1920,
  height = 1080,
  randomness = 0.3,
}) => {
  const frame = useCurrentFrame();
  const localFrame = frame - startFrame;

  // アニメーション範囲外では非表示
  if (localFrame < 0 || localFrame >= duration) {
    return null;
  }

  const { cols, rows } = gridSize;
  const particleWidth = width / cols;
  const particleHeight = height / rows;

  // パーティクル配列を生成
  const particles: React.ReactNode[] = [];

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const particleIndex = row * cols + col;

      // パーティクルごとに異なるシード値でランダム性を生成
      const seed = particleIndex * 0.123456;
      const randomFactor = 0.5 + (Math.sin(seed) * 0.5 + 0.5) * randomness;

      // Y軸移動量（上方向）: -200px 〜 -400px
      const baseTranslateY = -300;
      const translateY = interpolate(
        localFrame,
        [0, duration],
        [0, baseTranslateY * (1 + randomFactor)],
        {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
          easing: Easing.in(Easing.cubic),
        }
      );

      // X軸移動量（わずかに左右にブレる）: -30px 〜 +30px
      const randomX = (Math.sin(seed * 2) * 0.5 + 0.5) * 60 - 30;
      const translateX = interpolate(
        localFrame,
        [0, duration],
        [0, randomX],
        {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
          easing: Easing.out(Easing.quad),
        }
      );

      // 不透明度（フェードアウト）
      const opacity = interpolate(
        localFrame,
        [0, duration * 0.7, duration],
        [1, 0.8, 0],
        {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        }
      );

      // 回転（オプション、自然な崩壊感）
      const rotation = interpolate(
        localFrame,
        [0, duration],
        [0, (Math.sin(seed * 3) * 0.5 + 0.5) * 30 - 15],
        {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
          easing: Easing.inOut(Easing.quad),
        }
      );

      particles.push(
        <div
          key={particleIndex}
          style={{
            position: "absolute",
            left: col * particleWidth,
            top: row * particleHeight,
            width: particleWidth,
            height: particleHeight,
            backgroundImage: `url(${imageSrc})`,
            backgroundPosition: `-${col * particleWidth}px -${row * particleHeight}px`,
            backgroundSize: `${width}px ${height}px`,
            transform: `translate(${translateX}px, ${translateY}px) rotate(${rotation}deg)`,
            opacity,
            pointerEvents: "none",
          }}
        />
      );
    }
  }

  return (
    <div
      style={{
        position: "absolute",
        width,
        height,
        top: 0,
        left: 0,
        overflow: "hidden",
      }}
    >
      {particles}
    </div>
  );
};
