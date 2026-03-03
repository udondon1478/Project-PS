"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.emitDiagnosticEvent = emitDiagnosticEvent;exports.isDiagnosticsEnabled = isDiagnosticsEnabled;exports.onDiagnosticEvent = onDiagnosticEvent;exports.resetDiagnosticEventsForTest = resetDiagnosticEventsForTest;let seq = 0;
const listeners = new Set();
function isDiagnosticsEnabled(config) {
  return config?.diagnostics?.enabled === true;
}
function emitDiagnosticEvent(event) {
  const enriched = {
    ...event,
    seq: seq += 1,
    ts: Date.now()
  };
  for (const listener of listeners) {
    try {
      listener(enriched);
    }
    catch {

      // Ignore listener failures.
    }}
}
function onDiagnosticEvent(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
function resetDiagnosticEventsForTest() {
  seq = 0;
  listeners.clear();
} /* v9-0d5f39517c01ad7d */
