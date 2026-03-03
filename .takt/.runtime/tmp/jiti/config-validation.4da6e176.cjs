"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.validateConfigObject = validateConfigObject;exports.validateConfigObjectWithPlugins = validateConfigObjectWithPlugins;var _nodePath = _interopRequireDefault(require("node:path"));
var _agentScope = require("../agents/agent-scope.js");
var _registry = require("../channels/registry.js");
var _configState = require("../plugins/config-state.js");
var _manifestRegistry = require("../plugins/manifest-registry.js");
var _schemaValidator = require("../plugins/schema-validator.js");
var _agentDirs = require("./agent-dirs.js");
var _defaults = require("./defaults.js");
var _legacy = require("./legacy.js");
var _zodSchema = require("./zod-schema.js");function _interopRequireDefault(e) {return e && e.__esModule ? e : { default: e };}
const AVATAR_SCHEME_RE = /^[a-z][a-z0-9+.-]*:/i;
const AVATAR_DATA_RE = /^data:/i;
const AVATAR_HTTP_RE = /^https?:\/\//i;
const WINDOWS_ABS_RE = /^[a-zA-Z]:[\\/]/;
function isWorkspaceAvatarPath(value, workspaceDir) {
  const workspaceRoot = _nodePath.default.resolve(workspaceDir);
  const resolved = _nodePath.default.resolve(workspaceRoot, value);
  const relative = _nodePath.default.relative(workspaceRoot, resolved);
  if (relative === "") {
    return true;
  }
  if (relative.startsWith("..")) {
    return false;
  }
  return !_nodePath.default.isAbsolute(relative);
}
function validateIdentityAvatar(config) {
  const agents = config.agents?.list;
  if (!Array.isArray(agents) || agents.length === 0) {
    return [];
  }
  const issues = [];
  for (const [index, entry] of agents.entries()) {
    if (!entry || typeof entry !== "object") {
      continue;
    }
    const avatarRaw = entry.identity?.avatar;
    if (typeof avatarRaw !== "string") {
      continue;
    }
    const avatar = avatarRaw.trim();
    if (!avatar) {
      continue;
    }
    if (AVATAR_DATA_RE.test(avatar) || AVATAR_HTTP_RE.test(avatar)) {
      continue;
    }
    if (avatar.startsWith("~")) {
      issues.push({
        path: `agents.list.${index}.identity.avatar`,
        message: "identity.avatar must be a workspace-relative path, http(s) URL, or data URI."
      });
      continue;
    }
    const hasScheme = AVATAR_SCHEME_RE.test(avatar);
    if (hasScheme && !WINDOWS_ABS_RE.test(avatar)) {
      issues.push({
        path: `agents.list.${index}.identity.avatar`,
        message: "identity.avatar must be a workspace-relative path, http(s) URL, or data URI."
      });
      continue;
    }
    const workspaceDir = (0, _agentScope.resolveAgentWorkspaceDir)(config, entry.id ?? (0, _agentScope.resolveDefaultAgentId)(config));
    if (!isWorkspaceAvatarPath(avatar, workspaceDir)) {
      issues.push({
        path: `agents.list.${index}.identity.avatar`,
        message: "identity.avatar must stay within the agent workspace."
      });
    }
  }
  return issues;
}
function validateConfigObject(raw) {
  const legacyIssues = (0, _legacy.findLegacyConfigIssues)(raw);
  if (legacyIssues.length > 0) {
    return {
      ok: false,
      issues: legacyIssues.map((iss) => ({
        path: iss.path,
        message: iss.message
      }))
    };
  }
  const validated = _zodSchema.OpenClawSchema.safeParse(raw);
  if (!validated.success) {
    return {
      ok: false,
      issues: validated.error.issues.map((iss) => ({
        path: iss.path.join("."),
        message: iss.message
      }))
    };
  }
  const duplicates = (0, _agentDirs.findDuplicateAgentDirs)(validated.data);
  if (duplicates.length > 0) {
    return {
      ok: false,
      issues: [
      {
        path: "agents.list",
        message: (0, _agentDirs.formatDuplicateAgentDirError)(duplicates)
      }]

    };
  }
  const avatarIssues = validateIdentityAvatar(validated.data);
  if (avatarIssues.length > 0) {
    return { ok: false, issues: avatarIssues };
  }
  return {
    ok: true,
    config: (0, _defaults.applyModelDefaults)((0, _defaults.applyAgentDefaults)((0, _defaults.applySessionDefaults)(validated.data)))
  };
}
function isRecord(value) {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}
function validateConfigObjectWithPlugins(raw) {
  const base = validateConfigObject(raw);
  if (!base.ok) {
    return { ok: false, issues: base.issues, warnings: [] };
  }
  const config = base.config;
  const issues = [];
  const warnings = [];
  const pluginsConfig = config.plugins;
  const normalizedPlugins = (0, _configState.normalizePluginsConfig)(pluginsConfig);
  const workspaceDir = (0, _agentScope.resolveAgentWorkspaceDir)(config, (0, _agentScope.resolveDefaultAgentId)(config));
  const registry = (0, _manifestRegistry.loadPluginManifestRegistry)({
    config,
    workspaceDir: workspaceDir ?? undefined
  });
  const knownIds = new Set(registry.plugins.map((record) => record.id));
  for (const diag of registry.diagnostics) {
    let path = diag.pluginId ? `plugins.entries.${diag.pluginId}` : "plugins";
    if (!diag.pluginId && diag.message.includes("plugin path not found")) {
      path = "plugins.load.paths";
    }
    const pluginLabel = diag.pluginId ? `plugin ${diag.pluginId}` : "plugin";
    const message = `${pluginLabel}: ${diag.message}`;
    if (diag.level === "error") {
      issues.push({ path, message });
    } else
    {
      warnings.push({ path, message });
    }
  }
  const entries = pluginsConfig?.entries;
  if (entries && isRecord(entries)) {
    for (const pluginId of Object.keys(entries)) {
      if (!knownIds.has(pluginId)) {
        issues.push({
          path: `plugins.entries.${pluginId}`,
          message: `plugin not found: ${pluginId}`
        });
      }
    }
  }
  const allow = pluginsConfig?.allow ?? [];
  for (const pluginId of allow) {
    if (typeof pluginId !== "string" || !pluginId.trim()) {
      continue;
    }
    if (!knownIds.has(pluginId)) {
      issues.push({
        path: "plugins.allow",
        message: `plugin not found: ${pluginId}`
      });
    }
  }
  const deny = pluginsConfig?.deny ?? [];
  for (const pluginId of deny) {
    if (typeof pluginId !== "string" || !pluginId.trim()) {
      continue;
    }
    if (!knownIds.has(pluginId)) {
      issues.push({
        path: "plugins.deny",
        message: `plugin not found: ${pluginId}`
      });
    }
  }
  const memorySlot = normalizedPlugins.slots.memory;
  if (typeof memorySlot === "string" && memorySlot.trim() && !knownIds.has(memorySlot)) {
    issues.push({
      path: "plugins.slots.memory",
      message: `plugin not found: ${memorySlot}`
    });
  }
  const allowedChannels = new Set(["defaults", ..._registry.CHANNEL_IDS]);
  for (const record of registry.plugins) {
    for (const channelId of record.channels) {
      allowedChannels.add(channelId);
    }
  }
  if (config.channels && isRecord(config.channels)) {
    for (const key of Object.keys(config.channels)) {
      const trimmed = key.trim();
      if (!trimmed) {
        continue;
      }
      if (!allowedChannels.has(trimmed)) {
        issues.push({
          path: `channels.${trimmed}`,
          message: `unknown channel id: ${trimmed}`
        });
      }
    }
  }
  const heartbeatChannelIds = new Set();
  for (const channelId of _registry.CHANNEL_IDS) {
    heartbeatChannelIds.add(channelId.toLowerCase());
  }
  for (const record of registry.plugins) {
    for (const channelId of record.channels) {
      const trimmed = channelId.trim();
      if (trimmed) {
        heartbeatChannelIds.add(trimmed.toLowerCase());
      }
    }
  }
  const validateHeartbeatTarget = (target, path) => {
    if (typeof target !== "string") {
      return;
    }
    const trimmed = target.trim();
    if (!trimmed) {
      issues.push({ path, message: "heartbeat target must not be empty" });
      return;
    }
    const normalized = trimmed.toLowerCase();
    if (normalized === "last" || normalized === "none") {
      return;
    }
    if ((0, _registry.normalizeChatChannelId)(trimmed)) {
      return;
    }
    if (heartbeatChannelIds.has(normalized)) {
      return;
    }
    issues.push({ path, message: `unknown heartbeat target: ${target}` });
  };
  validateHeartbeatTarget(config.agents?.defaults?.heartbeat?.target, "agents.defaults.heartbeat.target");
  if (Array.isArray(config.agents?.list)) {
    for (const [index, entry] of config.agents.list.entries()) {
      validateHeartbeatTarget(entry?.heartbeat?.target, `agents.list.${index}.heartbeat.target`);
    }
  }
  let selectedMemoryPluginId = null;
  const seenPlugins = new Set();
  for (const record of registry.plugins) {
    const pluginId = record.id;
    if (seenPlugins.has(pluginId)) {
      continue;
    }
    seenPlugins.add(pluginId);
    const entry = normalizedPlugins.entries[pluginId];
    const entryHasConfig = Boolean(entry?.config);
    const enableState = (0, _configState.resolveEnableState)(pluginId, record.origin, normalizedPlugins);
    let enabled = enableState.enabled;
    let reason = enableState.reason;
    if (enabled) {
      const memoryDecision = (0, _configState.resolveMemorySlotDecision)({
        id: pluginId,
        kind: record.kind,
        slot: memorySlot,
        selectedId: selectedMemoryPluginId
      });
      if (!memoryDecision.enabled) {
        enabled = false;
        reason = memoryDecision.reason;
      }
      if (memoryDecision.selected && record.kind === "memory") {
        selectedMemoryPluginId = pluginId;
      }
    }
    const shouldValidate = enabled || entryHasConfig;
    if (shouldValidate) {
      if (record.configSchema) {
        const res = (0, _schemaValidator.validateJsonSchemaValue)({
          schema: record.configSchema,
          cacheKey: record.schemaCacheKey ?? record.manifestPath ?? pluginId,
          value: entry?.config ?? {}
        });
        if (!res.ok) {
          for (const error of res.errors) {
            issues.push({
              path: `plugins.entries.${pluginId}.config`,
              message: `invalid config: ${error}`
            });
          }
        }
      } else
      {
        issues.push({
          path: `plugins.entries.${pluginId}`,
          message: `plugin schema missing for ${pluginId}`
        });
      }
    }
    if (!enabled && entryHasConfig) {
      warnings.push({
        path: `plugins.entries.${pluginId}`,
        message: `plugin disabled (${reason ?? "disabled"}) but config is present`
      });
    }
  }
  if (issues.length > 0) {
    return { ok: false, issues, warnings };
  }
  return { ok: true, config, warnings };
} /* v9-715c3d73d007edf7 */
