"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.estimateBase64Size = estimateBase64Size;exports.resolveVideoMaxBase64Bytes = resolveVideoMaxBase64Bytes;var _defaults = require("./defaults.js");
function estimateBase64Size(bytes) {
  return Math.ceil(bytes / 3) * 4;
}
function resolveVideoMaxBase64Bytes(maxBytes) {
  const expanded = Math.floor(maxBytes * (4 / 3));
  return Math.min(expanded, _defaults.DEFAULT_VIDEO_MAX_BASE64_BYTES);
} /* v9-84d36e0a86dd46d9 */
