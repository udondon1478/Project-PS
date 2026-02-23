import { FEATURE_TIMING } from "./featureConstants";

const TOTAL_DURATION = FEATURE_TIMING.totalFrames;

const BGM_FADEOUT_START = FEATURE_TIMING.sceneProblem + FEATURE_TIMING.sceneCause + FEATURE_TIMING.sceneSolution - 2 * FEATURE_TIMING.transitionFrames;
const BGM_FADEOUT_DURATION = TOTAL_DURATION - BGM_FADEOUT_START;

export const FEATURE_AUDIO_CONFIG = {
  bgmTracks: {
    main: {
      file: "audio/feature-pv/bgm.mp3",
      start: 0,
      durationInFrames: TOTAL_DURATION,
    },
  },
  bgmVolume: {
    normalVolume: 0.25,
    duckedVolume: 0.06,
    duckTransition: 15,
    crossfade: FEATURE_TIMING.transitionFrames,
    fadeOutDuration: BGM_FADEOUT_DURATION,
  },
  // Absolute timeline: S1@0, S2@480, S3@840, S4@1440
  narration: {
    problem: {
      file: "audio/feature-pv/narration-problem.wav",
      start: 0,
      durationInFrames: 423, // 7.05s measured
    },
    cause: {
      file: "audio/feature-pv/narration-cause.wav",
      start: 510,
      durationInFrames: 303, // 5.05s measured
    },
    solution: {
      file: "audio/feature-pv/narration-solution.wav",
      start: 870,
      durationInFrames: 449, // 7.48s measured
    },
    cta: {
      file: "audio/feature-pv/narration-cta.wav",
      start: 1470,
      durationInFrames: 195, // 3.24s measured
    },
  },
  totalDuration: TOTAL_DURATION,
} as const;

export type FeatureBgmTrackKey =
  keyof typeof FEATURE_AUDIO_CONFIG.bgmTracks;
export type FeatureNarrationKey =
  keyof typeof FEATURE_AUDIO_CONFIG.narration;

export const FEATURE_BGM_ENTRIES = Object.entries(
  FEATURE_AUDIO_CONFIG.bgmTracks,
) as [
  FeatureBgmTrackKey,
  (typeof FEATURE_AUDIO_CONFIG.bgmTracks)[FeatureBgmTrackKey],
][];

export const FEATURE_NARRATION_ENTRIES = Object.entries(
  FEATURE_AUDIO_CONFIG.narration,
) as [
  FeatureNarrationKey,
  (typeof FEATURE_AUDIO_CONFIG.narration)[FeatureNarrationKey],
][];
