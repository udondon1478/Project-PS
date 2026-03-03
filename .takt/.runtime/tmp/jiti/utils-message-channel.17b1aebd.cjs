"use strict";Object.defineProperty(exports, "__esModule", { value: true });Object.defineProperty(exports, "GATEWAY_CLIENT_MODES", { enumerable: true, get: function () {return _clientInfo.GATEWAY_CLIENT_MODES;} });Object.defineProperty(exports, "GATEWAY_CLIENT_NAMES", { enumerable: true, get: function () {return _clientInfo.GATEWAY_CLIENT_NAMES;} });exports.INTERNAL_MESSAGE_CHANNEL = void 0;exports.isDeliverableMessageChannel = isDeliverableMessageChannel;exports.isGatewayCliClient = isGatewayCliClient;exports.isGatewayMessageChannel = isGatewayMessageChannel;exports.isInternalMessageChannel = isInternalMessageChannel;exports.isMarkdownCapableMessageChannel = isMarkdownCapableMessageChannel;exports.isWebchatClient = isWebchatClient;exports.listGatewayMessageChannels = exports.listGatewayAgentChannelValues = exports.listGatewayAgentChannelAliases = exports.listDeliverableMessageChannels = void 0;Object.defineProperty(exports, "normalizeGatewayClientMode", { enumerable: true, get: function () {return _clientInfo.normalizeGatewayClientMode;} });Object.defineProperty(exports, "normalizeGatewayClientName", { enumerable: true, get: function () {return _clientInfo.normalizeGatewayClientName;} });exports.normalizeMessageChannel = normalizeMessageChannel;exports.resolveGatewayMessageChannel = resolveGatewayMessageChannel;exports.resolveMessageChannel = resolveMessageChannel;var _registry = require("../channels/registry.js");
var _clientInfo = require("../gateway/protocol/client-info.js");
var _runtime = require("../plugins/runtime.js");
const INTERNAL_MESSAGE_CHANNEL = exports.INTERNAL_MESSAGE_CHANNEL = "webchat";
const MARKDOWN_CAPABLE_CHANNELS = new Set([
"slack",
"telegram",
"signal",
"discord",
"googlechat",
"tui",
INTERNAL_MESSAGE_CHANNEL]
);


function isGatewayCliClient(client) {
  return (0, _clientInfo.normalizeGatewayClientMode)(client?.mode) === _clientInfo.GATEWAY_CLIENT_MODES.CLI;
}
function isInternalMessageChannel(raw) {
  return normalizeMessageChannel(raw) === INTERNAL_MESSAGE_CHANNEL;
}
function isWebchatClient(client) {
  const mode = (0, _clientInfo.normalizeGatewayClientMode)(client?.mode);
  if (mode === _clientInfo.GATEWAY_CLIENT_MODES.WEBCHAT) {
    return true;
  }
  return (0, _clientInfo.normalizeGatewayClientName)(client?.id) === _clientInfo.GATEWAY_CLIENT_NAMES.WEBCHAT_UI;
}
function normalizeMessageChannel(raw) {
  const normalized = raw?.trim().toLowerCase();
  if (!normalized) {
    return undefined;
  }
  if (normalized === INTERNAL_MESSAGE_CHANNEL) {
    return INTERNAL_MESSAGE_CHANNEL;
  }
  const builtIn = (0, _registry.normalizeChatChannelId)(normalized);
  if (builtIn) {
    return builtIn;
  }
  const registry = (0, _runtime.getActivePluginRegistry)();
  const pluginMatch = registry?.channels.find((entry) => {
    if (entry.plugin.id.toLowerCase() === normalized) {
      return true;
    }
    return (entry.plugin.meta.aliases ?? []).some((alias) => alias.trim().toLowerCase() === normalized);
  });
  return pluginMatch?.plugin.id ?? normalized;
}
const listPluginChannelIds = () => {
  const registry = (0, _runtime.getActivePluginRegistry)();
  if (!registry) {
    return [];
  }
  return registry.channels.map((entry) => entry.plugin.id);
};
const listPluginChannelAliases = () => {
  const registry = (0, _runtime.getActivePluginRegistry)();
  if (!registry) {
    return [];
  }
  return registry.channels.flatMap((entry) => entry.plugin.meta.aliases ?? []);
};
const listDeliverableMessageChannels = () => Array.from(new Set([..._registry.CHANNEL_IDS, ...listPluginChannelIds()]));exports.listDeliverableMessageChannels = listDeliverableMessageChannels;
const listGatewayMessageChannels = () => [
...listDeliverableMessageChannels(),
INTERNAL_MESSAGE_CHANNEL];exports.listGatewayMessageChannels = listGatewayMessageChannels;

const listGatewayAgentChannelAliases = () => Array.from(new Set([...(0, _registry.listChatChannelAliases)(), ...listPluginChannelAliases()]));exports.listGatewayAgentChannelAliases = listGatewayAgentChannelAliases;
const listGatewayAgentChannelValues = () => Array.from(new Set([...listGatewayMessageChannels(), "last", ...listGatewayAgentChannelAliases()]));exports.listGatewayAgentChannelValues = listGatewayAgentChannelValues;
function isGatewayMessageChannel(value) {
  return listGatewayMessageChannels().includes(value);
}
function isDeliverableMessageChannel(value) {
  return listDeliverableMessageChannels().includes(value);
}
function resolveGatewayMessageChannel(raw) {
  const normalized = normalizeMessageChannel(raw);
  if (!normalized) {
    return undefined;
  }
  return isGatewayMessageChannel(normalized) ? normalized : undefined;
}
function resolveMessageChannel(primary, fallback) {
  return normalizeMessageChannel(primary) ?? normalizeMessageChannel(fallback);
}
function isMarkdownCapableMessageChannel(raw) {
  const channel = normalizeMessageChannel(raw);
  if (!channel) {
    return false;
  }
  return MARKDOWN_CAPABLE_CHANNELS.has(channel);
} /* v9-a7360af9d2c93c3d */
