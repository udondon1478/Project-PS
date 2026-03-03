"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.ensureSandboxBrowser = ensureSandboxBrowser;var _bridgeServer = require("../../browser/bridge-server.js");
var _config = require("../../browser/config.js");
var _constants = require("../../browser/constants.js");
var _browserBridges = require("./browser-bridges.js");
var _constants2 = require("./constants.js");
var _docker = require("./docker.js");
var _registry = require("./registry.js");
var _shared = require("./shared.js");
var _toolPolicy = require("./tool-policy.js");
async function waitForSandboxCdp(params) {
  const deadline = Date.now() + Math.max(0, params.timeoutMs);
  const url = `http://127.0.0.1:${params.cdpPort}/json/version`;
  while (Date.now() < deadline) {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 1000);
      try {
        const res = await fetch(url, { signal: ctrl.signal });
        if (res.ok) {
          return true;
        }
      } finally
      {
        clearTimeout(t);
      }
    }
    catch {

      // ignore
    }await new Promise((r) => setTimeout(r, 150));
  }
  return false;
}
function buildSandboxBrowserResolvedConfig(params) {
  const cdpHost = "127.0.0.1";
  return {
    enabled: true,
    evaluateEnabled: params.evaluateEnabled,
    controlPort: params.controlPort,
    cdpProtocol: "http",
    cdpHost,
    cdpIsLoopback: true,
    remoteCdpTimeoutMs: 1500,
    remoteCdpHandshakeTimeoutMs: 3000,
    color: _constants.DEFAULT_OPENCLAW_BROWSER_COLOR,
    executablePath: undefined,
    headless: params.headless,
    noSandbox: false,
    attachOnly: true,
    defaultProfile: _constants.DEFAULT_OPENCLAW_BROWSER_PROFILE_NAME,
    profiles: {
      [_constants.DEFAULT_OPENCLAW_BROWSER_PROFILE_NAME]: {
        cdpPort: params.cdpPort,
        color: _constants.DEFAULT_OPENCLAW_BROWSER_COLOR
      }
    }
  };
}
async function ensureSandboxBrowserImage(image) {
  const result = await (0, _docker.execDocker)(["image", "inspect", image], {
    allowFailure: true
  });
  if (result.code === 0) {
    return;
  }
  throw new Error(`Sandbox browser image not found: ${image}. Build it with scripts/sandbox-browser-setup.sh.`);
}
async function ensureSandboxBrowser(params) {
  if (!params.cfg.browser.enabled) {
    return null;
  }
  if (!(0, _toolPolicy.isToolAllowed)(params.cfg.tools, "browser")) {
    return null;
  }
  const slug = params.cfg.scope === "shared" ? "shared" : (0, _shared.slugifySessionKey)(params.scopeKey);
  const name = `${params.cfg.browser.containerPrefix}${slug}`;
  const containerName = name.slice(0, 63);
  const state = await (0, _docker.dockerContainerState)(containerName);
  if (!state.exists) {
    await ensureSandboxBrowserImage(params.cfg.browser.image ?? _constants2.DEFAULT_SANDBOX_BROWSER_IMAGE);
    const args = (0, _docker.buildSandboxCreateArgs)({
      name: containerName,
      cfg: params.cfg.docker,
      scopeKey: params.scopeKey,
      labels: { "openclaw.sandboxBrowser": "1" }
    });
    const mainMountSuffix = params.cfg.workspaceAccess === "ro" && params.workspaceDir === params.agentWorkspaceDir ?
    ":ro" :
    "";
    args.push("-v", `${params.workspaceDir}:${params.cfg.docker.workdir}${mainMountSuffix}`);
    if (params.cfg.workspaceAccess !== "none" && params.workspaceDir !== params.agentWorkspaceDir) {
      const agentMountSuffix = params.cfg.workspaceAccess === "ro" ? ":ro" : "";
      args.push("-v", `${params.agentWorkspaceDir}:${_constants2.SANDBOX_AGENT_WORKSPACE_MOUNT}${agentMountSuffix}`);
    }
    args.push("-p", `127.0.0.1::${params.cfg.browser.cdpPort}`);
    if (params.cfg.browser.enableNoVnc && !params.cfg.browser.headless) {
      args.push("-p", `127.0.0.1::${params.cfg.browser.noVncPort}`);
    }
    args.push("-e", `OPENCLAW_BROWSER_HEADLESS=${params.cfg.browser.headless ? "1" : "0"}`);
    args.push("-e", `OPENCLAW_BROWSER_ENABLE_NOVNC=${params.cfg.browser.enableNoVnc ? "1" : "0"}`);
    args.push("-e", `OPENCLAW_BROWSER_CDP_PORT=${params.cfg.browser.cdpPort}`);
    args.push("-e", `OPENCLAW_BROWSER_VNC_PORT=${params.cfg.browser.vncPort}`);
    args.push("-e", `OPENCLAW_BROWSER_NOVNC_PORT=${params.cfg.browser.noVncPort}`);
    args.push(params.cfg.browser.image);
    await (0, _docker.execDocker)(args);
    await (0, _docker.execDocker)(["start", containerName]);
  } else
  if (!state.running) {
    await (0, _docker.execDocker)(["start", containerName]);
  }
  const mappedCdp = await (0, _docker.readDockerPort)(containerName, params.cfg.browser.cdpPort);
  if (!mappedCdp) {
    throw new Error(`Failed to resolve CDP port mapping for ${containerName}.`);
  }
  const mappedNoVnc = params.cfg.browser.enableNoVnc && !params.cfg.browser.headless ?
  await (0, _docker.readDockerPort)(containerName, params.cfg.browser.noVncPort) :
  null;
  const existing = _browserBridges.BROWSER_BRIDGES.get(params.scopeKey);
  const existingProfile = existing ?
  (0, _config.resolveProfile)(existing.bridge.state.resolved, _constants.DEFAULT_OPENCLAW_BROWSER_PROFILE_NAME) :
  null;
  const shouldReuse = existing && existing.containerName === containerName && existingProfile?.cdpPort === mappedCdp;
  if (existing && !shouldReuse) {
    await (0, _bridgeServer.stopBrowserBridgeServer)(existing.bridge.server).catch(() => undefined);
    _browserBridges.BROWSER_BRIDGES.delete(params.scopeKey);
  }
  const bridge = (() => {
    if (shouldReuse && existing) {
      return existing.bridge;
    }
    return null;
  })();
  const ensureBridge = async () => {
    if (bridge) {
      return bridge;
    }
    const onEnsureAttachTarget = params.cfg.browser.autoStart ?
    async () => {
      const state = await (0, _docker.dockerContainerState)(containerName);
      if (state.exists && !state.running) {
        await (0, _docker.execDocker)(["start", containerName]);
      }
      const ok = await waitForSandboxCdp({
        cdpPort: mappedCdp,
        timeoutMs: params.cfg.browser.autoStartTimeoutMs
      });
      if (!ok) {
        throw new Error(`Sandbox browser CDP did not become reachable on 127.0.0.1:${mappedCdp} within ${params.cfg.browser.autoStartTimeoutMs}ms.`);
      }
    } :
    undefined;
    return await (0, _bridgeServer.startBrowserBridgeServer)({
      resolved: buildSandboxBrowserResolvedConfig({
        controlPort: 0,
        cdpPort: mappedCdp,
        headless: params.cfg.browser.headless,
        evaluateEnabled: params.evaluateEnabled ?? _constants.DEFAULT_BROWSER_EVALUATE_ENABLED
      }),
      onEnsureAttachTarget
    });
  };
  const resolvedBridge = await ensureBridge();
  if (!shouldReuse) {
    _browserBridges.BROWSER_BRIDGES.set(params.scopeKey, {
      bridge: resolvedBridge,
      containerName
    });
  }
  const now = Date.now();
  await (0, _registry.updateBrowserRegistry)({
    containerName,
    sessionKey: params.scopeKey,
    createdAtMs: now,
    lastUsedAtMs: now,
    image: params.cfg.browser.image,
    cdpPort: mappedCdp,
    noVncPort: mappedNoVnc ?? undefined
  });
  const noVncUrl = mappedNoVnc && params.cfg.browser.enableNoVnc && !params.cfg.browser.headless ?
  `http://127.0.0.1:${mappedNoVnc}/vnc.html?autoconnect=1&resize=remote` :
  undefined;
  return {
    bridgeUrl: resolvedBridge.baseUrl,
    noVncUrl,
    containerName
  };
} /* v9-b956a1b927567b7b */
