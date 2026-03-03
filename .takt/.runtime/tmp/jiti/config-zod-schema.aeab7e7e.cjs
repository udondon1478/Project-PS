"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.OpenClawSchema = void 0;var _zod = require("zod");
var _zodSchemaAgentRuntime = require("./zod-schema.agent-runtime.js");
var _zodSchemaAgents = require("./zod-schema.agents.js");
var _zodSchemaApprovals = require("./zod-schema.approvals.js");
var _zodSchemaCore = require("./zod-schema.core.js");
var _zodSchemaHooks = require("./zod-schema.hooks.js");
var _zodSchemaProviders = require("./zod-schema.providers.js");
var _zodSchemaSession = require("./zod-schema.session.js");
const BrowserSnapshotDefaultsSchema = _zod.z.
object({
  mode: _zod.z.literal("efficient").optional()
}).
strict().
optional();
const NodeHostSchema = _zod.z.
object({
  browserProxy: _zod.z.
  object({
    enabled: _zod.z.boolean().optional(),
    allowProfiles: _zod.z.array(_zod.z.string()).optional()
  }).
  strict().
  optional()
}).
strict().
optional();
const OpenClawSchema = exports.OpenClawSchema = _zod.z.
object({
  meta: _zod.z.
  object({
    lastTouchedVersion: _zod.z.string().optional(),
    lastTouchedAt: _zod.z.string().optional()
  }).
  strict().
  optional(),
  env: _zod.z.
  object({
    shellEnv: _zod.z.
    object({
      enabled: _zod.z.boolean().optional(),
      timeoutMs: _zod.z.number().int().nonnegative().optional()
    }).
    strict().
    optional(),
    vars: _zod.z.record(_zod.z.string(), _zod.z.string()).optional()
  }).
  catchall(_zod.z.string()).
  optional(),
  wizard: _zod.z.
  object({
    lastRunAt: _zod.z.string().optional(),
    lastRunVersion: _zod.z.string().optional(),
    lastRunCommit: _zod.z.string().optional(),
    lastRunCommand: _zod.z.string().optional(),
    lastRunMode: _zod.z.union([_zod.z.literal("local"), _zod.z.literal("remote")]).optional()
  }).
  strict().
  optional(),
  diagnostics: _zod.z.
  object({
    enabled: _zod.z.boolean().optional(),
    flags: _zod.z.array(_zod.z.string()).optional(),
    otel: _zod.z.
    object({
      enabled: _zod.z.boolean().optional(),
      endpoint: _zod.z.string().optional(),
      protocol: _zod.z.union([_zod.z.literal("http/protobuf"), _zod.z.literal("grpc")]).optional(),
      headers: _zod.z.record(_zod.z.string(), _zod.z.string()).optional(),
      serviceName: _zod.z.string().optional(),
      traces: _zod.z.boolean().optional(),
      metrics: _zod.z.boolean().optional(),
      logs: _zod.z.boolean().optional(),
      sampleRate: _zod.z.number().min(0).max(1).optional(),
      flushIntervalMs: _zod.z.number().int().nonnegative().optional()
    }).
    strict().
    optional(),
    cacheTrace: _zod.z.
    object({
      enabled: _zod.z.boolean().optional(),
      filePath: _zod.z.string().optional(),
      includeMessages: _zod.z.boolean().optional(),
      includePrompt: _zod.z.boolean().optional(),
      includeSystem: _zod.z.boolean().optional()
    }).
    strict().
    optional()
  }).
  strict().
  optional(),
  logging: _zod.z.
  object({
    level: _zod.z.
    union([
    _zod.z.literal("silent"),
    _zod.z.literal("fatal"),
    _zod.z.literal("error"),
    _zod.z.literal("warn"),
    _zod.z.literal("info"),
    _zod.z.literal("debug"),
    _zod.z.literal("trace")]
    ).
    optional(),
    file: _zod.z.string().optional(),
    consoleLevel: _zod.z.
    union([
    _zod.z.literal("silent"),
    _zod.z.literal("fatal"),
    _zod.z.literal("error"),
    _zod.z.literal("warn"),
    _zod.z.literal("info"),
    _zod.z.literal("debug"),
    _zod.z.literal("trace")]
    ).
    optional(),
    consoleStyle: _zod.z.
    union([_zod.z.literal("pretty"), _zod.z.literal("compact"), _zod.z.literal("json")]).
    optional(),
    redactSensitive: _zod.z.union([_zod.z.literal("off"), _zod.z.literal("tools")]).optional(),
    redactPatterns: _zod.z.array(_zod.z.string()).optional()
  }).
  strict().
  optional(),
  update: _zod.z.
  object({
    channel: _zod.z.union([_zod.z.literal("stable"), _zod.z.literal("beta"), _zod.z.literal("dev")]).optional(),
    checkOnStart: _zod.z.boolean().optional()
  }).
  strict().
  optional(),
  browser: _zod.z.
  object({
    enabled: _zod.z.boolean().optional(),
    evaluateEnabled: _zod.z.boolean().optional(),
    cdpUrl: _zod.z.string().optional(),
    remoteCdpTimeoutMs: _zod.z.number().int().nonnegative().optional(),
    remoteCdpHandshakeTimeoutMs: _zod.z.number().int().nonnegative().optional(),
    color: _zod.z.string().optional(),
    executablePath: _zod.z.string().optional(),
    headless: _zod.z.boolean().optional(),
    noSandbox: _zod.z.boolean().optional(),
    attachOnly: _zod.z.boolean().optional(),
    defaultProfile: _zod.z.string().optional(),
    snapshotDefaults: BrowserSnapshotDefaultsSchema,
    profiles: _zod.z.
    record(_zod.z.
    string().
    regex(/^[a-z0-9-]+$/, "Profile names must be alphanumeric with hyphens only"), _zod.z.
    object({
      cdpPort: _zod.z.number().int().min(1).max(65535).optional(),
      cdpUrl: _zod.z.string().optional(),
      driver: _zod.z.union([_zod.z.literal("openclaw"), _zod.z.literal("extension")]).optional(),
      color: _zodSchemaCore.HexColorSchema
    }).
    strict().
    refine((value) => value.cdpPort || value.cdpUrl, {
      message: "Profile must set cdpPort or cdpUrl"
    })).
    optional()
  }).
  strict().
  optional(),
  ui: _zod.z.
  object({
    seamColor: _zodSchemaCore.HexColorSchema.optional(),
    assistant: _zod.z.
    object({
      name: _zod.z.string().max(50).optional(),
      avatar: _zod.z.string().max(200).optional()
    }).
    strict().
    optional()
  }).
  strict().
  optional(),
  auth: _zod.z.
  object({
    profiles: _zod.z.
    record(_zod.z.string(), _zod.z.
    object({
      provider: _zod.z.string(),
      mode: _zod.z.union([_zod.z.literal("api_key"), _zod.z.literal("oauth"), _zod.z.literal("token")]),
      email: _zod.z.string().optional()
    }).
    strict()).
    optional(),
    order: _zod.z.record(_zod.z.string(), _zod.z.array(_zod.z.string())).optional(),
    cooldowns: _zod.z.
    object({
      billingBackoffHours: _zod.z.number().positive().optional(),
      billingBackoffHoursByProvider: _zod.z.record(_zod.z.string(), _zod.z.number().positive()).optional(),
      billingMaxHours: _zod.z.number().positive().optional(),
      failureWindowHours: _zod.z.number().positive().optional()
    }).
    strict().
    optional()
  }).
  strict().
  optional(),
  models: _zodSchemaCore.ModelsConfigSchema,
  nodeHost: NodeHostSchema,
  agents: _zodSchemaAgents.AgentsSchema,
  tools: _zodSchemaAgentRuntime.ToolsSchema,
  bindings: _zodSchemaAgents.BindingsSchema,
  broadcast: _zodSchemaAgents.BroadcastSchema,
  audio: _zodSchemaAgents.AudioSchema,
  media: _zod.z.
  object({
    preserveFilenames: _zod.z.boolean().optional()
  }).
  strict().
  optional(),
  messages: _zodSchemaSession.MessagesSchema,
  commands: _zodSchemaSession.CommandsSchema,
  approvals: _zodSchemaApprovals.ApprovalsSchema,
  session: _zodSchemaSession.SessionSchema,
  cron: _zod.z.
  object({
    enabled: _zod.z.boolean().optional(),
    store: _zod.z.string().optional(),
    maxConcurrentRuns: _zod.z.number().int().positive().optional()
  }).
  strict().
  optional(),
  hooks: _zod.z.
  object({
    enabled: _zod.z.boolean().optional(),
    path: _zod.z.string().optional(),
    token: _zod.z.string().optional(),
    maxBodyBytes: _zod.z.number().int().positive().optional(),
    presets: _zod.z.array(_zod.z.string()).optional(),
    transformsDir: _zod.z.string().optional(),
    mappings: _zod.z.array(_zodSchemaHooks.HookMappingSchema).optional(),
    gmail: _zodSchemaHooks.HooksGmailSchema,
    internal: _zodSchemaHooks.InternalHooksSchema
  }).
  strict().
  optional(),
  web: _zod.z.
  object({
    enabled: _zod.z.boolean().optional(),
    heartbeatSeconds: _zod.z.number().int().positive().optional(),
    reconnect: _zod.z.
    object({
      initialMs: _zod.z.number().positive().optional(),
      maxMs: _zod.z.number().positive().optional(),
      factor: _zod.z.number().positive().optional(),
      jitter: _zod.z.number().min(0).max(1).optional(),
      maxAttempts: _zod.z.number().int().min(0).optional()
    }).
    strict().
    optional()
  }).
  strict().
  optional(),
  channels: _zodSchemaProviders.ChannelsSchema,
  discovery: _zod.z.
  object({
    wideArea: _zod.z.
    object({
      enabled: _zod.z.boolean().optional(),
      domain: _zod.z.string().optional()
    }).
    strict().
    optional(),
    mdns: _zod.z.
    object({
      mode: _zod.z.enum(["off", "minimal", "full"]).optional()
    }).
    strict().
    optional()
  }).
  strict().
  optional(),
  canvasHost: _zod.z.
  object({
    enabled: _zod.z.boolean().optional(),
    root: _zod.z.string().optional(),
    port: _zod.z.number().int().positive().optional(),
    liveReload: _zod.z.boolean().optional()
  }).
  strict().
  optional(),
  talk: _zod.z.
  object({
    voiceId: _zod.z.string().optional(),
    voiceAliases: _zod.z.record(_zod.z.string(), _zod.z.string()).optional(),
    modelId: _zod.z.string().optional(),
    outputFormat: _zod.z.string().optional(),
    apiKey: _zod.z.string().optional(),
    interruptOnSpeech: _zod.z.boolean().optional()
  }).
  strict().
  optional(),
  gateway: _zod.z.
  object({
    port: _zod.z.number().int().positive().optional(),
    mode: _zod.z.union([_zod.z.literal("local"), _zod.z.literal("remote")]).optional(),
    bind: _zod.z.
    union([
    _zod.z.literal("auto"),
    _zod.z.literal("lan"),
    _zod.z.literal("loopback"),
    _zod.z.literal("custom"),
    _zod.z.literal("tailnet")]
    ).
    optional(),
    controlUi: _zod.z.
    object({
      enabled: _zod.z.boolean().optional(),
      basePath: _zod.z.string().optional(),
      allowInsecureAuth: _zod.z.boolean().optional(),
      dangerouslyDisableDeviceAuth: _zod.z.boolean().optional()
    }).
    strict().
    optional(),
    auth: _zod.z.
    object({
      mode: _zod.z.union([_zod.z.literal("token"), _zod.z.literal("password")]).optional(),
      token: _zod.z.string().optional(),
      password: _zod.z.string().optional(),
      allowTailscale: _zod.z.boolean().optional()
    }).
    strict().
    optional(),
    trustedProxies: _zod.z.array(_zod.z.string()).optional(),
    tailscale: _zod.z.
    object({
      mode: _zod.z.union([_zod.z.literal("off"), _zod.z.literal("serve"), _zod.z.literal("funnel")]).optional(),
      resetOnExit: _zod.z.boolean().optional()
    }).
    strict().
    optional(),
    remote: _zod.z.
    object({
      url: _zod.z.string().optional(),
      transport: _zod.z.union([_zod.z.literal("ssh"), _zod.z.literal("direct")]).optional(),
      token: _zod.z.string().optional(),
      password: _zod.z.string().optional(),
      tlsFingerprint: _zod.z.string().optional(),
      sshTarget: _zod.z.string().optional(),
      sshIdentity: _zod.z.string().optional()
    }).
    strict().
    optional(),
    reload: _zod.z.
    object({
      mode: _zod.z.
      union([
      _zod.z.literal("off"),
      _zod.z.literal("restart"),
      _zod.z.literal("hot"),
      _zod.z.literal("hybrid")]
      ).
      optional(),
      debounceMs: _zod.z.number().int().min(0).optional()
    }).
    strict().
    optional(),
    tls: _zod.z.
    object({
      enabled: _zod.z.boolean().optional(),
      autoGenerate: _zod.z.boolean().optional(),
      certPath: _zod.z.string().optional(),
      keyPath: _zod.z.string().optional(),
      caPath: _zod.z.string().optional()
    }).
    optional(),
    http: _zod.z.
    object({
      endpoints: _zod.z.
      object({
        chatCompletions: _zod.z.
        object({
          enabled: _zod.z.boolean().optional()
        }).
        strict().
        optional(),
        responses: _zod.z.
        object({
          enabled: _zod.z.boolean().optional(),
          maxBodyBytes: _zod.z.number().int().positive().optional(),
          files: _zod.z.
          object({
            allowUrl: _zod.z.boolean().optional(),
            allowedMimes: _zod.z.array(_zod.z.string()).optional(),
            maxBytes: _zod.z.number().int().positive().optional(),
            maxChars: _zod.z.number().int().positive().optional(),
            maxRedirects: _zod.z.number().int().nonnegative().optional(),
            timeoutMs: _zod.z.number().int().positive().optional(),
            pdf: _zod.z.
            object({
              maxPages: _zod.z.number().int().positive().optional(),
              maxPixels: _zod.z.number().int().positive().optional(),
              minTextChars: _zod.z.number().int().nonnegative().optional()
            }).
            strict().
            optional()
          }).
          strict().
          optional(),
          images: _zod.z.
          object({
            allowUrl: _zod.z.boolean().optional(),
            allowedMimes: _zod.z.array(_zod.z.string()).optional(),
            maxBytes: _zod.z.number().int().positive().optional(),
            maxRedirects: _zod.z.number().int().nonnegative().optional(),
            timeoutMs: _zod.z.number().int().positive().optional()
          }).
          strict().
          optional()
        }).
        strict().
        optional()
      }).
      strict().
      optional()
    }).
    strict().
    optional(),
    nodes: _zod.z.
    object({
      browser: _zod.z.
      object({
        mode: _zod.z.
        union([_zod.z.literal("auto"), _zod.z.literal("manual"), _zod.z.literal("off")]).
        optional(),
        node: _zod.z.string().optional()
      }).
      strict().
      optional(),
      allowCommands: _zod.z.array(_zod.z.string()).optional(),
      denyCommands: _zod.z.array(_zod.z.string()).optional()
    }).
    strict().
    optional()
  }).
  strict().
  optional(),
  skills: _zod.z.
  object({
    allowBundled: _zod.z.array(_zod.z.string()).optional(),
    load: _zod.z.
    object({
      extraDirs: _zod.z.array(_zod.z.string()).optional(),
      watch: _zod.z.boolean().optional(),
      watchDebounceMs: _zod.z.number().int().min(0).optional()
    }).
    strict().
    optional(),
    install: _zod.z.
    object({
      preferBrew: _zod.z.boolean().optional(),
      nodeManager: _zod.z.
      union([_zod.z.literal("npm"), _zod.z.literal("pnpm"), _zod.z.literal("yarn"), _zod.z.literal("bun")]).
      optional()
    }).
    strict().
    optional(),
    entries: _zod.z.
    record(_zod.z.string(), _zod.z.
    object({
      enabled: _zod.z.boolean().optional(),
      apiKey: _zod.z.string().optional(),
      env: _zod.z.record(_zod.z.string(), _zod.z.string()).optional(),
      config: _zod.z.record(_zod.z.string(), _zod.z.unknown()).optional()
    }).
    strict()).
    optional()
  }).
  strict().
  optional(),
  plugins: _zod.z.
  object({
    enabled: _zod.z.boolean().optional(),
    allow: _zod.z.array(_zod.z.string()).optional(),
    deny: _zod.z.array(_zod.z.string()).optional(),
    load: _zod.z.
    object({
      paths: _zod.z.array(_zod.z.string()).optional()
    }).
    strict().
    optional(),
    slots: _zod.z.
    object({
      memory: _zod.z.string().optional()
    }).
    strict().
    optional(),
    entries: _zod.z.
    record(_zod.z.string(), _zod.z.
    object({
      enabled: _zod.z.boolean().optional(),
      config: _zod.z.record(_zod.z.string(), _zod.z.unknown()).optional()
    }).
    strict()).
    optional(),
    installs: _zod.z.
    record(_zod.z.string(), _zod.z.
    object({
      source: _zod.z.union([_zod.z.literal("npm"), _zod.z.literal("archive"), _zod.z.literal("path")]),
      spec: _zod.z.string().optional(),
      sourcePath: _zod.z.string().optional(),
      installPath: _zod.z.string().optional(),
      version: _zod.z.string().optional(),
      installedAt: _zod.z.string().optional()
    }).
    strict()).
    optional()
  }).
  strict().
  optional()
}).
strict().
superRefine((cfg, ctx) => {
  const agents = cfg.agents?.list ?? [];
  if (agents.length === 0) {
    return;
  }
  const agentIds = new Set(agents.map((agent) => agent.id));
  const broadcast = cfg.broadcast;
  if (!broadcast) {
    return;
  }
  for (const [peerId, ids] of Object.entries(broadcast)) {
    if (peerId === "strategy") {
      continue;
    }
    if (!Array.isArray(ids)) {
      continue;
    }
    for (let idx = 0; idx < ids.length; idx += 1) {
      const agentId = ids[idx];
      if (!agentIds.has(agentId)) {
        ctx.addIssue({
          code: _zod.z.ZodIssueCode.custom,
          path: ["broadcast", peerId, idx],
          message: `Unknown agent id "${agentId}" (not in agents.list).`
        });
      }
    }
  }
}); /* v9-4934d64338441d85 */
