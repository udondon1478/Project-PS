"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.resolvePluginSkillDirs = resolvePluginSkillDirs;var _nodeFs = _interopRequireDefault(require("node:fs"));
var _nodePath = _interopRequireDefault(require("node:path"));
var _subsystem = require("../../logging/subsystem.js");
var _configState = require("../../plugins/config-state.js");
var _manifestRegistry = require("../../plugins/manifest-registry.js");function _interopRequireDefault(e) {return e && e.__esModule ? e : { default: e };}
const log = (0, _subsystem.createSubsystemLogger)("skills");
function resolvePluginSkillDirs(params) {
  const workspaceDir = params.workspaceDir.trim();
  if (!workspaceDir) {
    return [];
  }
  const registry = (0, _manifestRegistry.loadPluginManifestRegistry)({
    workspaceDir,
    config: params.config
  });
  if (registry.plugins.length === 0) {
    return [];
  }
  const normalizedPlugins = (0, _configState.normalizePluginsConfig)(params.config?.plugins);
  const memorySlot = normalizedPlugins.slots.memory;
  let selectedMemoryPluginId = null;
  const seen = new Set();
  const resolved = [];
  for (const record of registry.plugins) {
    if (!record.skills || record.skills.length === 0) {
      continue;
    }
    const enableState = (0, _configState.resolveEnableState)(record.id, record.origin, normalizedPlugins);
    if (!enableState.enabled) {
      continue;
    }
    const memoryDecision = (0, _configState.resolveMemorySlotDecision)({
      id: record.id,
      kind: record.kind,
      slot: memorySlot,
      selectedId: selectedMemoryPluginId
    });
    if (!memoryDecision.enabled) {
      continue;
    }
    if (memoryDecision.selected && record.kind === "memory") {
      selectedMemoryPluginId = record.id;
    }
    for (const raw of record.skills) {
      const trimmed = raw.trim();
      if (!trimmed) {
        continue;
      }
      const candidate = _nodePath.default.resolve(record.rootDir, trimmed);
      if (!_nodeFs.default.existsSync(candidate)) {
        log.warn(`plugin skill path not found (${record.id}): ${candidate}`);
        continue;
      }
      if (seen.has(candidate)) {
        continue;
      }
      seen.add(candidate);
      resolved.push(candidate);
    }
  }
  return resolved;
} /* v9-87da6fa879b87222 */
