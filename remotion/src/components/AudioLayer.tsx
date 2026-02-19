import React from "react";
import { Audio, Sequence, staticFile, useCurrentFrame } from "remotion";
import { interpolate } from "remotion";
import { AUDIO_CONFIG, BGM_ENTRIES, NARRATION_ENTRIES } from "../audioConfig";

const { bgmVolume } = AUDIO_CONFIG;

// ナレーションを開始時刻でソート（パフォーマンス最適化のため1回だけ計算）
const SORTED_NARRATIONS = [...NARRATION_ENTRIES].sort((a, b) =>
  a[1].start - b[1].start
);

function getDuckFactor(absFrame: number): number {
  let factor = 1;

  for (let i = 0; i < SORTED_NARRATIONS.length; i++) {
    const [, cfg] = SORTED_NARRATIONS[i];
    const narStart = cfg.start;
    const narEnd = cfg.start + cfg.durationInFrames;
    const trans = bgmVolume.duckTransition;
    const minGap = bgmVolume.minGapForFadeIn;

    // 次のナレーションまでの間隔を計算
    const hasNextNarration = i < SORTED_NARRATIONS.length - 1;
    const nextStart = hasNextNarration
      ? SORTED_NARRATIONS[i + 1][1].start
      : Infinity;
    const gapToNext = nextStart - narEnd;
    const shouldSkipFadeIn = gapToNext < minGap;

    // フェードダウン（ナレーション前）
    if (absFrame >= narStart - trans && absFrame < narStart) {
      const t = interpolate(absFrame, [narStart - trans, narStart], [1, 0], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      });
      factor = Math.min(factor, t);
    }
    // 完全ダッキング（ナレーション中）
    else if (absFrame >= narStart && absFrame < narEnd) {
      factor = 0;
    }
    // スマートフェードイン（ナレーション後）
    else if (absFrame >= narEnd && absFrame < narEnd + trans) {
      if (shouldSkipFadeIn) {
        // 間隔が短い場合：フェードインをスキップ、低音量を維持
        factor = 0;
      } else {
        // 間隔が十分な場合：通常のフェードイン
        const t = interpolate(absFrame, [narEnd, narEnd + trans], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });
        factor = Math.min(factor, t);
      }
    }
    // フェードイン後のギャップ維持（間隔が短い場合のみ）
    else if (shouldSkipFadeIn && absFrame >= narEnd + trans && absFrame < nextStart - trans) {
      factor = 0;
    }
  }

  return factor;
}

function getBgmTrackVolume(
  absFrame: number,
  trackStart: number,
  trackDuration: number,
  isFirst: boolean,
  isLast: boolean,
): number {
  const trackEnd = trackStart + trackDuration;
  const cf = bgmVolume.crossfade;

  // Crossfade in (first track fades from silence, others crossfade)
  const fadeInDuration = isFirst ? 60 : cf;
  const fadeIn = interpolate(
    absFrame,
    [trackStart, trackStart + fadeInDuration],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  // Crossfade out (last track uses custom fadeout duration, others crossfade)
  const fadeOutDuration = isLast ? (bgmVolume.fadeOutDuration ?? 120) : cf;
  const fadeOut = interpolate(
    absFrame,
    [trackEnd - fadeOutDuration, trackEnd],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  // Ducking
  const duckFactor = getDuckFactor(absFrame);
  const duckedVol = interpolate(
    duckFactor,
    [0, 1],
    [bgmVolume.duckedVolume, bgmVolume.normalVolume],
  );

  return duckedVol * fadeIn * fadeOut;
}

const BgmTrack: React.FC<{
  file: string;
  trackStart: number;
  trackDuration: number;
  isFirst: boolean;
  isLast: boolean;
}> = ({ file, trackStart, trackDuration, isFirst, isLast }) => {
  const frame = useCurrentFrame(); // relative to Sequence
  const absFrame = frame + trackStart;

  const volume = getBgmTrackVolume(
    absFrame,
    trackStart,
    trackDuration,
    isFirst,
    isLast,
  );

  return <Audio src={staticFile(file)} volume={volume} />;
};

export const AudioLayer: React.FC = () => {
  const trackCount = BGM_ENTRIES.length;

  return (
    <>
      {/* Per-scene BGM tracks with crossfade */}
      {BGM_ENTRIES.map(([key, cfg], index) => (
        <Sequence
          key={key}
          from={cfg.start}
          durationInFrames={cfg.durationInFrames}
        >
          <BgmTrack
            file={cfg.file}
            trackStart={cfg.start}
            trackDuration={cfg.durationInFrames}
            isFirst={index === 0}
            isLast={index === trackCount - 1}
          />
        </Sequence>
      ))}

      {/* Narration tracks */}
      {NARRATION_ENTRIES.map(([key, cfg]) => {
        const volume = (cfg as any).volume ?? 1.0; // volumeが未指定の場合は1.0をデフォルト値として使用

        return (
          <Sequence
            key={key}
            from={cfg.start}
            durationInFrames={cfg.durationInFrames}
          >
            <Audio src={staticFile(cfg.file)} volume={volume} />
          </Sequence>
        );
      })}
    </>
  );
};
