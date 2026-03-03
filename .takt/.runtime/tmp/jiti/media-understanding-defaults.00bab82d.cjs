"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.DEFAULT_VIDEO_MAX_BASE64_BYTES = exports.DEFAULT_TIMEOUT_SECONDS = exports.DEFAULT_PROMPT = exports.DEFAULT_MEDIA_CONCURRENCY = exports.DEFAULT_MAX_CHARS_BY_CAPABILITY = exports.DEFAULT_MAX_CHARS = exports.DEFAULT_MAX_BYTES = exports.DEFAULT_AUDIO_MODELS = exports.CLI_OUTPUT_MAX_BUFFER = void 0;const MB = 1024 * 1024;
const DEFAULT_MAX_CHARS = exports.DEFAULT_MAX_CHARS = 500;
const DEFAULT_MAX_CHARS_BY_CAPABILITY = exports.DEFAULT_MAX_CHARS_BY_CAPABILITY = {
  image: DEFAULT_MAX_CHARS,
  audio: undefined,
  video: DEFAULT_MAX_CHARS
};
const DEFAULT_MAX_BYTES = exports.DEFAULT_MAX_BYTES = {
  image: 10 * MB,
  audio: 20 * MB,
  video: 50 * MB
};
const DEFAULT_TIMEOUT_SECONDS = exports.DEFAULT_TIMEOUT_SECONDS = {
  image: 60,
  audio: 60,
  video: 120
};
const DEFAULT_PROMPT = exports.DEFAULT_PROMPT = {
  image: "Describe the image.",
  audio: "Transcribe the audio.",
  video: "Describe the video."
};
const DEFAULT_VIDEO_MAX_BASE64_BYTES = exports.DEFAULT_VIDEO_MAX_BASE64_BYTES = 70 * MB;
const DEFAULT_AUDIO_MODELS = exports.DEFAULT_AUDIO_MODELS = {
  groq: "whisper-large-v3-turbo",
  openai: "gpt-4o-mini-transcribe",
  deepgram: "nova-3"
};
const CLI_OUTPUT_MAX_BUFFER = exports.CLI_OUTPUT_MAX_BUFFER = 5 * MB;
const DEFAULT_MEDIA_CONCURRENCY = exports.DEFAULT_MEDIA_CONCURRENCY = 2; /* v9-318498497f22d00d */
