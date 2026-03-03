"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.addSession = addSession;exports.appendOutput = appendOutput;exports.clearFinished = clearFinished;exports.createSessionSlug = createSessionSlug;exports.deleteSession = deleteSession;exports.drainSession = drainSession;exports.getFinishedSession = getFinishedSession;exports.getSession = getSession;exports.listFinishedSessions = listFinishedSessions;exports.listRunningSessions = listRunningSessions;exports.markBackgrounded = markBackgrounded;exports.markExited = markExited;exports.resetProcessRegistryForTests = resetProcessRegistryForTests;exports.setJobTtlMs = setJobTtlMs;exports.tail = tail;exports.trimWithCap = trimWithCap;var _sessionSlug = require("./session-slug.js");
const DEFAULT_JOB_TTL_MS = 30 * 60 * 1000; // 30 minutes
const MIN_JOB_TTL_MS = 60 * 1000; // 1 minute
const MAX_JOB_TTL_MS = 3 * 60 * 60 * 1000; // 3 hours
const DEFAULT_PENDING_OUTPUT_CHARS = 30_000;
function clampTtl(value) {
  if (!value || Number.isNaN(value)) {
    return DEFAULT_JOB_TTL_MS;
  }
  return Math.min(Math.max(value, MIN_JOB_TTL_MS), MAX_JOB_TTL_MS);
}
let jobTtlMs = clampTtl(Number.parseInt(process.env.PI_BASH_JOB_TTL_MS ?? "", 10));
const runningSessions = new Map();
const finishedSessions = new Map();
let sweeper = null;
function isSessionIdTaken(id) {
  return runningSessions.has(id) || finishedSessions.has(id);
}
function createSessionSlug() {
  return (0, _sessionSlug.createSessionSlug)(isSessionIdTaken);
}
function addSession(session) {
  runningSessions.set(session.id, session);
  startSweeper();
}
function getSession(id) {
  return runningSessions.get(id);
}
function getFinishedSession(id) {
  return finishedSessions.get(id);
}
function deleteSession(id) {
  runningSessions.delete(id);
  finishedSessions.delete(id);
}
function appendOutput(session, stream, chunk) {
  session.pendingStdout ??= [];
  session.pendingStderr ??= [];
  session.pendingStdoutChars ??= sumPendingChars(session.pendingStdout);
  session.pendingStderrChars ??= sumPendingChars(session.pendingStderr);
  const buffer = stream === "stdout" ? session.pendingStdout : session.pendingStderr;
  const bufferChars = stream === "stdout" ? session.pendingStdoutChars : session.pendingStderrChars;
  const pendingCap = Math.min(session.pendingMaxOutputChars ?? DEFAULT_PENDING_OUTPUT_CHARS, session.maxOutputChars);
  buffer.push(chunk);
  let pendingChars = bufferChars + chunk.length;
  if (pendingChars > pendingCap) {
    session.truncated = true;
    pendingChars = capPendingBuffer(buffer, pendingChars, pendingCap);
  }
  if (stream === "stdout") {
    session.pendingStdoutChars = pendingChars;
  } else
  {
    session.pendingStderrChars = pendingChars;
  }
  session.totalOutputChars += chunk.length;
  const aggregated = trimWithCap(session.aggregated + chunk, session.maxOutputChars);
  session.truncated =
  session.truncated || aggregated.length < session.aggregated.length + chunk.length;
  session.aggregated = aggregated;
  session.tail = tail(session.aggregated, 2000);
}
function drainSession(session) {
  const stdout = session.pendingStdout.join("");
  const stderr = session.pendingStderr.join("");
  session.pendingStdout = [];
  session.pendingStderr = [];
  session.pendingStdoutChars = 0;
  session.pendingStderrChars = 0;
  return { stdout, stderr };
}
function markExited(session, exitCode, exitSignal, status) {
  session.exited = true;
  session.exitCode = exitCode;
  session.exitSignal = exitSignal;
  session.tail = tail(session.aggregated, 2000);
  moveToFinished(session, status);
}
function markBackgrounded(session) {
  session.backgrounded = true;
}
function moveToFinished(session, status) {
  runningSessions.delete(session.id);
  if (!session.backgrounded) {
    return;
  }
  finishedSessions.set(session.id, {
    id: session.id,
    command: session.command,
    scopeKey: session.scopeKey,
    startedAt: session.startedAt,
    endedAt: Date.now(),
    cwd: session.cwd,
    status,
    exitCode: session.exitCode,
    exitSignal: session.exitSignal,
    aggregated: session.aggregated,
    tail: session.tail,
    truncated: session.truncated,
    totalOutputChars: session.totalOutputChars
  });
}
function tail(text, max = 2000) {
  if (text.length <= max) {
    return text;
  }
  return text.slice(text.length - max);
}
function sumPendingChars(buffer) {
  let total = 0;
  for (const chunk of buffer) {
    total += chunk.length;
  }
  return total;
}
function capPendingBuffer(buffer, pendingChars, cap) {
  if (pendingChars <= cap) {
    return pendingChars;
  }
  const last = buffer.at(-1);
  if (last && last.length >= cap) {
    buffer.length = 0;
    buffer.push(last.slice(last.length - cap));
    return cap;
  }
  while (buffer.length && pendingChars - buffer[0].length >= cap) {
    pendingChars -= buffer[0].length;
    buffer.shift();
  }
  if (buffer.length && pendingChars > cap) {
    const overflow = pendingChars - cap;
    buffer[0] = buffer[0].slice(overflow);
    pendingChars = cap;
  }
  return pendingChars;
}
function trimWithCap(text, max) {
  if (text.length <= max) {
    return text;
  }
  return text.slice(text.length - max);
}
function listRunningSessions() {
  return Array.from(runningSessions.values()).filter((s) => s.backgrounded);
}
function listFinishedSessions() {
  return Array.from(finishedSessions.values());
}
function clearFinished() {
  finishedSessions.clear();
}
function resetProcessRegistryForTests() {
  runningSessions.clear();
  finishedSessions.clear();
  stopSweeper();
}
function setJobTtlMs(value) {
  if (value === undefined || Number.isNaN(value)) {
    return;
  }
  jobTtlMs = clampTtl(value);
  stopSweeper();
  startSweeper();
}
function pruneFinishedSessions() {
  const cutoff = Date.now() - jobTtlMs;
  for (const [id, session] of finishedSessions.entries()) {
    if (session.endedAt < cutoff) {
      finishedSessions.delete(id);
    }
  }
}
function startSweeper() {
  if (sweeper) {
    return;
  }
  sweeper = setInterval(pruneFinishedSessions, Math.max(30_000, jobTtlMs / 6));
  sweeper.unref?.();
}
function stopSweeper() {
  if (!sweeper) {
    return;
  }
  clearInterval(sweeper);
  sweeper = null;
} /* v9-707fb85deadf282a */
