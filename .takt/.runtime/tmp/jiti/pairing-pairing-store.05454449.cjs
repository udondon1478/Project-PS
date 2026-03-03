"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.addChannelAllowFromStoreEntry = addChannelAllowFromStoreEntry;exports.approveChannelPairingCode = approveChannelPairingCode;exports.listChannelPairingRequests = listChannelPairingRequests;exports.readChannelAllowFromStore = readChannelAllowFromStore;exports.removeChannelAllowFromStoreEntry = removeChannelAllowFromStoreEntry;exports.upsertChannelPairingRequest = upsertChannelPairingRequest;var _nodeCrypto = _interopRequireDefault(require("node:crypto"));
var _nodeFs = _interopRequireDefault(require("node:fs"));
var _nodeOs = _interopRequireDefault(require("node:os"));
var _nodePath = _interopRequireDefault(require("node:path"));
var _properLockfile = _interopRequireDefault(require("proper-lockfile"));
var _pairing = require("../channels/plugins/pairing.js");
var _paths = require("../config/paths.js");function _interopRequireDefault(e) {return e && e.__esModule ? e : { default: e };}
const PAIRING_CODE_LENGTH = 8;
const PAIRING_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const PAIRING_PENDING_TTL_MS = 60 * 60 * 1000;
const PAIRING_PENDING_MAX = 3;
const PAIRING_STORE_LOCK_OPTIONS = {
  retries: {
    retries: 10,
    factor: 2,
    minTimeout: 100,
    maxTimeout: 10_000,
    randomize: true
  },
  stale: 30_000
};
function resolveCredentialsDir(env = process.env) {
  const stateDir = (0, _paths.resolveStateDir)(env, _nodeOs.default.homedir);
  return (0, _paths.resolveOAuthDir)(env, stateDir);
}
/** Sanitize channel ID for use in filenames (prevent path traversal). */
function safeChannelKey(channel) {
  const raw = String(channel).trim().toLowerCase();
  if (!raw) {
    throw new Error("invalid pairing channel");
  }
  const safe = raw.replace(/[\\/:*?"<>|]/g, "_").replace(/\.\./g, "_");
  if (!safe || safe === "_") {
    throw new Error("invalid pairing channel");
  }
  return safe;
}
function resolvePairingPath(channel, env = process.env) {
  return _nodePath.default.join(resolveCredentialsDir(env), `${safeChannelKey(channel)}-pairing.json`);
}
function resolveAllowFromPath(channel, env = process.env) {
  return _nodePath.default.join(resolveCredentialsDir(env), `${safeChannelKey(channel)}-allowFrom.json`);
}
function safeParseJson(raw) {
  try {
    return JSON.parse(raw);
  }
  catch {
    return null;
  }
}
async function readJsonFile(filePath, fallback) {
  try {
    const raw = await _nodeFs.default.promises.readFile(filePath, "utf-8");
    const parsed = safeParseJson(raw);
    if (parsed == null) {
      return { value: fallback, exists: true };
    }
    return { value: parsed, exists: true };
  }
  catch (err) {
    const code = err.code;
    if (code === "ENOENT") {
      return { value: fallback, exists: false };
    }
    return { value: fallback, exists: false };
  }
}
async function writeJsonFile(filePath, value) {
  const dir = _nodePath.default.dirname(filePath);
  await _nodeFs.default.promises.mkdir(dir, { recursive: true, mode: 0o700 });
  const tmp = _nodePath.default.join(dir, `${_nodePath.default.basename(filePath)}.${_nodeCrypto.default.randomUUID()}.tmp`);
  await _nodeFs.default.promises.writeFile(tmp, `${JSON.stringify(value, null, 2)}\n`, {
    encoding: "utf-8"
  });
  await _nodeFs.default.promises.chmod(tmp, 0o600);
  await _nodeFs.default.promises.rename(tmp, filePath);
}
async function ensureJsonFile(filePath, fallback) {
  try {
    await _nodeFs.default.promises.access(filePath);
  }
  catch {
    await writeJsonFile(filePath, fallback);
  }
}
async function withFileLock(filePath, fallback, fn) {
  await ensureJsonFile(filePath, fallback);
  let release;
  try {
    release = await _properLockfile.default.lock(filePath, PAIRING_STORE_LOCK_OPTIONS);
    return await fn();
  } finally
  {
    if (release) {
      try {
        await release();
      }
      catch {

        // ignore unlock errors
      }}
  }
}
function parseTimestamp(value) {
  if (!value) {
    return null;
  }
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) {
    return null;
  }
  return parsed;
}
function isExpired(entry, nowMs) {
  const createdAt = parseTimestamp(entry.createdAt);
  if (!createdAt) {
    return true;
  }
  return nowMs - createdAt > PAIRING_PENDING_TTL_MS;
}
function pruneExpiredRequests(reqs, nowMs) {
  const kept = [];
  let removed = false;
  for (const req of reqs) {
    if (isExpired(req, nowMs)) {
      removed = true;
      continue;
    }
    kept.push(req);
  }
  return { requests: kept, removed };
}
function resolveLastSeenAt(entry) {
  return parseTimestamp(entry.lastSeenAt) ?? parseTimestamp(entry.createdAt) ?? 0;
}
function pruneExcessRequests(reqs, maxPending) {
  if (maxPending <= 0 || reqs.length <= maxPending) {
    return { requests: reqs, removed: false };
  }
  const sorted = reqs.slice().toSorted((a, b) => resolveLastSeenAt(a) - resolveLastSeenAt(b));
  return { requests: sorted.slice(-maxPending), removed: true };
}
function randomCode() {
  // Human-friendly: 8 chars, upper, no ambiguous chars (0O1I).
  let out = "";
  for (let i = 0; i < PAIRING_CODE_LENGTH; i++) {
    const idx = _nodeCrypto.default.randomInt(0, PAIRING_CODE_ALPHABET.length);
    out += PAIRING_CODE_ALPHABET[idx];
  }
  return out;
}
function generateUniqueCode(existing) {
  for (let attempt = 0; attempt < 500; attempt += 1) {
    const code = randomCode();
    if (!existing.has(code)) {
      return code;
    }
  }
  throw new Error("failed to generate unique pairing code");
}
function normalizeId(value) {
  return String(value).trim();
}
function normalizeAllowEntry(channel, entry) {
  const trimmed = entry.trim();
  if (!trimmed) {
    return "";
  }
  if (trimmed === "*") {
    return "";
  }
  const adapter = (0, _pairing.getPairingAdapter)(channel);
  const normalized = adapter?.normalizeAllowEntry ? adapter.normalizeAllowEntry(trimmed) : trimmed;
  return String(normalized).trim();
}
async function readChannelAllowFromStore(channel, env = process.env) {
  const filePath = resolveAllowFromPath(channel, env);
  const { value } = await readJsonFile(filePath, {
    version: 1,
    allowFrom: []
  });
  const list = Array.isArray(value.allowFrom) ? value.allowFrom : [];
  return list.map((v) => normalizeAllowEntry(channel, String(v))).filter(Boolean);
}
async function addChannelAllowFromStoreEntry(params) {
  const env = params.env ?? process.env;
  const filePath = resolveAllowFromPath(params.channel, env);
  return await withFileLock(filePath, { version: 1, allowFrom: [] }, async () => {
    const { value } = await readJsonFile(filePath, {
      version: 1,
      allowFrom: []
    });
    const current = (Array.isArray(value.allowFrom) ? value.allowFrom : []).
    map((v) => normalizeAllowEntry(params.channel, String(v))).
    filter(Boolean);
    const normalized = normalizeAllowEntry(params.channel, normalizeId(params.entry));
    if (!normalized) {
      return { changed: false, allowFrom: current };
    }
    if (current.includes(normalized)) {
      return { changed: false, allowFrom: current };
    }
    const next = [...current, normalized];
    await writeJsonFile(filePath, {
      version: 1,
      allowFrom: next
    });
    return { changed: true, allowFrom: next };
  });
}
async function removeChannelAllowFromStoreEntry(params) {
  const env = params.env ?? process.env;
  const filePath = resolveAllowFromPath(params.channel, env);
  return await withFileLock(filePath, { version: 1, allowFrom: [] }, async () => {
    const { value } = await readJsonFile(filePath, {
      version: 1,
      allowFrom: []
    });
    const current = (Array.isArray(value.allowFrom) ? value.allowFrom : []).
    map((v) => normalizeAllowEntry(params.channel, String(v))).
    filter(Boolean);
    const normalized = normalizeAllowEntry(params.channel, normalizeId(params.entry));
    if (!normalized) {
      return { changed: false, allowFrom: current };
    }
    const next = current.filter((entry) => entry !== normalized);
    if (next.length === current.length) {
      return { changed: false, allowFrom: current };
    }
    await writeJsonFile(filePath, {
      version: 1,
      allowFrom: next
    });
    return { changed: true, allowFrom: next };
  });
}
async function listChannelPairingRequests(channel, env = process.env) {
  const filePath = resolvePairingPath(channel, env);
  return await withFileLock(filePath, { version: 1, requests: [] }, async () => {
    const { value } = await readJsonFile(filePath, {
      version: 1,
      requests: []
    });
    const reqs = Array.isArray(value.requests) ? value.requests : [];
    const nowMs = Date.now();
    const { requests: prunedExpired, removed: expiredRemoved } = pruneExpiredRequests(reqs, nowMs);
    const { requests: pruned, removed: cappedRemoved } = pruneExcessRequests(prunedExpired, PAIRING_PENDING_MAX);
    if (expiredRemoved || cappedRemoved) {
      await writeJsonFile(filePath, {
        version: 1,
        requests: pruned
      });
    }
    return pruned.
    filter((r) => r &&
    typeof r.id === "string" &&
    typeof r.code === "string" &&
    typeof r.createdAt === "string").
    slice().
    toSorted((a, b) => a.createdAt.localeCompare(b.createdAt));
  });
}
async function upsertChannelPairingRequest(params) {
  const env = params.env ?? process.env;
  const filePath = resolvePairingPath(params.channel, env);
  return await withFileLock(filePath, { version: 1, requests: [] }, async () => {
    const { value } = await readJsonFile(filePath, {
      version: 1,
      requests: []
    });
    const now = new Date().toISOString();
    const nowMs = Date.now();
    const id = normalizeId(params.id);
    const meta = params.meta && typeof params.meta === "object" ?
    Object.fromEntries(Object.entries(params.meta).
    map(([k, v]) => [k, String(v ?? "").trim()]).
    filter(([_, v]) => Boolean(v))) :
    undefined;
    let reqs = Array.isArray(value.requests) ? value.requests : [];
    const { requests: prunedExpired, removed: expiredRemoved } = pruneExpiredRequests(reqs, nowMs);
    reqs = prunedExpired;
    const existingIdx = reqs.findIndex((r) => r.id === id);
    const existingCodes = new Set(reqs.map((req) => String(req.code ?? "").
    trim().
    toUpperCase()));
    if (existingIdx >= 0) {
      const existing = reqs[existingIdx];
      const existingCode = existing && typeof existing.code === "string" ? existing.code.trim() : "";
      const code = existingCode || generateUniqueCode(existingCodes);
      const next = {
        id,
        code,
        createdAt: existing?.createdAt ?? now,
        lastSeenAt: now,
        meta: meta ?? existing?.meta
      };
      reqs[existingIdx] = next;
      const { requests: capped } = pruneExcessRequests(reqs, PAIRING_PENDING_MAX);
      await writeJsonFile(filePath, {
        version: 1,
        requests: capped
      });
      return { code, created: false };
    }
    const { requests: capped, removed: cappedRemoved } = pruneExcessRequests(reqs, PAIRING_PENDING_MAX);
    reqs = capped;
    if (PAIRING_PENDING_MAX > 0 && reqs.length >= PAIRING_PENDING_MAX) {
      if (expiredRemoved || cappedRemoved) {
        await writeJsonFile(filePath, {
          version: 1,
          requests: reqs
        });
      }
      return { code: "", created: false };
    }
    const code = generateUniqueCode(existingCodes);
    const next = {
      id,
      code,
      createdAt: now,
      lastSeenAt: now,
      ...(meta ? { meta } : {})
    };
    await writeJsonFile(filePath, {
      version: 1,
      requests: [...reqs, next]
    });
    return { code, created: true };
  });
}
async function approveChannelPairingCode(params) {
  const env = params.env ?? process.env;
  const code = params.code.trim().toUpperCase();
  if (!code) {
    return null;
  }
  const filePath = resolvePairingPath(params.channel, env);
  return await withFileLock(filePath, { version: 1, requests: [] }, async () => {
    const { value } = await readJsonFile(filePath, {
      version: 1,
      requests: []
    });
    const reqs = Array.isArray(value.requests) ? value.requests : [];
    const nowMs = Date.now();
    const { requests: pruned, removed } = pruneExpiredRequests(reqs, nowMs);
    const idx = pruned.findIndex((r) => String(r.code ?? "").toUpperCase() === code);
    if (idx < 0) {
      if (removed) {
        await writeJsonFile(filePath, {
          version: 1,
          requests: pruned
        });
      }
      return null;
    }
    const entry = pruned[idx];
    if (!entry) {
      return null;
    }
    pruned.splice(idx, 1);
    await writeJsonFile(filePath, {
      version: 1,
      requests: pruned
    });
    await addChannelAllowFromStoreEntry({
      channel: params.channel,
      entry: entry.id,
      env
    });
    return { id: entry.id, entry };
  });
} /* v9-f65957c8c20e042c */
