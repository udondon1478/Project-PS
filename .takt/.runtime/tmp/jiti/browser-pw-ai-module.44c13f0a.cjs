"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.getPwAiModule = getPwAiModule;var _errors = require("../infra/errors.js");function _interopRequireWildcard(e, t) {if ("function" == typeof WeakMap) var r = new WeakMap(),n = new WeakMap();return (_interopRequireWildcard = function (e, t) {if (!t && e && e.__esModule) return e;var o,i,f = { __proto__: null, default: e };if (null === e || "object" != typeof e && "function" != typeof e) return f;if (o = t ? n : r) {if (o.has(e)) return o.get(e);o.set(e, f);}for (const t in e) "default" !== t && {}.hasOwnProperty.call(e, t) && ((i = (o = Object.defineProperty) && Object.getOwnPropertyDescriptor(e, t)) && (i.get || i.set) ? o(f, t, i) : f[t] = e[t]);return f;})(e, t);}
let pwAiModuleSoft = null;
let pwAiModuleStrict = null;
function isModuleNotFoundError(err) {
  const code = (0, _errors.extractErrorCode)(err);
  if (code === "ERR_MODULE_NOT_FOUND") {
    return true;
  }
  const msg = (0, _errors.formatErrorMessage)(err);
  return msg.includes("Cannot find module") ||
  msg.includes("Cannot find package") ||
  msg.includes("Failed to resolve import") ||
  msg.includes("Failed to resolve entry for package") ||
  msg.includes("Failed to load url");
}
async function loadPwAiModule(mode) {
  try {
    return await Promise.resolve().then(() => jitiImport("./pw-ai.js").then((m) => _interopRequireWildcard(m)));
  }
  catch (err) {
    if (mode === "soft") {
      return null;
    }
    if (isModuleNotFoundError(err)) {
      return null;
    }
    throw err;
  }
}
async function getPwAiModule(opts) {
  const mode = opts?.mode ?? "soft";
  if (mode === "soft") {
    if (!pwAiModuleSoft) {
      pwAiModuleSoft = loadPwAiModule("soft");
    }
    return await pwAiModuleSoft;
  }
  if (!pwAiModuleStrict) {
    pwAiModuleStrict = loadPwAiModule("strict");
  }
  return await pwAiModuleStrict;
} /* v9-cf36ed3bf15a5afa */
