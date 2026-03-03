"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.createBrowserControlContext = createBrowserControlContext;exports.getBrowserControlState = getBrowserControlState;exports.startBrowserControlServiceFromConfig = startBrowserControlServiceFromConfig;exports.stopBrowserControlService = stopBrowserControlService;var _config = require("../config/config.js");
var _subsystem = require("../logging/subsystem.js");
var _config2 = require("./config.js");
var _extensionRelay = require("./extension-relay.js");
var _serverContext = require("./server-context.js");function _interopRequireWildcard(e, t) {if ("function" == typeof WeakMap) var r = new WeakMap(),n = new WeakMap();return (_interopRequireWildcard = function (e, t) {if (!t && e && e.__esModule) return e;var o,i,f = { __proto__: null, default: e };if (null === e || "object" != typeof e && "function" != typeof e) return f;if (o = t ? n : r) {if (o.has(e)) return o.get(e);o.set(e, f);}for (const t in e) "default" !== t && {}.hasOwnProperty.call(e, t) && ((i = (o = Object.defineProperty) && Object.getOwnPropertyDescriptor(e, t)) && (i.get || i.set) ? o(f, t, i) : f[t] = e[t]);return f;})(e, t);}
let state = null;
const log = (0, _subsystem.createSubsystemLogger)("browser");
const logService = log.child("service");
function getBrowserControlState() {
  return state;
}
function createBrowserControlContext() {
  return (0, _serverContext.createBrowserRouteContext)({
    getState: () => state
  });
}
async function startBrowserControlServiceFromConfig() {
  if (state) {
    return state;
  }
  const cfg = (0, _config.loadConfig)();
  const resolved = (0, _config2.resolveBrowserConfig)(cfg.browser, cfg);
  if (!resolved.enabled) {
    return null;
  }
  state = {
    server: null,
    port: resolved.controlPort,
    resolved,
    profiles: new Map()
  };
  // If any profile uses the Chrome extension relay, start the local relay server eagerly
  // so the extension can connect before the first browser action.
  for (const name of Object.keys(resolved.profiles)) {
    const profile = (0, _config2.resolveProfile)(resolved, name);
    if (!profile || profile.driver !== "extension") {
      continue;
    }
    await (0, _extensionRelay.ensureChromeExtensionRelayServer)({ cdpUrl: profile.cdpUrl }).catch((err) => {
      logService.warn(`Chrome extension relay init failed for profile "${name}": ${String(err)}`);
    });
  }
  logService.info(`Browser control service ready (profiles=${Object.keys(resolved.profiles).length})`);
  return state;
}
async function stopBrowserControlService() {
  const current = state;
  if (!current) {
    return;
  }
  const ctx = (0, _serverContext.createBrowserRouteContext)({
    getState: () => state
  });
  try {
    for (const name of Object.keys(current.resolved.profiles)) {
      try {
        await ctx.forProfile(name).stopRunningBrowser();
      }
      catch {

        // ignore
      }}
  }
  catch (err) {
    logService.warn(`openclaw browser stop failed: ${String(err)}`);
  }
  state = null;
  // Optional: Playwright is not always available (e.g. embedded gateway builds).
  try {
    const mod = await Promise.resolve().then(() => jitiImport("./pw-ai.js").then((m) => _interopRequireWildcard(m)));
    await mod.closePlaywrightBrowserConnection();
  }
  catch {

    // ignore
  }} /* v9-a045522edeaa64fb */
