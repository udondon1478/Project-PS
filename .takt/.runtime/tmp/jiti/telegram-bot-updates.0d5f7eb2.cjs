"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.resolveTelegramUpdateId = exports.createTelegramUpdateDedupe = exports.buildTelegramUpdateKey = exports.MEDIA_GROUP_TIMEOUT_MS = void 0;var _dedupe = require("../infra/dedupe.js");
const MEDIA_GROUP_TIMEOUT_MS = exports.MEDIA_GROUP_TIMEOUT_MS = 500;
const RECENT_TELEGRAM_UPDATE_TTL_MS = 5 * 60_000;
const RECENT_TELEGRAM_UPDATE_MAX = 2000;
const resolveTelegramUpdateId = (ctx) => ctx.update?.update_id ?? ctx.update_id;exports.resolveTelegramUpdateId = resolveTelegramUpdateId;
const buildTelegramUpdateKey = (ctx) => {
  const updateId = resolveTelegramUpdateId(ctx);
  if (typeof updateId === "number") {
    return `update:${updateId}`;
  }
  const callbackId = ctx.callbackQuery?.id;
  if (callbackId) {
    return `callback:${callbackId}`;
  }
  const msg = ctx.message ?? ctx.update?.message ?? ctx.update?.edited_message ?? ctx.callbackQuery?.message;
  const chatId = msg?.chat?.id;
  const messageId = msg?.message_id;
  if (typeof chatId !== "undefined" && typeof messageId === "number") {
    return `message:${chatId}:${messageId}`;
  }
  return undefined;
};exports.buildTelegramUpdateKey = buildTelegramUpdateKey;
const createTelegramUpdateDedupe = () => (0, _dedupe.createDedupeCache)({
  ttlMs: RECENT_TELEGRAM_UPDATE_TTL_MS,
  maxSize: RECENT_TELEGRAM_UPDATE_MAX
});exports.createTelegramUpdateDedupe = createTelegramUpdateDedupe; /* v9-5995fb2643222af9 */
