"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.buildSystemPromptParams = buildSystemPromptParams;var _nodeFs = _interopRequireDefault(require("node:fs"));
var _nodePath = _interopRequireDefault(require("node:path"));
var _dateTime = require("./date-time.js");function _interopRequireDefault(e) {return e && e.__esModule ? e : { default: e };}
function buildSystemPromptParams(params) {
  const repoRoot = resolveRepoRoot({
    config: params.config,
    workspaceDir: params.workspaceDir,
    cwd: params.cwd
  });
  const userTimezone = (0, _dateTime.resolveUserTimezone)(params.config?.agents?.defaults?.userTimezone);
  const userTimeFormat = (0, _dateTime.resolveUserTimeFormat)(params.config?.agents?.defaults?.timeFormat);
  const userTime = (0, _dateTime.formatUserTime)(new Date(), userTimezone, userTimeFormat);
  return {
    runtimeInfo: {
      agentId: params.agentId,
      ...params.runtime,
      repoRoot
    },
    userTimezone,
    userTime,
    userTimeFormat
  };
}
function resolveRepoRoot(params) {
  const configured = params.config?.agents?.defaults?.repoRoot?.trim();
  if (configured) {
    try {
      const resolved = _nodePath.default.resolve(configured);
      const stat = _nodeFs.default.statSync(resolved);
      if (stat.isDirectory()) {
        return resolved;
      }
    }
    catch {

      // ignore invalid config path
    }}
  const candidates = [params.workspaceDir, params.cwd].
  map((value) => value?.trim()).
  filter(Boolean);
  const seen = new Set();
  for (const candidate of candidates) {
    const resolved = _nodePath.default.resolve(candidate);
    if (seen.has(resolved)) {
      continue;
    }
    seen.add(resolved);
    const root = findGitRoot(resolved);
    if (root) {
      return root;
    }
  }
  return undefined;
}
function findGitRoot(startDir) {
  let current = _nodePath.default.resolve(startDir);
  for (let i = 0; i < 12; i += 1) {
    const gitPath = _nodePath.default.join(current, ".git");
    try {
      const stat = _nodeFs.default.statSync(gitPath);
      if (stat.isDirectory() || stat.isFile()) {
        return current;
      }
    }
    catch {

      // ignore missing .git at this level
    }const parent = _nodePath.default.dirname(current);
    if (parent === current) {
      break;
    }
    current = parent;
  }
  return null;
} /* v9-72dde7789b069c5c */
