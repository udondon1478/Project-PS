// Transition overlap in frames (matches TransitionSeries transition duration)
const TRANSITION_FRAMES = 60;

// Total video duration in frames (56 seconds at 60fps)
const TOTAL_DURATION = 3360;

// BGM fadeout configuration
// Start fadeout at 49 seconds (7 seconds of fadeout)
const BGM_FADEOUT_START = 49 * 60; // 2940 frames
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
    minGapForFadeIn: 30, // フェードイン実行に必要な最小間隔（フレーム）。これ未満の間隔では低音量維持
    crossfade: TRANSITION_FRAMES,
    fadeOutDuration: BGM_FADEOUT_DURATION, // Custom fadeout duration for the ending
  },
  narration: {
    intro: {
      file: "audio/ナレーション_イントロ.wav",
      start: 0,
      durationInFrames: 536, // ~8.93秒 at 60fps
    },
    scene2: {
      file: "audio/ナレーション_Scene2_2.wav",
      start: 582, // Scene2開始(540) + 0.7秒(42f)
      durationInFrames: 540, // ~6秒 ※録音後に調整
    },
    scene3: {
      file: "audio/ナレーション_Scene3_2.wav",
      start: 1140, // Scene3開始(1080) + 1秒(60f)
      durationInFrames: 390, // ~6.5秒 ※録音後に調整
    },
    scene4Part1: {
      file: "audio/ナレーション_Scene4_Part1_2.wav",
      start: 1560, // Scene4開始(1560) + 0秒(0f)
      durationInFrames: 420, // ~5秒 ※録音後に調整
    },
    scene4Part2: {
      file: "audio/ナレーション_Scene4_Part2_5.wav",
      start: 2060, // Scene4開始(1560) + 8.33秒(500f)
      durationInFrames: 360, // ~4秒 ※録音後に調整
    },
    scene4Part3: {
      file: "audio/ナレーション_Scene4_Part3_3.wav",
      start: 2610, // Scene4開始(1560) + 18秒(1080f)
      durationInFrames: 300, // ~5秒 ※録音後に調整
    },
    scene5: {
      file: "audio/ナレーション_Scene5.wav",
      start: 2990, // Scene5開始(2960) + 0.5秒(30f)
      durationInFrames: 180, // ~3秒 ※録音後に調整
      volume: 0.7, // Scene5の音量を70%に下げる
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
