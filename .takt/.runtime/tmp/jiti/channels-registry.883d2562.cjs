"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.DEFAULT_CHAT_CHANNEL = exports.CHAT_CHANNEL_ORDER = exports.CHAT_CHANNEL_ALIASES = exports.CHANNEL_IDS = void 0;exports.formatChannelPrimerLine = formatChannelPrimerLine;exports.formatChannelSelectionLine = formatChannelSelectionLine;exports.getChatChannelMeta = getChatChannelMeta;exports.listChatChannelAliases = listChatChannelAliases;exports.listChatChannels = listChatChannels;exports.normalizeAnyChannelId = normalizeAnyChannelId;exports.normalizeChannelId = normalizeChannelId;exports.normalizeChatChannelId = normalizeChatChannelId;var _runtime = require("../plugins/runtime.js");
// Channel docking: add new core channels here (order + meta + aliases), then
// register the plugin in its extension entrypoint and keep protocol IDs in sync.
const CHAT_CHANNEL_ORDER = exports.CHAT_CHANNEL_ORDER = [
"telegram",
"whatsapp",
"discord",
"googlechat",
"slack",
"signal",
"imessage"];

const CHANNEL_IDS = exports.CHANNEL_IDS = [...CHAT_CHANNEL_ORDER];
const DEFAULT_CHAT_CHANNEL = exports.DEFAULT_CHAT_CHANNEL = "whatsapp";
const WEBSITE_URL = "https://openclaw.ai";
const CHAT_CHANNEL_META = {
  telegram: {
    id: "telegram",
    label: "Telegram",
    selectionLabel: "Telegram (Bot API)",
    detailLabel: "Telegram Bot",
    docsPath: "/channels/telegram",
    docsLabel: "telegram",
    blurb: "simplest way to get started — register a bot with @BotFather and get going.",
    systemImage: "paperplane",
    selectionDocsPrefix: "",
    selectionDocsOmitLabel: true,
    selectionExtras: [WEBSITE_URL]
  },
  whatsapp: {
    id: "whatsapp",
    label: "WhatsApp",
    selectionLabel: "WhatsApp (QR link)",
    detailLabel: "WhatsApp Web",
    docsPath: "/channels/whatsapp",
    docsLabel: "whatsapp",
    blurb: "works with your own number; recommend a separate phone + eSIM.",
    systemImage: "message"
  },
  discord: {
    id: "discord",
    label: "Discord",
    selectionLabel: "Discord (Bot API)",
    detailLabel: "Discord Bot",
    docsPath: "/channels/discord",
    docsLabel: "discord",
    blurb: "very well supported right now.",
    systemImage: "bubble.left.and.bubble.right"
  },
  googlechat: {
    id: "googlechat",
    label: "Google Chat",
    selectionLabel: "Google Chat (Chat API)",
    detailLabel: "Google Chat",
    docsPath: "/channels/googlechat",
    docsLabel: "googlechat",
    blurb: "Google Workspace Chat app with HTTP webhook.",
    systemImage: "message.badge"
  },
  slack: {
    id: "slack",
    label: "Slack",
    selectionLabel: "Slack (Socket Mode)",
    detailLabel: "Slack Bot",
    docsPath: "/channels/slack",
    docsLabel: "slack",
    blurb: "supported (Socket Mode).",
    systemImage: "number"
  },
  signal: {
    id: "signal",
    label: "Signal",
    selectionLabel: "Signal (signal-cli)",
    detailLabel: "Signal REST",
    docsPath: "/channels/signal",
    docsLabel: "signal",
    blurb: 'signal-cli linked device; more setup (David Reagans: "Hop on Discord.").',
    systemImage: "antenna.radiowaves.left.and.right"
  },
  imessage: {
    id: "imessage",
    label: "iMessage",
    selectionLabel: "iMessage (imsg)",
    detailLabel: "iMessage",
    docsPath: "/channels/imessage",
    docsLabel: "imessage",
    blurb: "this is still a work in progress.",
    systemImage: "message.fill"
  }
};
const CHAT_CHANNEL_ALIASES = exports.CHAT_CHANNEL_ALIASES = {
  imsg: "imessage",
  "google-chat": "googlechat",
  gchat: "googlechat"
};
const normalizeChannelKey = (raw) => {
  const normalized = raw?.trim().toLowerCase();
  return normalized || undefined;
};
function listChatChannels() {
  return CHAT_CHANNEL_ORDER.map((id) => CHAT_CHANNEL_META[id]);
}
function listChatChannelAliases() {
  return Object.keys(CHAT_CHANNEL_ALIASES);
}
function getChatChannelMeta(id) {
  return CHAT_CHANNEL_META[id];
}
function normalizeChatChannelId(raw) {
  const normalized = normalizeChannelKey(raw);
  if (!normalized) {
    return null;
  }
  const resolved = CHAT_CHANNEL_ALIASES[normalized] ?? normalized;
  return CHAT_CHANNEL_ORDER.includes(resolved) ? resolved : null;
}
// Channel docking: prefer this helper in shared code. Importing from
// `src/channels/plugins/*` can eagerly load channel implementations.
function normalizeChannelId(raw) {
  return normalizeChatChannelId(raw);
}
// Normalizes registered channel plugins (bundled or external).
//
// Keep this light: we do not import channel plugins here (those are "heavy" and can pull in
// monitors, web login, etc). The plugin registry must be initialized first.
function normalizeAnyChannelId(raw) {
  const key = normalizeChannelKey(raw);
  if (!key) {
    return null;
  }
  const registry = (0, _runtime.requireActivePluginRegistry)();
  const hit = registry.channels.find((entry) => {
    const id = String(entry.plugin.id ?? "").
    trim().
    toLowerCase();
    if (id && id === key) {
      return true;
    }
    return (entry.plugin.meta.aliases ?? []).some((alias) => alias.trim().toLowerCase() === key);
  });
  return hit?.plugin.id ?? null;
}
function formatChannelPrimerLine(meta) {
  return `${meta.label}: ${meta.blurb}`;
}
function formatChannelSelectionLine(meta, docsLink) {
  const docsPrefix = meta.selectionDocsPrefix ?? "Docs:";
  const docsLabel = meta.docsLabel ?? meta.id;
  const docs = meta.selectionDocsOmitLabel ?
  docsLink(meta.docsPath) :
  docsLink(meta.docsPath, docsLabel);
  const extras = (meta.selectionExtras ?? []).filter(Boolean).join(" ");
  return `${meta.label} — ${meta.blurb} ${docsPrefix ? `${docsPrefix} ` : ""}${docs}${extras ? ` ${extras}` : ""}`;
} /* v9-612c3be048267d4f */
