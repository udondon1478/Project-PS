"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.WhatsAppConfigSchema = exports.WhatsAppAccountSchema = void 0;var _zod = require("zod");
var _zodSchemaAgentRuntime = require("./zod-schema.agent-runtime.js");
var _zodSchemaChannels = require("./zod-schema.channels.js");
var _zodSchemaCore = require("./zod-schema.core.js");
const ToolPolicyBySenderSchema = _zod.z.record(_zod.z.string(), _zodSchemaAgentRuntime.ToolPolicySchema).optional();
const WhatsAppAccountSchema = exports.WhatsAppAccountSchema = _zod.z.
object({
  name: _zod.z.string().optional(),
  capabilities: _zod.z.array(_zod.z.string()).optional(),
  markdown: _zodSchemaCore.MarkdownConfigSchema,
  configWrites: _zod.z.boolean().optional(),
  enabled: _zod.z.boolean().optional(),
  sendReadReceipts: _zod.z.boolean().optional(),
  messagePrefix: _zod.z.string().optional(),
  /** Override auth directory for this WhatsApp account (Baileys multi-file auth state). */
  authDir: _zod.z.string().optional(),
  dmPolicy: _zodSchemaCore.DmPolicySchema.optional().default("pairing"),
  selfChatMode: _zod.z.boolean().optional(),
  allowFrom: _zod.z.array(_zod.z.string()).optional(),
  groupAllowFrom: _zod.z.array(_zod.z.string()).optional(),
  groupPolicy: _zodSchemaCore.GroupPolicySchema.optional().default("allowlist"),
  historyLimit: _zod.z.number().int().min(0).optional(),
  dmHistoryLimit: _zod.z.number().int().min(0).optional(),
  dms: _zod.z.record(_zod.z.string(), _zodSchemaCore.DmConfigSchema.optional()).optional(),
  textChunkLimit: _zod.z.number().int().positive().optional(),
  chunkMode: _zod.z.enum(["length", "newline"]).optional(),
  mediaMaxMb: _zod.z.number().int().positive().optional(),
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
  ackReaction: _zod.z.
  object({
    emoji: _zod.z.string().optional(),
    direct: _zod.z.boolean().optional().default(true),
    group: _zod.z.enum(["always", "mentions", "never"]).optional().default("mentions")
  }).
  strict().
  optional(),
  debounceMs: _zod.z.number().int().nonnegative().optional().default(0),
  heartbeat: _zodSchemaChannels.ChannelHeartbeatVisibilitySchema
}).
strict().
superRefine((value, ctx) => {
  if (value.dmPolicy !== "open") {
    return;
  }
  const allow = (value.allowFrom ?? []).map((v) => String(v).trim()).filter(Boolean);
  if (allow.includes("*")) {
    return;
  }
  ctx.addIssue({
    code: _zod.z.ZodIssueCode.custom,
    path: ["allowFrom"],
    message: 'channels.whatsapp.accounts.*.dmPolicy="open" requires allowFrom to include "*"'
  });
});
const WhatsAppConfigSchema = exports.WhatsAppConfigSchema = _zod.z.
object({
  accounts: _zod.z.record(_zod.z.string(), WhatsAppAccountSchema.optional()).optional(),
  capabilities: _zod.z.array(_zod.z.string()).optional(),
  markdown: _zodSchemaCore.MarkdownConfigSchema,
  configWrites: _zod.z.boolean().optional(),
  sendReadReceipts: _zod.z.boolean().optional(),
  dmPolicy: _zodSchemaCore.DmPolicySchema.optional().default("pairing"),
  messagePrefix: _zod.z.string().optional(),
  selfChatMode: _zod.z.boolean().optional(),
  allowFrom: _zod.z.array(_zod.z.string()).optional(),
  groupAllowFrom: _zod.z.array(_zod.z.string()).optional(),
  groupPolicy: _zodSchemaCore.GroupPolicySchema.optional().default("allowlist"),
  historyLimit: _zod.z.number().int().min(0).optional(),
  dmHistoryLimit: _zod.z.number().int().min(0).optional(),
  dms: _zod.z.record(_zod.z.string(), _zodSchemaCore.DmConfigSchema.optional()).optional(),
  textChunkLimit: _zod.z.number().int().positive().optional(),
  chunkMode: _zod.z.enum(["length", "newline"]).optional(),
  mediaMaxMb: _zod.z.number().int().positive().optional().default(50),
  blockStreaming: _zod.z.boolean().optional(),
  blockStreamingCoalesce: _zodSchemaCore.BlockStreamingCoalesceSchema.optional(),
  actions: _zod.z.
  object({
    reactions: _zod.z.boolean().optional(),
    sendMessage: _zod.z.boolean().optional(),
    polls: _zod.z.boolean().optional()
  }).
  strict().
  optional(),
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
  ackReaction: _zod.z.
  object({
    emoji: _zod.z.string().optional(),
    direct: _zod.z.boolean().optional().default(true),
    group: _zod.z.enum(["always", "mentions", "never"]).optional().default("mentions")
  }).
  strict().
  optional(),
  debounceMs: _zod.z.number().int().nonnegative().optional().default(0),
  heartbeat: _zodSchemaChannels.ChannelHeartbeatVisibilitySchema
}).
strict().
superRefine((value, ctx) => {
  if (value.dmPolicy !== "open") {
    return;
  }
  const allow = (value.allowFrom ?? []).map((v) => String(v).trim()).filter(Boolean);
  if (allow.includes("*")) {
    return;
  }
  ctx.addIssue({
    code: _zod.z.ZodIssueCode.custom,
    path: ["allowFrom"],
    message: 'channels.whatsapp.dmPolicy="open" requires channels.whatsapp.allowFrom to include "*"'
  });
}); /* v9-738d74e427380c46 */
