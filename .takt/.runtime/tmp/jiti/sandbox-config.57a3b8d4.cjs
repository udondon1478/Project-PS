"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.resolveSandboxBrowserConfig = resolveSandboxBrowserConfig;exports.resolveSandboxConfigForAgent = resolveSandboxConfigForAgent;exports.resolveSandboxDockerConfig = resolveSandboxDockerConfig;exports.resolveSandboxPruneConfig = resolveSandboxPruneConfig;exports.resolveSandboxScope = resolveSandboxScope;var _agentScope = require("../agent-scope.js");
var _constants = require("./constants.js");
var _toolPolicy = require("./tool-policy.js");
function resolveSandboxScope(params) {
  if (params.scope) {
    return params.scope;
  }
  if (typeof params.perSession === "boolean") {
    return params.perSession ? "session" : "shared";
  }
  return "agent";
}
function resolveSandboxDockerConfig(params) {
  const agentDocker = params.scope === "shared" ? undefined : params.agentDocker;
  const globalDocker = params.globalDocker;
  const env = agentDocker?.env ?
  { ...(globalDocker?.env ?? { LANG: "C.UTF-8" }), ...agentDocker.env } :
  globalDocker?.env ?? { LANG: "C.UTF-8" };
  const ulimits = agentDocker?.ulimits ?
  { ...globalDocker?.ulimits, ...agentDocker.ulimits } :
  globalDocker?.ulimits;
  const binds = [...(globalDocker?.binds ?? []), ...(agentDocker?.binds ?? [])];
  return {
    image: agentDocker?.image ?? globalDocker?.image ?? _constants.DEFAULT_SANDBOX_IMAGE,
    containerPrefix: agentDocker?.containerPrefix ??
    globalDocker?.containerPrefix ??
    _constants.DEFAULT_SANDBOX_CONTAINER_PREFIX,
    workdir: agentDocker?.workdir ?? globalDocker?.workdir ?? _constants.DEFAULT_SANDBOX_WORKDIR,
    readOnlyRoot: agentDocker?.readOnlyRoot ?? globalDocker?.readOnlyRoot ?? true,
    tmpfs: agentDocker?.tmpfs ?? globalDocker?.tmpfs ?? ["/tmp", "/var/tmp", "/run"],
    network: agentDocker?.network ?? globalDocker?.network ?? "none",
    user: agentDocker?.user ?? globalDocker?.user,
    capDrop: agentDocker?.capDrop ?? globalDocker?.capDrop ?? ["ALL"],
    env,
    setupCommand: agentDocker?.setupCommand ?? globalDocker?.setupCommand,
    pidsLimit: agentDocker?.pidsLimit ?? globalDocker?.pidsLimit,
    memory: agentDocker?.memory ?? globalDocker?.memory,
    memorySwap: agentDocker?.memorySwap ?? globalDocker?.memorySwap,
    cpus: agentDocker?.cpus ?? globalDocker?.cpus,
    ulimits,
    seccompProfile: agentDocker?.seccompProfile ?? globalDocker?.seccompProfile,
    apparmorProfile: agentDocker?.apparmorProfile ?? globalDocker?.apparmorProfile,
    dns: agentDocker?.dns ?? globalDocker?.dns,
    extraHosts: agentDocker?.extraHosts ?? globalDocker?.extraHosts,
    binds: binds.length ? binds : undefined
  };
}
function resolveSandboxBrowserConfig(params) {
  const agentBrowser = params.scope === "shared" ? undefined : params.agentBrowser;
  const globalBrowser = params.globalBrowser;
  return {
    enabled: agentBrowser?.enabled ?? globalBrowser?.enabled ?? false,
    image: agentBrowser?.image ?? globalBrowser?.image ?? _constants.DEFAULT_SANDBOX_BROWSER_IMAGE,
    containerPrefix: agentBrowser?.containerPrefix ??
    globalBrowser?.containerPrefix ??
    _constants.DEFAULT_SANDBOX_BROWSER_PREFIX,
    cdpPort: agentBrowser?.cdpPort ?? globalBrowser?.cdpPort ?? _constants.DEFAULT_SANDBOX_BROWSER_CDP_PORT,
    vncPort: agentBrowser?.vncPort ?? globalBrowser?.vncPort ?? _constants.DEFAULT_SANDBOX_BROWSER_VNC_PORT,
    noVncPort: agentBrowser?.noVncPort ?? globalBrowser?.noVncPort ?? _constants.DEFAULT_SANDBOX_BROWSER_NOVNC_PORT,
    headless: agentBrowser?.headless ?? globalBrowser?.headless ?? false,
    enableNoVnc: agentBrowser?.enableNoVnc ?? globalBrowser?.enableNoVnc ?? true,
    allowHostControl: agentBrowser?.allowHostControl ?? globalBrowser?.allowHostControl ?? false,
    autoStart: agentBrowser?.autoStart ?? globalBrowser?.autoStart ?? true,
    autoStartTimeoutMs: agentBrowser?.autoStartTimeoutMs ??
    globalBrowser?.autoStartTimeoutMs ??
    _constants.DEFAULT_SANDBOX_BROWSER_AUTOSTART_TIMEOUT_MS
  };
}
function resolveSandboxPruneConfig(params) {
  const agentPrune = params.scope === "shared" ? undefined : params.agentPrune;
  const globalPrune = params.globalPrune;
  return {
    idleHours: agentPrune?.idleHours ?? globalPrune?.idleHours ?? _constants.DEFAULT_SANDBOX_IDLE_HOURS,
    maxAgeDays: agentPrune?.maxAgeDays ?? globalPrune?.maxAgeDays ?? _constants.DEFAULT_SANDBOX_MAX_AGE_DAYS
  };
}
function resolveSandboxConfigForAgent(cfg, agentId) {
  const agent = cfg?.agents?.defaults?.sandbox;
  // Agent-specific sandbox config overrides global
  let agentSandbox;
  const agentConfig = cfg && agentId ? (0, _agentScope.resolveAgentConfig)(cfg, agentId) : undefined;
  if (agentConfig?.sandbox) {
    agentSandbox = agentConfig.sandbox;
  }
  const scope = resolveSandboxScope({
    scope: agentSandbox?.scope ?? agent?.scope,
    perSession: agentSandbox?.perSession ?? agent?.perSession
  });
  const toolPolicy = (0, _toolPolicy.resolveSandboxToolPolicyForAgent)(cfg, agentId);
  return {
    mode: agentSandbox?.mode ?? agent?.mode ?? "off",
    scope,
    workspaceAccess: agentSandbox?.workspaceAccess ?? agent?.workspaceAccess ?? "none",
    workspaceRoot: agentSandbox?.workspaceRoot ?? agent?.workspaceRoot ?? _constants.DEFAULT_SANDBOX_WORKSPACE_ROOT,
    docker: resolveSandboxDockerConfig({
      scope,
      globalDocker: agent?.docker,
      agentDocker: agentSandbox?.docker
    }),
    browser: resolveSandboxBrowserConfig({
      scope,
      globalBrowser: agent?.browser,
      agentBrowser: agentSandbox?.browser
    }),
    tools: {
      allow: toolPolicy.allow,
      deny: toolPolicy.deny
    },
    prune: resolveSandboxPruneConfig({
      scope,
      globalPrune: agent?.prune,
      agentPrune: agentSandbox?.prune
    })
  };
} /* v9-33e0b3dbf456e29c */
