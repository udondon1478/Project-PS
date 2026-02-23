import React from "react";
import { Audio, Sequence, staticFile, useCurrentFrame, interpolate } from "remotion";
import {
  FEATURE_AUDIO_CONFIG,
  FEATURE_BGM_ENTRIES,
  FEATURE_NARRATION_ENTRIES,
} from "./featureAudioConfig";

const { bgmVolume } = FEATURE_AUDIO_CONFIG;

function getDuckFactor(absFrame: number): number {
  let factor = 1;
  for (const [, cfg] of FEATURE_NARRATION_ENTRIES) {
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

  const fadeInDuration = isFirst ? 60 : cf;
  const fadeIn = interpolate(
    absFrame,
    [trackStart, trackStart + fadeInDuration],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  const fadeOutDuration = isLast ? (bgmVolume.fadeOutDuration ?? 120) : cf;
  const fadeOut = interpolate(
    absFrame,
    [trackEnd - fadeOutDuration, trackEnd],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

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
  const frame = useCurrentFrame();
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

export const FeatureAudioLayer: React.FC = () => {
  const trackCount = FEATURE_BGM_ENTRIES.length;

  return (
    <>
      {FEATURE_BGM_ENTRIES.map(([key, cfg], index) => (
        <Sequence
          key={key}
          from={cfg.start}
          durationInFrames={cfg.durationInFrames}
          layout="none"
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

      {FEATURE_NARRATION_ENTRIES.map(([key, cfg]) => (
        <Sequence
          key={key}
          from={cfg.start}
          durationInFrames={cfg.durationInFrames}
          layout="none"
        >
          <Audio src={staticFile(cfg.file)} />
        </Sequence>
      ))}
    </>
  );
};
