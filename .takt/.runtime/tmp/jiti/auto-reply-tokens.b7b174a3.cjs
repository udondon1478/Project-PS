"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.SILENT_REPLY_TOKEN = exports.HEARTBEAT_TOKEN = void 0;exports.isSilentReplyText = isSilentReplyText;const HEARTBEAT_TOKEN = exports.HEARTBEAT_TOKEN = "HEARTBEAT_OK";
const SILENT_REPLY_TOKEN = exports.SILENT_REPLY_TOKEN = "NO_REPLY";
function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function isSilentReplyText(text, token = SILENT_REPLY_TOKEN) {
  if (!text) {
    return false;
  }
  const escaped = escapeRegExp(token);
  const prefix = new RegExp(`^\\s*${escaped}(?=$|\\W)`);
  if (prefix.test(text)) {
    return true;
  }
  const suffix = new RegExp(`\\b${escaped}\\b\\W*$`);
  return suffix.test(text);
} /* v9-1dd8c9458e5e8f5c */
