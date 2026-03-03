"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.normalizeSlackToken = normalizeSlackToken;exports.resolveSlackAppToken = resolveSlackAppToken;exports.resolveSlackBotToken = resolveSlackBotToken;function normalizeSlackToken(raw) {
  const trimmed = raw?.trim();
  return trimmed ? trimmed : undefined;
}
function resolveSlackBotToken(raw) {
  return normalizeSlackToken(raw);
}
function resolveSlackAppToken(raw) {
  return normalizeSlackToken(raw);
} /* v9-ecf5eddb6190447c */
