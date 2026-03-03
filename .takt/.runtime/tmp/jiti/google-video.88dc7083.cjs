"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.DEFAULT_GOOGLE_VIDEO_BASE_URL = void 0;exports.describeGeminiVideo = describeGeminiVideo;var _modelsConfigProviders = require("../../../agents/models-config.providers.js");
var _shared = require("../shared.js");
const DEFAULT_GOOGLE_VIDEO_BASE_URL = exports.DEFAULT_GOOGLE_VIDEO_BASE_URL = "https://generativelanguage.googleapis.com/v1beta";
const DEFAULT_GOOGLE_VIDEO_MODEL = "gemini-3-flash-preview";
const DEFAULT_GOOGLE_VIDEO_PROMPT = "Describe the video.";
function resolveModel(model) {
  const trimmed = model?.trim();
  if (!trimmed) {
    return DEFAULT_GOOGLE_VIDEO_MODEL;
  }
  return (0, _modelsConfigProviders.normalizeGoogleModelId)(trimmed);
}
function resolvePrompt(prompt) {
  const trimmed = prompt?.trim();
  return trimmed || DEFAULT_GOOGLE_VIDEO_PROMPT;
}
async function describeGeminiVideo(params) {
  const fetchFn = params.fetchFn ?? fetch;
  const baseUrl = (0, _shared.normalizeBaseUrl)(params.baseUrl, DEFAULT_GOOGLE_VIDEO_BASE_URL);
  const model = resolveModel(params.model);
  const url = `${baseUrl}/models/${model}:generateContent`;
  const headers = new Headers(params.headers);
  if (!headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }
  if (!headers.has("x-goog-api-key")) {
    headers.set("x-goog-api-key", params.apiKey);
  }
  const body = {
    contents: [
    {
      role: "user",
      parts: [
      { text: resolvePrompt(params.prompt) },
      {
        inline_data: {
          mime_type: params.mime ?? "video/mp4",
          data: params.buffer.toString("base64")
        }
      }]

    }]

  };
  const res = await (0, _shared.fetchWithTimeout)(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body)
  }, params.timeoutMs, fetchFn);
  if (!res.ok) {
    const detail = await (0, _shared.readErrorResponse)(res);
    const suffix = detail ? `: ${detail}` : "";
    throw new Error(`Video description failed (HTTP ${res.status})${suffix}`);
  }
  const payload = await res.json();
  const parts = payload.candidates?.[0]?.content?.parts ?? [];
  const text = parts.
  map((part) => part?.text?.trim()).
  filter(Boolean).
  join("\n");
  if (!text) {
    throw new Error("Video description response missing text");
  }
  return { text, model };
} /* v9-c791df9b2152a2d7 */
