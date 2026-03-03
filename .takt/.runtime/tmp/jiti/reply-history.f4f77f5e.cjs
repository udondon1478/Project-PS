"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.MAX_HISTORY_KEYS = exports.HISTORY_CONTEXT_MARKER = exports.DEFAULT_GROUP_HISTORY_LIMIT = void 0;exports.appendHistoryEntry = appendHistoryEntry;exports.buildHistoryContext = buildHistoryContext;exports.buildHistoryContextFromEntries = buildHistoryContextFromEntries;exports.buildHistoryContextFromMap = buildHistoryContextFromMap;exports.buildPendingHistoryContextFromMap = buildPendingHistoryContextFromMap;exports.clearHistoryEntries = clearHistoryEntries;exports.clearHistoryEntriesIfEnabled = clearHistoryEntriesIfEnabled;exports.evictOldHistoryKeys = evictOldHistoryKeys;exports.recordPendingHistoryEntry = recordPendingHistoryEntry;exports.recordPendingHistoryEntryIfEnabled = recordPendingHistoryEntryIfEnabled;var _mentions = require("./mentions.js");
const HISTORY_CONTEXT_MARKER = exports.HISTORY_CONTEXT_MARKER = "[Chat messages since your last reply - for context]";
const DEFAULT_GROUP_HISTORY_LIMIT = exports.DEFAULT_GROUP_HISTORY_LIMIT = 50;
/** Maximum number of group history keys to retain (LRU eviction when exceeded). */
const MAX_HISTORY_KEYS = exports.MAX_HISTORY_KEYS = 1000;
/**
 * Evict oldest keys from a history map when it exceeds MAX_HISTORY_KEYS.
 * Uses Map's insertion order for LRU-like behavior.
 */
function evictOldHistoryKeys(historyMap, maxKeys = MAX_HISTORY_KEYS) {
  if (historyMap.size <= maxKeys) {
    return;
  }
  const keysToDelete = historyMap.size - maxKeys;
  const iterator = historyMap.keys();
  for (let i = 0; i < keysToDelete; i++) {
    const key = iterator.next().value;
    if (key !== undefined) {
      historyMap.delete(key);
    }
  }
}
function buildHistoryContext(params) {
  const { historyText, currentMessage } = params;
  const lineBreak = params.lineBreak ?? "\n";
  if (!historyText.trim()) {
    return currentMessage;
  }
  return [HISTORY_CONTEXT_MARKER, historyText, "", _mentions.CURRENT_MESSAGE_MARKER, currentMessage].join(lineBreak);
}
function appendHistoryEntry(params) {
  const { historyMap, historyKey, entry } = params;
  if (params.limit <= 0) {
    return [];
  }
  const history = historyMap.get(historyKey) ?? [];
  history.push(entry);
  while (history.length > params.limit) {
    history.shift();
  }
  if (historyMap.has(historyKey)) {
    // Refresh insertion order so eviction keeps recently used histories.
    historyMap.delete(historyKey);
  }
  historyMap.set(historyKey, history);
  // Evict oldest keys if map exceeds max size to prevent unbounded memory growth
  evictOldHistoryKeys(historyMap);
  return history;
}
function recordPendingHistoryEntry(params) {
  return appendHistoryEntry(params);
}
function recordPendingHistoryEntryIfEnabled(params) {
  if (!params.entry) {
    return [];
  }
  if (params.limit <= 0) {
    return [];
  }
  return recordPendingHistoryEntry({
    historyMap: params.historyMap,
    historyKey: params.historyKey,
    entry: params.entry,
    limit: params.limit
  });
}
function buildPendingHistoryContextFromMap(params) {
  if (params.limit <= 0) {
    return params.currentMessage;
  }
  const entries = params.historyMap.get(params.historyKey) ?? [];
  return buildHistoryContextFromEntries({
    entries,
    currentMessage: params.currentMessage,
    formatEntry: params.formatEntry,
    lineBreak: params.lineBreak,
    excludeLast: false
  });
}
function buildHistoryContextFromMap(params) {
  if (params.limit <= 0) {
    return params.currentMessage;
  }
  const entries = params.entry ?
  appendHistoryEntry({
    historyMap: params.historyMap,
    historyKey: params.historyKey,
    entry: params.entry,
    limit: params.limit
  }) :
  params.historyMap.get(params.historyKey) ?? [];
  return buildHistoryContextFromEntries({
    entries,
    currentMessage: params.currentMessage,
    formatEntry: params.formatEntry,
    lineBreak: params.lineBreak,
    excludeLast: params.excludeLast
  });
}
function clearHistoryEntries(params) {
  params.historyMap.set(params.historyKey, []);
}
function clearHistoryEntriesIfEnabled(params) {
  if (params.limit <= 0) {
    return;
  }
  clearHistoryEntries({ historyMap: params.historyMap, historyKey: params.historyKey });
}
function buildHistoryContextFromEntries(params) {
  const lineBreak = params.lineBreak ?? "\n";
  const entries = params.excludeLast === false ? params.entries : params.entries.slice(0, -1);
  if (entries.length === 0) {
    return params.currentMessage;
  }
  const historyText = entries.map(params.formatEntry).join(lineBreak);
  return buildHistoryContext({
    historyText,
    currentMessage: params.currentMessage,
    lineBreak
  });
} /* v9-c801e90c176eb800 */
