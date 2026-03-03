"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.createTtsTool = createTtsTool;var _typebox = require("@sinclair/typebox");
var _config = require("../../config/config.js");
var _tts = require("../../tts/tts.js");
var _common = require("./common.js");
const TtsToolSchema = _typebox.Type.Object({
  text: _typebox.Type.String({ description: "Text to convert to speech." }),
  channel: _typebox.Type.Optional(_typebox.Type.String({ description: "Optional channel id to pick output format (e.g. telegram)." }))
});
function createTtsTool(opts) {
  return {
    label: "TTS",
    name: "tts",
    description: "Convert text to speech and return a MEDIA: path. Use when the user requests audio or TTS is enabled. Copy the MEDIA line exactly.",
    parameters: TtsToolSchema,
    execute: async (_toolCallId, args) => {
      const params = args;
      const text = (0, _common.readStringParam)(params, "text", { required: true });
      const channel = (0, _common.readStringParam)(params, "channel");
      const cfg = opts?.config ?? (0, _config.loadConfig)();
      const result = await (0, _tts.textToSpeech)({
        text,
        cfg,
        channel: channel ?? opts?.agentChannel
      });
      if (result.success && result.audioPath) {
        const lines = [];
        // Tag Telegram Opus output as a voice bubble instead of a file attachment.
        if (result.voiceCompatible) {
          lines.push("[[audio_as_voice]]");
        }
        lines.push(`MEDIA:${result.audioPath}`);
        return {
          content: [{ type: "text", text: lines.join("\n") }],
          details: { audioPath: result.audioPath, provider: result.provider }
        };
      }
      return {
        content: [
        {
          type: "text",
          text: result.error ?? "TTS conversion failed"
        }],

        details: { error: result.error }
      };
    }
  };
} /* v9-1295efc6eba8e14b */
