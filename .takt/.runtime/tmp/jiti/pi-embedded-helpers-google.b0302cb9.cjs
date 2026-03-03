"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.isAntigravityClaude = isAntigravityClaude;exports.isGoogleModelApi = isGoogleModelApi;Object.defineProperty(exports, "sanitizeGoogleTurnOrdering", { enumerable: true, get: function () {return _bootstrap.sanitizeGoogleTurnOrdering;} });var _bootstrap = require("./bootstrap.js");
function isGoogleModelApi(api) {
  return api === "google-gemini-cli" || api === "google-generative-ai" || api === "google-antigravity";
}
function isAntigravityClaude(params) {
  const provider = params.provider?.toLowerCase();
  const api = params.api?.toLowerCase();
  if (provider !== "google-antigravity" && api !== "google-antigravity") {
    return false;
  }
  return params.modelId?.toLowerCase().includes("claude") ?? false;
} /* v9-d0a5f251ed1635cd */
