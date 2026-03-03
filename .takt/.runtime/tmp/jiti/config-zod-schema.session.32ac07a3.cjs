"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.SessionSchema = exports.MessagesSchema = exports.CommandsSchema = void 0;var _zod = require("zod");
var _zodSchemaCore = require("./zod-schema.core.js");
const SessionResetConfigSchema = _zod.z.
object({
  mode: _zod.z.union([_zod.z.literal("daily"), _zod.z.literal("idle")]).optional(),
  atHour: _zod.z.number().int().min(0).max(23).optional(),
  idleMinutes: _zod.z.number().int().positive().optional()
}).
strict();
const SessionSchema = exports.SessionSchema = _zod.z.
object({
  scope: _zod.z.union([_zod.z.literal("per-sender"), _zod.z.literal("global")]).optional(),
  dmScope: _zod.z.
  union([
  _zod.z.literal("main"),
  _zod.z.literal("per-peer"),
  _zod.z.literal("per-channel-peer"),
  _zod.z.literal("per-account-channel-peer")]
  ).
  optional(),
  identityLinks: _zod.z.record(_zod.z.string(), _zod.z.array(_zod.z.string())).optional(),
  resetTriggers: _zod.z.array(_zod.z.string()).optional(),
  idleMinutes: _zod.z.number().int().positive().optional(),
  reset: SessionResetConfigSchema.optional(),
  resetByType: _zod.z.
  object({
    dm: SessionResetConfigSchema.optional(),
    group: SessionResetConfigSchema.optional(),
    thread: SessionResetConfigSchema.optional()
  }).
  strict().
  optional(),
  resetByChannel: _zod.z.record(_zod.z.string(), SessionResetConfigSchema).optional(),
  store: _zod.z.string().optional(),
  typingIntervalSeconds: _zod.z.number().int().positive().optional(),
  typingMode: _zod.z.
  union([
  _zod.z.literal("never"),
  _zod.z.literal("instant"),
  _zod.z.literal("thinking"),
  _zod.z.literal("message")]
  ).
  optional(),
  mainKey: _zod.z.string().optional(),
  sendPolicy: _zod.z.
  object({
    default: _zod.z.union([_zod.z.literal("allow"), _zod.z.literal("deny")]).optional(),
    rules: _zod.z.
    array(_zod.z.
    object({
      action: _zod.z.union([_zod.z.literal("allow"), _zod.z.literal("deny")]),
      match: _zod.z.
      object({
        channel: _zod.z.string().optional(),
        chatType: _zod.z.
        union([_zod.z.literal("direct"), _zod.z.literal("group"), _zod.z.literal("channel")]).
        optional(),
        keyPrefix: _zod.z.string().optional()
      }).
      strict().
      optional()
    }).
    strict()).
    optional()
  }).
  strict().
  optional(),
  agentToAgent: _zod.z.
  object({
    maxPingPongTurns: _zod.z.number().int().min(0).max(5).optional()
  }).
  strict().
  optional()
}).
strict().
optional();
const MessagesSchema = exports.MessagesSchema = _zod.z.
object({
  messagePrefix: _zod.z.string().optional(),
  responsePrefix: _zod.z.string().optional(),
  groupChat: _zodSchemaCore.GroupChatSchema,
  queue: _zodSchemaCore.QueueSchema,
  inbound: _zodSchemaCore.InboundDebounceSchema,
  ackReaction: _zod.z.string().optional(),
  ackReactionScope: _zod.z.enum(["group-mentions", "group-all", "direct", "all"]).optional(),
  removeAckAfterReply: _zod.z.boolean().optional(),
  tts: _zodSchemaCore.TtsConfigSchema
}).
strict().
optional();
const CommandsSchema = exports.CommandsSchema = _zod.z.
object({
  native: _zodSchemaCore.NativeCommandsSettingSchema.optional().default("auto"),
  nativeSkills: _zodSchemaCore.NativeCommandsSettingSchema.optional().default("auto"),
  text: _zod.z.boolean().optional(),
  bash: _zod.z.boolean().optional(),
  bashForegroundMs: _zod.z.number().int().min(0).max(30_000).optional(),
  config: _zod.z.boolean().optional(),
  debug: _zod.z.boolean().optional(),
  restart: _zod.z.boolean().optional(),
  useAccessGroups: _zod.z.boolean().optional()
}).
strict().
optional().
default({ native: "auto", nativeSkills: "auto" }); /* v9-a4c4328abf12fe72 */
