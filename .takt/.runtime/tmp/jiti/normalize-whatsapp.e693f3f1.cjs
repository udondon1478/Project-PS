"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.looksLikeWhatsAppTargetId = looksLikeWhatsAppTargetId;exports.normalizeWhatsAppMessagingTarget = normalizeWhatsAppMessagingTarget;var _normalize = require("../../../whatsapp/normalize.js");
function normalizeWhatsAppMessagingTarget(raw) {
  const trimmed = raw.trim();
  if (!trimmed) {
    return undefined;
  }
  return (0, _normalize.normalizeWhatsAppTarget)(trimmed) ?? undefined;
}
function looksLikeWhatsAppTargetId(raw) {
  const trimmed = raw.trim();
  if (!trimmed) {
    return false;
  }
  if (/^whatsapp:/i.test(trimmed)) {
    return true;
  }
  if (trimmed.includes("@")) {
    return true;
  }
  return /^\+?\d{3,}$/.test(trimmed);
} /* v9-c420a6007eb4fd84 */
