import React from "react";
import { Audio, Sequence, staticFile, useCurrentFrame } from "remotion";
import { interpolate } from "remotion";
import { AUDIO_CONFIG, BGM_ENTRIES, NARRATION_ENTRIES } from "../audioConfig";

const { bgmVolume } = AUDIO_CONFIG;

function getDuckFactor(absFrame: number): number {
  let factor = 1;
  for (const [, cfg] of NARRATION_ENTRIES) {
    const narStart = cfg.start;
    const narEnd = cfg.start + cfg.durationInFrames;
    const trans = bgmVolume.duckTransition;

    if (absFrame >= narStart - trans && absFrame < narStart) {
      const t = interpolate(absFrame, [narStart - trans, narStart], [1, 0], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      });
      factor = Math.min(factor, t);
    } else if (absFrame >= narStart && absFrame < narEnd) {
      factor = 0;
    } else if (absFrame >= narEnd && absFrame < narEnd + trans) {
      const t = interpolate(absFrame, [narEnd, narEnd + trans], [0, 1], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      });
      factor = Math.min(factor, t);
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
      {NARRATION_ENTRIES.map(([key, cfg]) => (
        <Sequence
          key={key}
          from={cfg.start}
          durationInFrames={cfg.durationInFrames}
        >
          <Audio src={staticFile(cfg.file)} />
        </Sequence>
      ))}
    </>
  );
};
