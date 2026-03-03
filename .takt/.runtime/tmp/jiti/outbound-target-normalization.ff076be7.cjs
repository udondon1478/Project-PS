"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.buildTargetResolverSignature = buildTargetResolverSignature;exports.normalizeChannelTargetInput = normalizeChannelTargetInput;exports.normalizeTargetForProvider = normalizeTargetForProvider;var _index = require("../../channels/plugins/index.js");
function normalizeChannelTargetInput(raw) {
  return raw.trim();
}
function normalizeTargetForProvider(provider, raw) {
  if (!raw) {
    return undefined;
  }
  const providerId = (0, _index.normalizeChannelId)(provider);
  const plugin = providerId ? (0, _index.getChannelPlugin)(providerId) : undefined;
  const normalized = plugin?.messaging?.normalizeTarget?.(raw) ?? (raw.trim().toLowerCase() || undefined);
  return normalized || undefined;
}
function buildTargetResolverSignature(channel) {
  const plugin = (0, _index.getChannelPlugin)(channel);
  const resolver = plugin?.messaging?.targetResolver;
  const hint = resolver?.hint ?? "";
  const looksLike = resolver?.looksLikeId;
  const source = looksLike ? looksLike.toString() : "";
  return hashSignature(`${hint}|${source}`);
}
function hashSignature(value) {
  let hash = 5381;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) + hash ^ value.charCodeAt(i);
  }
  return (hash >>> 0).toString(36);
} /* v9-00516149f46fb53f */
