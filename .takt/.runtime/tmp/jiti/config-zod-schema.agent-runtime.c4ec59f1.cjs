"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.ToolsWebSearchSchema = exports.ToolsWebSchema = exports.ToolsWebFetchSchema = exports.ToolsSchema = exports.ToolProfileSchema = exports.ToolPolicyWithProfileSchema = exports.ToolPolicySchema = exports.SandboxPruneSchema = exports.SandboxDockerSchema = exports.SandboxBrowserSchema = exports.MemorySearchSchema = exports.HeartbeatSchema = exports.ElevatedAllowFromSchema = exports.AgentToolsSchema = exports.AgentSandboxSchema = exports.AgentModelSchema = exports.AgentEntrySchema = void 0;var _zod = require("zod");
var _parseDuration = require("../cli/parse-duration.js");
var _zodSchemaCore = require("./zod-schema.core.js");
const HeartbeatSchema = exports.HeartbeatSchema = _zod.z.
object({
  every: _zod.z.string().optional(),
  activeHours: _zod.z.
  object({
    start: _zod.z.string().optional(),
    end: _zod.z.string().optional(),
    timezone: _zod.z.string().optional()
  }).
  strict().
  optional(),
  model: _zod.z.string().optional(),
  session: _zod.z.string().optional(),
  includeReasoning: _zod.z.boolean().optional(),
  target: _zod.z.string().optional(),
  to: _zod.z.string().optional(),
  prompt: _zod.z.string().optional(),
  ackMaxChars: _zod.z.number().int().nonnegative().optional()
}).
strict().
superRefine((val, ctx) => {
  if (!val.every) {
    return;
  }
  try {
    (0, _parseDuration.parseDurationMs)(val.every, { defaultUnit: "m" });
  }
  catch {
    ctx.addIssue({
      code: _zod.z.ZodIssueCode.custom,
      path: ["every"],
      message: "invalid duration (use ms, s, m, h)"
    });
  }
  const active = val.activeHours;
  if (!active) {
    return;
  }
  const timePattern = /^([01]\d|2[0-3]|24):([0-5]\d)$/;
  const validateTime = (raw, opts, path) => {
    if (!raw) {
      return;
    }
    if (!timePattern.test(raw)) {
      ctx.addIssue({
        code: _zod.z.ZodIssueCode.custom,
        path: ["activeHours", path],
        message: 'invalid time (use "HH:MM" 24h format)'
      });
      return;
    }
    const [hourStr, minuteStr] = raw.split(":");
    const hour = Number(hourStr);
    const minute = Number(minuteStr);
    if (hour === 24 && minute !== 0) {
      ctx.addIssue({
        code: _zod.z.ZodIssueCode.custom,
        path: ["activeHours", path],
        message: "invalid time (24:00 is the only allowed 24:xx value)"
      });
      return;
    }
    if (hour === 24 && !opts.allow24) {
      ctx.addIssue({
        code: _zod.z.ZodIssueCode.custom,
        path: ["activeHours", path],
        message: "invalid time (start cannot be 24:00)"
      });
    }
  };
  validateTime(active.start, { allow24: false }, "start");
  validateTime(active.end, { allow24: true }, "end");
}).
optional();
const SandboxDockerSchema = exports.SandboxDockerSchema = _zod.z.
object({
  image: _zod.z.string().optional(),
  containerPrefix: _zod.z.string().optional(),
  workdir: _zod.z.string().optional(),
  readOnlyRoot: _zod.z.boolean().optional(),
  tmpfs: _zod.z.array(_zod.z.string()).optional(),
  network: _zod.z.string().optional(),
  user: _zod.z.string().optional(),
  capDrop: _zod.z.array(_zod.z.string()).optional(),
  env: _zod.z.record(_zod.z.string(), _zod.z.string()).optional(),
  setupCommand: _zod.z.string().optional(),
  pidsLimit: _zod.z.number().int().positive().optional(),
  memory: _zod.z.union([_zod.z.string(), _zod.z.number()]).optional(),
  memorySwap: _zod.z.union([_zod.z.string(), _zod.z.number()]).optional(),
  cpus: _zod.z.number().positive().optional(),
  ulimits: _zod.z.
  record(_zod.z.string(), _zod.z.union([
  _zod.z.string(),
  _zod.z.number(),
  _zod.z.
  object({
    soft: _zod.z.number().int().nonnegative().optional(),
    hard: _zod.z.number().int().nonnegative().optional()
  }).
  strict()]
  )).
  optional(),
  seccompProfile: _zod.z.string().optional(),
  apparmorProfile: _zod.z.string().optional(),
  dns: _zod.z.array(_zod.z.string()).optional(),
  extraHosts: _zod.z.array(_zod.z.string()).optional(),
  binds: _zod.z.array(_zod.z.string()).optional()
}).
strict().
optional();
const SandboxBrowserSchema = exports.SandboxBrowserSchema = _zod.z.
object({
  enabled: _zod.z.boolean().optional(),
  image: _zod.z.string().optional(),
  containerPrefix: _zod.z.string().optional(),
  cdpPort: _zod.z.number().int().positive().optional(),
  vncPort: _zod.z.number().int().positive().optional(),
  noVncPort: _zod.z.number().int().positive().optional(),
  headless: _zod.z.boolean().optional(),
  enableNoVnc: _zod.z.boolean().optional(),
  allowHostControl: _zod.z.boolean().optional(),
  autoStart: _zod.z.boolean().optional(),
  autoStartTimeoutMs: _zod.z.number().int().positive().optional()
}).
strict().
optional();
const SandboxPruneSchema = exports.SandboxPruneSchema = _zod.z.
object({
  idleHours: _zod.z.number().int().nonnegative().optional(),
  maxAgeDays: _zod.z.number().int().nonnegative().optional()
}).
strict().
optional();
const ToolPolicyBaseSchema = _zod.z.
object({
  allow: _zod.z.array(_zod.z.string()).optional(),
  alsoAllow: _zod.z.array(_zod.z.string()).optional(),
  deny: _zod.z.array(_zod.z.string()).optional()
}).
strict();
const ToolPolicySchema = exports.ToolPolicySchema = ToolPolicyBaseSchema.superRefine((value, ctx) => {
  if (value.allow && value.allow.length > 0 && value.alsoAllow && value.alsoAllow.length > 0) {
    ctx.addIssue({
      code: _zod.z.ZodIssueCode.custom,
      message: "tools policy cannot set both allow and alsoAllow in the same scope (merge alsoAllow into allow, or remove allow and use profile + alsoAllow)"
    });
  }
}).optional();
const ToolsWebSearchSchema = exports.ToolsWebSearchSchema = _zod.z.
object({
  enabled: _zod.z.boolean().optional(),
  provider: _zod.z.union([_zod.z.literal("brave"), _zod.z.literal("perplexity")]).optional(),
  apiKey: _zod.z.string().optional(),
  maxResults: _zod.z.number().int().positive().optional(),
  timeoutSeconds: _zod.z.number().int().positive().optional(),
  cacheTtlMinutes: _zod.z.number().nonnegative().optional(),
  perplexity: _zod.z.
  object({
    apiKey: _zod.z.string().optional(),
    baseUrl: _zod.z.string().optional(),
    model: _zod.z.string().optional()
  }).
  strict().
  optional()
}).
strict().
optional();
const ToolsWebFetchSchema = exports.ToolsWebFetchSchema = _zod.z.
object({
  enabled: _zod.z.boolean().optional(),
  maxChars: _zod.z.number().int().positive().optional(),
  timeoutSeconds: _zod.z.number().int().positive().optional(),
  cacheTtlMinutes: _zod.z.number().nonnegative().optional(),
  maxRedirects: _zod.z.number().int().nonnegative().optional(),
  userAgent: _zod.z.string().optional()
}).
strict().
optional();
const ToolsWebSchema = exports.ToolsWebSchema = _zod.z.
object({
  search: ToolsWebSearchSchema,
  fetch: ToolsWebFetchSchema
}).
strict().
optional();
const ToolProfileSchema = exports.ToolProfileSchema = _zod.z.
union([_zod.z.literal("minimal"), _zod.z.literal("coding"), _zod.z.literal("messaging"), _zod.z.literal("full")]).
optional();
const ToolPolicyWithProfileSchema = exports.ToolPolicyWithProfileSchema = _zod.z.
object({
  allow: _zod.z.array(_zod.z.string()).optional(),
  alsoAllow: _zod.z.array(_zod.z.string()).optional(),
  deny: _zod.z.array(_zod.z.string()).optional(),
  profile: ToolProfileSchema
}).
strict().
superRefine((value, ctx) => {
  if (value.allow && value.allow.length > 0 && value.alsoAllow && value.alsoAllow.length > 0) {
    ctx.addIssue({
      code: _zod.z.ZodIssueCode.custom,
      message: "tools.byProvider policy cannot set both allow and alsoAllow in the same scope (merge alsoAllow into allow, or remove allow and use profile + alsoAllow)"
    });
  }
});
// Provider docking: allowlists keyed by provider id (no schema updates when adding providers).
const ElevatedAllowFromSchema = exports.ElevatedAllowFromSchema = _zod.z.
record(_zod.z.string(), _zod.z.array(_zod.z.union([_zod.z.string(), _zod.z.number()]))).
optional();
const AgentSandboxSchema = exports.AgentSandboxSchema = _zod.z.
object({
  mode: _zod.z.union([_zod.z.literal("off"), _zod.z.literal("non-main"), _zod.z.literal("all")]).optional(),
  workspaceAccess: _zod.z.union([_zod.z.literal("none"), _zod.z.literal("ro"), _zod.z.literal("rw")]).optional(),
  sessionToolsVisibility: _zod.z.union([_zod.z.literal("spawned"), _zod.z.literal("all")]).optional(),
  scope: _zod.z.union([_zod.z.literal("session"), _zod.z.literal("agent"), _zod.z.literal("shared")]).optional(),
  perSession: _zod.z.boolean().optional(),
  workspaceRoot: _zod.z.string().optional(),
  docker: SandboxDockerSchema,
  browser: SandboxBrowserSchema,
  prune: SandboxPruneSchema
}).
strict().
optional();
const AgentToolsSchema = exports.AgentToolsSchema = _zod.z.
object({
  profile: ToolProfileSchema,
  allow: _zod.z.array(_zod.z.string()).optional(),
  alsoAllow: _zod.z.array(_zod.z.string()).optional(),
  deny: _zod.z.array(_zod.z.string()).optional(),
  byProvider: _zod.z.record(_zod.z.string(), ToolPolicyWithProfileSchema).optional(),
  elevated: _zod.z.
  object({
    enabled: _zod.z.boolean().optional(),
    allowFrom: ElevatedAllowFromSchema
  }).
  strict().
  optional(),
  exec: _zod.z.
  object({
    host: _zod.z.enum(["sandbox", "gateway", "node"]).optional(),
    security: _zod.z.enum(["deny", "allowlist", "full"]).optional(),
    ask: _zod.z.enum(["off", "on-miss", "always"]).optional(),
    node: _zod.z.string().optional(),
    pathPrepend: _zod.z.array(_zod.z.string()).optional(),
    safeBins: _zod.z.array(_zod.z.string()).optional(),
    backgroundMs: _zod.z.number().int().positive().optional(),
    timeoutSec: _zod.z.number().int().positive().optional(),
    approvalRunningNoticeMs: _zod.z.number().int().nonnegative().optional(),
    cleanupMs: _zod.z.number().int().positive().optional(),
    notifyOnExit: _zod.z.boolean().optional(),
    applyPatch: _zod.z.
    object({
      enabled: _zod.z.boolean().optional(),
      allowModels: _zod.z.array(_zod.z.string()).optional()
    }).
    strict().
    optional()
  }).
  strict().
  optional(),
  sandbox: _zod.z.
  object({
    tools: ToolPolicySchema
  }).
  strict().
  optional()
}).
strict().
superRefine((value, ctx) => {
  if (value.allow && value.allow.length > 0 && value.alsoAllow && value.alsoAllow.length > 0) {
    ctx.addIssue({
      code: _zod.z.ZodIssueCode.custom,
      message: "agent tools cannot set both allow and alsoAllow in the same scope (merge alsoAllow into allow, or remove allow and use profile + alsoAllow)"
    });
  }
}).
optional();
const MemorySearchSchema = exports.MemorySearchSchema = _zod.z.
object({
  enabled: _zod.z.boolean().optional(),
  sources: _zod.z.array(_zod.z.union([_zod.z.literal("memory"), _zod.z.literal("sessions")])).optional(),
  extraPaths: _zod.z.array(_zod.z.string()).optional(),
  experimental: _zod.z.
  object({
    sessionMemory: _zod.z.boolean().optional()
  }).
  strict().
  optional(),
  provider: _zod.z.union([_zod.z.literal("openai"), _zod.z.literal("local"), _zod.z.literal("gemini")]).optional(),
  remote: _zod.z.
  object({
    baseUrl: _zod.z.string().optional(),
    apiKey: _zod.z.string().optional(),
    headers: _zod.z.record(_zod.z.string(), _zod.z.string()).optional(),
    batch: _zod.z.
    object({
      enabled: _zod.z.boolean().optional(),
      wait: _zod.z.boolean().optional(),
      concurrency: _zod.z.number().int().positive().optional(),
      pollIntervalMs: _zod.z.number().int().nonnegative().optional(),
      timeoutMinutes: _zod.z.number().int().positive().optional()
    }).
    strict().
    optional()
  }).
  strict().
  optional(),
  fallback: _zod.z.
  union([_zod.z.literal("openai"), _zod.z.literal("gemini"), _zod.z.literal("local"), _zod.z.literal("none")]).
  optional(),
  model: _zod.z.string().optional(),
  local: _zod.z.
  object({
    modelPath: _zod.z.string().optional(),
    modelCacheDir: _zod.z.string().optional()
  }).
  strict().
  optional(),
  store: _zod.z.
  object({
    driver: _zod.z.literal("sqlite").optional(),
    path: _zod.z.string().optional(),
    vector: _zod.z.
    object({
      enabled: _zod.z.boolean().optional(),
      extensionPath: _zod.z.string().optional()
    }).
    strict().
    optional()
  }).
  strict().
  optional(),
  chunking: _zod.z.
  object({
    tokens: _zod.z.number().int().positive().optional(),
    overlap: _zod.z.number().int().nonnegative().optional()
  }).
  strict().
  optional(),
  sync: _zod.z.
  object({
    onSessionStart: _zod.z.boolean().optional(),
    onSearch: _zod.z.boolean().optional(),
    watch: _zod.z.boolean().optional(),
    watchDebounceMs: _zod.z.number().int().nonnegative().optional(),
    intervalMinutes: _zod.z.number().int().nonnegative().optional(),
    sessions: _zod.z.
    object({
      deltaBytes: _zod.z.number().int().nonnegative().optional(),
      deltaMessages: _zod.z.number().int().nonnegative().optional()
    }).
    strict().
    optional()
  }).
  strict().
  optional(),
  query: _zod.z.
  object({
    maxResults: _zod.z.number().int().positive().optional(),
    minScore: _zod.z.number().min(0).max(1).optional(),
    hybrid: _zod.z.
    object({
      enabled: _zod.z.boolean().optional(),
      vectorWeight: _zod.z.number().min(0).max(1).optional(),
      textWeight: _zod.z.number().min(0).max(1).optional(),
      candidateMultiplier: _zod.z.number().int().positive().optional()
    }).
    strict().
    optional()
  }).
  strict().
  optional(),
  cache: _zod.z.
  object({
    enabled: _zod.z.boolean().optional(),
    maxEntries: _zod.z.number().int().positive().optional()
  }).
  strict().
  optional()
}).
strict().
optional();
const AgentModelSchema = exports.AgentModelSchema = _zod.z.union([
_zod.z.string(),
_zod.z.
object({
  primary: _zod.z.string().optional(),
  fallbacks: _zod.z.array(_zod.z.string()).optional()
}).
strict()]
);
const AgentEntrySchema = exports.AgentEntrySchema = _zod.z.
object({
  id: _zod.z.string(),
  default: _zod.z.boolean().optional(),
  name: _zod.z.string().optional(),
  workspace: _zod.z.string().optional(),
  agentDir: _zod.z.string().optional(),
  model: AgentModelSchema.optional(),
  memorySearch: MemorySearchSchema,
  humanDelay: _zodSchemaCore.HumanDelaySchema.optional(),
  heartbeat: HeartbeatSchema,
  identity: _zodSchemaCore.IdentitySchema,
  groupChat: _zodSchemaCore.GroupChatSchema,
  subagents: _zod.z.
  object({
    allowAgents: _zod.z.array(_zod.z.string()).optional(),
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
  sandbox: AgentSandboxSchema,
  tools: AgentToolsSchema
}).
strict();
const ToolsSchema = exports.ToolsSchema = _zod.z.
object({
  profile: ToolProfileSchema,
  allow: _zod.z.array(_zod.z.string()).optional(),
  alsoAllow: _zod.z.array(_zod.z.string()).optional(),
  deny: _zod.z.array(_zod.z.string()).optional(),
  byProvider: _zod.z.record(_zod.z.string(), ToolPolicyWithProfileSchema).optional(),
  web: ToolsWebSchema,
  media: _zodSchemaCore.ToolsMediaSchema,
  links: _zodSchemaCore.ToolsLinksSchema,
  message: _zod.z.
  object({
    allowCrossContextSend: _zod.z.boolean().optional(),
    crossContext: _zod.z.
    object({
      allowWithinProvider: _zod.z.boolean().optional(),
      allowAcrossProviders: _zod.z.boolean().optional(),
      marker: _zod.z.
      object({
        enabled: _zod.z.boolean().optional(),
        prefix: _zod.z.string().optional(),
        suffix: _zod.z.string().optional()
      }).
      strict().
      optional()
    }).
    strict().
    optional(),
    broadcast: _zod.z.
    object({
      enabled: _zod.z.boolean().optional()
    }).
    strict().
    optional()
  }).
  strict().
  optional(),
  agentToAgent: _zod.z.
  object({
    enabled: _zod.z.boolean().optional(),
    allow: _zod.z.array(_zod.z.string()).optional()
  }).
  strict().
  optional(),
  elevated: _zod.z.
  object({
    enabled: _zod.z.boolean().optional(),
    allowFrom: ElevatedAllowFromSchema
  }).
  strict().
  optional(),
  exec: _zod.z.
  object({
    host: _zod.z.enum(["sandbox", "gateway", "node"]).optional(),
    security: _zod.z.enum(["deny", "allowlist", "full"]).optional(),
    ask: _zod.z.enum(["off", "on-miss", "always"]).optional(),
    node: _zod.z.string().optional(),
    pathPrepend: _zod.z.array(_zod.z.string()).optional(),
    safeBins: _zod.z.array(_zod.z.string()).optional(),
    backgroundMs: _zod.z.number().int().positive().optional(),
    timeoutSec: _zod.z.number().int().positive().optional(),
    cleanupMs: _zod.z.number().int().positive().optional(),
    notifyOnExit: _zod.z.boolean().optional(),
    applyPatch: _zod.z.
    object({
      enabled: _zod.z.boolean().optional(),
      allowModels: _zod.z.array(_zod.z.string()).optional()
    }).
    strict().
    optional()
  }).
  strict().
  optional(),
  subagents: _zod.z.
  object({
    tools: ToolPolicySchema
  }).
  strict().
  optional(),
  sandbox: _zod.z.
  object({
    tools: ToolPolicySchema
  }).
  strict().
  optional()
}).
strict().
superRefine((value, ctx) => {
  if (value.allow && value.allow.length > 0 && value.alsoAllow && value.alsoAllow.length > 0) {
    ctx.addIssue({
      code: _zod.z.ZodIssueCode.custom,
      message: "tools cannot set both allow and alsoAllow in the same scope (merge alsoAllow into allow, or remove allow and use profile + alsoAllow)"
    });
  }
}).
optional(); /* v9-5478b16080912d6f */
