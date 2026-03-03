"use strict";Object.defineProperty(exports, "__esModule", { value: true });Object.defineProperty(exports, "CircularIncludeError", { enumerable: true, get: function () {return _includes.CircularIncludeError;} });Object.defineProperty(exports, "ConfigIncludeError", { enumerable: true, get: function () {return _includes.ConfigIncludeError;} });Object.defineProperty(exports, "MissingEnvVarError", { enumerable: true, get: function () {return _envSubstitution.MissingEnvVarError;} });exports.createConfigIO = createConfigIO;exports.loadConfig = loadConfig;exports.parseConfigJson5 = parseConfigJson5;exports.readConfigFileSnapshot = readConfigFileSnapshot;exports.resolveConfigSnapshotHash = resolveConfigSnapshotHash;exports.writeConfigFile = writeConfigFile;var _json = _interopRequireDefault(require("json5"));
var _nodeCrypto = _interopRequireDefault(require("node:crypto"));
var _nodeFs = _interopRequireDefault(require("node:fs"));
var _nodeOs = _interopRequireDefault(require("node:os"));
var _nodePath = _interopRequireDefault(require("node:path"));
var _shellEnv = require("../infra/shell-env.js");
var _version = require("../version.js");
var _agentDirs = require("./agent-dirs.js");
var _defaults = require("./defaults.js");
var _envSubstitution = require("./env-substitution.js");
var _envVars = require("./env-vars.js");
var _includes = require("./includes.js");
var _legacy = require("./legacy.js");
var _normalizePaths = require("./normalize-paths.js");
var _paths = require("./paths.js");
var _runtimeOverrides = require("./runtime-overrides.js");
var _validation = require("./validation.js");
var _version2 = require("./version.js");function _interopRequireDefault(e) {return e && e.__esModule ? e : { default: e };}
// Re-export for backwards compatibility


const SHELL_ENV_EXPECTED_KEYS = [
"OPENAI_API_KEY",
"ANTHROPIC_API_KEY",
"ANTHROPIC_OAUTH_TOKEN",
"GEMINI_API_KEY",
"ZAI_API_KEY",
"OPENROUTER_API_KEY",
"AI_GATEWAY_API_KEY",
"MINIMAX_API_KEY",
"SYNTHETIC_API_KEY",
"ELEVENLABS_API_KEY",
"TELEGRAM_BOT_TOKEN",
"DISCORD_BOT_TOKEN",
"SLACK_BOT_TOKEN",
"SLACK_APP_TOKEN",
"OPENCLAW_GATEWAY_TOKEN",
"OPENCLAW_GATEWAY_PASSWORD"];

const CONFIG_BACKUP_COUNT = 5;
const loggedInvalidConfigs = new Set();
function hashConfigRaw(raw) {
  return _nodeCrypto.default.
  createHash("sha256").
  update(raw ?? "").
  digest("hex");
}
function resolveConfigSnapshotHash(snapshot) {
  if (typeof snapshot.hash === "string") {
    const trimmed = snapshot.hash.trim();
    if (trimmed) {
      return trimmed;
    }
  }
  if (typeof snapshot.raw !== "string") {
    return null;
  }
  return hashConfigRaw(snapshot.raw);
}
function coerceConfig(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  return value;
}
async function rotateConfigBackups(configPath, ioFs) {
  if (CONFIG_BACKUP_COUNT <= 1) {
    return;
  }
  const backupBase = `${configPath}.bak`;
  const maxIndex = CONFIG_BACKUP_COUNT - 1;
  await ioFs.unlink(`${backupBase}.${maxIndex}`).catch(() => {

    // best-effort
  });for (let index = maxIndex - 1; index >= 1; index -= 1) {
    await ioFs.rename(`${backupBase}.${index}`, `${backupBase}.${index + 1}`).catch(() => {

      // best-effort
    });}
  await ioFs.rename(backupBase, `${backupBase}.1`).catch(() => {

    // best-effort
  });}
function warnOnConfigMiskeys(raw, logger) {
  if (!raw || typeof raw !== "object") {
    return;
  }
  const gateway = raw.gateway;
  if (!gateway || typeof gateway !== "object") {
    return;
  }
  if ("token" in gateway) {
    logger.warn('Config uses "gateway.token". This key is ignored; use "gateway.auth.token" instead.');
  }
}
function stampConfigVersion(cfg) {
  const now = new Date().toISOString();
  return {
    ...cfg,
    meta: {
      ...cfg.meta,
      lastTouchedVersion: _version.VERSION,
      lastTouchedAt: now
    }
  };
}
function warnIfConfigFromFuture(cfg, logger) {
  const touched = cfg.meta?.lastTouchedVersion;
  if (!touched) {
    return;
  }
  const cmp = (0, _version2.compareOpenClawVersions)(_version.VERSION, touched);
  if (cmp === null) {
    return;
  }
  if (cmp < 0) {
    logger.warn(`Config was last written by a newer OpenClaw (${touched}); current version is ${_version.VERSION}.`);
  }
}
function applyConfigEnv(cfg, env) {
  const entries = (0, _envVars.collectConfigEnvVars)(cfg);
  for (const [key, value] of Object.entries(entries)) {
    if (env[key]?.trim()) {
      continue;
    }
    env[key] = value;
  }
}
function resolveConfigPathForDeps(deps) {
  if (deps.configPath) {
    return deps.configPath;
  }
  return (0, _paths.resolveConfigPath)(deps.env, (0, _paths.resolveStateDir)(deps.env, deps.homedir));
}
function normalizeDeps(overrides = {}) {
  return {
    fs: overrides.fs ?? _nodeFs.default,
    json5: overrides.json5 ?? _json.default,
    env: overrides.env ?? process.env,
    homedir: overrides.homedir ?? _nodeOs.default.homedir,
    configPath: overrides.configPath ?? "",
    logger: overrides.logger ?? console
  };
}
function parseConfigJson5(raw, json5 = _json.default) {
  try {
    return { ok: true, parsed: json5.parse(raw) };
  }
  catch (err) {
    return { ok: false, error: String(err) };
  }
}
function createConfigIO(overrides = {}) {
  const deps = normalizeDeps(overrides);
  const requestedConfigPath = resolveConfigPathForDeps(deps);
  const candidatePaths = deps.configPath ?
  [requestedConfigPath] :
  (0, _paths.resolveDefaultConfigCandidates)(deps.env, deps.homedir);
  const configPath = candidatePaths.find((candidate) => deps.fs.existsSync(candidate)) ?? requestedConfigPath;
  function loadConfig() {
    try {
      if (!deps.fs.existsSync(configPath)) {
        if ((0, _shellEnv.shouldEnableShellEnvFallback)(deps.env) && !(0, _shellEnv.shouldDeferShellEnvFallback)(deps.env)) {
          (0, _shellEnv.loadShellEnvFallback)({
            enabled: true,
            env: deps.env,
            expectedKeys: SHELL_ENV_EXPECTED_KEYS,
            logger: deps.logger,
            timeoutMs: (0, _shellEnv.resolveShellEnvFallbackTimeoutMs)(deps.env)
          });
        }
        return {};
      }
      const raw = deps.fs.readFileSync(configPath, "utf-8");
      const parsed = deps.json5.parse(raw);
      // Resolve $include directives before validation
      const resolved = (0, _includes.resolveConfigIncludes)(parsed, configPath, {
        readFile: (p) => deps.fs.readFileSync(p, "utf-8"),
        parseJson: (raw) => deps.json5.parse(raw)
      });
      // Apply config.env to process.env BEFORE substitution so ${VAR} can reference config-defined vars
      if (resolved && typeof resolved === "object" && "env" in resolved) {
        applyConfigEnv(resolved, deps.env);
      }
      // Substitute ${VAR} env var references
      const substituted = (0, _envSubstitution.resolveConfigEnvVars)(resolved, deps.env);
      const resolvedConfig = substituted;
      warnOnConfigMiskeys(resolvedConfig, deps.logger);
      if (typeof resolvedConfig !== "object" || resolvedConfig === null) {
        return {};
      }
      const preValidationDuplicates = (0, _agentDirs.findDuplicateAgentDirs)(resolvedConfig, {
        env: deps.env,
        homedir: deps.homedir
      });
      if (preValidationDuplicates.length > 0) {
        throw new _agentDirs.DuplicateAgentDirError(preValidationDuplicates);
      }
      const validated = (0, _validation.validateConfigObjectWithPlugins)(resolvedConfig);
      if (!validated.ok) {
        const details = validated.issues.
        map((iss) => `- ${iss.path || "<root>"}: ${iss.message}`).
        join("\n");
        if (!loggedInvalidConfigs.has(configPath)) {
          loggedInvalidConfigs.add(configPath);
          deps.logger.error(`Invalid config at ${configPath}:\\n${details}`);
        }
        const error = new Error("Invalid config");
        error.code = "INVALID_CONFIG";
        error.details = details;
        throw error;
      }
      if (validated.warnings.length > 0) {
        const details = validated.warnings.
        map((iss) => `- ${iss.path || "<root>"}: ${iss.message}`).
        join("\n");
        deps.logger.warn(`Config warnings:\\n${details}`);
      }
      warnIfConfigFromFuture(validated.config, deps.logger);
      const cfg = (0, _defaults.applyModelDefaults)((0, _defaults.applyCompactionDefaults)((0, _defaults.applyContextPruningDefaults)((0, _defaults.applyAgentDefaults)((0, _defaults.applySessionDefaults)((0, _defaults.applyLoggingDefaults)((0, _defaults.applyMessageDefaults)(validated.config)))))));
      (0, _normalizePaths.normalizeConfigPaths)(cfg);
      const duplicates = (0, _agentDirs.findDuplicateAgentDirs)(cfg, {
        env: deps.env,
        homedir: deps.homedir
      });
      if (duplicates.length > 0) {
        throw new _agentDirs.DuplicateAgentDirError(duplicates);
      }
      applyConfigEnv(cfg, deps.env);
      const enabled = (0, _shellEnv.shouldEnableShellEnvFallback)(deps.env) || cfg.env?.shellEnv?.enabled === true;
      if (enabled && !(0, _shellEnv.shouldDeferShellEnvFallback)(deps.env)) {
        (0, _shellEnv.loadShellEnvFallback)({
          enabled: true,
          env: deps.env,
          expectedKeys: SHELL_ENV_EXPECTED_KEYS,
          logger: deps.logger,
          timeoutMs: cfg.env?.shellEnv?.timeoutMs ?? (0, _shellEnv.resolveShellEnvFallbackTimeoutMs)(deps.env)
        });
      }
      return (0, _runtimeOverrides.applyConfigOverrides)(cfg);
    }
    catch (err) {
      if (err instanceof _agentDirs.DuplicateAgentDirError) {
        deps.logger.error(err.message);
        throw err;
      }
      const error = err;
      if (error?.code === "INVALID_CONFIG") {
        return {};
      }
      deps.logger.error(`Failed to read config at ${configPath}`, err);
      return {};
    }
  }
  async function readConfigFileSnapshot() {
    const exists = deps.fs.existsSync(configPath);
    if (!exists) {
      const hash = hashConfigRaw(null);
      const config = (0, _defaults.applyTalkApiKey)((0, _defaults.applyModelDefaults)((0, _defaults.applyCompactionDefaults)((0, _defaults.applyContextPruningDefaults)((0, _defaults.applyAgentDefaults)((0, _defaults.applySessionDefaults)((0, _defaults.applyMessageDefaults)({})))))));
      const legacyIssues = [];
      return {
        path: configPath,
        exists: false,
        raw: null,
        parsed: {},
        valid: true,
        config,
        hash,
        issues: [],
        warnings: [],
        legacyIssues
      };
    }
    try {
      const raw = deps.fs.readFileSync(configPath, "utf-8");
      const hash = hashConfigRaw(raw);
      const parsedRes = parseConfigJson5(raw, deps.json5);
      if (!parsedRes.ok) {
        return {
          path: configPath,
          exists: true,
          raw,
          parsed: {},
          valid: false,
          config: {},
          hash,
          issues: [{ path: "", message: `JSON5 parse failed: ${parsedRes.error}` }],
          warnings: [],
          legacyIssues: []
        };
      }
      // Resolve $include directives
      let resolved;
      try {
        resolved = (0, _includes.resolveConfigIncludes)(parsedRes.parsed, configPath, {
          readFile: (p) => deps.fs.readFileSync(p, "utf-8"),
          parseJson: (raw) => deps.json5.parse(raw)
        });
      }
      catch (err) {
        const message = err instanceof _includes.ConfigIncludeError ?
        err.message :
        `Include resolution failed: ${String(err)}`;
        return {
          path: configPath,
          exists: true,
          raw,
          parsed: parsedRes.parsed,
          valid: false,
          config: coerceConfig(parsedRes.parsed),
          hash,
          issues: [{ path: "", message }],
          warnings: [],
          legacyIssues: []
        };
      }
      // Apply config.env to process.env BEFORE substitution so ${VAR} can reference config-defined vars
      if (resolved && typeof resolved === "object" && "env" in resolved) {
        applyConfigEnv(resolved, deps.env);
      }
      // Substitute ${VAR} env var references
      let substituted;
      try {
        substituted = (0, _envSubstitution.resolveConfigEnvVars)(resolved, deps.env);
      }
      catch (err) {
        const message = err instanceof _envSubstitution.MissingEnvVarError ?
        err.message :
        `Env var substitution failed: ${String(err)}`;
        return {
          path: configPath,
          exists: true,
          raw,
          parsed: parsedRes.parsed,
          valid: false,
          config: coerceConfig(resolved),
          hash,
          issues: [{ path: "", message }],
          warnings: [],
          legacyIssues: []
        };
      }
      const resolvedConfigRaw = substituted;
      const legacyIssues = (0, _legacy.findLegacyConfigIssues)(resolvedConfigRaw);
      const validated = (0, _validation.validateConfigObjectWithPlugins)(resolvedConfigRaw);
      if (!validated.ok) {
        return {
          path: configPath,
          exists: true,
          raw,
          parsed: parsedRes.parsed,
          valid: false,
          config: coerceConfig(resolvedConfigRaw),
          hash,
          issues: validated.issues,
          warnings: validated.warnings,
          legacyIssues
        };
      }
      warnIfConfigFromFuture(validated.config, deps.logger);
      return {
        path: configPath,
        exists: true,
        raw,
        parsed: parsedRes.parsed,
        valid: true,
        config: (0, _normalizePaths.normalizeConfigPaths)((0, _defaults.applyTalkApiKey)((0, _defaults.applyModelDefaults)((0, _defaults.applyAgentDefaults)((0, _defaults.applySessionDefaults)((0, _defaults.applyLoggingDefaults)((0, _defaults.applyMessageDefaults)(validated.config))))))),
        hash,
        issues: [],
        warnings: validated.warnings,
        legacyIssues
      };
    }
    catch (err) {
      return {
        path: configPath,
        exists: true,
        raw: null,
        parsed: {},
        valid: false,
        config: {},
        hash: hashConfigRaw(null),
        issues: [{ path: "", message: `read failed: ${String(err)}` }],
        warnings: [],
        legacyIssues: []
      };
    }
  }
  async function writeConfigFile(cfg) {
    clearConfigCache();
    const validated = (0, _validation.validateConfigObjectWithPlugins)(cfg);
    if (!validated.ok) {
      const issue = validated.issues[0];
      const pathLabel = issue?.path ? issue.path : "<root>";
      throw new Error(`Config validation failed: ${pathLabel}: ${issue?.message ?? "invalid"}`);
    }
    if (validated.warnings.length > 0) {
      const details = validated.warnings.
      map((warning) => `- ${warning.path}: ${warning.message}`).
      join("\n");
      deps.logger.warn(`Config warnings:\n${details}`);
    }
    const dir = _nodePath.default.dirname(configPath);
    await deps.fs.promises.mkdir(dir, { recursive: true, mode: 0o700 });
    const json = JSON.stringify((0, _defaults.applyModelDefaults)(stampConfigVersion(cfg)), null, 2).
    trimEnd().
    concat("\n");
    const tmp = _nodePath.default.join(dir, `${_nodePath.default.basename(configPath)}.${process.pid}.${_nodeCrypto.default.randomUUID()}.tmp`);
    await deps.fs.promises.writeFile(tmp, json, {
      encoding: "utf-8",
      mode: 0o600
    });
    if (deps.fs.existsSync(configPath)) {
      await rotateConfigBackups(configPath, deps.fs.promises);
      await deps.fs.promises.copyFile(configPath, `${configPath}.bak`).catch(() => {

        // best-effort
      });}
    try {
      await deps.fs.promises.rename(tmp, configPath);
    }
    catch (err) {
      const code = err.code;
      // Windows doesn't reliably support atomic replace via rename when dest exists.
      if (code === "EPERM" || code === "EEXIST") {
        await deps.fs.promises.copyFile(tmp, configPath);
        await deps.fs.promises.chmod(configPath, 0o600).catch(() => {

          // best-effort
        });await deps.fs.promises.unlink(tmp).catch(() => {

          // best-effort
        });return;
      }
      await deps.fs.promises.unlink(tmp).catch(() => {

        // best-effort
      });throw err;
    }
  }
  return {
    configPath,
    loadConfig,
    readConfigFileSnapshot,
    writeConfigFile
  };
}
// NOTE: These wrappers intentionally do *not* cache the resolved config path at
// module scope. `OPENCLAW_CONFIG_PATH` (and friends) are expected to work even
// when set after the module has been imported (tests, one-off scripts, etc.).
const DEFAULT_CONFIG_CACHE_MS = 200;
let configCache = null;
function resolveConfigCacheMs(env) {
  const raw = env.OPENCLAW_CONFIG_CACHE_MS?.trim();
  if (raw === "" || raw === "0") {
    return 0;
  }
  if (!raw) {
    return DEFAULT_CONFIG_CACHE_MS;
  }
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed)) {
    return DEFAULT_CONFIG_CACHE_MS;
  }
  return Math.max(0, parsed);
}
function shouldUseConfigCache(env) {
  if (env.OPENCLAW_DISABLE_CONFIG_CACHE?.trim()) {
    return false;
  }
  return resolveConfigCacheMs(env) > 0;
}
function clearConfigCache() {
  configCache = null;
}
function loadConfig() {
  const io = createConfigIO();
  const configPath = io.configPath;
  const now = Date.now();
  if (shouldUseConfigCache(process.env)) {
    const cached = configCache;
    if (cached && cached.configPath === configPath && cached.expiresAt > now) {
      return cached.config;
    }
  }
  const config = io.loadConfig();
  if (shouldUseConfigCache(process.env)) {
    const cacheMs = resolveConfigCacheMs(process.env);
    if (cacheMs > 0) {
      configCache = {
        configPath,
        expiresAt: now + cacheMs,
        config
      };
    }
  }
  return config;
}
async function readConfigFileSnapshot() {
  return await createConfigIO().readConfigFileSnapshot();
}
async function writeConfigFile(cfg) {
  clearConfigCache();
  await createConfigIO().writeConfigFile(cfg);
} /* v9-ed2fbe66a1dc5fbd */
