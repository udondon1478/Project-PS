"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.resolveQueueSettings = resolveQueueSettings;var _index = require("../../../channels/plugins/index.js");
var _normalize = require("./normalize.js");
var _state = require("./state.js");
function defaultQueueModeForChannel(_channel) {
  return "collect";
}
/** Resolve per-channel debounce override from debounceMsByChannel map. */
function resolveChannelDebounce(byChannel, channelKey) {
  if (!channelKey || !byChannel) {
    return undefined;
  }
  const value = byChannel[channelKey];
  return typeof value === "number" && Number.isFinite(value) ? Math.max(0, value) : undefined;
}
function resolvePluginDebounce(channelKey) {
  if (!channelKey) {
    return undefined;
  }
  const plugin = (0, _index.getChannelPlugin)(channelKey);
  const value = plugin?.defaults?.queue?.debounceMs;
  return typeof value === "number" && Number.isFinite(value) ? Math.max(0, value) : undefined;
}
function resolveQueueSettings(params) {
  const channelKey = params.channel?.trim().toLowerCase();
  const queueCfg = params.cfg.messages?.queue;
  const providerModeRaw = channelKey && queueCfg?.byChannel ?
  queueCfg.byChannel[channelKey] :
  undefined;
  const resolvedMode = params.inlineMode ??
  (0, _normalize.normalizeQueueMode)(params.sessionEntry?.queueMode) ??
  (0, _normalize.normalizeQueueMode)(providerModeRaw) ??
  (0, _normalize.normalizeQueueMode)(queueCfg?.mode) ??
  defaultQueueModeForChannel(channelKey);
  const debounceRaw = params.inlineOptions?.debounceMs ??
  params.sessionEntry?.queueDebounceMs ??
  resolveChannelDebounce(queueCfg?.debounceMsByChannel, channelKey) ??
  resolvePluginDebounce(channelKey) ??
  queueCfg?.debounceMs ??
  _state.DEFAULT_QUEUE_DEBOUNCE_MS;
  const capRaw = params.inlineOptions?.cap ??
  params.sessionEntry?.queueCap ??
  queueCfg?.cap ??
  _state.DEFAULT_QUEUE_CAP;
  const dropRaw = params.inlineOptions?.dropPolicy ??
  params.sessionEntry?.queueDrop ??
  (0, _normalize.normalizeQueueDropPolicy)(queueCfg?.drop) ??
  _state.DEFAULT_QUEUE_DROP;
  return {
    mode: resolvedMode,
    debounceMs: typeof debounceRaw === "number" ? Math.max(0, debounceRaw) : undefined,
    cap: typeof capRaw === "number" ? Math.max(1, Math.floor(capRaw)) : undefined,
    dropPolicy: dropRaw
  };
} /* v9-ab20a68958e0c234 */
