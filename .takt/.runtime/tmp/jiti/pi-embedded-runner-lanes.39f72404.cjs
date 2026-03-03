"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.resolveEmbeddedSessionLane = resolveEmbeddedSessionLane;exports.resolveGlobalLane = resolveGlobalLane;exports.resolveSessionLane = resolveSessionLane;function resolveSessionLane(key) {
  const cleaned = key.trim() || "main" /* CommandLane.Main */;
  return cleaned.startsWith("session:") ? cleaned : `session:${cleaned}`;
}
function resolveGlobalLane(lane) {
  const cleaned = lane?.trim();
  return cleaned ? cleaned : "main" /* CommandLane.Main */;
}
function resolveEmbeddedSessionLane(key) {
  return resolveSessionLane(key);
} /* v9-327942fbce32864c */
