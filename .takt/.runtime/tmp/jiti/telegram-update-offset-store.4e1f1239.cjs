"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.readTelegramUpdateOffset = readTelegramUpdateOffset;exports.writeTelegramUpdateOffset = writeTelegramUpdateOffset;var _nodeCrypto = _interopRequireDefault(require("node:crypto"));
var _promises = _interopRequireDefault(require("node:fs/promises"));
var _nodeOs = _interopRequireDefault(require("node:os"));
var _nodePath = _interopRequireDefault(require("node:path"));
var _paths = require("../config/paths.js");function _interopRequireDefault(e) {return e && e.__esModule ? e : { default: e };}
const STORE_VERSION = 1;
function normalizeAccountId(accountId) {
  const trimmed = accountId?.trim();
  if (!trimmed) {
    return "default";
  }
  return trimmed.replace(/[^a-z0-9._-]+/gi, "_");
}
function resolveTelegramUpdateOffsetPath(accountId, env = process.env) {
  const stateDir = (0, _paths.resolveStateDir)(env, _nodeOs.default.homedir);
  const normalized = normalizeAccountId(accountId);
  return _nodePath.default.join(stateDir, "telegram", `update-offset-${normalized}.json`);
}
function safeParseState(raw) {
  try {
    const parsed = JSON.parse(raw);
    if (parsed?.version !== STORE_VERSION) {
      return null;
    }
    if (parsed.lastUpdateId !== null && typeof parsed.lastUpdateId !== "number") {
      return null;
    }
    return parsed;
  }
  catch {
    return null;
  }
}
async function readTelegramUpdateOffset(params) {
  const filePath = resolveTelegramUpdateOffsetPath(params.accountId, params.env);
  try {
    const raw = await _promises.default.readFile(filePath, "utf-8");
    const parsed = safeParseState(raw);
    return parsed?.lastUpdateId ?? null;
  }
  catch (err) {
    const code = err.code;
    if (code === "ENOENT") {
      return null;
    }
    return null;
  }
}
async function writeTelegramUpdateOffset(params) {
  const filePath = resolveTelegramUpdateOffsetPath(params.accountId, params.env);
  const dir = _nodePath.default.dirname(filePath);
  await _promises.default.mkdir(dir, { recursive: true, mode: 0o700 });
  const tmp = _nodePath.default.join(dir, `${_nodePath.default.basename(filePath)}.${_nodeCrypto.default.randomUUID()}.tmp`);
  const payload = {
    version: STORE_VERSION,
    lastUpdateId: params.updateId
  };
  await _promises.default.writeFile(tmp, `${JSON.stringify(payload, null, 2)}\n`, {
    encoding: "utf-8"
  });
  await _promises.default.chmod(tmp, 0o600);
  await _promises.default.rename(tmp, filePath);
} /* v9-459fd86e34965183 */
