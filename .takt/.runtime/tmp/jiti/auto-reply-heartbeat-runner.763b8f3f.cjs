"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.resolveHeartbeatRecipients = resolveHeartbeatRecipients;exports.runWebHeartbeatOnce = runWebHeartbeatOnce;var _heartbeat = require("../../auto-reply/heartbeat.js");
var _reply = require("../../auto-reply/reply.js");
var _tokens = require("../../auto-reply/tokens.js");
var _whatsappHeartbeat = require("../../channels/plugins/whatsapp-heartbeat.js");
var _config = require("../../config/config.js");
var _sessions = require("../../config/sessions.js");
var _heartbeatEvents = require("../../infra/heartbeat-events.js");
var _heartbeatVisibility = require("../../infra/heartbeat-visibility.js");
var _logging = require("../../logging.js");
var _sessionKey = require("../../routing/session-key.js");
var _outbound = require("../outbound.js");
var _reconnect = require("../reconnect.js");
var _session = require("../session.js");
var _loggers = require("./loggers.js");
var _sessionSnapshot = require("./session-snapshot.js");
var _util = require("./util.js");
function resolveHeartbeatReplyPayload(replyResult) {
  if (!replyResult) {
    return undefined;
  }
  if (!Array.isArray(replyResult)) {
    return replyResult;
  }
  for (let idx = replyResult.length - 1; idx >= 0; idx -= 1) {
    const payload = replyResult[idx];
    if (!payload) {
      continue;
    }
    if (payload.text || payload.mediaUrl || payload.mediaUrls && payload.mediaUrls.length > 0) {
      return payload;
    }
  }
  return undefined;
}
async function runWebHeartbeatOnce(opts) {
  const { cfg: cfgOverride, to, verbose = false, sessionId, overrideBody, dryRun = false } = opts;
  const replyResolver = opts.replyResolver ?? _reply.getReplyFromConfig;
  const sender = opts.sender ?? _outbound.sendMessageWhatsApp;
  const runId = (0, _reconnect.newConnectionId)();
  const heartbeatLogger = (0, _logging.getChildLogger)({
    module: "web-heartbeat",
    runId,
    to
  });
  const cfg = cfgOverride ?? (0, _config.loadConfig)();
  // Resolve heartbeat visibility settings for WhatsApp
  const visibility = (0, _heartbeatVisibility.resolveHeartbeatVisibility)({ cfg, channel: "whatsapp" });
  const heartbeatOkText = _tokens.HEARTBEAT_TOKEN;
  const sessionCfg = cfg.session;
  const sessionScope = sessionCfg?.scope ?? "per-sender";
  const mainKey = (0, _sessionKey.normalizeMainKey)(sessionCfg?.mainKey);
  const sessionKey = (0, _sessions.resolveSessionKey)(sessionScope, { From: to }, mainKey);
  if (sessionId) {
    const storePath = (0, _sessions.resolveStorePath)(cfg.session?.store);
    const store = (0, _sessions.loadSessionStore)(storePath);
    const current = store[sessionKey] ?? {};
    store[sessionKey] = {
      ...current,
      sessionId,
      updatedAt: Date.now()
    };
    await (0, _sessions.updateSessionStore)(storePath, (nextStore) => {
      const nextCurrent = nextStore[sessionKey] ?? current;
      nextStore[sessionKey] = {
        ...nextCurrent,
        sessionId,
        updatedAt: Date.now()
      };
    });
  }
  const sessionSnapshot = (0, _sessionSnapshot.getSessionSnapshot)(cfg, to, true);
  if (verbose) {
    heartbeatLogger.info({
      to,
      sessionKey: sessionSnapshot.key,
      sessionId: sessionId ?? sessionSnapshot.entry?.sessionId ?? null,
      sessionFresh: sessionSnapshot.fresh,
      resetMode: sessionSnapshot.resetPolicy.mode,
      resetAtHour: sessionSnapshot.resetPolicy.atHour,
      idleMinutes: sessionSnapshot.resetPolicy.idleMinutes ?? null,
      dailyResetAt: sessionSnapshot.dailyResetAt ?? null,
      idleExpiresAt: sessionSnapshot.idleExpiresAt ?? null
    }, "heartbeat session snapshot");
  }
  if (overrideBody && overrideBody.trim().length === 0) {
    throw new Error("Override body must be non-empty when provided.");
  }
  try {
    if (overrideBody) {
      if (dryRun) {
        _loggers.whatsappHeartbeatLog.info(`[dry-run] web send -> ${to}: ${(0, _util.elide)(overrideBody.trim(), 200)} (manual message)`);
        return;
      }
      const sendResult = await sender(to, overrideBody, { verbose });
      (0, _heartbeatEvents.emitHeartbeatEvent)({
        status: "sent",
        to,
        preview: overrideBody.slice(0, 160),
        hasMedia: false,
        channel: "whatsapp",
        indicatorType: visibility.useIndicator ? (0, _heartbeatEvents.resolveIndicatorType)("sent") : undefined
      });
      heartbeatLogger.info({
        to,
        messageId: sendResult.messageId,
        chars: overrideBody.length,
        reason: "manual-message"
      }, "manual heartbeat message sent");
      _loggers.whatsappHeartbeatLog.info(`manual heartbeat sent to ${to} (id ${sendResult.messageId})`);
      return;
    }
    if (!visibility.showAlerts && !visibility.showOk && !visibility.useIndicator) {
      heartbeatLogger.info({ to, reason: "alerts-disabled" }, "heartbeat skipped");
      (0, _heartbeatEvents.emitHeartbeatEvent)({
        status: "skipped",
        to,
        reason: "alerts-disabled",
        channel: "whatsapp"
      });
      return;
    }
    const replyResult = await replyResolver({
      Body: (0, _heartbeat.resolveHeartbeatPrompt)(cfg.agents?.defaults?.heartbeat?.prompt),
      From: to,
      To: to,
      MessageSid: sessionId ?? sessionSnapshot.entry?.sessionId
    }, { isHeartbeat: true }, cfg);
    const replyPayload = resolveHeartbeatReplyPayload(replyResult);
    if (!replyPayload ||
    !replyPayload.text && !replyPayload.mediaUrl && !replyPayload.mediaUrls?.length) {
      heartbeatLogger.info({
        to,
        reason: "empty-reply",
        sessionId: sessionSnapshot.entry?.sessionId ?? null
      }, "heartbeat skipped");
      let okSent = false;
      if (visibility.showOk) {
        if (dryRun) {
          _loggers.whatsappHeartbeatLog.info(`[dry-run] heartbeat ok -> ${to}`);
        } else
        {
          const sendResult = await sender(to, heartbeatOkText, { verbose });
          okSent = true;
          heartbeatLogger.info({
            to,
            messageId: sendResult.messageId,
            chars: heartbeatOkText.length,
            reason: "heartbeat-ok"
          }, "heartbeat ok sent");
          _loggers.whatsappHeartbeatLog.info(`heartbeat ok sent to ${to} (id ${sendResult.messageId})`);
        }
      }
      (0, _heartbeatEvents.emitHeartbeatEvent)({
        status: "ok-empty",
        to,
        channel: "whatsapp",
        silent: !okSent,
        indicatorType: visibility.useIndicator ? (0, _heartbeatEvents.resolveIndicatorType)("ok-empty") : undefined
      });
      return;
    }
    const hasMedia = Boolean(replyPayload.mediaUrl || (replyPayload.mediaUrls?.length ?? 0) > 0);
    const ackMaxChars = Math.max(0, cfg.agents?.defaults?.heartbeat?.ackMaxChars ?? _heartbeat.DEFAULT_HEARTBEAT_ACK_MAX_CHARS);
    const stripped = (0, _heartbeat.stripHeartbeatToken)(replyPayload.text, {
      mode: "heartbeat",
      maxAckChars: ackMaxChars
    });
    if (stripped.shouldSkip && !hasMedia) {
      // Don't let heartbeats keep sessions alive: restore previous updatedAt so idle expiry still works.
      const storePath = (0, _sessions.resolveStorePath)(cfg.session?.store);
      const store = (0, _sessions.loadSessionStore)(storePath);
      if (sessionSnapshot.entry && store[sessionSnapshot.key]) {
        store[sessionSnapshot.key].updatedAt = sessionSnapshot.entry.updatedAt;
        await (0, _sessions.updateSessionStore)(storePath, (nextStore) => {
          const nextEntry = nextStore[sessionSnapshot.key];
          if (!nextEntry) {
            return;
          }
          nextStore[sessionSnapshot.key] = {
            ...nextEntry,
            updatedAt: sessionSnapshot.entry.updatedAt
          };
        });
      }
      heartbeatLogger.info({ to, reason: "heartbeat-token", rawLength: replyPayload.text?.length }, "heartbeat skipped");
      let okSent = false;
      if (visibility.showOk) {
        if (dryRun) {
          _loggers.whatsappHeartbeatLog.info(`[dry-run] heartbeat ok -> ${to}`);
        } else
        {
          const sendResult = await sender(to, heartbeatOkText, { verbose });
          okSent = true;
          heartbeatLogger.info({
            to,
            messageId: sendResult.messageId,
            chars: heartbeatOkText.length,
            reason: "heartbeat-ok"
          }, "heartbeat ok sent");
          _loggers.whatsappHeartbeatLog.info(`heartbeat ok sent to ${to} (id ${sendResult.messageId})`);
        }
      }
      (0, _heartbeatEvents.emitHeartbeatEvent)({
        status: "ok-token",
        to,
        channel: "whatsapp",
        silent: !okSent,
        indicatorType: visibility.useIndicator ? (0, _heartbeatEvents.resolveIndicatorType)("ok-token") : undefined
      });
      return;
    }
    if (hasMedia) {
      heartbeatLogger.warn({ to }, "heartbeat reply contained media; sending text only");
    }
    const finalText = stripped.text || replyPayload.text || "";
    // Check if alerts are disabled for WhatsApp
    if (!visibility.showAlerts) {
      heartbeatLogger.info({ to, reason: "alerts-disabled" }, "heartbeat skipped");
      (0, _heartbeatEvents.emitHeartbeatEvent)({
        status: "skipped",
        to,
        reason: "alerts-disabled",
        preview: finalText.slice(0, 200),
        channel: "whatsapp",
        hasMedia,
        indicatorType: visibility.useIndicator ? (0, _heartbeatEvents.resolveIndicatorType)("sent") : undefined
      });
      return;
    }
    if (dryRun) {
      heartbeatLogger.info({ to, reason: "dry-run", chars: finalText.length }, "heartbeat dry-run");
      _loggers.whatsappHeartbeatLog.info(`[dry-run] heartbeat -> ${to}: ${(0, _util.elide)(finalText, 200)}`);
      return;
    }
    const sendResult = await sender(to, finalText, { verbose });
    (0, _heartbeatEvents.emitHeartbeatEvent)({
      status: "sent",
      to,
      preview: finalText.slice(0, 160),
      hasMedia,
      channel: "whatsapp",
      indicatorType: visibility.useIndicator ? (0, _heartbeatEvents.resolveIndicatorType)("sent") : undefined
    });
    heartbeatLogger.info({
      to,
      messageId: sendResult.messageId,
      chars: finalText.length,
      preview: (0, _util.elide)(finalText, 140)
    }, "heartbeat sent");
    _loggers.whatsappHeartbeatLog.info(`heartbeat alert sent to ${to}`);
  }
  catch (err) {
    const reason = (0, _session.formatError)(err);
    heartbeatLogger.warn({ to, error: reason }, "heartbeat failed");
    _loggers.whatsappHeartbeatLog.warn(`heartbeat failed (${reason})`);
    (0, _heartbeatEvents.emitHeartbeatEvent)({
      status: "failed",
      to,
      reason,
      channel: "whatsapp",
      indicatorType: visibility.useIndicator ? (0, _heartbeatEvents.resolveIndicatorType)("failed") : undefined
    });
    throw err;
  }
}
function resolveHeartbeatRecipients(cfg, opts = {}) {
  return (0, _whatsappHeartbeat.resolveWhatsAppHeartbeatRecipients)(cfg, opts);
} /* v9-c215eb876f429743 */
