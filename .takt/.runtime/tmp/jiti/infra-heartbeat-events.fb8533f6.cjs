"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.emitHeartbeatEvent = emitHeartbeatEvent;exports.getLastHeartbeatEvent = getLastHeartbeatEvent;exports.onHeartbeatEvent = onHeartbeatEvent;exports.resolveIndicatorType = resolveIndicatorType;function resolveIndicatorType(status) {
  switch (status) {
    case "ok-empty":
    case "ok-token":
      return "ok";
    case "sent":
      return "alert";
    case "failed":
      return "error";
    case "skipped":
      return undefined;
  }
}
let lastHeartbeat = null;
const listeners = new Set();
function emitHeartbeatEvent(evt) {
  const enriched = { ts: Date.now(), ...evt };
  lastHeartbeat = enriched;
  for (const listener of listeners) {
    try {
      listener(enriched);
    }
    catch {

      /* ignore */}
  }
}
function onHeartbeatEvent(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
function getLastHeartbeatEvent() {
  return lastHeartbeat;
} /* v9-408bd7723cce1859 */
