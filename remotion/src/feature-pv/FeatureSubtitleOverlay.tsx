import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { notoSansJP } from "../fonts";

interface SubtitleEntry {
  text: string;
  startFrame: number;
  endFrame: number;
}

const FADE_FRAMES = 10;

const SUBTITLES: SubtitleEntry[] = [
  // S1: Problem (narration 0-423)
  {
    text: "BOOTHやPolySeekで検索していると、",
    startFrame: 0,
    endFrame: 200,
  },
  {
    text: "同じ意味の言葉なのに\n検索で見つからないこと、ありませんか？",
    startFrame: 200,
    endFrame: 423,
  },
  // S2: Cause (narration 510-813)
  {
    text: "それは、タグの表記が違うだけで",
    startFrame: 510,
    endFrame: 660,
  },
  {
    text: "検索から漏れてしまっていたからです",
    startFrame: 660,
    endFrame: 813,
  },
  // S3: Solution (narration 870-1319)
  {
    text: "新機能「タグエイリアス」なら",
    startFrame: 870,
    endFrame: 1050,
  },
  {
    text: "同じ意味のタグを検索に自動で紐付け",
    startFrame: 1050,
    endFrame: 1200,
  },
  {
    text: "もう検索漏れはありません",
    startFrame: 1200,
    endFrame: 1319,
  },
  // S4: CTA (narration 1470-1665)
  {
    text: "PolySeekで「もっと見つかる」検索体験を",
    startFrame: 1470,
    endFrame: 1665,
  },
];

export const FeatureSubtitleOverlay: React.FC = () => {
  const frame = useCurrentFrame();

  const activeEntry = SUBTITLES.find(
    (s) => frame >= s.startFrame && frame <= s.endFrame,
  );

  if (!activeEntry) return null;

  const fadeIn = interpolate(
    frame,
    [activeEntry.startFrame, activeEntry.startFrame + FADE_FRAMES],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  const fadeOut = interpolate(
    frame,
    [activeEntry.endFrame - FADE_FRAMES, activeEntry.endFrame],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  return (
    <div
      style={{
        position: "absolute",
        bottom: 60,
        left: 0,
        right: 0,
        display: "flex",
        justifyContent: "center",
        opacity: fadeIn * fadeOut,
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          background: "rgba(0, 0, 0, 0.65)",
          borderRadius: 12,
          padding: "12px 36px",
          maxWidth: "85%",
        }}
      >
        <span
          style={{
            fontSize: 30,
            fontWeight: 700,
            color: "#ffffff",
            fontFamily: notoSansJP,
            textAlign: "center",
            lineHeight: 1.5,
            whiteSpace: "pre-line",
          }}
        >
          {activeEntry.text}
        </span>
      </div>
    </div>
  );
};
