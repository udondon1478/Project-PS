"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.emitSessionTranscriptUpdate = emitSessionTranscriptUpdate;exports.onSessionTranscriptUpdate = onSessionTranscriptUpdate;const SESSION_TRANSCRIPT_LISTENERS = new Set();
function onSessionTranscriptUpdate(listener) {
  SESSION_TRANSCRIPT_LISTENERS.add(listener);
  return () => {
    SESSION_TRANSCRIPT_LISTENERS.delete(listener);
  };
}
function emitSessionTranscriptUpdate(sessionFile) {
  const trimmed = sessionFile.trim();
  if (!trimmed) {
    return;
  }
  const update = { sessionFile: trimmed };
  for (const listener of SESSION_TRANSCRIPT_LISTENERS) {
    listener(update);
  }
} /* v9-4903e941f960cf8f */
