"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.isRecentInboundMessage = isRecentInboundMessage;exports.resetWebInboundDedupe = resetWebInboundDedupe;var _dedupe = require("../../infra/dedupe.js");
const RECENT_WEB_MESSAGE_TTL_MS = 20 * 60_000;
const RECENT_WEB_MESSAGE_MAX = 5000;
const recentInboundMessages = (0, _dedupe.createDedupeCache)({
  ttlMs: RECENT_WEB_MESSAGE_TTL_MS,
  maxSize: RECENT_WEB_MESSAGE_MAX
});
function resetWebInboundDedupe() {
  recentInboundMessages.clear();
}
function isRecentInboundMessage(key) {
  return recentInboundMessages.check(key);
} /* v9-5e751c4becb401c9 */
