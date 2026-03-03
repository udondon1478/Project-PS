"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.BroadcastStrategySchema = exports.BroadcastSchema = exports.BindingsSchema = exports.AudioSchema = exports.AgentsSchema = void 0;var _zod = require("zod");
var _zodSchemaAgentDefaults = require("./zod-schema.agent-defaults.js");
var _zodSchemaAgentRuntime = require("./zod-schema.agent-runtime.js");
var _zodSchemaCore = require("./zod-schema.core.js");
const AgentsSchema = exports.AgentsSchema = _zod.z.
object({
  defaults: _zod.z.lazy(() => _zodSchemaAgentDefaults.AgentDefaultsSchema).optional(),
  list: _zod.z.array(_zodSchemaAgentRuntime.AgentEntrySchema).optional()
}).
strict().
optional();
const BindingsSchema = exports.BindingsSchema = _zod.z.
array(_zod.z.
object({
  agentId: _zod.z.string(),
  match: _zod.z.
  object({
    channel: _zod.z.string(),
    accountId: _zod.z.string().optional(),
    peer: _zod.z.
    object({
      kind: _zod.z.union([_zod.z.literal("dm"), _zod.z.literal("group"), _zod.z.literal("channel")]),
      id: _zod.z.string()
    }).
    strict().
    optional(),
    guildId: _zod.z.string().optional(),
    teamId: _zod.z.string().optional()
  }).
  strict()
}).
strict()).
optional();
const BroadcastStrategySchema = exports.BroadcastStrategySchema = _zod.z.enum(["parallel", "sequential"]);
const BroadcastSchema = exports.BroadcastSchema = _zod.z.
object({
  strategy: BroadcastStrategySchema.optional()
}).
catchall(_zod.z.array(_zod.z.string())).
optional();
const AudioSchema = exports.AudioSchema = _zod.z.
object({
  transcription: _zodSchemaCore.TranscribeAudioSchema
}).
strict().
optional(); /* v9-d89a9939d7f0066d */
