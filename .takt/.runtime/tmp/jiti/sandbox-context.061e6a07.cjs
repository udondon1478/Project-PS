"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.ensureSandboxWorkspaceForSession = ensureSandboxWorkspaceForSession;exports.resolveSandboxContext = resolveSandboxContext;var _promises = _interopRequireDefault(require("node:fs/promises"));
var _constants = require("../../browser/constants.js");
var _runtime = require("../../runtime.js");
var _utils = require("../../utils.js");
var _skills = require("../skills.js");
var _workspace = require("../workspace.js");
var _browser = require("./browser.js");
var _config = require("./config.js");
var _docker = require("./docker.js");
var _prune = require("./prune.js");
var _runtimeStatus = require("./runtime-status.js");
var _shared = require("./shared.js");
var _workspace2 = require("./workspace.js");function _interopRequireDefault(e) {return e && e.__esModule ? e : { default: e };}
async function resolveSandboxContext(params) {
  const rawSessionKey = params.sessionKey?.trim();
  if (!rawSessionKey) {
    return null;
  }
  const runtime = (0, _runtimeStatus.resolveSandboxRuntimeStatus)({
    cfg: params.config,
    sessionKey: rawSessionKey
  });
  if (!runtime.sandboxed) {
    return null;
  }
  const cfg = (0, _config.resolveSandboxConfigForAgent)(params.config, runtime.agentId);
  await (0, _prune.maybePruneSandboxes)(cfg);
  const agentWorkspaceDir = (0, _utils.resolveUserPath)(params.workspaceDir?.trim() || _workspace.DEFAULT_AGENT_WORKSPACE_DIR);
  const workspaceRoot = (0, _utils.resolveUserPath)(cfg.workspaceRoot);
  const scopeKey = (0, _shared.resolveSandboxScopeKey)(cfg.scope, rawSessionKey);
  const sandboxWorkspaceDir = cfg.scope === "shared" ? workspaceRoot : (0, _shared.resolveSandboxWorkspaceDir)(workspaceRoot, scopeKey);
  const workspaceDir = cfg.workspaceAccess === "rw" ? agentWorkspaceDir : sandboxWorkspaceDir;
  if (workspaceDir === sandboxWorkspaceDir) {
    await (0, _workspace2.ensureSandboxWorkspace)(sandboxWorkspaceDir, agentWorkspaceDir, params.config?.agents?.defaults?.skipBootstrap);
    if (cfg.workspaceAccess !== "rw") {
      try {
        await (0, _skills.syncSkillsToWorkspace)({
          sourceWorkspaceDir: agentWorkspaceDir,
          targetWorkspaceDir: sandboxWorkspaceDir,
          config: params.config
        });
      }
      catch (error) {
        const message = error instanceof Error ? error.message : JSON.stringify(error);
        _runtime.defaultRuntime.error?.(`Sandbox skill sync failed: ${message}`);
      }
    }
  } else
  {
    await _promises.default.mkdir(workspaceDir, { recursive: true });
  }
  const containerName = await (0, _docker.ensureSandboxContainer)({
    sessionKey: rawSessionKey,
    workspaceDir,
    agentWorkspaceDir,
    cfg
  });
  const evaluateEnabled = params.config?.browser?.evaluateEnabled ?? _constants.DEFAULT_BROWSER_EVALUATE_ENABLED;
  const browser = await (0, _browser.ensureSandboxBrowser)({
    scopeKey,
    workspaceDir,
    agentWorkspaceDir,
    cfg,
    evaluateEnabled
  });
  return {
    enabled: true,
    sessionKey: rawSessionKey,
    workspaceDir,
    agentWorkspaceDir,
    workspaceAccess: cfg.workspaceAccess,
    containerName,
    containerWorkdir: cfg.docker.workdir,
    docker: cfg.docker,
    tools: cfg.tools,
    browserAllowHostControl: cfg.browser.allowHostControl,
    browser: browser ?? undefined
  };
}
async function ensureSandboxWorkspaceForSession(params) {
  const rawSessionKey = params.sessionKey?.trim();
  if (!rawSessionKey) {
    return null;
  }
  const runtime = (0, _runtimeStatus.resolveSandboxRuntimeStatus)({
    cfg: params.config,
    sessionKey: rawSessionKey
  });
  if (!runtime.sandboxed) {
    return null;
  }
  const cfg = (0, _config.resolveSandboxConfigForAgent)(params.config, runtime.agentId);
  const agentWorkspaceDir = (0, _utils.resolveUserPath)(params.workspaceDir?.trim() || _workspace.DEFAULT_AGENT_WORKSPACE_DIR);
  const workspaceRoot = (0, _utils.resolveUserPath)(cfg.workspaceRoot);
  const scopeKey = (0, _shared.resolveSandboxScopeKey)(cfg.scope, rawSessionKey);
  const sandboxWorkspaceDir = cfg.scope === "shared" ? workspaceRoot : (0, _shared.resolveSandboxWorkspaceDir)(workspaceRoot, scopeKey);
  const workspaceDir = cfg.workspaceAccess === "rw" ? agentWorkspaceDir : sandboxWorkspaceDir;
  if (workspaceDir === sandboxWorkspaceDir) {
    await (0, _workspace2.ensureSandboxWorkspace)(sandboxWorkspaceDir, agentWorkspaceDir, params.config?.agents?.defaults?.skipBootstrap);
    if (cfg.workspaceAccess !== "rw") {
      try {
        await (0, _skills.syncSkillsToWorkspace)({
          sourceWorkspaceDir: agentWorkspaceDir,
          targetWorkspaceDir: sandboxWorkspaceDir,
          config: params.config
        });
      }
      catch (error) {
        const message = error instanceof Error ? error.message : JSON.stringify(error);
        _runtime.defaultRuntime.error?.(`Sandbox skill sync failed: ${message}`);
      }
    }
  } else
  {
    await _promises.default.mkdir(workspaceDir, { recursive: true });
  }
  return {
    workspaceDir,
    containerWorkdir: cfg.docker.workdir
  };
} /* v9-7d2d22cc9b319508 */
