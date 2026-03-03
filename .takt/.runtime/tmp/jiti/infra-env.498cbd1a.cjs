"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.isTruthyEnvValue = isTruthyEnvValue;exports.logAcceptedEnvOption = logAcceptedEnvOption;exports.normalizeEnv = normalizeEnv;exports.normalizeZaiEnv = normalizeZaiEnv;var _subsystem = require("../logging/subsystem.js");
var _boolean = require("../utils/boolean.js");
const log = (0, _subsystem.createSubsystemLogger)("env");
const loggedEnv = new Set();
function formatEnvValue(value, redact) {
  if (redact) {
    return "<redacted>";
  }
  const singleLine = value.replace(/\s+/g, " ").trim();
  if (singleLine.length <= 160) {
    return singleLine;
  }
  return `${singleLine.slice(0, 160)}…`;
}
function logAcceptedEnvOption(option) {
  if (process.env.VITEST || process.env.NODE_ENV === "test") {
    return;
  }
  if (loggedEnv.has(option.key)) {
    return;
  }
  const rawValue = option.value ?? process.env[option.key];
  if (!rawValue || !rawValue.trim()) {
    return;
  }
  loggedEnv.add(option.key);
  log.info(`env: ${option.key}=${formatEnvValue(rawValue, option.redact)} (${option.description})`);
}
function normalizeZaiEnv() {
  if (!process.env.ZAI_API_KEY?.trim() && process.env.Z_AI_API_KEY?.trim()) {
    process.env.ZAI_API_KEY = process.env.Z_AI_API_KEY;
  }
}
function isTruthyEnvValue(value) {
  return (0, _boolean.parseBooleanValue)(value) === true;
}
function normalizeEnv() {
  normalizeZaiEnv();
} /* v9-35eaa34a5c120c5d */
