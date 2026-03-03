"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.applyConfigOverrides = applyConfigOverrides;exports.getConfigOverrides = getConfigOverrides;exports.resetConfigOverrides = resetConfigOverrides;exports.setConfigOverride = setConfigOverride;exports.unsetConfigOverride = unsetConfigOverride;var _configPaths = require("./config-paths.js");
let overrides = {};
function mergeOverrides(base, override) {
  if (!isPlainObject(base) || !isPlainObject(override)) {
    return override;
  }
  const next = { ...base };
  for (const [key, value] of Object.entries(override)) {
    if (value === undefined) {
      continue;
    }
    next[key] = mergeOverrides(base[key], value);
  }
  return next;
}
function isPlainObject(value) {
  return typeof value === "object" &&
  value !== null &&
  !Array.isArray(value) &&
  Object.prototype.toString.call(value) === "[object Object]";
}
function getConfigOverrides() {
  return overrides;
}
function resetConfigOverrides() {
  overrides = {};
}
function setConfigOverride(pathRaw, value) {
  const parsed = (0, _configPaths.parseConfigPath)(pathRaw);
  if (!parsed.ok || !parsed.path) {
    return { ok: false, error: parsed.error ?? "Invalid path." };
  }
  (0, _configPaths.setConfigValueAtPath)(overrides, parsed.path, value);
  return { ok: true };
}
function unsetConfigOverride(pathRaw) {
  const parsed = (0, _configPaths.parseConfigPath)(pathRaw);
  if (!parsed.ok || !parsed.path) {
    return {
      ok: false,
      removed: false,
      error: parsed.error ?? "Invalid path."
    };
  }
  const removed = (0, _configPaths.unsetConfigValueAtPath)(overrides, parsed.path);
  return { ok: true, removed };
}
function applyConfigOverrides(cfg) {
  if (!overrides || Object.keys(overrides).length === 0) {
    return cfg;
  }
  return mergeOverrides(cfg, overrides);
} /* v9-e2315d840c3af88e */
