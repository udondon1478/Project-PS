"use strict";Object.defineProperty(exports, "__esModule", { value: true });Object.defineProperty(exports, "decorateOpenClawProfile", { enumerable: true, get: function () {return _chromeProfileDecoration.decorateOpenClawProfile;} });Object.defineProperty(exports, "ensureProfileCleanExit", { enumerable: true, get: function () {return _chromeProfileDecoration.ensureProfileCleanExit;} });Object.defineProperty(exports, "findChromeExecutableLinux", { enumerable: true, get: function () {return _chromeExecutables.findChromeExecutableLinux;} });Object.defineProperty(exports, "findChromeExecutableMac", { enumerable: true, get: function () {return _chromeExecutables.findChromeExecutableMac;} });Object.defineProperty(exports, "findChromeExecutableWindows", { enumerable: true, get: function () {return _chromeExecutables.findChromeExecutableWindows;} });exports.getChromeWebSocketUrl = getChromeWebSocketUrl;exports.isChromeCdpReady = isChromeCdpReady;exports.isChromeReachable = isChromeReachable;Object.defineProperty(exports, "isProfileDecorated", { enumerable: true, get: function () {return _chromeProfileDecoration.isProfileDecorated;} });exports.launchOpenClawChrome = launchOpenClawChrome;Object.defineProperty(exports, "resolveBrowserExecutableForPlatform", { enumerable: true, get: function () {return _chromeExecutables.resolveBrowserExecutableForPlatform;} });exports.resolveOpenClawUserDataDir = resolveOpenClawUserDataDir;exports.stopOpenClawChrome = stopOpenClawChrome;var _nodeChild_process = require("node:child_process");
var _nodeFs = _interopRequireDefault(require("node:fs"));
var _nodeOs = _interopRequireDefault(require("node:os"));
var _nodePath = _interopRequireDefault(require("node:path"));
var _ws = _interopRequireDefault(require("ws"));
var _ports = require("../infra/ports.js");
var _subsystem = require("../logging/subsystem.js");
var _utils = require("../utils.js");
var _cdpHelpers = require("./cdp.helpers.js");
var _cdp = require("./cdp.js");
var _chromeExecutables = require("./chrome.executables.js");
var _chromeProfileDecoration = require("./chrome.profile-decoration.js");
var _constants = require("./constants.js");function _interopRequireDefault(e) {return e && e.__esModule ? e : { default: e };}
const log = (0, _subsystem.createSubsystemLogger)("browser").child("chrome");


function exists(filePath) {
  try {
    return _nodeFs.default.existsSync(filePath);
  }
  catch {
    return false;
  }
}
function resolveBrowserExecutable(resolved) {
  return (0, _chromeExecutables.resolveBrowserExecutableForPlatform)(resolved, process.platform);
}
function resolveOpenClawUserDataDir(profileName = _constants.DEFAULT_OPENCLAW_BROWSER_PROFILE_NAME) {
  return _nodePath.default.join(_utils.CONFIG_DIR, "browser", profileName, "user-data");
}
function cdpUrlForPort(cdpPort) {
  return `http://127.0.0.1:${cdpPort}`;
}
async function isChromeReachable(cdpUrl, timeoutMs = 500) {
  const version = await fetchChromeVersion(cdpUrl, timeoutMs);
  return Boolean(version);
}
async function fetchChromeVersion(cdpUrl, timeoutMs = 500) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const versionUrl = (0, _cdpHelpers.appendCdpPath)(cdpUrl, "/json/version");
    const res = await fetch(versionUrl, {
      signal: ctrl.signal,
      headers: (0, _cdp.getHeadersWithAuth)(versionUrl)
    });
    if (!res.ok) {
      return null;
    }
    const data = await res.json();
    if (!data || typeof data !== "object") {
      return null;
    }
    return data;
  }
  catch {
    return null;
  } finally
  {
    clearTimeout(t);
  }
}
async function getChromeWebSocketUrl(cdpUrl, timeoutMs = 500) {
  const version = await fetchChromeVersion(cdpUrl, timeoutMs);
  const wsUrl = String(version?.webSocketDebuggerUrl ?? "").trim();
  if (!wsUrl) {
    return null;
  }
  return (0, _cdp.normalizeCdpWsUrl)(wsUrl, cdpUrl);
}
async function canOpenWebSocket(wsUrl, timeoutMs = 800) {
  return await new Promise((resolve) => {
    const headers = (0, _cdp.getHeadersWithAuth)(wsUrl);
    const ws = new _ws.default(wsUrl, {
      handshakeTimeout: timeoutMs,
      ...(Object.keys(headers).length ? { headers } : {})
    });
    const timer = setTimeout(() => {
      try {
        ws.terminate();
      }
      catch {

        // ignore
      }resolve(false);
    }, Math.max(50, timeoutMs + 25));
    ws.once("open", () => {
      clearTimeout(timer);
      try {
        ws.close();
      }
      catch {

        // ignore
      }resolve(true);
    });
    ws.once("error", () => {
      clearTimeout(timer);
      resolve(false);
    });
  });
}
async function isChromeCdpReady(cdpUrl, timeoutMs = 500, handshakeTimeoutMs = 800) {
  const wsUrl = await getChromeWebSocketUrl(cdpUrl, timeoutMs);
  if (!wsUrl) {
    return false;
  }
  return await canOpenWebSocket(wsUrl, handshakeTimeoutMs);
}
async function launchOpenClawChrome(resolved, profile) {
  if (!profile.cdpIsLoopback) {
    throw new Error(`Profile "${profile.name}" is remote; cannot launch local Chrome.`);
  }
  await (0, _ports.ensurePortAvailable)(profile.cdpPort);
  const exe = resolveBrowserExecutable(resolved);
  if (!exe) {
    throw new Error("No supported browser found (Chrome/Brave/Edge/Chromium on macOS, Linux, or Windows).");
  }
  const userDataDir = resolveOpenClawUserDataDir(profile.name);
  _nodeFs.default.mkdirSync(userDataDir, { recursive: true });
  const needsDecorate = !(0, _chromeProfileDecoration.isProfileDecorated)(userDataDir, profile.name, (profile.color ?? _constants.DEFAULT_OPENCLAW_BROWSER_COLOR).toUpperCase());
  // First launch to create preference files if missing, then decorate and relaunch.
  const spawnOnce = () => {
    const args = [
    `--remote-debugging-port=${profile.cdpPort}`,
    `--user-data-dir=${userDataDir}`,
    "--no-first-run",
    "--no-default-browser-check",
    "--disable-sync",
    "--disable-background-networking",
    "--disable-component-update",
    "--disable-features=Translate,MediaRouter",
    "--disable-session-crashed-bubble",
    "--hide-crash-restore-bubble",
    "--password-store=basic"];

    if (resolved.headless) {
      // Best-effort; older Chromes may ignore.
      args.push("--headless=new");
      args.push("--disable-gpu");
    }
    if (resolved.noSandbox) {
      args.push("--no-sandbox");
      args.push("--disable-setuid-sandbox");
    }
    if (process.platform === "linux") {
      args.push("--disable-dev-shm-usage");
    }
    // Always open a blank tab to ensure a target exists.
    args.push("about:blank");
    return (0, _nodeChild_process.spawn)(exe.path, args, {
      stdio: "pipe",
      env: {
        ...process.env,
        // Reduce accidental sharing with the user's env.
        HOME: _nodeOs.default.homedir()
      }
    });
  };
  const startedAt = Date.now();
  const localStatePath = _nodePath.default.join(userDataDir, "Local State");
  const preferencesPath = _nodePath.default.join(userDataDir, "Default", "Preferences");
  const needsBootstrap = !exists(localStatePath) || !exists(preferencesPath);
  // If the profile doesn't exist yet, bootstrap it once so Chrome creates defaults.
  // Then decorate (if needed) before the "real" run.
  if (needsBootstrap) {
    const bootstrap = spawnOnce();
    const deadline = Date.now() + 10_000;
    while (Date.now() < deadline) {
      if (exists(localStatePath) && exists(preferencesPath)) {
        break;
      }
      await new Promise((r) => setTimeout(r, 100));
    }
    try {
      bootstrap.kill("SIGTERM");
    }
    catch {

      // ignore
    }const exitDeadline = Date.now() + 5000;
    while (Date.now() < exitDeadline) {
      if (bootstrap.exitCode != null) {
        break;
      }
      await new Promise((r) => setTimeout(r, 50));
    }
  }
  if (needsDecorate) {
    try {
      (0, _chromeProfileDecoration.decorateOpenClawProfile)(userDataDir, {
        name: profile.name,
        color: profile.color
      });
      log.info(`🦞 openclaw browser profile decorated (${profile.color})`);
    }
    catch (err) {
      log.warn(`openclaw browser profile decoration failed: ${String(err)}`);
    }
  }
  try {
    (0, _chromeProfileDecoration.ensureProfileCleanExit)(userDataDir);
  }
  catch (err) {
    log.warn(`openclaw browser clean-exit prefs failed: ${String(err)}`);
  }
  const proc = spawnOnce();
  // Wait for CDP to come up.
  const readyDeadline = Date.now() + 15_000;
  while (Date.now() < readyDeadline) {
    if (await isChromeReachable(profile.cdpUrl, 500)) {
      break;
    }
    await new Promise((r) => setTimeout(r, 200));
  }
  if (!(await isChromeReachable(profile.cdpUrl, 500))) {
    try {
      proc.kill("SIGKILL");
    }
    catch {

      // ignore
    }throw new Error(`Failed to start Chrome CDP on port ${profile.cdpPort} for profile "${profile.name}".`);
  }
  const pid = proc.pid ?? -1;
  log.info(`🦞 openclaw browser started (${exe.kind}) profile "${profile.name}" on 127.0.0.1:${profile.cdpPort} (pid ${pid})`);
  return {
    pid,
    exe,
    userDataDir,
    cdpPort: profile.cdpPort,
    startedAt,
    proc
  };
}
async function stopOpenClawChrome(running, timeoutMs = 2500) {
  const proc = running.proc;
  if (proc.killed) {
    return;
  }
  try {
    proc.kill("SIGTERM");
  }
  catch {

    // ignore
  }const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (!proc.exitCode && proc.killed) {
      break;
    }
    if (!(await isChromeReachable(cdpUrlForPort(running.cdpPort), 200))) {
      return;
    }
    await new Promise((r) => setTimeout(r, 100));
  }
  try {
    proc.kill("SIGKILL");
  }
  catch {

    // ignore
  }} /* v9-0f5fcfec04337d2a */
