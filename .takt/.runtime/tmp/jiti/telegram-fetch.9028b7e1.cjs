"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.resolveTelegramFetch = resolveTelegramFetch;var net = _interopRequireWildcard(require("node:net"));
var _fetch = require("../infra/fetch.js");
var _subsystem = require("../logging/subsystem.js");
var _networkConfig = require("./network-config.js");function _interopRequireWildcard(e, t) {if ("function" == typeof WeakMap) var r = new WeakMap(),n = new WeakMap();return (_interopRequireWildcard = function (e, t) {if (!t && e && e.__esModule) return e;var o,i,f = { __proto__: null, default: e };if (null === e || "object" != typeof e && "function" != typeof e) return f;if (o = t ? n : r) {if (o.has(e)) return o.get(e);o.set(e, f);}for (const t in e) "default" !== t && {}.hasOwnProperty.call(e, t) && ((i = (o = Object.defineProperty) && Object.getOwnPropertyDescriptor(e, t)) && (i.get || i.set) ? o(f, t, i) : f[t] = e[t]);return f;})(e, t);}
let appliedAutoSelectFamily = null;
const log = (0, _subsystem.createSubsystemLogger)("telegram/network");
// Node 22 workaround: disable autoSelectFamily to avoid Happy Eyeballs timeouts.
// See: https://github.com/nodejs/node/issues/54359
function applyTelegramNetworkWorkarounds(network) {
  const decision = (0, _networkConfig.resolveTelegramAutoSelectFamilyDecision)({ network });
  if (decision.value === null || decision.value === appliedAutoSelectFamily) {
    return;
  }
  appliedAutoSelectFamily = decision.value;
  if (typeof net.setDefaultAutoSelectFamily === "function") {
    try {
      net.setDefaultAutoSelectFamily(decision.value);
      const label = decision.source ? ` (${decision.source})` : "";
      log.info(`telegram: autoSelectFamily=${decision.value}${label}`);
    }
    catch {

      // ignore if unsupported by the runtime
    }}
}
// Prefer wrapped fetch when available to normalize AbortSignal across runtimes.
function resolveTelegramFetch(proxyFetch, options) {
  applyTelegramNetworkWorkarounds(options?.network);
  if (proxyFetch) {
    return (0, _fetch.resolveFetch)(proxyFetch);
  }
  const fetchImpl = (0, _fetch.resolveFetch)();
  if (!fetchImpl) {
    throw new Error("fetch is not available; set channels.telegram.proxy in config");
  }
  return fetchImpl;
} /* v9-837ab39e2885ba43 */
