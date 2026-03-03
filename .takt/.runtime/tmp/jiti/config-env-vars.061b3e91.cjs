"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.collectConfigEnvVars = collectConfigEnvVars;function collectConfigEnvVars(cfg) {
  const envConfig = cfg?.env;
  if (!envConfig) {
    return {};
  }
  const entries = {};
  if (envConfig.vars) {
    for (const [key, value] of Object.entries(envConfig.vars)) {
      if (!value) {
        continue;
      }
      entries[key] = value;
    }
  }
  for (const [key, value] of Object.entries(envConfig)) {
    if (key === "shellEnv" || key === "vars") {
      continue;
    }
    if (typeof value !== "string" || !value.trim()) {
      continue;
    }
    entries[key] = value;
  }
  return entries;
} /* v9-4d13c950d1daf93e */
