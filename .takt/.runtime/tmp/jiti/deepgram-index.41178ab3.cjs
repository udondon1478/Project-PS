"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.deepgramProvider = void 0;var _audio = require("./audio.js");
const deepgramProvider = exports.deepgramProvider = {
  id: "deepgram",
  capabilities: ["audio"],
  transcribeAudio: _audio.transcribeDeepgramAudio
}; /* v9-4cbd64e231463223 */
