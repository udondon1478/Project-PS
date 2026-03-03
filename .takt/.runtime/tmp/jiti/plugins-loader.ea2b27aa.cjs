"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.loadOpenClawPlugins = loadOpenClawPlugins;var _jiti = require("jiti");
var _nodeFs = _interopRequireDefault(require("node:fs"));
var _nodePath = _interopRequireDefault(require("node:path"));
var _nodeUrl = require("node:url");
var _subsystem = require("../logging/subsystem.js");
var _utils = require("../utils.js");
var _commands = require("./commands.js");
var _configState = require("./config-state.js");
var _discovery = require("./discovery.js");
var _hookRunnerGlobal = require("./hook-runner-global.js");
var _manifestRegistry = require("./manifest-registry.js");
var _registry = require("./registry.js");
var _runtime = require("./runtime.js");
var _index = require("./runtime/index.js");
var _schemaValidator = require("./schema-validator.js");function _interopRequireDefault(e) {return e && e.__esModule ? e : { default: e };}
const registryCache = new Map();
const defaultLogger = () => (0, _subsystem.createSubsystemLogger)("plugins");
const resolvePluginSdkAlias = () => {
  try {
    const modulePath = (0, _nodeUrl.fileURLToPath)("file:///Users/x22004xx/.nvm/versions/node/v24.11.1/lib/node_modules/openclaw/dist/plugins/loader.js");
    const isDistRuntime = modulePath.split(_nodePath.default.sep).includes("dist");
    const preferDist = process.env.VITEST || process.env.NODE_ENV === "test" || isDistRuntime;
    let cursor = _nodePath.default.dirname(modulePath);
    for (let i = 0; i < 6; i += 1) {
      const srcCandidate = _nodePath.default.join(cursor, "src", "plugin-sdk", "index.ts");
      const distCandidate = _nodePath.default.join(cursor, "dist", "plugin-sdk", "index.js");
      const orderedCandidates = preferDist ?
      [distCandidate, srcCandidate] :
      [srcCandidate, distCandidate];
      for (const candidate of orderedCandidates) {
        if (_nodeFs.default.existsSync(candidate)) {
          return candidate;
        }
      }
      const parent = _nodePath.default.dirname(cursor);
      if (parent === cursor) {
        break;
      }
      cursor = parent;
    }
  }
  catch {

    // ignore
  }return null;
};
function buildCacheKey(params) {
  const workspaceKey = params.workspaceDir ? (0, _utils.resolveUserPath)(params.workspaceDir) : "";
  return `${workspaceKey}::${JSON.stringify(params.plugins)}`;
}
function validatePluginConfig(params) {
  const schema = params.schema;
  if (!schema) {
    return { ok: true, value: params.value };
  }
  const cacheKey = params.cacheKey ?? JSON.stringify(schema);
  const result = (0, _schemaValidator.validateJsonSchemaValue)({
    schema,
    cacheKey,
    value: params.value ?? {}
  });
  if (result.ok) {
    return { ok: true, value: params.value };
  }
  return { ok: false, errors: result.errors };
}
function resolvePluginModuleExport(moduleExport) {
  const resolved = moduleExport &&
  typeof moduleExport === "object" &&
  "default" in moduleExport ?
  moduleExport.default :
  moduleExport;
  if (typeof resolved === "function") {
    return {
      register: resolved
    };
  }
  if (resolved && typeof resolved === "object") {
    const def = resolved;
    const register = def.register ?? def.activate;
    return { definition: def, register };
  }
  return {};
}
function createPluginRecord(params) {
  return {
    id: params.id,
    name: params.name ?? params.id,
    description: params.description,
    version: params.version,
    source: params.source,
    origin: params.origin,
    workspaceDir: params.workspaceDir,
    enabled: params.enabled,
    status: params.enabled ? "loaded" : "disabled",
    toolNames: [],
    hookNames: [],
    channelIds: [],
    providerIds: [],
    gatewayMethods: [],
    cliCommands: [],
    services: [],
    commands: [],
    httpHandlers: 0,
    hookCount: 0,
    configSchema: params.configSchema,
    configUiHints: undefined,
    configJsonSchema: undefined
  };
}
function pushDiagnostics(diagnostics, append) {
  diagnostics.push(...append);
}
function loadOpenClawPlugins(options = {}) {
  const cfg = options.config ?? {};
  const logger = options.logger ?? defaultLogger();
  const validateOnly = options.mode === "validate";
  const normalized = (0, _configState.normalizePluginsConfig)(cfg.plugins);
  const cacheKey = buildCacheKey({
    workspaceDir: options.workspaceDir,
    plugins: normalized
  });
  const cacheEnabled = options.cache !== false;
  if (cacheEnabled) {
    const cached = registryCache.get(cacheKey);
    if (cached) {
      (0, _runtime.setActivePluginRegistry)(cached, cacheKey);
      return cached;
    }
  }
  // Clear previously registered plugin commands before reloading
  (0, _commands.clearPluginCommands)();
  const runtime = (0, _index.createPluginRuntime)();
  const { registry, createApi } = (0, _registry.createPluginRegistry)({
    logger,
    runtime,
    coreGatewayHandlers: options.coreGatewayHandlers
  });
  const discovery = (0, _discovery.discoverOpenClawPlugins)({
    workspaceDir: options.workspaceDir,
    extraPaths: normalized.loadPaths
  });
  const manifestRegistry = (0, _manifestRegistry.loadPluginManifestRegistry)({
    config: cfg,
    workspaceDir: options.workspaceDir,
    cache: options.cache,
    candidates: discovery.candidates,
    diagnostics: discovery.diagnostics
  });
  pushDiagnostics(registry.diagnostics, manifestRegistry.diagnostics);
  const pluginSdkAlias = resolvePluginSdkAlias();
  const jiti = (0, _jiti.createJiti)("file:///Users/x22004xx/.nvm/versions/node/v24.11.1/lib/node_modules/openclaw/dist/plugins/loader.js", {
    interopDefault: true,
    extensions: [".ts", ".tsx", ".mts", ".cts", ".mtsx", ".ctsx", ".js", ".mjs", ".cjs", ".json"],
    ...(pluginSdkAlias ?
    {
      alias: { "openclaw/plugin-sdk": pluginSdkAlias }
    } :
    {})
  });
  const manifestByRoot = new Map(manifestRegistry.plugins.map((record) => [record.rootDir, record]));
  const seenIds = new Map();
  const memorySlot = normalized.slots.memory;
  let selectedMemoryPluginId = null;
  let memorySlotMatched = false;
  for (const candidate of discovery.candidates) {
    const manifestRecord = manifestByRoot.get(candidate.rootDir);
    if (!manifestRecord) {
      continue;
    }
    const pluginId = manifestRecord.id;
    const existingOrigin = seenIds.get(pluginId);
    if (existingOrigin) {
      const record = createPluginRecord({
        id: pluginId,
        name: manifestRecord.name ?? pluginId,
        description: manifestRecord.description,
        version: manifestRecord.version,
        source: candidate.source,
        origin: candidate.origin,
        workspaceDir: candidate.workspaceDir,
        enabled: false,
        configSchema: Boolean(manifestRecord.configSchema)
      });
      record.status = "disabled";
      record.error = `overridden by ${existingOrigin} plugin`;
      registry.plugins.push(record);
      continue;
    }
    const enableState = (0, _configState.resolveEnableState)(pluginId, candidate.origin, normalized);
    const entry = normalized.entries[pluginId];
    const record = createPluginRecord({
      id: pluginId,
      name: manifestRecord.name ?? pluginId,
      description: manifestRecord.description,
      version: manifestRecord.version,
      source: candidate.source,
      origin: candidate.origin,
      workspaceDir: candidate.workspaceDir,
      enabled: enableState.enabled,
      configSchema: Boolean(manifestRecord.configSchema)
    });
    record.kind = manifestRecord.kind;
    record.configUiHints = manifestRecord.configUiHints;
    record.configJsonSchema = manifestRecord.configSchema;
    if (!enableState.enabled) {
      record.status = "disabled";
      record.error = enableState.reason;
      registry.plugins.push(record);
      seenIds.set(pluginId, candidate.origin);
      continue;
    }
    if (!manifestRecord.configSchema) {
      record.status = "error";
      record.error = "missing config schema";
      registry.plugins.push(record);
      seenIds.set(pluginId, candidate.origin);
      registry.diagnostics.push({
        level: "error",
        pluginId: record.id,
        source: record.source,
        message: record.error
      });
      continue;
    }
    let mod = null;
    try {
      mod = jiti(candidate.source);
    }
    catch (err) {
      logger.error(`[plugins] ${record.id} failed to load from ${record.source}: ${String(err)}`);
      record.status = "error";
      record.error = String(err);
      registry.plugins.push(record);
      seenIds.set(pluginId, candidate.origin);
      registry.diagnostics.push({
        level: "error",
        pluginId: record.id,
        source: record.source,
        message: `failed to load plugin: ${String(err)}`
      });
      continue;
    }
    const resolved = resolvePluginModuleExport(mod);
    const definition = resolved.definition;
    const register = resolved.register;
    if (definition?.id && definition.id !== record.id) {
      registry.diagnostics.push({
        level: "warn",
        pluginId: record.id,
        source: record.source,
        message: `plugin id mismatch (config uses "${record.id}", export uses "${definition.id}")`
      });
    }
    record.name = definition?.name ?? record.name;
    record.description = definition?.description ?? record.description;
    record.version = definition?.version ?? record.version;
    const manifestKind = record.kind;
    const exportKind = definition?.kind;
    if (manifestKind && exportKind && exportKind !== manifestKind) {
      registry.diagnostics.push({
        level: "warn",
        pluginId: record.id,
        source: record.source,
        message: `plugin kind mismatch (manifest uses "${manifestKind}", export uses "${exportKind}")`
      });
    }
    record.kind = definition?.kind ?? record.kind;
    if (record.kind === "memory" && memorySlot === record.id) {
      memorySlotMatched = true;
    }
    const memoryDecision = (0, _configState.resolveMemorySlotDecision)({
      id: record.id,
      kind: record.kind,
      slot: memorySlot,
      selectedId: selectedMemoryPluginId
    });
    if (!memoryDecision.enabled) {
      record.enabled = false;
      record.status = "disabled";
      record.error = memoryDecision.reason;
      registry.plugins.push(record);
      seenIds.set(pluginId, candidate.origin);
      continue;
    }
    if (memoryDecision.selected && record.kind === "memory") {
      selectedMemoryPluginId = record.id;
    }
    const validatedConfig = validatePluginConfig({
      schema: manifestRecord.configSchema,
      cacheKey: manifestRecord.schemaCacheKey,
      value: entry?.config
    });
    if (!validatedConfig.ok) {
      logger.error(`[plugins] ${record.id} invalid config: ${validatedConfig.errors?.join(", ")}`);
      record.status = "error";
      record.error = `invalid config: ${validatedConfig.errors?.join(", ")}`;
      registry.plugins.push(record);
      seenIds.set(pluginId, candidate.origin);
      registry.diagnostics.push({
        level: "error",
        pluginId: record.id,
        source: record.source,
        message: record.error
      });
      continue;
    }
    if (validateOnly) {
      registry.plugins.push(record);
      seenIds.set(pluginId, candidate.origin);
      continue;
    }
    if (typeof register !== "function") {
      logger.error(`[plugins] ${record.id} missing register/activate export`);
      record.status = "error";
      record.error = "plugin export missing register/activate";
      registry.plugins.push(record);
      seenIds.set(pluginId, candidate.origin);
      registry.diagnostics.push({
        level: "error",
        pluginId: record.id,
        source: record.source,
        message: record.error
      });
      continue;
    }
    const api = createApi(record, {
      config: cfg,
      pluginConfig: validatedConfig.value
    });
    try {
      const result = register(api);
      if (result && typeof result.then === "function") {
        registry.diagnostics.push({
          level: "warn",
          pluginId: record.id,
          source: record.source,
          message: "plugin register returned a promise; async registration is ignored"
        });
      }
      registry.plugins.push(record);
      seenIds.set(pluginId, candidate.origin);
    }
    catch (err) {
      logger.error(`[plugins] ${record.id} failed during register from ${record.source}: ${String(err)}`);
      record.status = "error";
      record.error = String(err);
      registry.plugins.push(record);
      seenIds.set(pluginId, candidate.origin);
      registry.diagnostics.push({
        level: "error",
        pluginId: record.id,
        source: record.source,
        message: `plugin failed during register: ${String(err)}`
      });
    }
  }
  if (typeof memorySlot === "string" && !memorySlotMatched) {
    registry.diagnostics.push({
      level: "warn",
      message: `memory slot plugin not found or not marked as memory: ${memorySlot}`
    });
  }
  if (cacheEnabled) {
    registryCache.set(cacheKey, registry);
  }
  (0, _runtime.setActivePluginRegistry)(registry, cacheKey);
  (0, _hookRunnerGlobal.initializeGlobalHookRunner)(registry);
  return registry;
} /* v9-f0498bad3a0f0eae */
