"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.getChannelDock = getChannelDock;exports.listChannelDocks = listChannelDocks;var _accounts = require("../discord/accounts.js");
var _accounts2 = require("../imessage/accounts.js");
var _runtime = require("../plugins/runtime.js");
var _sessionKey = require("../routing/session-key.js");
var _accounts3 = require("../signal/accounts.js");
var _accounts4 = require("../slack/accounts.js");
var _threadingToolContext = require("../slack/threading-tool-context.js");
var _accounts5 = require("../telegram/accounts.js");
var _utils = require("../utils.js");
var _accounts6 = require("../web/accounts.js");
var _normalize = require("../whatsapp/normalize.js");
var _groupMentions = require("./plugins/group-mentions.js");
var _registry = require("./registry.js");
const formatLower = (allowFrom) => allowFrom.
map((entry) => String(entry).trim()).
filter(Boolean).
map((entry) => entry.toLowerCase());
const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
// Channel docks: lightweight channel metadata/behavior for shared code paths.
//
// Rules:
// - keep this module *light* (no monitors, probes, puppeteer/web login, etc)
// - OK: config readers, allowFrom formatting, mention stripping patterns, threading defaults
// - shared code should import from here (and from `src/channels/registry.ts`), not from the plugins registry
//
// Adding a channel:
// - add a new entry to `DOCKS`
// - keep it cheap; push heavy logic into `src/channels/plugins/<id>.ts` or channel modules
const DOCKS = {
  telegram: {
    id: "telegram",
    capabilities: {
      chatTypes: ["direct", "group", "channel", "thread"],
      nativeCommands: true,
      blockStreaming: true
    },
    outbound: { textChunkLimit: 4000 },
    config: {
      resolveAllowFrom: ({ cfg, accountId }) => ((0, _accounts5.resolveTelegramAccount)({ cfg, accountId }).config.allowFrom ?? []).map((entry) => String(entry)),
      formatAllowFrom: ({ allowFrom }) => allowFrom.
      map((entry) => String(entry).trim()).
      filter(Boolean).
      map((entry) => entry.replace(/^(telegram|tg):/i, "")).
      map((entry) => entry.toLowerCase())
    },
    groups: {
      resolveRequireMention: _groupMentions.resolveTelegramGroupRequireMention,
      resolveToolPolicy: _groupMentions.resolveTelegramGroupToolPolicy
    },
    threading: {
      resolveReplyToMode: ({ cfg }) => cfg.channels?.telegram?.replyToMode ?? "first",
      buildToolContext: ({ context, hasRepliedRef }) => {
        const threadId = context.MessageThreadId ?? context.ReplyToId;
        return {
          currentChannelId: context.To?.trim() || undefined,
          currentThreadTs: threadId != null ? String(threadId) : undefined,
          hasRepliedRef
        };
      }
    }
  },
  whatsapp: {
    id: "whatsapp",
    capabilities: {
      chatTypes: ["direct", "group"],
      polls: true,
      reactions: true,
      media: true
    },
    commands: {
      enforceOwnerForCommands: true,
      skipWhenConfigEmpty: true
    },
    outbound: { textChunkLimit: 4000 },
    config: {
      resolveAllowFrom: ({ cfg, accountId }) => (0, _accounts6.resolveWhatsAppAccount)({ cfg, accountId }).allowFrom ?? [],
      formatAllowFrom: ({ allowFrom }) => allowFrom.
      map((entry) => String(entry).trim()).
      filter((entry) => Boolean(entry)).
      map((entry) => entry === "*" ? entry : (0, _normalize.normalizeWhatsAppTarget)(entry)).
      filter((entry) => Boolean(entry))
    },
    groups: {
      resolveRequireMention: _groupMentions.resolveWhatsAppGroupRequireMention,
      resolveToolPolicy: _groupMentions.resolveWhatsAppGroupToolPolicy,
      resolveGroupIntroHint: () => "WhatsApp IDs: SenderId is the participant JID; [message_id: ...] is the message id for reactions (use SenderId as participant)."
    },
    mentions: {
      stripPatterns: ({ ctx }) => {
        const selfE164 = (ctx.To ?? "").replace(/^whatsapp:/, "");
        if (!selfE164) {
          return [];
        }
        const escaped = escapeRegExp(selfE164);
        return [escaped, `@${escaped}`];
      }
    },
    threading: {
      buildToolContext: ({ context, hasRepliedRef }) => {
        const channelId = context.From?.trim() || context.To?.trim() || undefined;
        return {
          currentChannelId: channelId,
          currentThreadTs: context.ReplyToId,
          hasRepliedRef
        };
      }
    }
  },
  discord: {
    id: "discord",
    capabilities: {
      chatTypes: ["direct", "channel", "thread"],
      polls: true,
      reactions: true,
      media: true,
      nativeCommands: true,
      threads: true
    },
    outbound: { textChunkLimit: 2000 },
    streaming: {
      blockStreamingCoalesceDefaults: { minChars: 1500, idleMs: 1000 }
    },
    elevated: {
      allowFromFallback: ({ cfg }) => cfg.channels?.discord?.dm?.allowFrom
    },
    config: {
      resolveAllowFrom: ({ cfg, accountId }) => ((0, _accounts.resolveDiscordAccount)({ cfg, accountId }).config.dm?.allowFrom ?? []).map((entry) => String(entry)),
      formatAllowFrom: ({ allowFrom }) => formatLower(allowFrom)
    },
    groups: {
      resolveRequireMention: _groupMentions.resolveDiscordGroupRequireMention,
      resolveToolPolicy: _groupMentions.resolveDiscordGroupToolPolicy
    },
    mentions: {
      stripPatterns: () => ["<@!?\\d+>"]
    },
    threading: {
      resolveReplyToMode: ({ cfg }) => cfg.channels?.discord?.replyToMode ?? "off",
      buildToolContext: ({ context, hasRepliedRef }) => ({
        currentChannelId: context.To?.trim() || undefined,
        currentThreadTs: context.ReplyToId,
        hasRepliedRef
      })
    }
  },
  googlechat: {
    id: "googlechat",
    capabilities: {
      chatTypes: ["direct", "group", "thread"],
      reactions: true,
      media: true,
      threads: true,
      blockStreaming: true
    },
    outbound: { textChunkLimit: 4000 },
    config: {
      resolveAllowFrom: ({ cfg, accountId }) => {
        const channel = cfg.channels?.googlechat;
        const normalized = (0, _sessionKey.normalizeAccountId)(accountId);
        const account = channel?.accounts?.[normalized] ??
        channel?.accounts?.[Object.keys(channel?.accounts ?? {}).find((key) => key.toLowerCase() === normalized.toLowerCase()) ?? ""];
        return (account?.dm?.allowFrom ?? channel?.dm?.allowFrom ?? []).map((entry) => String(entry));
      },
      formatAllowFrom: ({ allowFrom }) => allowFrom.
      map((entry) => String(entry).trim()).
      filter(Boolean).
      map((entry) => entry.
      replace(/^(googlechat|google-chat|gchat):/i, "").
      replace(/^user:/i, "").
      replace(/^users\//i, "").
      toLowerCase())
    },
    groups: {
      resolveRequireMention: _groupMentions.resolveGoogleChatGroupRequireMention,
      resolveToolPolicy: _groupMentions.resolveGoogleChatGroupToolPolicy
    },
    threading: {
      resolveReplyToMode: ({ cfg }) => cfg.channels?.googlechat?.replyToMode ?? "off",
      buildToolContext: ({ context, hasRepliedRef }) => {
        const threadId = context.MessageThreadId ?? context.ReplyToId;
        return {
          currentChannelId: context.To?.trim() || undefined,
          currentThreadTs: threadId != null ? String(threadId) : undefined,
          hasRepliedRef
        };
      }
    }
  },
  slack: {
    id: "slack",
    capabilities: {
      chatTypes: ["direct", "channel", "thread"],
      reactions: true,
      media: true,
      nativeCommands: true,
      threads: true
    },
    outbound: { textChunkLimit: 4000 },
    streaming: {
      blockStreamingCoalesceDefaults: { minChars: 1500, idleMs: 1000 }
    },
    config: {
      resolveAllowFrom: ({ cfg, accountId }) => ((0, _accounts4.resolveSlackAccount)({ cfg, accountId }).dm?.allowFrom ?? []).map((entry) => String(entry)),
      formatAllowFrom: ({ allowFrom }) => formatLower(allowFrom)
    },
    groups: {
      resolveRequireMention: _groupMentions.resolveSlackGroupRequireMention,
      resolveToolPolicy: _groupMentions.resolveSlackGroupToolPolicy
    },
    threading: {
      resolveReplyToMode: ({ cfg, accountId, chatType }) => (0, _accounts4.resolveSlackReplyToMode)((0, _accounts4.resolveSlackAccount)({ cfg, accountId }), chatType),
      allowTagsWhenOff: true,
      buildToolContext: (params) => (0, _threadingToolContext.buildSlackThreadingToolContext)(params)
    }
  },
  signal: {
    id: "signal",
    capabilities: {
      chatTypes: ["direct", "group"],
      reactions: true,
      media: true
    },
    outbound: { textChunkLimit: 4000 },
    streaming: {
      blockStreamingCoalesceDefaults: { minChars: 1500, idleMs: 1000 }
    },
    config: {
      resolveAllowFrom: ({ cfg, accountId }) => ((0, _accounts3.resolveSignalAccount)({ cfg, accountId }).config.allowFrom ?? []).map((entry) => String(entry)),
      formatAllowFrom: ({ allowFrom }) => allowFrom.
      map((entry) => String(entry).trim()).
      filter(Boolean).
      map((entry) => entry === "*" ? "*" : (0, _utils.normalizeE164)(entry.replace(/^signal:/i, ""))).
      filter(Boolean)
    },
    threading: {
      buildToolContext: ({ context, hasRepliedRef }) => {
        const isDirect = context.ChatType?.toLowerCase() === "direct";
        const channelId = (isDirect ? context.From ?? context.To : context.To)?.trim() || undefined;
        return {
          currentChannelId: channelId,
          currentThreadTs: context.ReplyToId,
          hasRepliedRef
        };
      }
    }
  },
  imessage: {
    id: "imessage",
    capabilities: {
      chatTypes: ["direct", "group"],
      reactions: true,
      media: true
    },
    outbound: { textChunkLimit: 4000 },
    config: {
      resolveAllowFrom: ({ cfg, accountId }) => ((0, _accounts2.resolveIMessageAccount)({ cfg, accountId }).config.allowFrom ?? []).map((entry) => String(entry)),
      formatAllowFrom: ({ allowFrom }) => allowFrom.map((entry) => String(entry).trim()).filter(Boolean)
    },
    groups: {
      resolveRequireMention: _groupMentions.resolveIMessageGroupRequireMention,
      resolveToolPolicy: _groupMentions.resolveIMessageGroupToolPolicy
    },
    threading: {
      buildToolContext: ({ context, hasRepliedRef }) => {
        const isDirect = context.ChatType?.toLowerCase() === "direct";
        const channelId = (isDirect ? context.From ?? context.To : context.To)?.trim() || undefined;
        return {
          currentChannelId: channelId,
          currentThreadTs: context.ReplyToId,
          hasRepliedRef
        };
      }
    }
  }
};
function buildDockFromPlugin(plugin) {
  return {
    id: plugin.id,
    capabilities: plugin.capabilities,
    commands: plugin.commands,
    outbound: plugin.outbound?.textChunkLimit ?
    { textChunkLimit: plugin.outbound.textChunkLimit } :
    undefined,
    streaming: plugin.streaming ?
    { blockStreamingCoalesceDefaults: plugin.streaming.blockStreamingCoalesceDefaults } :
    undefined,
    elevated: plugin.elevated,
    config: plugin.config ?
    {
      resolveAllowFrom: plugin.config.resolveAllowFrom,
      formatAllowFrom: plugin.config.formatAllowFrom
    } :
    undefined,
    groups: plugin.groups,
    mentions: plugin.mentions,
    threading: plugin.threading,
    agentPrompt: plugin.agentPrompt
  };
}
function listPluginDockEntries() {
  const registry = (0, _runtime.requireActivePluginRegistry)();
  const entries = [];
  const seen = new Set();
  for (const entry of registry.channels) {
    const plugin = entry.plugin;
    const id = String(plugin.id).trim();
    if (!id || seen.has(id)) {
      continue;
    }
    seen.add(id);
    if (_registry.CHAT_CHANNEL_ORDER.includes(plugin.id)) {
      continue;
    }
    const dock = entry.dock ?? buildDockFromPlugin(plugin);
    entries.push({ id: plugin.id, dock, order: plugin.meta.order });
  }
  return entries;
}
function listChannelDocks() {
  const baseEntries = _registry.CHAT_CHANNEL_ORDER.map((id) => ({
    id,
    dock: DOCKS[id],
    order: (0, _registry.getChatChannelMeta)(id).order
  }));
  const pluginEntries = listPluginDockEntries();
  const combined = [...baseEntries, ...pluginEntries];
  combined.sort((a, b) => {
    const indexA = _registry.CHAT_CHANNEL_ORDER.indexOf(a.id);
    const indexB = _registry.CHAT_CHANNEL_ORDER.indexOf(b.id);
    const orderA = a.order ?? (indexA === -1 ? 999 : indexA);
    const orderB = b.order ?? (indexB === -1 ? 999 : indexB);
    if (orderA !== orderB) {
      return orderA - orderB;
    }
    return String(a.id).localeCompare(String(b.id));
  });
  return combined.map((entry) => entry.dock);
}
function getChannelDock(id) {
  const core = DOCKS[id];
  if (core) {
    return core;
  }
  const registry = (0, _runtime.requireActivePluginRegistry)();
  const pluginEntry = registry.channels.find((entry) => entry.plugin.id === id);
  if (!pluginEntry) {
    return undefined;
  }
  return pluginEntry.dock ?? buildDockFromPlugin(pluginEntry.plugin);
} /* v9-9c1820e6d42e5f5c */
