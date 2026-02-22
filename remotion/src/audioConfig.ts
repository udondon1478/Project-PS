// Transition overlap in frames (matches TransitionSeries transition duration)
const TRANSITION_FRAMES = 60;

// Total video duration in frames (55 seconds at 60fps)
const TOTAL_DURATION = 3300;

// BGM fadeout configuration
// Start fadeout at 48 seconds (7 seconds of fadeout)
const BGM_FADEOUT_START = 48 * 60; // 2880 frames
const BGM_FADEOUT_DURATION = TOTAL_DURATION - BGM_FADEOUT_START; // 420 frames (7 seconds)

export const AUDIO_CONFIG = {
  bgmTracks: {
    main: {
      file: "audio/tech-product-demo-background-digital-clean-459119.mp3",
      start: 0,
      durationInFrames: TOTAL_DURATION,
    },
  },
  bgmVolume: {
    normalVolume: 0.3,
    duckedVolume: 0.08,
    duckTransition: 15, // 0.25s transition to ducked volume
    crossfade: TRANSITION_FRAMES,
    fadeOutDuration: BGM_FADEOUT_DURATION, // Custom fadeout duration for the ending
  },
  narration: {
    intro: {
      file: "audio/ナレーション_イントロ.wav",
      start: 0,
      durationInFrames: 536, // ~8.93秒 at 60fps
    },
  },
  totalDuration: TOTAL_DURATION,
} as const;

export type BgmTrackKey = keyof typeof AUDIO_CONFIG.bgmTracks;
export type NarrationKey = keyof typeof AUDIO_CONFIG.narration;

export const BGM_ENTRIES = Object.entries(AUDIO_CONFIG.bgmTracks) as [
  BgmTrackKey,
  (typeof AUDIO_CONFIG.bgmTracks)[BgmTrackKey],
][];

export const NARRATION_ENTRIES = Object.entries(AUDIO_CONFIG.narration) as [
  NarrationKey,
  (typeof AUDIO_CONFIG.narration)[NarrationKey],
][];
