"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.looksLikeDiscordTargetId = looksLikeDiscordTargetId;exports.normalizeDiscordMessagingTarget = normalizeDiscordMessagingTarget;var _targets = require("../../../discord/targets.js");
function normalizeDiscordMessagingTarget(raw) {
  // Default bare IDs to channels so routing is stable across tool actions.
  const target = (0, _targets.parseDiscordTarget)(raw, { defaultKind: "channel" });
  return target?.normalized;
}
function looksLikeDiscordTargetId(raw) {
  const trimmed = raw.trim();
  if (!trimmed) {
    return false;
  }
  if (/^<@!?\d+>$/.test(trimmed)) {
    return true;
  }
  if (/^(user|channel|discord):/i.test(trimmed)) {
    return true;
  }
  if (/^\d{6,}$/.test(trimmed)) {
    return true;
  }
  return false;
} /* v9-f3679fd999571692 */
