"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.clearDeviceAuthToken = clearDeviceAuthToken;exports.loadDeviceAuthToken = loadDeviceAuthToken;exports.storeDeviceAuthToken = storeDeviceAuthToken;var _nodeFs = _interopRequireDefault(require("node:fs"));
var _nodePath = _interopRequireDefault(require("node:path"));
var _paths = require("../config/paths.js");function _interopRequireDefault(e) {return e && e.__esModule ? e : { default: e };}
const DEVICE_AUTH_FILE = "device-auth.json";
function resolveDeviceAuthPath(env = process.env) {
  return _nodePath.default.join((0, _paths.resolveStateDir)(env), "identity", DEVICE_AUTH_FILE);
}
function normalizeRole(role) {
  return role.trim();
}
function normalizeScopes(scopes) {
  if (!Array.isArray(scopes)) {
    return [];
  }
  const out = new Set();
  for (const scope of scopes) {
    const trimmed = scope.trim();
    if (trimmed) {
      out.add(trimmed);
    }
  }
  return [...out].toSorted();
}
function readStore(filePath) {
  try {
    if (!_nodeFs.default.existsSync(filePath)) {
      return null;
    }
    const raw = _nodeFs.default.readFileSync(filePath, "utf8");
    const parsed = JSON.parse(raw);
    if (parsed?.version !== 1 || typeof parsed.deviceId !== "string") {
      return null;
    }
    if (!parsed.tokens || typeof parsed.tokens !== "object") {
      return null;
    }
    return parsed;
  }
  catch {
    return null;
  }
}
function writeStore(filePath, store) {
  _nodeFs.default.mkdirSync(_nodePath.default.dirname(filePath), { recursive: true });
  _nodeFs.default.writeFileSync(filePath, `${JSON.stringify(store, null, 2)}\n`, { mode: 0o600 });
  try {
    _nodeFs.default.chmodSync(filePath, 0o600);
  }
  catch {

    // best-effort
  }}
function loadDeviceAuthToken(params) {
  const filePath = resolveDeviceAuthPath(params.env);
  const store = readStore(filePath);
  if (!store) {
    return null;
  }
  if (store.deviceId !== params.deviceId) {
    return null;
  }
  const role = normalizeRole(params.role);
  const entry = store.tokens[role];
  if (!entry || typeof entry.token !== "string") {
    return null;
  }
  return entry;
}
function storeDeviceAuthToken(params) {
  const filePath = resolveDeviceAuthPath(params.env);
  const existing = readStore(filePath);
  const role = normalizeRole(params.role);
  const next = {
    version: 1,
    deviceId: params.deviceId,
    tokens: existing && existing.deviceId === params.deviceId && existing.tokens ?
    { ...existing.tokens } :
    {}
  };
  const entry = {
    token: params.token,
    role,
    scopes: normalizeScopes(params.scopes),
    updatedAtMs: Date.now()
  };
  next.tokens[role] = entry;
  writeStore(filePath, next);
  return entry;
}
function clearDeviceAuthToken(params) {
  const filePath = resolveDeviceAuthPath(params.env);
  const store = readStore(filePath);
  if (!store || store.deviceId !== params.deviceId) {
    return;
  }
  const role = normalizeRole(params.role);
  if (!store.tokens[role]) {
    return;
  }
  const next = {
    version: 1,
    deviceId: store.deviceId,
    tokens: { ...store.tokens }
  };
  delete next.tokens[role];
  writeStore(filePath, next);
} /* v9-c29769b870cd9438 */
