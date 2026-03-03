"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.approveNodePairing = approveNodePairing;exports.getPairedNode = getPairedNode;exports.listNodePairing = listNodePairing;exports.rejectNodePairing = rejectNodePairing;exports.renamePairedNode = renamePairedNode;exports.requestNodePairing = requestNodePairing;exports.updatePairedNodeMetadata = updatePairedNodeMetadata;exports.verifyNodeToken = verifyNodeToken;var _nodeCrypto = require("node:crypto");
var _promises = _interopRequireDefault(require("node:fs/promises"));
var _nodePath = _interopRequireDefault(require("node:path"));
var _paths = require("../config/paths.js");function _interopRequireDefault(e) {return e && e.__esModule ? e : { default: e };}
const PENDING_TTL_MS = 5 * 60 * 1000;
function resolvePaths(baseDir) {
  const root = baseDir ?? (0, _paths.resolveStateDir)();
  const dir = _nodePath.default.join(root, "nodes");
  return {
    dir,
    pendingPath: _nodePath.default.join(dir, "pending.json"),
    pairedPath: _nodePath.default.join(dir, "paired.json")
  };
}
async function readJSON(filePath) {
  try {
    const raw = await _promises.default.readFile(filePath, "utf8");
    return JSON.parse(raw);
  }
  catch {
    return null;
  }
}
async function writeJSONAtomic(filePath, value) {
  const dir = _nodePath.default.dirname(filePath);
  await _promises.default.mkdir(dir, { recursive: true });
  const tmp = `${filePath}.${(0, _nodeCrypto.randomUUID)()}.tmp`;
  await _promises.default.writeFile(tmp, JSON.stringify(value, null, 2), "utf8");
  try {
    await _promises.default.chmod(tmp, 0o600);
  }
  catch {

    // best-effort; ignore on platforms without chmod
  }await _promises.default.rename(tmp, filePath);
  try {
    await _promises.default.chmod(filePath, 0o600);
  }
  catch {

    // best-effort; ignore on platforms without chmod
  }}
function pruneExpiredPending(pendingById, nowMs) {
  for (const [id, req] of Object.entries(pendingById)) {
    if (nowMs - req.ts > PENDING_TTL_MS) {
      delete pendingById[id];
    }
  }
}
let lock = Promise.resolve();
async function withLock(fn) {
  const prev = lock;
  let release;
  lock = new Promise((resolve) => {
    release = resolve;
  });
  await prev;
  try {
    return await fn();
  } finally
  {
    release?.();
  }
}
async function loadState(baseDir) {
  const { pendingPath, pairedPath } = resolvePaths(baseDir);
  const [pending, paired] = await Promise.all([
  readJSON(pendingPath),
  readJSON(pairedPath)]
  );
  const state = {
    pendingById: pending ?? {},
    pairedByNodeId: paired ?? {}
  };
  pruneExpiredPending(state.pendingById, Date.now());
  return state;
}
async function persistState(state, baseDir) {
  const { pendingPath, pairedPath } = resolvePaths(baseDir);
  await Promise.all([
  writeJSONAtomic(pendingPath, state.pendingById),
  writeJSONAtomic(pairedPath, state.pairedByNodeId)]
  );
}
function normalizeNodeId(nodeId) {
  return nodeId.trim();
}
function newToken() {
  return (0, _nodeCrypto.randomUUID)().replaceAll("-", "");
}
async function listNodePairing(baseDir) {
  const state = await loadState(baseDir);
  const pending = Object.values(state.pendingById).toSorted((a, b) => b.ts - a.ts);
  const paired = Object.values(state.pairedByNodeId).toSorted((a, b) => b.approvedAtMs - a.approvedAtMs);
  return { pending, paired };
}
async function getPairedNode(nodeId, baseDir) {
  const state = await loadState(baseDir);
  return state.pairedByNodeId[normalizeNodeId(nodeId)] ?? null;
}
async function requestNodePairing(req, baseDir) {
  return await withLock(async () => {
    const state = await loadState(baseDir);
    const nodeId = normalizeNodeId(req.nodeId);
    if (!nodeId) {
      throw new Error("nodeId required");
    }
    const existing = Object.values(state.pendingById).find((p) => p.nodeId === nodeId);
    if (existing) {
      return { status: "pending", request: existing, created: false };
    }
    const isRepair = Boolean(state.pairedByNodeId[nodeId]);
    const request = {
      requestId: (0, _nodeCrypto.randomUUID)(),
      nodeId,
      displayName: req.displayName,
      platform: req.platform,
      version: req.version,
      coreVersion: req.coreVersion,
      uiVersion: req.uiVersion,
      deviceFamily: req.deviceFamily,
      modelIdentifier: req.modelIdentifier,
      caps: req.caps,
      commands: req.commands,
      permissions: req.permissions,
      remoteIp: req.remoteIp,
      silent: req.silent,
      isRepair,
      ts: Date.now()
    };
    state.pendingById[request.requestId] = request;
    await persistState(state, baseDir);
    return { status: "pending", request, created: true };
  });
}
async function approveNodePairing(requestId, baseDir) {
  return await withLock(async () => {
    const state = await loadState(baseDir);
    const pending = state.pendingById[requestId];
    if (!pending) {
      return null;
    }
    const now = Date.now();
    const existing = state.pairedByNodeId[pending.nodeId];
    const node = {
      nodeId: pending.nodeId,
      token: newToken(),
      displayName: pending.displayName,
      platform: pending.platform,
      version: pending.version,
      coreVersion: pending.coreVersion,
      uiVersion: pending.uiVersion,
      deviceFamily: pending.deviceFamily,
      modelIdentifier: pending.modelIdentifier,
      caps: pending.caps,
      commands: pending.commands,
      permissions: pending.permissions,
      remoteIp: pending.remoteIp,
      createdAtMs: existing?.createdAtMs ?? now,
      approvedAtMs: now
    };
    delete state.pendingById[requestId];
    state.pairedByNodeId[pending.nodeId] = node;
    await persistState(state, baseDir);
    return { requestId, node };
  });
}
async function rejectNodePairing(requestId, baseDir) {
  return await withLock(async () => {
    const state = await loadState(baseDir);
    const pending = state.pendingById[requestId];
    if (!pending) {
      return null;
    }
    delete state.pendingById[requestId];
    await persistState(state, baseDir);
    return { requestId, nodeId: pending.nodeId };
  });
}
async function verifyNodeToken(nodeId, token, baseDir) {
  const state = await loadState(baseDir);
  const normalized = normalizeNodeId(nodeId);
  const node = state.pairedByNodeId[normalized];
  if (!node) {
    return { ok: false };
  }
  return node.token === token ? { ok: true, node } : { ok: false };
}
async function updatePairedNodeMetadata(nodeId, patch, baseDir) {
  await withLock(async () => {
    const state = await loadState(baseDir);
    const normalized = normalizeNodeId(nodeId);
    const existing = state.pairedByNodeId[normalized];
    if (!existing) {
      return;
    }
    const next = {
      ...existing,
      displayName: patch.displayName ?? existing.displayName,
      platform: patch.platform ?? existing.platform,
      version: patch.version ?? existing.version,
      coreVersion: patch.coreVersion ?? existing.coreVersion,
      uiVersion: patch.uiVersion ?? existing.uiVersion,
      deviceFamily: patch.deviceFamily ?? existing.deviceFamily,
      modelIdentifier: patch.modelIdentifier ?? existing.modelIdentifier,
      remoteIp: patch.remoteIp ?? existing.remoteIp,
      caps: patch.caps ?? existing.caps,
      commands: patch.commands ?? existing.commands,
      bins: patch.bins ?? existing.bins,
      permissions: patch.permissions ?? existing.permissions,
      lastConnectedAtMs: patch.lastConnectedAtMs ?? existing.lastConnectedAtMs
    };
    state.pairedByNodeId[normalized] = next;
    await persistState(state, baseDir);
  });
}
async function renamePairedNode(nodeId, displayName, baseDir) {
  return await withLock(async () => {
    const state = await loadState(baseDir);
    const normalized = normalizeNodeId(nodeId);
    const existing = state.pairedByNodeId[normalized];
    if (!existing) {
      return null;
    }
    const trimmed = displayName.trim();
    if (!trimmed) {
      throw new Error("displayName required");
    }
    const next = { ...existing, displayName: trimmed };
    state.pairedByNodeId[normalized] = next;
    await persistState(state, baseDir);
    return next;
  });
} /* v9-da98e463ef143486 */
