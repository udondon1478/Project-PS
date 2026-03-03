"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.AgentDefaultsSchema = void 0;var _zod = require("zod");
var _zodSchemaAgentRuntime = require("./zod-schema.agent-runtime.js");
var _zodSchemaCore = require("./zod-schema.core.js");
const AgentDefaultsSchema = exports.AgentDefaultsSchema = _zod.z.
object({
  model: _zod.z.
  object({
    primary: _zod.z.string().optional(),
    fallbacks: _zod.z.array(_zod.z.string()).optional()
  }).
  strict().
  optional(),
  imageModel: _zod.z.
  object({
    primary: _zod.z.string().optional(),
    fallbacks: _zod.z.array(_zod.z.string()).optional()
  }).
  strict().
  optional(),
  models: _zod.z.
  record(_zod.z.string(), _zod.z.
  object({
    alias: _zod.z.string().optional(),
    /** Provider-specific API parameters (e.g., GLM-4.7 thinking mode). */
    params: _zod.z.record(_zod.z.string(), _zod.z.unknown()).optional()
  }).
  strict()).
  optional(),
  workspace: _zod.z.string().optional(),
  repoRoot: _zod.z.string().optional(),
  skipBootstrap: _zod.z.boolean().optional(),
  bootstrapMaxChars: _zod.z.number().int().positive().optional(),
  userTimezone: _zod.z.string().optional(),
  timeFormat: _zod.z.union([_zod.z.literal("auto"), _zod.z.literal("12"), _zod.z.literal("24")]).optional(),
  envelopeTimezone: _zod.z.string().optional(),
  envelopeTimestamp: _zod.z.union([_zod.z.literal("on"), _zod.z.literal("off")]).optional(),
  envelopeElapsed: _zod.z.union([_zod.z.literal("on"), _zod.z.literal("off")]).optional(),
  contextTokens: _zod.z.number().int().positive().optional(),
  cliBackends: _zod.z.record(_zod.z.string(), _zodSchemaCore.CliBackendSchema).optional(),
  memorySearch: _zodSchemaAgentRuntime.MemorySearchSchema,
  contextPruning: _zod.z.
  object({
    mode: _zod.z.union([_zod.z.literal("off"), _zod.z.literal("cache-ttl")]).optional(),
    ttl: _zod.z.string().optional(),
    keepLastAssistants: _zod.z.number().int().nonnegative().optional(),
    softTrimRatio: _zod.z.number().min(0).max(1).optional(),
    hardClearRatio: _zod.z.number().min(0).max(1).optional(),
    minPrunableToolChars: _zod.z.number().int().nonnegative().optional(),
    tools: _zod.z.
    object({
      allow: _zod.z.array(_zod.z.string()).optional(),
      deny: _zod.z.array(_zod.z.string()).optional()
    }).
    strict().
    optional(),
    softTrim: _zod.z.
    object({
      maxChars: _zod.z.number().int().nonnegative().optional(),
      headChars: _zod.z.number().int().nonnegative().optional(),
      tailChars: _zod.z.number().int().nonnegative().optional()
    }).
    strict().
    optional(),
    hardClear: _zod.z.
    object({
      enabled: _zod.z.boolean().optional(),
      placeholder: _zod.z.string().optional()
    }).
    strict().
    optional()
  }).
  strict().
  optional(),
  compaction: _zod.z.
  object({
    mode: _zod.z.union([_zod.z.literal("default"), _zod.z.literal("safeguard")]).optional(),
    reserveTokensFloor: _zod.z.number().int().nonnegative().optional(),
    maxHistoryShare: _zod.z.number().min(0.1).max(0.9).optional(),
    memoryFlush: _zod.z.
    object({
      enabled: _zod.z.boolean().optional(),
      softThresholdTokens: _zod.z.number().int().nonnegative().optional(),
      prompt: _zod.z.string().optional(),
      systemPrompt: _zod.z.string().optional()
    }).
    strict().
    optional()
  }).
  strict().
  optional(),
  thinkingDefault: _zod.z.
  union([
  _zod.z.literal("off"),
  _zod.z.literal("minimal"),
  _zod.z.literal("low"),
  _zod.z.literal("medium"),
  _zod.z.literal("high"),
  _zod.z.literal("xhigh")]
  ).
  optional(),
  verboseDefault: _zod.z.union([_zod.z.literal("off"), _zod.z.literal("on"), _zod.z.literal("full")]).optional(),
  elevatedDefault: _zod.z.
  union([_zod.z.literal("off"), _zod.z.literal("on"), _zod.z.literal("ask"), _zod.z.literal("full")]).
  optional(),
  blockStreamingDefault: _zod.z.union([_zod.z.literal("off"), _zod.z.literal("on")]).optional(),
  blockStreamingBreak: _zod.z.union([_zod.z.literal("text_end"), _zod.z.literal("message_end")]).optional(),
  blockStreamingChunk: _zodSchemaCore.BlockStreamingChunkSchema.optional(),
  blockStreamingCoalesce: _zodSchemaCore.BlockStreamingCoalesceSchema.optional(),
  humanDelay: _zodSchemaCore.HumanDelaySchema.optional(),
  timeoutSeconds: _zod.z.number().int().positive().optional(),
  mediaMaxMb: _zod.z.number().positive().optional(),
  typingIntervalSeconds: _zod.z.number().int().positive().optional(),
  typingMode: _zod.z.
  union([
  _zod.z.literal("never"),
  _zod.z.literal("instant"),
  _zod.z.literal("thinking"),
  _zod.z.literal("message")]
  ).
  optional(),
  heartbeat: _zodSchemaAgentRuntime.HeartbeatSchema,
  maxConcurrent: _zod.z.number().int().positive().optional(),
  subagents: _zod.z.
  object({
    maxConcurrent: _zod.z.number().int().positive().optional(),
    archiveAfterMinutes: _zod.z.number().int().positive().optional(),
    model: _zod.z.
    union([
    _zod.z.string(),
    _zod.z.
    object({
      primary: _zod.z.string().optional(),
      fallbacks: _zod.z.array(_zod.z.string()).optional()
    }).
    strict()]
    ).
    optional()
  }).
  strict().
  optional(),
  sandbox: _zod.z.
  object({
    mode: _zod.z.union([_zod.z.literal("off"), _zod.z.literal("non-main"), _zod.z.literal("all")]).optional(),
    workspaceAccess: _zod.z.union([_zod.z.literal("none"), _zod.z.literal("ro"), _zod.z.literal("rw")]).optional(),
    sessionToolsVisibility: _zod.z.union([_zod.z.literal("spawned"), _zod.z.literal("all")]).optional(),
    scope: _zod.z.union([_zod.z.literal("session"), _zod.z.literal("agent"), _zod.z.literal("shared")]).optional(),
    perSession: _zod.z.boolean().optional(),
    workspaceRoot: _zod.z.string().optional(),
    docker: _zodSchemaAgentRuntime.SandboxDockerSchema,
    browser: _zodSchemaAgentRuntime.SandboxBrowserSchema,
    prune: _zodSchemaAgentRuntime.SandboxPruneSchema
  }).
  strict().
  optional()
}).
strict().
optional(); /* v9-29bf180064d74b5a */
