"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.groqProvider = void 0;var _audio = require("../openai/audio.js");
const DEFAULT_GROQ_AUDIO_BASE_URL = "https://api.groq.com/openai/v1";
const groqProvider = exports.groqProvider = {
  id: "groq",
  capabilities: ["audio"],
  transcribeAudio: (req) => (0, _audio.transcribeOpenAiCompatibleAudio)({
    ...req,
    baseUrl: req.baseUrl ?? DEFAULT_GROQ_AUDIO_BASE_URL
  })
}; /* v9-5b5eda795e5f66f4 */
