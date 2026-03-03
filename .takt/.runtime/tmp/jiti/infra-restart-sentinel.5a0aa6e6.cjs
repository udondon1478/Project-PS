"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.consumeRestartSentinel = consumeRestartSentinel;exports.formatDoctorNonInteractiveHint = formatDoctorNonInteractiveHint;exports.formatRestartSentinelMessage = formatRestartSentinelMessage;exports.readRestartSentinel = readRestartSentinel;exports.resolveRestartSentinelPath = resolveRestartSentinelPath;exports.summarizeRestartSentinel = summarizeRestartSentinel;exports.trimLogTail = trimLogTail;exports.writeRestartSentinel = writeRestartSentinel;var _promises = _interopRequireDefault(require("node:fs/promises"));
var _nodePath = _interopRequireDefault(require("node:path"));
var _commandFormat = require("../cli/command-format.js");
var _paths = require("../config/paths.js");function _interopRequireDefault(e) {return e && e.__esModule ? e : { default: e };}
const SENTINEL_FILENAME = "restart-sentinel.json";
function formatDoctorNonInteractiveHint(env = process.env) {
  return `Run: ${(0, _commandFormat.formatCliCommand)("openclaw doctor --non-interactive", env)}`;
}
function resolveRestartSentinelPath(env = process.env) {
  return _nodePath.default.join((0, _paths.resolveStateDir)(env), SENTINEL_FILENAME);
}
async function writeRestartSentinel(payload, env = process.env) {
  const filePath = resolveRestartSentinelPath(env);
  await _promises.default.mkdir(_nodePath.default.dirname(filePath), { recursive: true });
  const data = { version: 1, payload };
  await _promises.default.writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf-8");
  return filePath;
}
async function readRestartSentinel(env = process.env) {
  const filePath = resolveRestartSentinelPath(env);
  try {
    const raw = await _promises.default.readFile(filePath, "utf-8");
    let parsed;
    try {
      parsed = JSON.parse(raw);
    }
    catch {
      await _promises.default.unlink(filePath).catch(() => {});
      return null;
    }
    if (!parsed || parsed.version !== 1 || !parsed.payload) {
      await _promises.default.unlink(filePath).catch(() => {});
      return null;
    }
    return parsed;
  }
  catch {
    return null;
  }
}
async function consumeRestartSentinel(env = process.env) {
  const filePath = resolveRestartSentinelPath(env);
  const parsed = await readRestartSentinel(env);
  if (!parsed) {
    return null;
  }
  await _promises.default.unlink(filePath).catch(() => {});
  return parsed;
}
function formatRestartSentinelMessage(payload) {
  return `GatewayRestart:\n${JSON.stringify(payload, null, 2)}`;
}
function summarizeRestartSentinel(payload) {
  const kind = payload.kind;
  const status = payload.status;
  const mode = payload.stats?.mode ? ` (${payload.stats.mode})` : "";
  return `Gateway restart ${kind} ${status}${mode}`.trim();
}
function trimLogTail(input, maxChars = 8000) {
  if (!input) {
    return null;
  }
  const text = input.trimEnd();
  if (text.length <= maxChars) {
    return text;
  }
  return `…${text.slice(text.length - maxChars)}`;
} /* v9-e1eb887c409d03f2 */
