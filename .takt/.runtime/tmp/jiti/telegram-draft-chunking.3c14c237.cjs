"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.resolveTelegramDraftStreamingChunking = resolveTelegramDraftStreamingChunking;var _chunk = require("../auto-reply/chunk.js");
var _dock = require("../channels/dock.js");
var _sessionKey = require("../routing/session-key.js");
const DEFAULT_TELEGRAM_DRAFT_STREAM_MIN = 200;
const DEFAULT_TELEGRAM_DRAFT_STREAM_MAX = 800;
function resolveTelegramDraftStreamingChunking(cfg, accountId) {
  const providerChunkLimit = (0, _dock.getChannelDock)("telegram")?.outbound?.textChunkLimit;
  const textLimit = (0, _chunk.resolveTextChunkLimit)(cfg, "telegram", accountId, {
    fallbackLimit: providerChunkLimit
  });
  const normalizedAccountId = (0, _sessionKey.normalizeAccountId)(accountId);
  const draftCfg = cfg?.channels?.telegram?.accounts?.[normalizedAccountId]?.draftChunk ??
  cfg?.channels?.telegram?.draftChunk;
  const maxRequested = Math.max(1, Math.floor(draftCfg?.maxChars ?? DEFAULT_TELEGRAM_DRAFT_STREAM_MAX));
  const maxChars = Math.max(1, Math.min(maxRequested, textLimit));
  const minRequested = Math.max(1, Math.floor(draftCfg?.minChars ?? DEFAULT_TELEGRAM_DRAFT_STREAM_MIN));
  const minChars = Math.min(minRequested, maxChars);
  const breakPreference = draftCfg?.breakPreference === "newline" || draftCfg?.breakPreference === "sentence" ?
  draftCfg.breakPreference :
  "paragraph";
  return { minChars, maxChars, breakPreference };
} /* v9-1ed084de65188a83 */
