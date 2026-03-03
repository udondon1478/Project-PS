"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.loadSubagentRegistryFromDisk = loadSubagentRegistryFromDisk;exports.resolveSubagentRegistryPath = resolveSubagentRegistryPath;exports.saveSubagentRegistryToDisk = saveSubagentRegistryToDisk;var _nodePath = _interopRequireDefault(require("node:path"));
var _paths = require("../config/paths.js");
var _jsonFile = require("../infra/json-file.js");
var _deliveryContext = require("../utils/delivery-context.js");function _interopRequireDefault(e) {return e && e.__esModule ? e : { default: e };}
const REGISTRY_VERSION = 2;
function resolveSubagentRegistryPath() {
  return _nodePath.default.join(_paths.STATE_DIR, "subagents", "runs.json");
}
function loadSubagentRegistryFromDisk() {
  const pathname = resolveSubagentRegistryPath();
  const raw = (0, _jsonFile.loadJsonFile)(pathname);
  if (!raw || typeof raw !== "object") {
    return new Map();
  }
  const record = raw;
  if (record.version !== 1 && record.version !== 2) {
    return new Map();
  }
  const runsRaw = record.runs;
  if (!runsRaw || typeof runsRaw !== "object") {
    return new Map();
  }
  const out = new Map();
  const isLegacy = record.version === 1;
  let migrated = false;
  for (const [runId, entry] of Object.entries(runsRaw)) {
    if (!entry || typeof entry !== "object") {
      continue;
    }
    const typed = entry;
    if (!typed.runId || typeof typed.runId !== "string") {
      continue;
    }
    const legacyCompletedAt = isLegacy && typeof typed.announceCompletedAt === "number" ?
    typed.announceCompletedAt :
    undefined;
    const cleanupCompletedAt = typeof typed.cleanupCompletedAt === "number" ? typed.cleanupCompletedAt : legacyCompletedAt;
    const cleanupHandled = typeof typed.cleanupHandled === "boolean" ?
    typed.cleanupHandled :
    isLegacy ?
    Boolean(typed.announceHandled ?? cleanupCompletedAt) :
    undefined;
    const requesterOrigin = (0, _deliveryContext.normalizeDeliveryContext)(typed.requesterOrigin ?? {
      channel: typeof typed.requesterChannel === "string" ? typed.requesterChannel : undefined,
      accountId: typeof typed.requesterAccountId === "string" ? typed.requesterAccountId : undefined
    });
    const { announceCompletedAt: _announceCompletedAt, announceHandled: _announceHandled, requesterChannel: _channel, requesterAccountId: _accountId, ...rest } = typed;
    out.set(runId, {
      ...rest,
      requesterOrigin,
      cleanupCompletedAt,
      cleanupHandled
    });
    if (isLegacy) {
      migrated = true;
    }
  }
  if (migrated) {
    try {
      saveSubagentRegistryToDisk(out);
    }
    catch {

      // ignore migration write failures
    }}
  return out;
}
function saveSubagentRegistryToDisk(runs) {
  const pathname = resolveSubagentRegistryPath();
  const serialized = {};
  for (const [runId, entry] of runs.entries()) {
    serialized[runId] = entry;
  }
  const out = {
    version: REGISTRY_VERSION,
    runs: serialized
  };
  (0, _jsonFile.saveJsonFile)(pathname, out);
} /* v9-9fdf77f03ba02c24 */
