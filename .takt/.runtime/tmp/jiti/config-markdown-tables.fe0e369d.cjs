"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.resolveMarkdownTableMode = resolveMarkdownTableMode;var _index = require("../channels/plugins/index.js");
var _sessionKey = require("../routing/session-key.js");
const DEFAULT_TABLE_MODES = new Map([
["signal", "bullets"],
["whatsapp", "bullets"]]
);
const isMarkdownTableMode = (value) => value === "off" || value === "bullets" || value === "code";
function resolveMarkdownModeFromSection(section, accountId) {
  if (!section) {
    return undefined;
  }
  const normalizedAccountId = (0, _sessionKey.normalizeAccountId)(accountId);
  const accounts = section.accounts;
  if (accounts && typeof accounts === "object") {
    const direct = accounts[normalizedAccountId];
    const directMode = direct?.markdown?.tables;
    if (isMarkdownTableMode(directMode)) {
      return directMode;
    }
    const matchKey = Object.keys(accounts).find((key) => key.toLowerCase() === normalizedAccountId.toLowerCase());
    const match = matchKey ? accounts[matchKey] : undefined;
    const matchMode = match?.markdown?.tables;
    if (isMarkdownTableMode(matchMode)) {
      return matchMode;
    }
  }
  const sectionMode = section.markdown?.tables;
  return isMarkdownTableMode(sectionMode) ? sectionMode : undefined;
}
function resolveMarkdownTableMode(params) {
  const channel = (0, _index.normalizeChannelId)(params.channel);
  const defaultMode = channel ? DEFAULT_TABLE_MODES.get(channel) ?? "code" : "code";
  if (!channel || !params.cfg) {
    return defaultMode;
  }
  const channelsConfig = params.cfg.channels;
  const section = channelsConfig?.[channel] ??
  params.cfg?.[channel];
  return resolveMarkdownModeFromSection(section, params.accountId) ?? defaultMode;
} /* v9-5a693f86e3fd4bed */
