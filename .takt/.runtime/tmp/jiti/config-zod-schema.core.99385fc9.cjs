"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.requireOpenAllowFrom = exports.normalizeAllowFrom = exports.TtsProviderSchema = exports.TtsModeSchema = exports.TtsConfigSchema = exports.TtsAutoSchema = exports.TranscribeAudioSchema = exports.ToolsMediaUnderstandingSchema = exports.ToolsMediaSchema = exports.ToolsLinksSchema = exports.RetryConfigSchema = exports.ReplyToModeSchema = exports.QueueSchema = exports.QueueModeSchema = exports.QueueModeBySurfaceSchema = exports.QueueDropSchema = exports.ProviderCommandsSchema = exports.NativeCommandsSettingSchema = exports.ModelsConfigSchema = exports.ModelProviderSchema = exports.ModelDefinitionSchema = exports.ModelCompatSchema = exports.ModelApiSchema = exports.MediaUnderstandingScopeSchema = exports.MediaUnderstandingModelSchema = exports.MediaUnderstandingCapabilitiesSchema = exports.MediaUnderstandingAttachmentsSchema = exports.MarkdownTableModeSchema = exports.MarkdownConfigSchema = exports.MSTeamsReplyStyleSchema = exports.LinkModelSchema = exports.InboundDebounceSchema = exports.IdentitySchema = exports.HumanDelaySchema = exports.HexColorSchema = exports.GroupPolicySchema = exports.GroupChatSchema = exports.ExecutableTokenSchema = exports.DmPolicySchema = exports.DmConfigSchema = exports.DebounceMsBySurfaceSchema = exports.CliBackendSchema = exports.BlockStreamingCoalesceSchema = exports.BlockStreamingChunkSchema = exports.BedrockDiscoverySchema = void 0;var _zod = require("zod");
var _execSafety = require("../infra/exec-safety.js");
const ModelApiSchema = exports.ModelApiSchema = _zod.z.union([
_zod.z.literal("openai-completions"),
_zod.z.literal("openai-responses"),
_zod.z.literal("anthropic-messages"),
_zod.z.literal("google-generative-ai"),
_zod.z.literal("github-copilot"),
_zod.z.literal("bedrock-converse-stream")]
);
const ModelCompatSchema = exports.ModelCompatSchema = _zod.z.
object({
  supportsStore: _zod.z.boolean().optional(),
  supportsDeveloperRole: _zod.z.boolean().optional(),
  supportsReasoningEffort: _zod.z.boolean().optional(),
  maxTokensField: _zod.z.
  union([_zod.z.literal("max_completion_tokens"), _zod.z.literal("max_tokens")]).
  optional()
}).
strict().
optional();
const ModelDefinitionSchema = exports.ModelDefinitionSchema = _zod.z.
object({
  id: _zod.z.string().min(1),
  name: _zod.z.string().min(1),
  api: ModelApiSchema.optional(),
  reasoning: _zod.z.boolean().optional(),
  input: _zod.z.array(_zod.z.union([_zod.z.literal("text"), _zod.z.literal("image")])).optional(),
  cost: _zod.z.
  object({
    input: _zod.z.number().optional(),
    output: _zod.z.number().optional(),
    cacheRead: _zod.z.number().optional(),
    cacheWrite: _zod.z.number().optional()
  }).
  strict().
  optional(),
  contextWindow: _zod.z.number().positive().optional(),
  maxTokens: _zod.z.number().positive().optional(),
  headers: _zod.z.record(_zod.z.string(), _zod.z.string()).optional(),
  compat: ModelCompatSchema
}).
strict();
const ModelProviderSchema = exports.ModelProviderSchema = _zod.z.
object({
  baseUrl: _zod.z.string().min(1),
  apiKey: _zod.z.string().optional(),
  auth: _zod.z.
  union([_zod.z.literal("api-key"), _zod.z.literal("aws-sdk"), _zod.z.literal("oauth"), _zod.z.literal("token")]).
  optional(),
  api: ModelApiSchema.optional(),
  headers: _zod.z.record(_zod.z.string(), _zod.z.string()).optional(),
  authHeader: _zod.z.boolean().optional(),
  models: _zod.z.array(ModelDefinitionSchema)
}).
strict();
const BedrockDiscoverySchema = exports.BedrockDiscoverySchema = _zod.z.
object({
  enabled: _zod.z.boolean().optional(),
  region: _zod.z.string().optional(),
  providerFilter: _zod.z.array(_zod.z.string()).optional(),
  refreshInterval: _zod.z.number().int().nonnegative().optional(),
  defaultContextWindow: _zod.z.number().int().positive().optional(),
  defaultMaxTokens: _zod.z.number().int().positive().optional()
}).
strict().
optional();
const ModelsConfigSchema = exports.ModelsConfigSchema = _zod.z.
object({
  mode: _zod.z.union([_zod.z.literal("merge"), _zod.z.literal("replace")]).optional(),
  providers: _zod.z.record(_zod.z.string(), ModelProviderSchema).optional(),
  bedrockDiscovery: BedrockDiscoverySchema
}).
strict().
optional();
const GroupChatSchema = exports.GroupChatSchema = _zod.z.
object({
  mentionPatterns: _zod.z.array(_zod.z.string()).optional(),
  historyLimit: _zod.z.number().int().positive().optional()
}).
strict().
optional();
const DmConfigSchema = exports.DmConfigSchema = _zod.z.
object({
  historyLimit: _zod.z.number().int().min(0).optional()
}).
strict();
const IdentitySchema = exports.IdentitySchema = _zod.z.
object({
  name: _zod.z.string().optional(),
  theme: _zod.z.string().optional(),
  emoji: _zod.z.string().optional(),
  avatar: _zod.z.string().optional()
}).
strict().
optional();
const QueueModeSchema = exports.QueueModeSchema = _zod.z.union([
_zod.z.literal("steer"),
_zod.z.literal("followup"),
_zod.z.literal("collect"),
_zod.z.literal("steer-backlog"),
_zod.z.literal("steer+backlog"),
_zod.z.literal("queue"),
_zod.z.literal("interrupt")]
);
const QueueDropSchema = exports.QueueDropSchema = _zod.z.union([
_zod.z.literal("old"),
_zod.z.literal("new"),
_zod.z.literal("summarize")]
);
const ReplyToModeSchema = exports.ReplyToModeSchema = _zod.z.union([_zod.z.literal("off"), _zod.z.literal("first"), _zod.z.literal("all")]);
// GroupPolicySchema: controls how group messages are handled
// Used with .default("allowlist").optional() pattern:
//   - .optional() allows field omission in input config
//   - .default("allowlist") ensures runtime always resolves to "allowlist" if not provided
const GroupPolicySchema = exports.GroupPolicySchema = _zod.z.enum(["open", "disabled", "allowlist"]);
const DmPolicySchema = exports.DmPolicySchema = _zod.z.enum(["pairing", "allowlist", "open", "disabled"]);
const BlockStreamingCoalesceSchema = exports.BlockStreamingCoalesceSchema = _zod.z.
object({
  minChars: _zod.z.number().int().positive().optional(),
  maxChars: _zod.z.number().int().positive().optional(),
  idleMs: _zod.z.number().int().nonnegative().optional()
}).
strict();
const BlockStreamingChunkSchema = exports.BlockStreamingChunkSchema = _zod.z.
object({
  minChars: _zod.z.number().int().positive().optional(),
  maxChars: _zod.z.number().int().positive().optional(),
  breakPreference: _zod.z.
  union([_zod.z.literal("paragraph"), _zod.z.literal("newline"), _zod.z.literal("sentence")]).
  optional()
}).
strict();
const MarkdownTableModeSchema = exports.MarkdownTableModeSchema = _zod.z.enum(["off", "bullets", "code"]);
const MarkdownConfigSchema = exports.MarkdownConfigSchema = _zod.z.
object({
  tables: MarkdownTableModeSchema.optional()
}).
strict().
optional();
const TtsProviderSchema = exports.TtsProviderSchema = _zod.z.enum(["elevenlabs", "openai", "edge"]);
const TtsModeSchema = exports.TtsModeSchema = _zod.z.enum(["final", "all"]);
const TtsAutoSchema = exports.TtsAutoSchema = _zod.z.enum(["off", "always", "inbound", "tagged"]);
const TtsConfigSchema = exports.TtsConfigSchema = _zod.z.
object({
  auto: TtsAutoSchema.optional(),
  enabled: _zod.z.boolean().optional(),
  mode: TtsModeSchema.optional(),
  provider: TtsProviderSchema.optional(),
  summaryModel: _zod.z.string().optional(),
  modelOverrides: _zod.z.
  object({
    enabled: _zod.z.boolean().optional(),
    allowText: _zod.z.boolean().optional(),
    allowProvider: _zod.z.boolean().optional(),
    allowVoice: _zod.z.boolean().optional(),
    allowModelId: _zod.z.boolean().optional(),
    allowVoiceSettings: _zod.z.boolean().optional(),
    allowNormalization: _zod.z.boolean().optional(),
    allowSeed: _zod.z.boolean().optional()
  }).
  strict().
  optional(),
  elevenlabs: _zod.z.
  object({
    apiKey: _zod.z.string().optional(),
    baseUrl: _zod.z.string().optional(),
    voiceId: _zod.z.string().optional(),
    modelId: _zod.z.string().optional(),
    seed: _zod.z.number().int().min(0).max(4294967295).optional(),
    applyTextNormalization: _zod.z.enum(["auto", "on", "off"]).optional(),
    languageCode: _zod.z.string().optional(),
    voiceSettings: _zod.z.
    object({
      stability: _zod.z.number().min(0).max(1).optional(),
      similarityBoost: _zod.z.number().min(0).max(1).optional(),
      style: _zod.z.number().min(0).max(1).optional(),
      useSpeakerBoost: _zod.z.boolean().optional(),
      speed: _zod.z.number().min(0.5).max(2).optional()
    }).
    strict().
    optional()
  }).
  strict().
  optional(),
  openai: _zod.z.
  object({
    apiKey: _zod.z.string().optional(),
    model: _zod.z.string().optional(),
    voice: _zod.z.string().optional()
  }).
  strict().
  optional(),
  edge: _zod.z.
  object({
    enabled: _zod.z.boolean().optional(),
    voice: _zod.z.string().optional(),
    lang: _zod.z.string().optional(),
    outputFormat: _zod.z.string().optional(),
    pitch: _zod.z.string().optional(),
    rate: _zod.z.string().optional(),
    volume: _zod.z.string().optional(),
    saveSubtitles: _zod.z.boolean().optional(),
    proxy: _zod.z.string().optional(),
    timeoutMs: _zod.z.number().int().min(1000).max(120000).optional()
  }).
  strict().
  optional(),
  prefsPath: _zod.z.string().optional(),
  maxTextLength: _zod.z.number().int().min(1).optional(),
  timeoutMs: _zod.z.number().int().min(1000).max(120000).optional()
}).
strict().
optional();
const HumanDelaySchema = exports.HumanDelaySchema = _zod.z.
object({
  mode: _zod.z.union([_zod.z.literal("off"), _zod.z.literal("natural"), _zod.z.literal("custom")]).optional(),
  minMs: _zod.z.number().int().nonnegative().optional(),
  maxMs: _zod.z.number().int().nonnegative().optional()
}).
strict();
const CliBackendSchema = exports.CliBackendSchema = _zod.z.
object({
  command: _zod.z.string(),
  args: _zod.z.array(_zod.z.string()).optional(),
  output: _zod.z.union([_zod.z.literal("json"), _zod.z.literal("text"), _zod.z.literal("jsonl")]).optional(),
  resumeOutput: _zod.z.union([_zod.z.literal("json"), _zod.z.literal("text"), _zod.z.literal("jsonl")]).optional(),
  input: _zod.z.union([_zod.z.literal("arg"), _zod.z.literal("stdin")]).optional(),
  maxPromptArgChars: _zod.z.number().int().positive().optional(),
  env: _zod.z.record(_zod.z.string(), _zod.z.string()).optional(),
  clearEnv: _zod.z.array(_zod.z.string()).optional(),
  modelArg: _zod.z.string().optional(),
  modelAliases: _zod.z.record(_zod.z.string(), _zod.z.string()).optional(),
  sessionArg: _zod.z.string().optional(),
  sessionArgs: _zod.z.array(_zod.z.string()).optional(),
  resumeArgs: _zod.z.array(_zod.z.string()).optional(),
  sessionMode: _zod.z.
  union([_zod.z.literal("always"), _zod.z.literal("existing"), _zod.z.literal("none")]).
  optional(),
  sessionIdFields: _zod.z.array(_zod.z.string()).optional(),
  systemPromptArg: _zod.z.string().optional(),
  systemPromptMode: _zod.z.union([_zod.z.literal("append"), _zod.z.literal("replace")]).optional(),
  systemPromptWhen: _zod.z.
  union([_zod.z.literal("first"), _zod.z.literal("always"), _zod.z.literal("never")]).
  optional(),
  imageArg: _zod.z.string().optional(),
  imageMode: _zod.z.union([_zod.z.literal("repeat"), _zod.z.literal("list")]).optional(),
  serialize: _zod.z.boolean().optional()
}).
strict();
const normalizeAllowFrom = (values) => (values ?? []).map((v) => String(v).trim()).filter(Boolean);exports.normalizeAllowFrom = normalizeAllowFrom;
const requireOpenAllowFrom = (params) => {
  if (params.policy !== "open") {
    return;
  }
  const allow = normalizeAllowFrom(params.allowFrom);
  if (allow.includes("*")) {
    return;
  }
  params.ctx.addIssue({
    code: _zod.z.ZodIssueCode.custom,
    path: params.path,
    message: params.message
  });
};exports.requireOpenAllowFrom = requireOpenAllowFrom;
const MSTeamsReplyStyleSchema = exports.MSTeamsReplyStyleSchema = _zod.z.enum(["thread", "top-level"]);
const RetryConfigSchema = exports.RetryConfigSchema = _zod.z.
object({
  attempts: _zod.z.number().int().min(1).optional(),
  minDelayMs: _zod.z.number().int().min(0).optional(),
  maxDelayMs: _zod.z.number().int().min(0).optional(),
  jitter: _zod.z.number().min(0).max(1).optional()
}).
strict().
optional();
const QueueModeBySurfaceSchema = exports.QueueModeBySurfaceSchema = _zod.z.
object({
  whatsapp: QueueModeSchema.optional(),
  telegram: QueueModeSchema.optional(),
  discord: QueueModeSchema.optional(),
  slack: QueueModeSchema.optional(),
  mattermost: QueueModeSchema.optional(),
  signal: QueueModeSchema.optional(),
  imessage: QueueModeSchema.optional(),
  msteams: QueueModeSchema.optional(),
  webchat: QueueModeSchema.optional()
}).
strict().
optional();
const DebounceMsBySurfaceSchema = exports.DebounceMsBySurfaceSchema = _zod.z.
record(_zod.z.string(), _zod.z.number().int().nonnegative()).
optional();
const QueueSchema = exports.QueueSchema = _zod.z.
object({
  mode: QueueModeSchema.optional(),
  byChannel: QueueModeBySurfaceSchema,
  debounceMs: _zod.z.number().int().nonnegative().optional(),
  debounceMsByChannel: DebounceMsBySurfaceSchema,
  cap: _zod.z.number().int().positive().optional(),
  drop: QueueDropSchema.optional()
}).
strict().
optional();
const InboundDebounceSchema = exports.InboundDebounceSchema = _zod.z.
object({
  debounceMs: _zod.z.number().int().nonnegative().optional(),
  byChannel: DebounceMsBySurfaceSchema
}).
strict().
optional();
const TranscribeAudioSchema = exports.TranscribeAudioSchema = _zod.z.
object({
  command: _zod.z.array(_zod.z.string()).superRefine((value, ctx) => {
    const executable = value[0];
    if (!(0, _execSafety.isSafeExecutableValue)(executable)) {
      ctx.addIssue({
        code: _zod.z.ZodIssueCode.custom,
        path: [0],
        message: "expected safe executable name or path"
      });
    }
  }),
  timeoutSeconds: _zod.z.number().int().positive().optional()
}).
strict().
optional();
const HexColorSchema = exports.HexColorSchema = _zod.z.string().regex(/^#?[0-9a-fA-F]{6}$/, "expected hex color (RRGGBB)");
const ExecutableTokenSchema = exports.ExecutableTokenSchema = _zod.z.
string().
refine(_execSafety.isSafeExecutableValue, "expected safe executable name or path");
const MediaUnderstandingScopeSchema = exports.MediaUnderstandingScopeSchema = _zod.z.
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
optional();
const MediaUnderstandingCapabilitiesSchema = exports.MediaUnderstandingCapabilitiesSchema = _zod.z.
array(_zod.z.union([_zod.z.literal("image"), _zod.z.literal("audio"), _zod.z.literal("video")])).
optional();
const MediaUnderstandingAttachmentsSchema = exports.MediaUnderstandingAttachmentsSchema = _zod.z.
object({
  mode: _zod.z.union([_zod.z.literal("first"), _zod.z.literal("all")]).optional(),
  maxAttachments: _zod.z.number().int().positive().optional(),
  prefer: _zod.z.
  union([_zod.z.literal("first"), _zod.z.literal("last"), _zod.z.literal("path"), _zod.z.literal("url")]).
  optional()
}).
strict().
optional();
const DeepgramAudioSchema = _zod.z.
object({
  detectLanguage: _zod.z.boolean().optional(),
  punctuate: _zod.z.boolean().optional(),
  smartFormat: _zod.z.boolean().optional()
}).
strict().
optional();
const ProviderOptionValueSchema = _zod.z.union([_zod.z.string(), _zod.z.number(), _zod.z.boolean()]);
const ProviderOptionsSchema = _zod.z.
record(_zod.z.string(), _zod.z.record(_zod.z.string(), ProviderOptionValueSchema)).
optional();
const MediaUnderstandingModelSchema = exports.MediaUnderstandingModelSchema = _zod.z.
object({
  provider: _zod.z.string().optional(),
  model: _zod.z.string().optional(),
  capabilities: MediaUnderstandingCapabilitiesSchema,
  type: _zod.z.union([_zod.z.literal("provider"), _zod.z.literal("cli")]).optional(),
  command: _zod.z.string().optional(),
  args: _zod.z.array(_zod.z.string()).optional(),
  prompt: _zod.z.string().optional(),
  maxChars: _zod.z.number().int().positive().optional(),
  maxBytes: _zod.z.number().int().positive().optional(),
  timeoutSeconds: _zod.z.number().int().positive().optional(),
  language: _zod.z.string().optional(),
  providerOptions: ProviderOptionsSchema,
  deepgram: DeepgramAudioSchema,
  baseUrl: _zod.z.string().optional(),
  headers: _zod.z.record(_zod.z.string(), _zod.z.string()).optional(),
  profile: _zod.z.string().optional(),
  preferredProfile: _zod.z.string().optional()
}).
strict().
optional();
const ToolsMediaUnderstandingSchema = exports.ToolsMediaUnderstandingSchema = _zod.z.
object({
  enabled: _zod.z.boolean().optional(),
  scope: MediaUnderstandingScopeSchema,
  maxBytes: _zod.z.number().int().positive().optional(),
  maxChars: _zod.z.number().int().positive().optional(),
  prompt: _zod.z.string().optional(),
  timeoutSeconds: _zod.z.number().int().positive().optional(),
  language: _zod.z.string().optional(),
  providerOptions: ProviderOptionsSchema,
  deepgram: DeepgramAudioSchema,
  baseUrl: _zod.z.string().optional(),
  headers: _zod.z.record(_zod.z.string(), _zod.z.string()).optional(),
  attachments: MediaUnderstandingAttachmentsSchema,
  models: _zod.z.array(MediaUnderstandingModelSchema).optional()
}).
strict().
optional();
const ToolsMediaSchema = exports.ToolsMediaSchema = _zod.z.
object({
  models: _zod.z.array(MediaUnderstandingModelSchema).optional(),
  concurrency: _zod.z.number().int().positive().optional(),
  image: ToolsMediaUnderstandingSchema.optional(),
  audio: ToolsMediaUnderstandingSchema.optional(),
  video: ToolsMediaUnderstandingSchema.optional()
}).
strict().
optional();
const LinkModelSchema = exports.LinkModelSchema = _zod.z.
object({
  type: _zod.z.literal("cli").optional(),
  command: _zod.z.string().min(1),
  args: _zod.z.array(_zod.z.string()).optional(),
  timeoutSeconds: _zod.z.number().int().positive().optional()
}).
strict();
const ToolsLinksSchema = exports.ToolsLinksSchema = _zod.z.
object({
  enabled: _zod.z.boolean().optional(),
  scope: MediaUnderstandingScopeSchema,
  maxLinks: _zod.z.number().int().positive().optional(),
  timeoutSeconds: _zod.z.number().int().positive().optional(),
  models: _zod.z.array(LinkModelSchema).optional()
}).
strict().
optional();
const NativeCommandsSettingSchema = exports.NativeCommandsSettingSchema = _zod.z.union([_zod.z.boolean(), _zod.z.literal("auto")]);
const ProviderCommandsSchema = exports.ProviderCommandsSchema = _zod.z.
object({
  native: NativeCommandsSettingSchema.optional(),
  nativeSkills: NativeCommandsSettingSchema.optional()
}).
strict().
optional(); /* v9-55ec6cd7ce0a8831 */
