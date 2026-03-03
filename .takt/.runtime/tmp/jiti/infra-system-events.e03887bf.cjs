"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.drainSystemEventEntries = drainSystemEventEntries;exports.drainSystemEvents = drainSystemEvents;exports.enqueueSystemEvent = enqueueSystemEvent;exports.hasSystemEvents = hasSystemEvents;exports.isSystemEventContextChanged = isSystemEventContextChanged;exports.peekSystemEvents = peekSystemEvents;exports.resetSystemEventsForTest = resetSystemEventsForTest; // Lightweight in-memory queue for human-readable system events that should be
// prefixed to the next prompt. We intentionally avoid persistence to keep
// events ephemeral. Events are session-scoped and require an explicit key.
const MAX_EVENTS = 20;
const queues = new Map();
function requireSessionKey(key) {
  const trimmed = typeof key === "string" ? key.trim() : "";
  if (!trimmed) {
    throw new Error("system events require a sessionKey");
  }
  return trimmed;
}
function normalizeContextKey(key) {
  if (!key) {
    return null;
  }
  const trimmed = key.trim();
  if (!trimmed) {
    return null;
  }
  return trimmed.toLowerCase();
}
function isSystemEventContextChanged(sessionKey, contextKey) {
  const key = requireSessionKey(sessionKey);
  const existing = queues.get(key);
  const normalized = normalizeContextKey(contextKey);
  return normalized !== (existing?.lastContextKey ?? null);
}
function enqueueSystemEvent(text, options) {
  const key = requireSessionKey(options?.sessionKey);
  const entry = queues.get(key) ??
  (() => {
    const created = {
      queue: [],
      lastText: null,
      lastContextKey: null
    };
    queues.set(key, created);
    return created;
  })();
  const cleaned = text.trim();
  if (!cleaned) {
    return;
  }
  entry.lastContextKey = normalizeContextKey(options?.contextKey);
  if (entry.lastText === cleaned) {
    return;
  } // skip consecutive duplicates
  entry.lastText = cleaned;
  entry.queue.push({ text: cleaned, ts: Date.now() });
  if (entry.queue.length > MAX_EVENTS) {
    entry.queue.shift();
  }
}
function drainSystemEventEntries(sessionKey) {
  const key = requireSessionKey(sessionKey);
  const entry = queues.get(key);
  if (!entry || entry.queue.length === 0) {
    return [];
  }
  const out = entry.queue.slice();
  entry.queue.length = 0;
  entry.lastText = null;
  entry.lastContextKey = null;
  queues.delete(key);
  return out;
}
function drainSystemEvents(sessionKey) {
  return drainSystemEventEntries(sessionKey).map((event) => event.text);
}
function peekSystemEvents(sessionKey) {
  const key = requireSessionKey(sessionKey);
  return queues.get(key)?.queue.map((e) => e.text) ?? [];
}
function hasSystemEvents(sessionKey) {
  const key = requireSessionKey(sessionKey);
  return (queues.get(key)?.queue.length ?? 0) > 0;
}
function resetSystemEventsForTest() {
  queues.clear();
} /* v9-849a920136388197 */
