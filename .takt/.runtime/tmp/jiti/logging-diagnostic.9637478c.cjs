"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.diagnosticLogger = void 0;exports.logActiveRuns = logActiveRuns;exports.logLaneDequeue = logLaneDequeue;exports.logLaneEnqueue = logLaneEnqueue;exports.logMessageProcessed = logMessageProcessed;exports.logMessageQueued = logMessageQueued;exports.logRunAttempt = logRunAttempt;exports.logSessionStateChange = logSessionStateChange;exports.logSessionStuck = logSessionStuck;exports.logWebhookError = logWebhookError;exports.logWebhookProcessed = logWebhookProcessed;exports.logWebhookReceived = logWebhookReceived;exports.startDiagnosticHeartbeat = startDiagnosticHeartbeat;exports.stopDiagnosticHeartbeat = stopDiagnosticHeartbeat;var _diagnosticEvents = require("../infra/diagnostic-events.js");
var _subsystem = require("./subsystem.js");
const diag = exports.diagnosticLogger = (0, _subsystem.createSubsystemLogger)("diagnostic");
const sessionStates = new Map();
const webhookStats = {
  received: 0,
  processed: 0,
  errors: 0,
  lastReceived: 0
};
let lastActivityAt = 0;
function markActivity() {
  lastActivityAt = Date.now();
}
function resolveSessionKey({ sessionKey, sessionId }) {
  return sessionKey ?? sessionId ?? "unknown";
}
function getSessionState(ref) {
  const key = resolveSessionKey(ref);
  const existing = sessionStates.get(key);
  if (existing) {
    if (ref.sessionId) {
      existing.sessionId = ref.sessionId;
    }
    if (ref.sessionKey) {
      existing.sessionKey = ref.sessionKey;
    }
    return existing;
  }
  const created = {
    sessionId: ref.sessionId,
    sessionKey: ref.sessionKey,
    lastActivity: Date.now(),
    state: "idle",
    queueDepth: 0
  };
  sessionStates.set(key, created);
  return created;
}
function logWebhookReceived(params) {
  webhookStats.received += 1;
  webhookStats.lastReceived = Date.now();
  diag.debug(`webhook received: channel=${params.channel} type=${params.updateType ?? "unknown"} chatId=${params.chatId ?? "unknown"} total=${webhookStats.received}`);
  (0, _diagnosticEvents.emitDiagnosticEvent)({
    type: "webhook.received",
    channel: params.channel,
    updateType: params.updateType,
    chatId: params.chatId
  });
  markActivity();
}
function logWebhookProcessed(params) {
  webhookStats.processed += 1;
  diag.debug(`webhook processed: channel=${params.channel} type=${params.updateType ?? "unknown"} chatId=${params.chatId ?? "unknown"} duration=${params.durationMs ?? 0}ms processed=${webhookStats.processed}`);
  (0, _diagnosticEvents.emitDiagnosticEvent)({
    type: "webhook.processed",
    channel: params.channel,
    updateType: params.updateType,
    chatId: params.chatId,
    durationMs: params.durationMs
  });
  markActivity();
}
function logWebhookError(params) {
  webhookStats.errors += 1;
  diag.error(`webhook error: channel=${params.channel} type=${params.updateType ?? "unknown"} chatId=${params.chatId ?? "unknown"} error="${params.error}" errors=${webhookStats.errors}`);
  (0, _diagnosticEvents.emitDiagnosticEvent)({
    type: "webhook.error",
    channel: params.channel,
    updateType: params.updateType,
    chatId: params.chatId,
    error: params.error
  });
  markActivity();
}
function logMessageQueued(params) {
  const state = getSessionState(params);
  state.queueDepth += 1;
  state.lastActivity = Date.now();
  diag.debug(`message queued: sessionId=${state.sessionId ?? "unknown"} sessionKey=${state.sessionKey ?? "unknown"} source=${params.source} queueDepth=${state.queueDepth} sessionState=${state.state}`);
  (0, _diagnosticEvents.emitDiagnosticEvent)({
    type: "message.queued",
    sessionId: state.sessionId,
    sessionKey: state.sessionKey,
    channel: params.channel,
    source: params.source,
    queueDepth: state.queueDepth
  });
  markActivity();
}
function logMessageProcessed(params) {
  const payload = `message processed: channel=${params.channel} chatId=${params.chatId ?? "unknown"} messageId=${params.messageId ?? "unknown"} sessionId=${params.sessionId ?? "unknown"} sessionKey=${params.sessionKey ?? "unknown"} outcome=${params.outcome} duration=${params.durationMs ?? 0}ms${params.reason ? ` reason=${params.reason}` : ""}${params.error ? ` error="${params.error}"` : ""}`;
  if (params.outcome === "error") {
    diag.error(payload);
  } else
  if (params.outcome === "skipped") {
    diag.debug(payload);
  } else
  {
    diag.debug(payload);
  }
  (0, _diagnosticEvents.emitDiagnosticEvent)({
    type: "message.processed",
    channel: params.channel,
    chatId: params.chatId,
    messageId: params.messageId,
    sessionId: params.sessionId,
    sessionKey: params.sessionKey,
    durationMs: params.durationMs,
    outcome: params.outcome,
    reason: params.reason,
    error: params.error
  });
  markActivity();
}
function logSessionStateChange(params) {
  const state = getSessionState(params);
  const isProbeSession = state.sessionId?.startsWith("probe-") ?? false;
  const prevState = state.state;
  state.state = params.state;
  state.lastActivity = Date.now();
  if (params.state === "idle") {
    state.queueDepth = Math.max(0, state.queueDepth - 1);
  }
  if (!isProbeSession) {
    diag.debug(`session state: sessionId=${state.sessionId ?? "unknown"} sessionKey=${state.sessionKey ?? "unknown"} prev=${prevState} new=${params.state} reason="${params.reason ?? ""}" queueDepth=${state.queueDepth}`);
  }
  (0, _diagnosticEvents.emitDiagnosticEvent)({
    type: "session.state",
    sessionId: state.sessionId,
    sessionKey: state.sessionKey,
    prevState,
    state: params.state,
    reason: params.reason,
    queueDepth: state.queueDepth
  });
  markActivity();
}
function logSessionStuck(params) {
  const state = getSessionState(params);
  diag.warn(`stuck session: sessionId=${state.sessionId ?? "unknown"} sessionKey=${state.sessionKey ?? "unknown"} state=${params.state} age=${Math.round(params.ageMs / 1000)}s queueDepth=${state.queueDepth}`);
  (0, _diagnosticEvents.emitDiagnosticEvent)({
    type: "session.stuck",
    sessionId: state.sessionId,
    sessionKey: state.sessionKey,
    state: params.state,
    ageMs: params.ageMs,
    queueDepth: state.queueDepth
  });
  markActivity();
}
function logLaneEnqueue(lane, queueSize) {
  diag.debug(`lane enqueue: lane=${lane} queueSize=${queueSize}`);
  (0, _diagnosticEvents.emitDiagnosticEvent)({
    type: "queue.lane.enqueue",
    lane,
    queueSize
  });
  markActivity();
}
function logLaneDequeue(lane, waitMs, queueSize) {
  diag.debug(`lane dequeue: lane=${lane} waitMs=${waitMs} queueSize=${queueSize}`);
  (0, _diagnosticEvents.emitDiagnosticEvent)({
    type: "queue.lane.dequeue",
    lane,
    queueSize,
    waitMs
  });
  markActivity();
}
function logRunAttempt(params) {
  diag.debug(`run attempt: sessionId=${params.sessionId ?? "unknown"} sessionKey=${params.sessionKey ?? "unknown"} runId=${params.runId} attempt=${params.attempt}`);
  (0, _diagnosticEvents.emitDiagnosticEvent)({
    type: "run.attempt",
    sessionId: params.sessionId,
    sessionKey: params.sessionKey,
    runId: params.runId,
    attempt: params.attempt
  });
  markActivity();
}
function logActiveRuns() {
  const activeSessions = Array.from(sessionStates.entries()).
  filter(([, s]) => s.state === "processing").
  map(([id, s]) => `${id}(q=${s.queueDepth},age=${Math.round((Date.now() - s.lastActivity) / 1000)}s)`);
  diag.debug(`active runs: count=${activeSessions.length} sessions=[${activeSessions.join(", ")}]`);
  markActivity();
}
let heartbeatInterval = null;
function startDiagnosticHeartbeat() {
  if (heartbeatInterval) {
    return;
  }
  heartbeatInterval = setInterval(() => {
    const now = Date.now();
    const activeCount = Array.from(sessionStates.values()).filter((s) => s.state === "processing").length;
    const waitingCount = Array.from(sessionStates.values()).filter((s) => s.state === "waiting").length;
    const totalQueued = Array.from(sessionStates.values()).reduce((sum, s) => sum + s.queueDepth, 0);
    const hasActivity = lastActivityAt > 0 ||
    webhookStats.received > 0 ||
    activeCount > 0 ||
    waitingCount > 0 ||
    totalQueued > 0;
    if (!hasActivity) {
      return;
    }
    if (now - lastActivityAt > 120_000 && activeCount === 0 && waitingCount === 0) {
      return;
    }
    diag.debug(`heartbeat: webhooks=${webhookStats.received}/${webhookStats.processed}/${webhookStats.errors} active=${activeCount} waiting=${waitingCount} queued=${totalQueued}`);
    (0, _diagnosticEvents.emitDiagnosticEvent)({
      type: "diagnostic.heartbeat",
      webhooks: {
        received: webhookStats.received,
        processed: webhookStats.processed,
        errors: webhookStats.errors
      },
      active: activeCount,
      waiting: waitingCount,
      queued: totalQueued
    });
    for (const [, state] of sessionStates) {
      const ageMs = now - state.lastActivity;
      if (state.state === "processing" && ageMs > 120_000) {
        logSessionStuck({
          sessionId: state.sessionId,
          sessionKey: state.sessionKey,
          state: state.state,
          ageMs
        });
      }
    }
  }, 30_000);
  heartbeatInterval.unref?.();
}
function stopDiagnosticHeartbeat() {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
  }
} /* v9-4a28749cd94a064a */
