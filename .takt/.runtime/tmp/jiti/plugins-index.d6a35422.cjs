"use strict";Object.defineProperty(exports, "__esModule", { value: true });Object.defineProperty(exports, "applyChannelMatchMeta", { enumerable: true, get: function () {return _channelConfig.applyChannelMatchMeta;} });Object.defineProperty(exports, "buildChannelKeyCandidates", { enumerable: true, get: function () {return _channelConfig.buildChannelKeyCandidates;} });Object.defineProperty(exports, "formatAllowlistMatchMeta", { enumerable: true, get: function () {return _allowlistMatch.formatAllowlistMatchMeta;} });exports.getChannelPlugin = getChannelPlugin;exports.listChannelPlugins = listChannelPlugins;Object.defineProperty(exports, "listDiscordDirectoryGroupsFromConfig", { enumerable: true, get: function () {return _directoryConfig.listDiscordDirectoryGroupsFromConfig;} });Object.defineProperty(exports, "listDiscordDirectoryPeersFromConfig", { enumerable: true, get: function () {return _directoryConfig.listDiscordDirectoryPeersFromConfig;} });Object.defineProperty(exports, "listSlackDirectoryGroupsFromConfig", { enumerable: true, get: function () {return _directoryConfig.listSlackDirectoryGroupsFromConfig;} });Object.defineProperty(exports, "listSlackDirectoryPeersFromConfig", { enumerable: true, get: function () {return _directoryConfig.listSlackDirectoryPeersFromConfig;} });Object.defineProperty(exports, "listTelegramDirectoryGroupsFromConfig", { enumerable: true, get: function () {return _directoryConfig.listTelegramDirectoryGroupsFromConfig;} });Object.defineProperty(exports, "listTelegramDirectoryPeersFromConfig", { enumerable: true, get: function () {return _directoryConfig.listTelegramDirectoryPeersFromConfig;} });Object.defineProperty(exports, "listWhatsAppDirectoryGroupsFromConfig", { enumerable: true, get: function () {return _directoryConfig.listWhatsAppDirectoryGroupsFromConfig;} });Object.defineProperty(exports, "listWhatsAppDirectoryPeersFromConfig", { enumerable: true, get: function () {return _directoryConfig.listWhatsAppDirectoryPeersFromConfig;} });exports.normalizeChannelId = normalizeChannelId;Object.defineProperty(exports, "normalizeChannelSlug", { enumerable: true, get: function () {return _channelConfig.normalizeChannelSlug;} });Object.defineProperty(exports, "resolveChannelEntryMatch", { enumerable: true, get: function () {return _channelConfig.resolveChannelEntryMatch;} });Object.defineProperty(exports, "resolveChannelEntryMatchWithFallback", { enumerable: true, get: function () {return _channelConfig.resolveChannelEntryMatchWithFallback;} });Object.defineProperty(exports, "resolveChannelMatchConfig", { enumerable: true, get: function () {return _channelConfig.resolveChannelMatchConfig;} });Object.defineProperty(exports, "resolveNestedAllowlistDecision", { enumerable: true, get: function () {return _channelConfig.resolveNestedAllowlistDecision;} });var _runtime = require("../../plugins/runtime.js");
var _registry = require("../registry.js");

















































var _directoryConfig = require("./directory-config.js");
var _channelConfig = require("./channel-config.js");
var _allowlistMatch = require("./allowlist-match.js"); // Channel plugins registry (runtime).
//
// This module is intentionally "heavy" (plugins may import channel monitors, web login, etc).
// Shared code paths (reply flow, command auth, sandbox explain) should depend on `src/channels/dock.ts`
// instead, and only call `getChannelPlugin()` at execution boundaries.
//
// Channel plugins are registered by the plugin loader (extensions/ or configured paths).
function listPluginChannels() {const registry = (0, _runtime.requireActivePluginRegistry)();return registry.channels.map((entry) => entry.plugin);}function dedupeChannels(channels) {const seen = new Set();const resolved = [];for (const plugin of channels) {const id = String(plugin.id).trim();if (!id || seen.has(id)) {continue;}seen.add(id);resolved.push(plugin);}return resolved;}function listChannelPlugins() {const combined = dedupeChannels(listPluginChannels());return combined.toSorted((a, b) => {const indexA = _registry.CHAT_CHANNEL_ORDER.indexOf(a.id);const indexB = _registry.CHAT_CHANNEL_ORDER.indexOf(b.id);const orderA = a.meta.order ?? (indexA === -1 ? 999 : indexA);const orderB = b.meta.order ?? (indexB === -1 ? 999 : indexB);if (orderA !== orderB) {return orderA - orderB;}return a.id.localeCompare(b.id);});}function getChannelPlugin(id) {const resolvedId = String(id).trim();if (!resolvedId) {return undefined;}return listChannelPlugins().find((plugin) => plugin.id === resolvedId);}function normalizeChannelId(raw) {// Channel docking: keep input normalization centralized in src/channels/registry.ts.
  // Plugin registry must be initialized before calling.
  return (0, _registry.normalizeAnyChannelId)(raw);} /* v9-fdd87886a0e7dade */
