"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.DEFAULT_SKILLS_WATCH_IGNORED = void 0;exports.bumpSkillsSnapshotVersion = bumpSkillsSnapshotVersion;exports.ensureSkillsWatcher = ensureSkillsWatcher;exports.getSkillsSnapshotVersion = getSkillsSnapshotVersion;exports.registerSkillsChangeListener = registerSkillsChangeListener;var _chokidar = _interopRequireDefault(require("chokidar"));
var _nodePath = _interopRequireDefault(require("node:path"));
var _subsystem = require("../../logging/subsystem.js");
var _utils = require("../../utils.js");
var _pluginSkills = require("./plugin-skills.js");function _interopRequireDefault(e) {return e && e.__esModule ? e : { default: e };}
const log = (0, _subsystem.createSubsystemLogger)("gateway/skills");
const listeners = new Set();
const workspaceVersions = new Map();
const watchers = new Map();
let globalVersion = 0;
const DEFAULT_SKILLS_WATCH_IGNORED = exports.DEFAULT_SKILLS_WATCH_IGNORED = [
/(^|[\\/])\.git([\\/]|$)/,
/(^|[\\/])node_modules([\\/]|$)/,
/(^|[\\/])dist([\\/]|$)/];

function bumpVersion(current) {
  const now = Date.now();
  return now <= current ? current + 1 : now;
}
function emit(event) {
  for (const listener of listeners) {
    try {
      listener(event);
    }
    catch (err) {
      log.warn(`skills change listener failed: ${String(err)}`);
    }
  }
}
function resolveWatchPaths(workspaceDir, config) {
  const paths = [];
  if (workspaceDir.trim()) {
    paths.push(_nodePath.default.join(workspaceDir, "skills"));
  }
  paths.push(_nodePath.default.join(_utils.CONFIG_DIR, "skills"));
  const extraDirsRaw = config?.skills?.load?.extraDirs ?? [];
  const extraDirs = extraDirsRaw.
  map((d) => typeof d === "string" ? d.trim() : "").
  filter(Boolean).
  map((dir) => (0, _utils.resolveUserPath)(dir));
  paths.push(...extraDirs);
  const pluginSkillDirs = (0, _pluginSkills.resolvePluginSkillDirs)({ workspaceDir, config });
  paths.push(...pluginSkillDirs);
  return paths;
}
function registerSkillsChangeListener(listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
function bumpSkillsSnapshotVersion(params) {
  const reason = params?.reason ?? "manual";
  const changedPath = params?.changedPath;
  if (params?.workspaceDir) {
    const current = workspaceVersions.get(params.workspaceDir) ?? 0;
    const next = bumpVersion(current);
    workspaceVersions.set(params.workspaceDir, next);
    emit({ workspaceDir: params.workspaceDir, reason, changedPath });
    return next;
  }
  globalVersion = bumpVersion(globalVersion);
  emit({ reason, changedPath });
  return globalVersion;
}
function getSkillsSnapshotVersion(workspaceDir) {
  if (!workspaceDir) {
    return globalVersion;
  }
  const local = workspaceVersions.get(workspaceDir) ?? 0;
  return Math.max(globalVersion, local);
}
function ensureSkillsWatcher(params) {
  const workspaceDir = params.workspaceDir.trim();
  if (!workspaceDir) {
    return;
  }
  const watchEnabled = params.config?.skills?.load?.watch !== false;
  const debounceMsRaw = params.config?.skills?.load?.watchDebounceMs;
  const debounceMs = typeof debounceMsRaw === "number" && Number.isFinite(debounceMsRaw) ?
  Math.max(0, debounceMsRaw) :
  250;
  const existing = watchers.get(workspaceDir);
  if (!watchEnabled) {
    if (existing) {
      watchers.delete(workspaceDir);
      if (existing.timer) {
        clearTimeout(existing.timer);
      }
      void existing.watcher.close().catch(() => {});
    }
    return;
  }
  const watchPaths = resolveWatchPaths(workspaceDir, params.config);
  const pathsKey = watchPaths.join("|");
  if (existing && existing.pathsKey === pathsKey && existing.debounceMs === debounceMs) {
    return;
  }
  if (existing) {
    watchers.delete(workspaceDir);
    if (existing.timer) {
      clearTimeout(existing.timer);
    }
    void existing.watcher.close().catch(() => {});
  }
  const watcher = _chokidar.default.watch(watchPaths, {
    ignoreInitial: true,
    awaitWriteFinish: {
      stabilityThreshold: debounceMs,
      pollInterval: 100
    },
    // Avoid FD exhaustion on macOS when a workspace contains huge trees.
    // This watcher only needs to react to skill changes.
    ignored: DEFAULT_SKILLS_WATCH_IGNORED
  });
  const state = { watcher, pathsKey, debounceMs };
  const schedule = (changedPath) => {
    state.pendingPath = changedPath ?? state.pendingPath;
    if (state.timer) {
      clearTimeout(state.timer);
    }
    state.timer = setTimeout(() => {
      const pendingPath = state.pendingPath;
      state.pendingPath = undefined;
      state.timer = undefined;
      bumpSkillsSnapshotVersion({
        workspaceDir,
        reason: "watch",
        changedPath: pendingPath
      });
    }, debounceMs);
  };
  watcher.on("add", (p) => schedule(p));
  watcher.on("change", (p) => schedule(p));
  watcher.on("unlink", (p) => schedule(p));
  watcher.on("error", (err) => {
    log.warn(`skills watcher error (${workspaceDir}): ${String(err)}`);
  });
  watchers.set(workspaceDir, state);
} /* v9-50ea09b007f5d47f */
