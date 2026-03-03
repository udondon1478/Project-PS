"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.__testing = void 0;exports.acquireSessionWriteLock = acquireSessionWriteLock;var _nodeFs = _interopRequireDefault(require("node:fs"));
var _promises = _interopRequireDefault(require("node:fs/promises"));
var _nodePath = _interopRequireDefault(require("node:path"));function _interopRequireDefault(e) {return e && e.__esModule ? e : { default: e };}
const HELD_LOCKS = new Map();
const CLEANUP_SIGNALS = ["SIGINT", "SIGTERM", "SIGQUIT", "SIGABRT"];
const cleanupHandlers = new Map();
function isAlive(pid) {
  if (!Number.isFinite(pid) || pid <= 0) {
    return false;
  }
  try {
    process.kill(pid, 0);
    return true;
  }
  catch {
    return false;
  }
}
/**
 * Synchronously release all held locks.
 * Used during process exit when async operations aren't reliable.
 */
function releaseAllLocksSync() {
  for (const [sessionFile, held] of HELD_LOCKS) {
    try {
      if (typeof held.handle.close === "function") {
        void held.handle.close().catch(() => {});
      }
    }
    catch {

      // Ignore errors during cleanup - best effort
    }try {
      _nodeFs.default.rmSync(held.lockPath, { force: true });
    }
    catch {

      // Ignore errors during cleanup - best effort
    }HELD_LOCKS.delete(sessionFile);
  }
}
let cleanupRegistered = false;
function handleTerminationSignal(signal) {
  releaseAllLocksSync();
  const shouldReraise = process.listenerCount(signal) === 1;
  if (shouldReraise) {
    const handler = cleanupHandlers.get(signal);
    if (handler) {
      process.off(signal, handler);
    }
    try {
      process.kill(process.pid, signal);
    }
    catch {

      // Ignore errors during shutdown
    }}
}
function registerCleanupHandlers() {
  if (cleanupRegistered) {
    return;
  }
  cleanupRegistered = true;
  // Cleanup on normal exit and process.exit() calls
  process.on("exit", () => {
    releaseAllLocksSync();
  });
  // Handle termination signals
  for (const signal of CLEANUP_SIGNALS) {
    try {
      const handler = () => handleTerminationSignal(signal);
      cleanupHandlers.set(signal, handler);
      process.on(signal, handler);
    }
    catch {

      // Ignore unsupported signals on this platform.
    }}
}
async function readLockPayload(lockPath) {
  try {
    const raw = await _promises.default.readFile(lockPath, "utf8");
    const parsed = JSON.parse(raw);
    if (typeof parsed.pid !== "number") {
      return null;
    }
    if (typeof parsed.createdAt !== "string") {
      return null;
    }
    return { pid: parsed.pid, createdAt: parsed.createdAt };
  }
  catch {
    return null;
  }
}
async function acquireSessionWriteLock(params) {
  registerCleanupHandlers();
  const timeoutMs = params.timeoutMs ?? 10_000;
  const staleMs = params.staleMs ?? 30 * 60 * 1000;
  const sessionFile = _nodePath.default.resolve(params.sessionFile);
  const sessionDir = _nodePath.default.dirname(sessionFile);
  await _promises.default.mkdir(sessionDir, { recursive: true });
  let normalizedDir = sessionDir;
  try {
    normalizedDir = await _promises.default.realpath(sessionDir);
  }
  catch {

    // Fall back to the resolved path if realpath fails (permissions, transient FS).
  }const normalizedSessionFile = _nodePath.default.join(normalizedDir, _nodePath.default.basename(sessionFile));
  const lockPath = `${normalizedSessionFile}.lock`;
  const held = HELD_LOCKS.get(normalizedSessionFile);
  if (held) {
    held.count += 1;
    return {
      release: async () => {
        const current = HELD_LOCKS.get(normalizedSessionFile);
        if (!current) {
          return;
        }
        current.count -= 1;
        if (current.count > 0) {
          return;
        }
        HELD_LOCKS.delete(normalizedSessionFile);
        await current.handle.close();
        await _promises.default.rm(current.lockPath, { force: true });
      }
    };
  }
  const startedAt = Date.now();
  let attempt = 0;
  while (Date.now() - startedAt < timeoutMs) {
    attempt += 1;
    try {
      const handle = await _promises.default.open(lockPath, "wx");
      await handle.writeFile(JSON.stringify({ pid: process.pid, createdAt: new Date().toISOString() }, null, 2), "utf8");
      HELD_LOCKS.set(normalizedSessionFile, { count: 1, handle, lockPath });
      return {
        release: async () => {
          const current = HELD_LOCKS.get(normalizedSessionFile);
          if (!current) {
            return;
          }
          current.count -= 1;
          if (current.count > 0) {
            return;
          }
          HELD_LOCKS.delete(normalizedSessionFile);
          await current.handle.close();
          await _promises.default.rm(current.lockPath, { force: true });
        }
      };
    }
    catch (err) {
      const code = err.code;
      if (code !== "EEXIST") {
        throw err;
      }
      const payload = await readLockPayload(lockPath);
      const createdAt = payload?.createdAt ? Date.parse(payload.createdAt) : NaN;
      const stale = !Number.isFinite(createdAt) || Date.now() - createdAt > staleMs;
      const alive = payload?.pid ? isAlive(payload.pid) : false;
      if (stale || !alive) {
        await _promises.default.rm(lockPath, { force: true });
        continue;
      }
      const delay = Math.min(1000, 50 * attempt);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  const payload = await readLockPayload(lockPath);
  const owner = payload?.pid ? `pid=${payload.pid}` : "unknown";
  throw new Error(`session file locked (timeout ${timeoutMs}ms): ${owner} ${lockPath}`);
}
const __testing = exports.__testing = {
  cleanupSignals: [...CLEANUP_SIGNALS],
  handleTerminationSignal,
  releaseAllLocksSync
}; /* v9-8c159399c94faddb */
