"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.isVoiceCompatibleAudio = isVoiceCompatibleAudio;var _mime = require("./mime.js");
const VOICE_AUDIO_EXTENSIONS = new Set([".oga", ".ogg", ".opus"]);
function isVoiceCompatibleAudio(opts) {
  const mime = opts.contentType?.toLowerCase();
  if (mime && (mime.includes("ogg") || mime.includes("opus"))) {
    return true;
  }
  const fileName = opts.fileName?.trim();
  if (!fileName) {
    return false;
  }
  const ext = (0, _mime.getFileExtension)(fileName);
  if (!ext) {
    return false;
  }
  return VOICE_AUDIO_EXTENSIONS.has(ext);
} /* v9-8d639f314c244b3b */
