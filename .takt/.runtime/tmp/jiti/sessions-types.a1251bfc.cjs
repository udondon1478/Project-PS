"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.DEFAULT_RESET_TRIGGERS = exports.DEFAULT_RESET_TRIGGER = exports.DEFAULT_IDLE_MINUTES = void 0;exports.mergeSessionEntry = mergeSessionEntry;var _nodeCrypto = _interopRequireDefault(require("node:crypto"));function _interopRequireDefault(e) {return e && e.__esModule ? e : { default: e };}
function mergeSessionEntry(existing, patch) {
  const sessionId = patch.sessionId ?? existing?.sessionId ?? _nodeCrypto.default.randomUUID();
  const updatedAt = Math.max(existing?.updatedAt ?? 0, patch.updatedAt ?? 0, Date.now());
  if (!existing) {
    return { ...patch, sessionId, updatedAt };
  }
  return { ...existing, ...patch, sessionId, updatedAt };
}
const DEFAULT_RESET_TRIGGER = exports.DEFAULT_RESET_TRIGGER = "/new";
const DEFAULT_RESET_TRIGGERS = exports.DEFAULT_RESET_TRIGGERS = ["/new", "/reset"];
const DEFAULT_IDLE_MINUTES = exports.DEFAULT_IDLE_MINUTES = 60; /* v9-26c393502d590b75 */
