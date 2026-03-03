"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.TelegramTopicSchema = exports.TelegramGroupSchema = exports.TelegramConfigSchema = exports.TelegramAccountSchemaBase = exports.TelegramAccountSchema = exports.SlackThreadSchema = exports.SlackDmSchema = exports.SlackConfigSchema = exports.SlackChannelSchema = exports.SlackAccountSchema = exports.SignalConfigSchema = exports.SignalAccountSchemaBase = exports.SignalAccountSchema = exports.MSTeamsTeamSchema = exports.MSTeamsConfigSchema = exports.MSTeamsChannelSchema = exports.IMessageConfigSchema = exports.IMessageAccountSchemaBase = exports.IMessageAccountSchema = exports.GoogleChatGroupSchema = exports.GoogleChatDmSchema = exports.GoogleChatConfigSchema = exports.GoogleChatAccountSchema = exports.DiscordGuildSchema = exports.DiscordGuildChannelSchema = exports.DiscordDmSchema = exports.DiscordConfigSchema = exports.DiscordAccountSchema = exports.BlueBubblesConfigSchema = exports.BlueBubblesAccountSchemaBase = exports.BlueBubblesAccountSchema = void 0;var _zod = require("zod");
var _telegramCustomCommands = require("./telegram-custom-commands.js");
var _zodSchemaAgentRuntime = require("./zod-schema.agent-runtime.js");
var _zodSchemaChannels = require("./zod-schema.channels.js");
var _zodSchemaCore = require("./zod-schema.core.js");
const ToolPolicyBySenderSchema = _zod.z.record(_zod.z.string(), _zodSchemaAgentRuntime.ToolPolicySchema).optional();
const TelegramInlineButtonsScopeSchema = _zod.z.enum(["off", "dm", "group", "all", "allowlist"]);
const TelegramCapabilitiesSchema = _zod.z.union([
_zod.z.array(_zod.z.string()),
_zod.z.
object({
  inlineButtons: TelegramInlineButtonsScopeSchema.optional()
}).
strict()]
);
const TelegramTopicSchema = exports.TelegramTopicSchema = _zod.z.
object({
  requireMention: _zod.z.boolean().optional(),
  skills: _zod.z.array(_zod.z.string()).optional(),
  enabled: _zod.z.boolean().optional(),
  allowFrom: _zod.z.array(_zod.z.union([_zod.z.string(), _zod.z.number()])).optional(),
  systemPrompt: _zod.z.string().optional()
}).
strict();
const TelegramGroupSchema = exports.TelegramGroupSchema = _zod.z.
object({
  requireMention: _zod.z.boolean().optional(),
  tools: _zodSchemaAgentRuntime.ToolPolicySchema,
  toolsBySender: ToolPolicyBySenderSchema,
  skills: _zod.z.array(_zod.z.string()).optional(),
  enabled: _zod.z.boolean().optional(),
  allowFrom: _zod.z.array(_zod.z.union([_zod.z.string(), _zod.z.number()])).optional(),
  systemPrompt: _zod.z.string().optional(),
  topics: _zod.z.record(_zod.z.string(), TelegramTopicSchema.optional()).optional()
}).
strict();
const TelegramCustomCommandSchema = _zod.z.
object({
  command: _zod.z.string().transform(_telegramCustomCommands.normalizeTelegramCommandName),
  description: _zod.z.string().transform(_telegramCustomCommands.normalizeTelegramCommandDescription)
}).
strict();
const validateTelegramCustomCommands = (value, ctx) => {
  if (!value.customCommands || value.customCommands.length === 0) {
    return;
  }
  const { issues } = (0, _telegramCustomCommands.resolveTelegramCustomCommands)({
    commands: value.customCommands,
    checkReserved: false,
    checkDuplicates: false
  });
  for (const issue of issues) {
    ctx.addIssue({
      code: _zod.z.ZodIssueCode.custom,
      path: ["customCommands", issue.index, issue.field],
      message: issue.message
    });
  }
};
const TelegramAccountSchemaBase = exports.TelegramAccountSchemaBase = _zod.z.
object({
  name: _zod.z.string().optional(),
  capabilities: TelegramCapabilitiesSchema.optional(),
  markdown: _zodSchemaCore.MarkdownConfigSchema,
  enabled: _zod.z.boolean().optional(),
  commands: _zodSchemaCore.ProviderCommandsSchema,
  customCommands: _zod.z.array(TelegramCustomCommandSchema).optional(),
  configWrites: _zod.z.boolean().optional(),
  dmPolicy: _zodSchemaCore.DmPolicySchema.optional().default("pairing"),
  botToken: _zod.z.string().optional(),
  tokenFile: _zod.z.string().optional(),
  replyToMode: _zodSchemaCore.ReplyToModeSchema.optional(),
  groups: _zod.z.record(_zod.z.string(), TelegramGroupSchema.optional()).optional(),
  allowFrom: _zod.z.array(_zod.z.union([_zod.z.string(), _zod.z.number()])).optional(),
  groupAllowFrom: _zod.z.array(_zod.z.union([_zod.z.string(), _zod.z.number()])).optional(),
  groupPolicy: _zodSchemaCore.GroupPolicySchema.optional().default("allowlist"),
  historyLimit: _zod.z.number().int().min(0).optional(),
  dmHistoryLimit: _zod.z.number().int().min(0).optional(),
  dms: _zod.z.record(_zod.z.string(), _zodSchemaCore.DmConfigSchema.optional()).optional(),
  textChunkLimit: _zod.z.number().int().positive().optional(),
  chunkMode: _zod.z.enum(["length", "newline"]).optional(),
  blockStreaming: _zod.z.boolean().optional(),
  draftChunk: _zodSchemaCore.BlockStreamingChunkSchema.optional(),
  blockStreamingCoalesce: _zodSchemaCore.BlockStreamingCoalesceSchema.optional(),
  streamMode: _zod.z.enum(["off", "partial", "block"]).optional().default("partial"),
  mediaMaxMb: _zod.z.number().positive().optional(),
  timeoutSeconds: _zod.z.number().int().positive().optional(),
  retry: _zodSchemaCore.RetryConfigSchema,
  network: _zod.z.
  object({
    autoSelectFamily: _zod.z.boolean().optional()
  }).
  strict().
  optional(),
  proxy: _zod.z.string().optional(),
  webhookUrl: _zod.z.string().optional(),
  webhookSecret: _zod.z.string().optional(),
  webhookPath: _zod.z.string().optional(),
  actions: _zod.z.
  object({
    reactions: _zod.z.boolean().optional(),
    sendMessage: _zod.z.boolean().optional(),
    deleteMessage: _zod.z.boolean().optional(),
    sticker: _zod.z.boolean().optional()
  }).
  strict().
  optional(),
  reactionNotifications: _zod.z.enum(["off", "own", "all"]).optional(),
  reactionLevel: _zod.z.enum(["off", "ack", "minimal", "extensive"]).optional(),
  heartbeat: _zodSchemaChannels.ChannelHeartbeatVisibilitySchema,
  linkPreview: _zod.z.boolean().optional()
}).
strict();
const TelegramAccountSchema = exports.TelegramAccountSchema = TelegramAccountSchemaBase.superRefine((value, ctx) => {
  (0, _zodSchemaCore.requireOpenAllowFrom)({
    policy: value.dmPolicy,
    allowFrom: value.allowFrom,
    ctx,
    path: ["allowFrom"],
    message: 'channels.telegram.dmPolicy="open" requires channels.telegram.allowFrom to include "*"'
  });
  validateTelegramCustomCommands(value, ctx);
});
const TelegramConfigSchema = exports.TelegramConfigSchema = TelegramAccountSchemaBase.extend({
  accounts: _zod.z.record(_zod.z.string(), TelegramAccountSchema.optional()).optional()
}).superRefine((value, ctx) => {
  (0, _zodSchemaCore.requireOpenAllowFrom)({
    policy: value.dmPolicy,
    allowFrom: value.allowFrom,
    ctx,
    path: ["allowFrom"],
    message: 'channels.telegram.dmPolicy="open" requires channels.telegram.allowFrom to include "*"'
  });
  validateTelegramCustomCommands(value, ctx);
  const baseWebhookUrl = typeof value.webhookUrl === "string" ? value.webhookUrl.trim() : "";
  const baseWebhookSecret = typeof value.webhookSecret === "string" ? value.webhookSecret.trim() : "";
  if (baseWebhookUrl && !baseWebhookSecret) {
    ctx.addIssue({
      code: _zod.z.ZodIssueCode.custom,
      message: "channels.telegram.webhookUrl requires channels.telegram.webhookSecret",
      path: ["webhookSecret"]
    });
  }
  if (!value.accounts) {
    return;
  }
  for (const [accountId, account] of Object.entries(value.accounts)) {
    if (!account) {
      continue;
    }
    if (account.enabled === false) {
      continue;
    }
    const accountWebhookUrl = typeof account.webhookUrl === "string" ? account.webhookUrl.trim() : "";
    if (!accountWebhookUrl) {
      continue;
    }
    const accountSecret = typeof account.webhookSecret === "string" ? account.webhookSecret.trim() : "";
    if (!accountSecret && !baseWebhookSecret) {
      ctx.addIssue({
        code: _zod.z.ZodIssueCode.custom,
        message: "channels.telegram.accounts.*.webhookUrl requires channels.telegram.webhookSecret or channels.telegram.accounts.*.webhookSecret",
        path: ["accounts", accountId, "webhookSecret"]
      });
    }
  }
});
const DiscordDmSchema = exports.DiscordDmSchema = _zod.z.
object({
  enabled: _zod.z.boolean().optional(),
  policy: _zodSchemaCore.DmPolicySchema.optional().default("pairing"),
  allowFrom: _zod.z.array(_zod.z.union([_zod.z.string(), _zod.z.number()])).optional(),
  groupEnabled: _zod.z.boolean().optional(),
  groupChannels: _zod.z.array(_zod.z.union([_zod.z.string(), _zod.z.number()])).optional()
}).
strict().
superRefine((value, ctx) => {
  (0, _zodSchemaCore.requireOpenAllowFrom)({
    policy: value.policy,
    allowFrom: value.allowFrom,
    ctx,
    path: ["allowFrom"],
    message: 'channels.discord.dm.policy="open" requires channels.discord.dm.allowFrom to include "*"'
  });
});
const DiscordGuildChannelSchema = exports.DiscordGuildChannelSchema = _zod.z.
object({
  allow: _zod.z.boolean().optional(),
  requireMention: _zod.z.boolean().optional(),
  tools: _zodSchemaAgentRuntime.ToolPolicySchema,
  toolsBySender: ToolPolicyBySenderSchema,
  skills: _zod.z.array(_zod.z.string()).optional(),
  enabled: _zod.z.boolean().optional(),
  users: _zod.z.array(_zod.z.union([_zod.z.string(), _zod.z.number()])).optional(),
  systemPrompt: _zod.z.string().optional(),
  autoThread: _zod.z.boolean().optional()
}).
strict();
const DiscordGuildSchema = exports.DiscordGuildSchema = _zod.z.
object({
  slug: _zod.z.string().optional(),
  requireMention: _zod.z.boolean().optional(),
  tools: _zodSchemaAgentRuntime.ToolPolicySchema,
  toolsBySender: ToolPolicyBySenderSchema,
  reactionNotifications: _zod.z.enum(["off", "own", "all", "allowlist"]).optional(),
  users: _zod.z.array(_zod.z.union([_zod.z.string(), _zod.z.number()])).optional(),
  channels: _zod.z.record(_zod.z.string(), DiscordGuildChannelSchema.optional()).optional()
}).
strict();
const DiscordAccountSchema = exports.DiscordAccountSchema = _zod.z.
object({
  name: _zod.z.string().optional(),
  capabilities: _zod.z.array(_zod.z.string()).optional(),
  markdown: _zodSchemaCore.MarkdownConfigSchema,
  enabled: _zod.z.boolean().optional(),
  commands: _zodSchemaCore.ProviderCommandsSchema,
  configWrites: _zod.z.boolean().optional(),
  token: _zod.z.string().optional(),
  allowBots: _zod.z.boolean().optional(),
  groupPolicy: _zodSchemaCore.GroupPolicySchema.optional().default("allowlist"),
  historyLimit: _zod.z.number().int().min(0).optional(),
  dmHistoryLimit: _zod.z.number().int().min(0).optional(),
  dms: _zod.z.record(_zod.z.string(), _zodSchemaCore.DmConfigSchema.optional()).optional(),
  textChunkLimit: _zod.z.number().int().positive().optional(),
  chunkMode: _zod.z.enum(["length", "newline"]).optional(),
  blockStreaming: _zod.z.boolean().optional(),
  blockStreamingCoalesce: _zodSchemaCore.BlockStreamingCoalesceSchema.optional(),
  maxLinesPerMessage: _zod.z.number().int().positive().optional(),
  mediaMaxMb: _zod.z.number().positive().optional(),
  retry: _zodSchemaCore.RetryConfigSchema,
  actions: _zod.z.
  object({
    reactions: _zod.z.boolean().optional(),
    stickers: _zod.z.boolean().optional(),
    emojiUploads: _zod.z.boolean().optional(),
    stickerUploads: _zod.z.boolean().optional(),
    polls: _zod.z.boolean().optional(),
    permissions: _zod.z.boolean().optional(),
    messages: _zod.z.boolean().optional(),
    threads: _zod.z.boolean().optional(),
    pins: _zod.z.boolean().optional(),
    search: _zod.z.boolean().optional(),
    memberInfo: _zod.z.boolean().optional(),
    roleInfo: _zod.z.boolean().optional(),
    roles: _zod.z.boolean().optional(),
    channelInfo: _zod.z.boolean().optional(),
    voiceStatus: _zod.z.boolean().optional(),
    events: _zod.z.boolean().optional(),
    moderation: _zod.z.boolean().optional(),
    channels: _zod.z.boolean().optional()
  }).
  strict().
  optional(),
  replyToMode: _zodSchemaCore.ReplyToModeSchema.optional(),
  dm: DiscordDmSchema.optional(),
  guilds: _zod.z.record(_zod.z.string(), DiscordGuildSchema.optional()).optional(),
  heartbeat: _zodSchemaChannels.ChannelHeartbeatVisibilitySchema,
  execApprovals: _zod.z.
  object({
    enabled: _zod.z.boolean().optional(),
    approvers: _zod.z.array(_zod.z.union([_zod.z.string(), _zod.z.number()])).optional(),
    agentFilter: _zod.z.array(_zod.z.string()).optional(),
    sessionFilter: _zod.z.array(_zod.z.string()).optional()
  }).
  strict().
  optional(),
  intents: _zod.z.
  object({
    presence: _zod.z.boolean().optional(),
    guildMembers: _zod.z.boolean().optional()
  }).
  strict().
  optional(),
  pluralkit: _zod.z.
  object({
    enabled: _zod.z.boolean().optional(),
    token: _zod.z.string().optional()
  }).
  strict().
  optional()
}).
strict();
const DiscordConfigSchema = exports.DiscordConfigSchema = DiscordAccountSchema.extend({
  accounts: _zod.z.record(_zod.z.string(), DiscordAccountSchema.optional()).optional()
});
const GoogleChatDmSchema = exports.GoogleChatDmSchema = _zod.z.
object({
  enabled: _zod.z.boolean().optional(),
  policy: _zodSchemaCore.DmPolicySchema.optional().default("pairing"),
  allowFrom: _zod.z.array(_zod.z.union([_zod.z.string(), _zod.z.number()])).optional()
}).
strict().
superRefine((value, ctx) => {
  (0, _zodSchemaCore.requireOpenAllowFrom)({
    policy: value.policy,
    allowFrom: value.allowFrom,
    ctx,
    path: ["allowFrom"],
    message: 'channels.googlechat.dm.policy="open" requires channels.googlechat.dm.allowFrom to include "*"'
  });
});
const GoogleChatGroupSchema = exports.GoogleChatGroupSchema = _zod.z.
object({
  enabled: _zod.z.boolean().optional(),
  allow: _zod.z.boolean().optional(),
  requireMention: _zod.z.boolean().optional(),
  users: _zod.z.array(_zod.z.union([_zod.z.string(), _zod.z.number()])).optional(),
  systemPrompt: _zod.z.string().optional()
}).
strict();
const GoogleChatAccountSchema = exports.GoogleChatAccountSchema = _zod.z.
object({
  name: _zod.z.string().optional(),
  capabilities: _zod.z.array(_zod.z.string()).optional(),
  enabled: _zod.z.boolean().optional(),
  configWrites: _zod.z.boolean().optional(),
  allowBots: _zod.z.boolean().optional(),
  requireMention: _zod.z.boolean().optional(),
  groupPolicy: _zodSchemaCore.GroupPolicySchema.optional().default("allowlist"),
  groupAllowFrom: _zod.z.array(_zod.z.union([_zod.z.string(), _zod.z.number()])).optional(),
  groups: _zod.z.record(_zod.z.string(), GoogleChatGroupSchema.optional()).optional(),
  serviceAccount: _zod.z.union([_zod.z.string(), _zod.z.record(_zod.z.string(), _zod.z.unknown())]).optional(),
  serviceAccountFile: _zod.z.string().optional(),
  audienceType: _zod.z.enum(["app-url", "project-number"]).optional(),
  audience: _zod.z.string().optional(),
  webhookPath: _zod.z.string().optional(),
  webhookUrl: _zod.z.string().optional(),
  botUser: _zod.z.string().optional(),
  historyLimit: _zod.z.number().int().min(0).optional(),
  dmHistoryLimit: _zod.z.number().int().min(0).optional(),
  dms: _zod.z.record(_zod.z.string(), _zodSchemaCore.DmConfigSchema.optional()).optional(),
  textChunkLimit: _zod.z.number().int().positive().optional(),
  chunkMode: _zod.z.enum(["length", "newline"]).optional(),
  blockStreaming: _zod.z.boolean().optional(),
  blockStreamingCoalesce: _zodSchemaCore.BlockStreamingCoalesceSchema.optional(),
  mediaMaxMb: _zod.z.number().positive().optional(),
  replyToMode: _zodSchemaCore.ReplyToModeSchema.optional(),
  actions: _zod.z.
  object({
    reactions: _zod.z.boolean().optional()
  }).
  strict().
  optional(),
  dm: GoogleChatDmSchema.optional(),
  typingIndicator: _zod.z.enum(["none", "message", "reaction"]).optional()
}).
strict();
const GoogleChatConfigSchema = exports.GoogleChatConfigSchema = GoogleChatAccountSchema.extend({
  accounts: _zod.z.record(_zod.z.string(), GoogleChatAccountSchema.optional()).optional(),
  defaultAccount: _zod.z.string().optional()
});
const SlackDmSchema = exports.SlackDmSchema = _zod.z.
object({
  enabled: _zod.z.boolean().optional(),
  policy: _zodSchemaCore.DmPolicySchema.optional().default("pairing"),
  allowFrom: _zod.z.array(_zod.z.union([_zod.z.string(), _zod.z.number()])).optional(),
  groupEnabled: _zod.z.boolean().optional(),
  groupChannels: _zod.z.array(_zod.z.union([_zod.z.string(), _zod.z.number()])).optional(),
  replyToMode: _zodSchemaCore.ReplyToModeSchema.optional()
}).
strict().
superRefine((value, ctx) => {
  (0, _zodSchemaCore.requireOpenAllowFrom)({
    policy: value.policy,
    allowFrom: value.allowFrom,
    ctx,
    path: ["allowFrom"],
    message: 'channels.slack.dm.policy="open" requires channels.slack.dm.allowFrom to include "*"'
  });
});
const SlackChannelSchema = exports.SlackChannelSchema = _zod.z.
object({
  enabled: _zod.z.boolean().optional(),
  allow: _zod.z.boolean().optional(),
  requireMention: _zod.z.boolean().optional(),
  tools: _zodSchemaAgentRuntime.ToolPolicySchema,
  toolsBySender: ToolPolicyBySenderSchema,
  allowBots: _zod.z.boolean().optional(),
  users: _zod.z.array(_zod.z.union([_zod.z.string(), _zod.z.number()])).optional(),
  skills: _zod.z.array(_zod.z.string()).optional(),
  systemPrompt: _zod.z.string().optional()
}).
strict();
const SlackThreadSchema = exports.SlackThreadSchema = _zod.z.
object({
  historyScope: _zod.z.enum(["thread", "channel"]).optional(),
  inheritParent: _zod.z.boolean().optional()
}).
strict();
const SlackReplyToModeByChatTypeSchema = _zod.z.
object({
  direct: _zodSchemaCore.ReplyToModeSchema.optional(),
  group: _zodSchemaCore.ReplyToModeSchema.optional(),
  channel: _zodSchemaCore.ReplyToModeSchema.optional()
}).
strict();
const SlackAccountSchema = exports.SlackAccountSchema = _zod.z.
object({
  name: _zod.z.string().optional(),
  mode: _zod.z.enum(["socket", "http"]).optional(),
  signingSecret: _zod.z.string().optional(),
  webhookPath: _zod.z.string().optional(),
  capabilities: _zod.z.array(_zod.z.string()).optional(),
  markdown: _zodSchemaCore.MarkdownConfigSchema,
  enabled: _zod.z.boolean().optional(),
  commands: _zodSchemaCore.ProviderCommandsSchema,
  configWrites: _zod.z.boolean().optional(),
  botToken: _zod.z.string().optional(),
  appToken: _zod.z.string().optional(),
  userToken: _zod.z.string().optional(),
  userTokenReadOnly: _zod.z.boolean().optional().default(true),
  allowBots: _zod.z.boolean().optional(),
  requireMention: _zod.z.boolean().optional(),
  groupPolicy: _zodSchemaCore.GroupPolicySchema.optional().default("allowlist"),
  historyLimit: _zod.z.number().int().min(0).optional(),
  dmHistoryLimit: _zod.z.number().int().min(0).optional(),
  dms: _zod.z.record(_zod.z.string(), _zodSchemaCore.DmConfigSchema.optional()).optional(),
  textChunkLimit: _zod.z.number().int().positive().optional(),
  chunkMode: _zod.z.enum(["length", "newline"]).optional(),
  blockStreaming: _zod.z.boolean().optional(),
  blockStreamingCoalesce: _zodSchemaCore.BlockStreamingCoalesceSchema.optional(),
  mediaMaxMb: _zod.z.number().positive().optional(),
  reactionNotifications: _zod.z.enum(["off", "own", "all", "allowlist"]).optional(),
  reactionAllowlist: _zod.z.array(_zod.z.union([_zod.z.string(), _zod.z.number()])).optional(),
  replyToMode: _zodSchemaCore.ReplyToModeSchema.optional(),
  replyToModeByChatType: SlackReplyToModeByChatTypeSchema.optional(),
  thread: SlackThreadSchema.optional(),
  actions: _zod.z.
  object({
    reactions: _zod.z.boolean().optional(),
    messages: _zod.z.boolean().optional(),
    pins: _zod.z.boolean().optional(),
    search: _zod.z.boolean().optional(),
    permissions: _zod.z.boolean().optional(),
    memberInfo: _zod.z.boolean().optional(),
    channelInfo: _zod.z.boolean().optional(),
    emojiList: _zod.z.boolean().optional()
  }).
  strict().
  optional(),
  slashCommand: _zod.z.
  object({
    enabled: _zod.z.boolean().optional(),
    name: _zod.z.string().optional(),
    sessionPrefix: _zod.z.string().optional(),
    ephemeral: _zod.z.boolean().optional()
  }).
  strict().
  optional(),
  dm: SlackDmSchema.optional(),
  channels: _zod.z.record(_zod.z.string(), SlackChannelSchema.optional()).optional(),
  heartbeat: _zodSchemaChannels.ChannelHeartbeatVisibilitySchema
}).
strict();
const SlackConfigSchema = exports.SlackConfigSchema = SlackAccountSchema.extend({
  mode: _zod.z.enum(["socket", "http"]).optional().default("socket"),
  signingSecret: _zod.z.string().optional(),
  webhookPath: _zod.z.string().optional().default("/slack/events"),
  accounts: _zod.z.record(_zod.z.string(), SlackAccountSchema.optional()).optional()
}).superRefine((value, ctx) => {
  const baseMode = value.mode ?? "socket";
  if (baseMode === "http" && !value.signingSecret) {
    ctx.addIssue({
      code: _zod.z.ZodIssueCode.custom,
      message: 'channels.slack.mode="http" requires channels.slack.signingSecret',
      path: ["signingSecret"]
    });
  }
  if (!value.accounts) {
    return;
  }
  for (const [accountId, account] of Object.entries(value.accounts)) {
    if (!account) {
      continue;
    }
    if (account.enabled === false) {
      continue;
    }
    const accountMode = account.mode ?? baseMode;
    if (accountMode !== "http") {
      continue;
    }
    const accountSecret = account.signingSecret ?? value.signingSecret;
    if (!accountSecret) {
      ctx.addIssue({
        code: _zod.z.ZodIssueCode.custom,
        message: 'channels.slack.accounts.*.mode="http" requires channels.slack.signingSecret or channels.slack.accounts.*.signingSecret',
        path: ["accounts", accountId, "signingSecret"]
      });
    }
  }
});
const SignalAccountSchemaBase = exports.SignalAccountSchemaBase = _zod.z.
object({
  name: _zod.z.string().optional(),
  capabilities: _zod.z.array(_zod.z.string()).optional(),
  markdown: _zodSchemaCore.MarkdownConfigSchema,
  enabled: _zod.z.boolean().optional(),
  configWrites: _zod.z.boolean().optional(),
  account: _zod.z.string().optional(),
  httpUrl: _zod.z.string().optional(),
  httpHost: _zod.z.string().optional(),
  httpPort: _zod.z.number().int().positive().optional(),
  cliPath: _zodSchemaCore.ExecutableTokenSchema.optional(),
  autoStart: _zod.z.boolean().optional(),
  startupTimeoutMs: _zod.z.number().int().min(1000).max(120000).optional(),
  receiveMode: _zod.z.union([_zod.z.literal("on-start"), _zod.z.literal("manual")]).optional(),
  ignoreAttachments: _zod.z.boolean().optional(),
  ignoreStories: _zod.z.boolean().optional(),
  sendReadReceipts: _zod.z.boolean().optional(),
  dmPolicy: _zodSchemaCore.DmPolicySchema.optional().default("pairing"),
  allowFrom: _zod.z.array(_zod.z.union([_zod.z.string(), _zod.z.number()])).optional(),
  groupAllowFrom: _zod.z.array(_zod.z.union([_zod.z.string(), _zod.z.number()])).optional(),
  groupPolicy: _zodSchemaCore.GroupPolicySchema.optional().default("allowlist"),
  historyLimit: _zod.z.number().int().min(0).optional(),
  dmHistoryLimit: _zod.z.number().int().min(0).optional(),
  dms: _zod.z.record(_zod.z.string(), _zodSchemaCore.DmConfigSchema.optional()).optional(),
  textChunkLimit: _zod.z.number().int().positive().optional(),
  chunkMode: _zod.z.enum(["length", "newline"]).optional(),
  blockStreaming: _zod.z.boolean().optional(),
  blockStreamingCoalesce: _zodSchemaCore.BlockStreamingCoalesceSchema.optional(),
  mediaMaxMb: _zod.z.number().int().positive().optional(),
  reactionNotifications: _zod.z.enum(["off", "own", "all", "allowlist"]).optional(),
  reactionAllowlist: _zod.z.array(_zod.z.union([_zod.z.string(), _zod.z.number()])).optional(),
  actions: _zod.z.
  object({
    reactions: _zod.z.boolean().optional()
  }).
  strict().
  optional(),
  reactionLevel: _zod.z.enum(["off", "ack", "minimal", "extensive"]).optional(),
  heartbeat: _zodSchemaChannels.ChannelHeartbeatVisibilitySchema
}).
strict();
const SignalAccountSchema = exports.SignalAccountSchema = SignalAccountSchemaBase.superRefine((value, ctx) => {
  (0, _zodSchemaCore.requireOpenAllowFrom)({
    policy: value.dmPolicy,
    allowFrom: value.allowFrom,
    ctx,
    path: ["allowFrom"],
    message: 'channels.signal.dmPolicy="open" requires channels.signal.allowFrom to include "*"'
  });
});
const SignalConfigSchema = exports.SignalConfigSchema = SignalAccountSchemaBase.extend({
  accounts: _zod.z.record(_zod.z.string(), SignalAccountSchema.optional()).optional()
}).superRefine((value, ctx) => {
  (0, _zodSchemaCore.requireOpenAllowFrom)({
    policy: value.dmPolicy,
    allowFrom: value.allowFrom,
    ctx,
    path: ["allowFrom"],
    message: 'channels.signal.dmPolicy="open" requires channels.signal.allowFrom to include "*"'
  });
});
const IMessageAccountSchemaBase = exports.IMessageAccountSchemaBase = _zod.z.
object({
  name: _zod.z.string().optional(),
  capabilities: _zod.z.array(_zod.z.string()).optional(),
  markdown: _zodSchemaCore.MarkdownConfigSchema,
  enabled: _zod.z.boolean().optional(),
  configWrites: _zod.z.boolean().optional(),
  cliPath: _zodSchemaCore.ExecutableTokenSchema.optional(),
  dbPath: _zod.z.string().optional(),
  remoteHost: _zod.z.string().optional(),
  service: _zod.z.union([_zod.z.literal("imessage"), _zod.z.literal("sms"), _zod.z.literal("auto")]).optional(),
  region: _zod.z.string().optional(),
  dmPolicy: _zodSchemaCore.DmPolicySchema.optional().default("pairing"),
  allowFrom: _zod.z.array(_zod.z.union([_zod.z.string(), _zod.z.number()])).optional(),
  groupAllowFrom: _zod.z.array(_zod.z.union([_zod.z.string(), _zod.z.number()])).optional(),
  groupPolicy: _zodSchemaCore.GroupPolicySchema.optional().default("allowlist"),
  historyLimit: _zod.z.number().int().min(0).optional(),
  dmHistoryLimit: _zod.z.number().int().min(0).optional(),
  dms: _zod.z.record(_zod.z.string(), _zodSchemaCore.DmConfigSchema.optional()).optional(),
  includeAttachments: _zod.z.boolean().optional(),
  mediaMaxMb: _zod.z.number().int().positive().optional(),
  textChunkLimit: _zod.z.number().int().positive().optional(),
  chunkMode: _zod.z.enum(["length", "newline"]).optional(),
  blockStreaming: _zod.z.boolean().optional(),
  blockStreamingCoalesce: _zodSchemaCore.BlockStreamingCoalesceSchema.optional(),
  groups: _zod.z.
  record(_zod.z.string(), _zod.z.
  object({
    requireMention: _zod.z.boolean().optional(),
    tools: _zodSchemaAgentRuntime.ToolPolicySchema,
    toolsBySender: ToolPolicyBySenderSchema
  }).
  strict().
  optional()).
  optional(),
  heartbeat: _zodSchemaChannels.ChannelHeartbeatVisibilitySchema
}).
strict();
const IMessageAccountSchema = exports.IMessageAccountSchema = IMessageAccountSchemaBase.superRefine((value, ctx) => {
  (0, _zodSchemaCore.requireOpenAllowFrom)({
    policy: value.dmPolicy,
    allowFrom: value.allowFrom,
    ctx,
    path: ["allowFrom"],
    message: 'channels.imessage.dmPolicy="open" requires channels.imessage.allowFrom to include "*"'
  });
});
const IMessageConfigSchema = exports.IMessageConfigSchema = IMessageAccountSchemaBase.extend({
  accounts: _zod.z.record(_zod.z.string(), IMessageAccountSchema.optional()).optional()
}).superRefine((value, ctx) => {
  (0, _zodSchemaCore.requireOpenAllowFrom)({
    policy: value.dmPolicy,
    allowFrom: value.allowFrom,
    ctx,
    path: ["allowFrom"],
    message: 'channels.imessage.dmPolicy="open" requires channels.imessage.allowFrom to include "*"'
  });
});
const BlueBubblesAllowFromEntry = _zod.z.union([_zod.z.string(), _zod.z.number()]);
const BlueBubblesActionSchema = _zod.z.
object({
  reactions: _zod.z.boolean().optional(),
  edit: _zod.z.boolean().optional(),
  unsend: _zod.z.boolean().optional(),
  reply: _zod.z.boolean().optional(),
  sendWithEffect: _zod.z.boolean().optional(),
  renameGroup: _zod.z.boolean().optional(),
  setGroupIcon: _zod.z.boolean().optional(),
  addParticipant: _zod.z.boolean().optional(),
  removeParticipant: _zod.z.boolean().optional(),
  leaveGroup: _zod.z.boolean().optional(),
  sendAttachment: _zod.z.boolean().optional()
}).
strict().
optional();
const BlueBubblesGroupConfigSchema = _zod.z.
object({
  requireMention: _zod.z.boolean().optional(),
  tools: _zodSchemaAgentRuntime.ToolPolicySchema,
  toolsBySender: ToolPolicyBySenderSchema
}).
strict();
const BlueBubblesAccountSchemaBase = exports.BlueBubblesAccountSchemaBase = _zod.z.
object({
  name: _zod.z.string().optional(),
  capabilities: _zod.z.array(_zod.z.string()).optional(),
  markdown: _zodSchemaCore.MarkdownConfigSchema,
  configWrites: _zod.z.boolean().optional(),
  enabled: _zod.z.boolean().optional(),
  serverUrl: _zod.z.string().optional(),
  password: _zod.z.string().optional(),
  webhookPath: _zod.z.string().optional(),
  dmPolicy: _zodSchemaCore.DmPolicySchema.optional().default("pairing"),
  allowFrom: _zod.z.array(BlueBubblesAllowFromEntry).optional(),
  groupAllowFrom: _zod.z.array(BlueBubblesAllowFromEntry).optional(),
  groupPolicy: _zodSchemaCore.GroupPolicySchema.optional().default("allowlist"),
  historyLimit: _zod.z.number().int().min(0).optional(),
  dmHistoryLimit: _zod.z.number().int().min(0).optional(),
  dms: _zod.z.record(_zod.z.string(), _zodSchemaCore.DmConfigSchema.optional()).optional(),
  textChunkLimit: _zod.z.number().int().positive().optional(),
  chunkMode: _zod.z.enum(["length", "newline"]).optional(),
  mediaMaxMb: _zod.z.number().int().positive().optional(),
  sendReadReceipts: _zod.z.boolean().optional(),
  blockStreaming: _zod.z.boolean().optional(),
  blockStreamingCoalesce: _zodSchemaCore.BlockStreamingCoalesceSchema.optional(),
  groups: _zod.z.record(_zod.z.string(), BlueBubblesGroupConfigSchema.optional()).optional(),
  heartbeat: _zodSchemaChannels.ChannelHeartbeatVisibilitySchema
}).
strict();
const BlueBubblesAccountSchema = exports.BlueBubblesAccountSchema = BlueBubblesAccountSchemaBase.superRefine((value, ctx) => {
  (0, _zodSchemaCore.requireOpenAllowFrom)({
    policy: value.dmPolicy,
    allowFrom: value.allowFrom,
    ctx,
    path: ["allowFrom"],
    message: 'channels.bluebubbles.accounts.*.dmPolicy="open" requires allowFrom to include "*"'
  });
});
const BlueBubblesConfigSchema = exports.BlueBubblesConfigSchema = BlueBubblesAccountSchemaBase.extend({
  accounts: _zod.z.record(_zod.z.string(), BlueBubblesAccountSchema.optional()).optional(),
  actions: BlueBubblesActionSchema
}).superRefine((value, ctx) => {
  (0, _zodSchemaCore.requireOpenAllowFrom)({
    policy: value.dmPolicy,
    allowFrom: value.allowFrom,
    ctx,
    path: ["allowFrom"],
    message: 'channels.bluebubbles.dmPolicy="open" requires channels.bluebubbles.allowFrom to include "*"'
  });
});
const MSTeamsChannelSchema = exports.MSTeamsChannelSchema = _zod.z.
object({
  requireMention: _zod.z.boolean().optional(),
  tools: _zodSchemaAgentRuntime.ToolPolicySchema,
  toolsBySender: ToolPolicyBySenderSchema,
  replyStyle: _zodSchemaCore.MSTeamsReplyStyleSchema.optional()
}).
strict();
const MSTeamsTeamSchema = exports.MSTeamsTeamSchema = _zod.z.
object({
  requireMention: _zod.z.boolean().optional(),
  tools: _zodSchemaAgentRuntime.ToolPolicySchema,
  toolsBySender: ToolPolicyBySenderSchema,
  replyStyle: _zodSchemaCore.MSTeamsReplyStyleSchema.optional(),
  channels: _zod.z.record(_zod.z.string(), MSTeamsChannelSchema.optional()).optional()
}).
strict();
const MSTeamsConfigSchema = exports.MSTeamsConfigSchema = _zod.z.
object({
  enabled: _zod.z.boolean().optional(),
  capabilities: _zod.z.array(_zod.z.string()).optional(),
  markdown: _zodSchemaCore.MarkdownConfigSchema,
  configWrites: _zod.z.boolean().optional(),
  appId: _zod.z.string().optional(),
  appPassword: _zod.z.string().optional(),
  tenantId: _zod.z.string().optional(),
  webhook: _zod.z.
  object({
    port: _zod.z.number().int().positive().optional(),
    path: _zod.z.string().optional()
  }).
  strict().
  optional(),
  dmPolicy: _zodSchemaCore.DmPolicySchema.optional().default("pairing"),
  allowFrom: _zod.z.array(_zod.z.string()).optional(),
  groupAllowFrom: _zod.z.array(_zod.z.string()).optional(),
  groupPolicy: _zodSchemaCore.GroupPolicySchema.optional().default("allowlist"),
  textChunkLimit: _zod.z.number().int().positive().optional(),
  chunkMode: _zod.z.enum(["length", "newline"]).optional(),
  blockStreamingCoalesce: _zodSchemaCore.BlockStreamingCoalesceSchema.optional(),
  mediaAllowHosts: _zod.z.array(_zod.z.string()).optional(),
  mediaAuthAllowHosts: _zod.z.array(_zod.z.string()).optional(),
  requireMention: _zod.z.boolean().optional(),
  historyLimit: _zod.z.number().int().min(0).optional(),
  dmHistoryLimit: _zod.z.number().int().min(0).optional(),
  dms: _zod.z.record(_zod.z.string(), _zodSchemaCore.DmConfigSchema.optional()).optional(),
  replyStyle: _zodSchemaCore.MSTeamsReplyStyleSchema.optional(),
  teams: _zod.z.record(_zod.z.string(), MSTeamsTeamSchema.optional()).optional(),
  /** Max media size in MB (default: 100MB for OneDrive upload support). */
  mediaMaxMb: _zod.z.number().positive().optional(),
  /** SharePoint site ID for file uploads in group chats/channels (e.g., "contoso.sharepoint.com,guid1,guid2") */
  sharePointSiteId: _zod.z.string().optional(),
  heartbeat: _zodSchemaChannels.ChannelHeartbeatVisibilitySchema
}).
strict().
superRefine((value, ctx) => {
  (0, _zodSchemaCore.requireOpenAllowFrom)({
    policy: value.dmPolicy,
    allowFrom: value.allowFrom,
    ctx,
    path: ["allowFrom"],
    message: 'channels.msteams.dmPolicy="open" requires channels.msteams.allowFrom to include "*"'
  });
}); /* v9-7d7b04249ed491f5 */
