"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.monitorWebChannel = monitorWebChannel;var _commandDetection = require("../../auto-reply/command-detection.js");
var _inboundDebounce = require("../../auto-reply/inbound-debounce.js");
var _reply = require("../../auto-reply/reply.js");
var _history = require("../../auto-reply/reply/history.js");
var _commandFormat = require("../../cli/command-format.js");
var _wait = require("../../cli/wait.js");
var _config = require("../../config/config.js");
var _globals = require("../../globals.js");
var _formatDuration = require("../../infra/format-duration.js");
var _systemEvents = require("../../infra/system-events.js");
var _unhandledRejections = require("../../infra/unhandled-rejections.js");
var _logging = require("../../logging.js");
var _resolveRoute = require("../../routing/resolve-route.js");
var _runtime = require("../../runtime.js");
var _accounts = require("../accounts.js");
var _activeListener = require("../active-listener.js");
var _inbound = require("../inbound.js");
var _reconnect = require("../reconnect.js");
var _session = require("../session.js");
var _constants = require("./constants.js");
var _loggers = require("./loggers.js");
var _mentions = require("./mentions.js");
var _echo = require("./monitor/echo.js");
var _onMessage = require("./monitor/on-message.js");
var _util = require("./util.js");
async function monitorWebChannel(verbose, listenerFactory = _inbound.monitorWebInbox, keepAlive = true, replyResolver = _reply.getReplyFromConfig, runtime = _runtime.defaultRuntime, abortSignal, tuning = {}) {
  const runId = (0, _reconnect.newConnectionId)();
  const replyLogger = (0, _logging.getChildLogger)({ module: "web-auto-reply", runId });
  const heartbeatLogger = (0, _logging.getChildLogger)({ module: "web-heartbeat", runId });
  const reconnectLogger = (0, _logging.getChildLogger)({ module: "web-reconnect", runId });
  const status = {
    running: true,
    connected: false,
    reconnectAttempts: 0,
    lastConnectedAt: null,
    lastDisconnect: null,
    lastMessageAt: null,
    lastEventAt: null,
    lastError: null
  };
  const emitStatus = () => {
    tuning.statusSink?.({
      ...status,
      lastDisconnect: status.lastDisconnect ? { ...status.lastDisconnect } : null
    });
  };
  emitStatus();
  const baseCfg = (0, _config.loadConfig)();
  const account = (0, _accounts.resolveWhatsAppAccount)({
    cfg: baseCfg,
    accountId: tuning.accountId
  });
  const cfg = {
    ...baseCfg,
    channels: {
      ...baseCfg.channels,
      whatsapp: {
        ...baseCfg.channels?.whatsapp,
        ackReaction: account.ackReaction,
        messagePrefix: account.messagePrefix,
        allowFrom: account.allowFrom,
        groupAllowFrom: account.groupAllowFrom,
        groupPolicy: account.groupPolicy,
        textChunkLimit: account.textChunkLimit,
        chunkMode: account.chunkMode,
        mediaMaxMb: account.mediaMaxMb,
        blockStreaming: account.blockStreaming,
        groups: account.groups
      }
    }
  };
  const configuredMaxMb = cfg.agents?.defaults?.mediaMaxMb;
  const maxMediaBytes = typeof configuredMaxMb === "number" && configuredMaxMb > 0 ?
  configuredMaxMb * 1024 * 1024 :
  _constants.DEFAULT_WEB_MEDIA_BYTES;
  const heartbeatSeconds = (0, _reconnect.resolveHeartbeatSeconds)(cfg, tuning.heartbeatSeconds);
  const reconnectPolicy = (0, _reconnect.resolveReconnectPolicy)(cfg, tuning.reconnect);
  const baseMentionConfig = (0, _mentions.buildMentionConfig)(cfg);
  const groupHistoryLimit = cfg.channels?.whatsapp?.accounts?.[tuning.accountId ?? ""]?.historyLimit ??
  cfg.channels?.whatsapp?.historyLimit ??
  cfg.messages?.groupChat?.historyLimit ??
  _history.DEFAULT_GROUP_HISTORY_LIMIT;
  const groupHistories = new Map();
  const groupMemberNames = new Map();
  const echoTracker = (0, _echo.createEchoTracker)({ maxItems: 100, logVerbose: _globals.logVerbose });
  const sleep = tuning.sleep ?? (
  (ms, signal) => (0, _reconnect.sleepWithAbort)(ms, signal ?? abortSignal));
  const stopRequested = () => abortSignal?.aborted === true;
  const abortPromise = abortSignal &&
  new Promise((resolve) => abortSignal.addEventListener("abort", () => resolve("aborted"), {
    once: true
  }));
  // Avoid noisy MaxListenersExceeded warnings in test environments where
  // multiple gateway instances may be constructed.
  const currentMaxListeners = process.getMaxListeners?.() ?? 10;
  if (process.setMaxListeners && currentMaxListeners < 50) {
    process.setMaxListeners(50);
  }
  let sigintStop = false;
  const handleSigint = () => {
    sigintStop = true;
  };
  process.once("SIGINT", handleSigint);
  let reconnectAttempts = 0;
  while (true) {
    if (stopRequested()) {
      break;
    }
    const connectionId = (0, _reconnect.newConnectionId)();
    const startedAt = Date.now();
    let heartbeat = null;
    let watchdogTimer = null;
    let lastMessageAt = null;
    let handledMessages = 0;
    let _lastInboundMsg = null;
    let unregisterUnhandled = null;
    // Watchdog to detect stuck message processing (e.g., event emitter died)
    const MESSAGE_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes without any messages
    const WATCHDOG_CHECK_MS = 60 * 1000; // Check every minute
    const backgroundTasks = new Set();
    const onMessage = (0, _onMessage.createWebOnMessageHandler)({
      cfg,
      verbose,
      connectionId,
      maxMediaBytes,
      groupHistoryLimit,
      groupHistories,
      groupMemberNames,
      echoTracker,
      backgroundTasks,
      replyResolver: replyResolver ?? _reply.getReplyFromConfig,
      replyLogger,
      baseMentionConfig,
      account
    });
    const inboundDebounceMs = (0, _inboundDebounce.resolveInboundDebounceMs)({ cfg, channel: "whatsapp" });
    const shouldDebounce = (msg) => {
      if (msg.mediaPath || msg.mediaType) {
        return false;
      }
      if (msg.location) {
        return false;
      }
      if (msg.replyToId || msg.replyToBody) {
        return false;
      }
      return !(0, _commandDetection.hasControlCommand)(msg.body, cfg);
    };
    const listener = await (listenerFactory ?? _inbound.monitorWebInbox)({
      verbose,
      accountId: account.accountId,
      authDir: account.authDir,
      mediaMaxMb: account.mediaMaxMb,
      sendReadReceipts: account.sendReadReceipts,
      debounceMs: inboundDebounceMs,
      shouldDebounce,
      onMessage: async (msg) => {
        handledMessages += 1;
        lastMessageAt = Date.now();
        status.lastMessageAt = lastMessageAt;
        status.lastEventAt = lastMessageAt;
        emitStatus();
        _lastInboundMsg = msg;
        await onMessage(msg);
      }
    });
    status.connected = true;
    status.lastConnectedAt = Date.now();
    status.lastEventAt = status.lastConnectedAt;
    status.lastError = null;
    emitStatus();
    // Surface a concise connection event for the next main-session turn/heartbeat.
    const { e164: selfE164 } = (0, _session.readWebSelfId)(account.authDir);
    const connectRoute = (0, _resolveRoute.resolveAgentRoute)({
      cfg,
      channel: "whatsapp",
      accountId: account.accountId
    });
    (0, _systemEvents.enqueueSystemEvent)(`WhatsApp gateway connected${selfE164 ? ` as ${selfE164}` : ""}.`, {
      sessionKey: connectRoute.sessionKey
    });
    (0, _activeListener.setActiveWebListener)(account.accountId, listener);
    unregisterUnhandled = (0, _unhandledRejections.registerUnhandledRejectionHandler)((reason) => {
      if (!(0, _util.isLikelyWhatsAppCryptoError)(reason)) {
        return false;
      }
      const errorStr = (0, _session.formatError)(reason);
      reconnectLogger.warn({ connectionId, error: errorStr }, "web reconnect: unhandled rejection from WhatsApp socket; forcing reconnect");
      listener.signalClose?.({
        status: 499,
        isLoggedOut: false,
        error: reason
      });
      return true;
    });
    const closeListener = async () => {
      (0, _activeListener.setActiveWebListener)(account.accountId, null);
      if (unregisterUnhandled) {
        unregisterUnhandled();
        unregisterUnhandled = null;
      }
      if (heartbeat) {
        clearInterval(heartbeat);
      }
      if (watchdogTimer) {
        clearInterval(watchdogTimer);
      }
      if (backgroundTasks.size > 0) {
        await Promise.allSettled(backgroundTasks);
        backgroundTasks.clear();
      }
      try {
        await listener.close();
      }
      catch (err) {
        (0, _globals.logVerbose)(`Socket close failed: ${(0, _session.formatError)(err)}`);
      }
    };
    if (keepAlive) {
      heartbeat = setInterval(() => {
        const authAgeMs = (0, _session.getWebAuthAgeMs)(account.authDir);
        const minutesSinceLastMessage = lastMessageAt ?
        Math.floor((Date.now() - lastMessageAt) / 60000) :
        null;
        const logData = {
          connectionId,
          reconnectAttempts,
          messagesHandled: handledMessages,
          lastMessageAt,
          authAgeMs,
          uptimeMs: Date.now() - startedAt,
          ...(minutesSinceLastMessage !== null && minutesSinceLastMessage > 30 ?
          { minutesSinceLastMessage } :
          {})
        };
        if (minutesSinceLastMessage && minutesSinceLastMessage > 30) {
          heartbeatLogger.warn(logData, "⚠️ web gateway heartbeat - no messages in 30+ minutes");
        } else
        {
          heartbeatLogger.info(logData, "web gateway heartbeat");
        }
      }, heartbeatSeconds * 1000);
      watchdogTimer = setInterval(() => {
        if (!lastMessageAt) {
          return;
        }
        const timeSinceLastMessage = Date.now() - lastMessageAt;
        if (timeSinceLastMessage <= MESSAGE_TIMEOUT_MS) {
          return;
        }
        const minutesSinceLastMessage = Math.floor(timeSinceLastMessage / 60000);
        heartbeatLogger.warn({
          connectionId,
          minutesSinceLastMessage,
          lastMessageAt: new Date(lastMessageAt),
          messagesHandled: handledMessages
        }, "Message timeout detected - forcing reconnect");
        _loggers.whatsappHeartbeatLog.warn(`No messages received in ${minutesSinceLastMessage}m - restarting connection`);
        void closeListener().catch((err) => {
          (0, _globals.logVerbose)(`Close listener failed: ${(0, _session.formatError)(err)}`);
        });
        listener.signalClose?.({
          status: 499,
          isLoggedOut: false,
          error: "watchdog-timeout"
        });
      }, WATCHDOG_CHECK_MS);
    }
    _loggers.whatsappLog.info("Listening for personal WhatsApp inbound messages.");
    if (process.stdout.isTTY || process.stderr.isTTY) {
      _loggers.whatsappLog.raw("Ctrl+C to stop.");
    }
    if (!keepAlive) {
      await closeListener();
      return;
    }
    const reason = await Promise.race([
    listener.onClose?.catch((err) => {
      reconnectLogger.error({ error: (0, _session.formatError)(err) }, "listener.onClose rejected");
      return { status: 500, isLoggedOut: false, error: err };
    }) ?? (0, _wait.waitForever)(),
    abortPromise ?? (0, _wait.waitForever)()]
    );
    const uptimeMs = Date.now() - startedAt;
    if (uptimeMs > heartbeatSeconds * 1000) {
      reconnectAttempts = 0; // Healthy stretch; reset the backoff.
    }
    status.reconnectAttempts = reconnectAttempts;
    emitStatus();
    if (stopRequested() || sigintStop || reason === "aborted") {
      await closeListener();
      break;
    }
    const statusCode = (typeof reason === "object" && reason && "status" in reason ?
    reason.status :
    undefined) ?? "unknown";
    const loggedOut = typeof reason === "object" &&
    reason &&
    "isLoggedOut" in reason &&
    reason.isLoggedOut;
    const errorStr = (0, _session.formatError)(reason);
    status.connected = false;
    status.lastEventAt = Date.now();
    status.lastDisconnect = {
      at: status.lastEventAt,
      status: typeof statusCode === "number" ? statusCode : undefined,
      error: errorStr,
      loggedOut: Boolean(loggedOut)
    };
    status.lastError = errorStr;
    status.reconnectAttempts = reconnectAttempts;
    emitStatus();
    reconnectLogger.info({
      connectionId,
      status: statusCode,
      loggedOut,
      reconnectAttempts,
      error: errorStr
    }, "web reconnect: connection closed");
    (0, _systemEvents.enqueueSystemEvent)(`WhatsApp gateway disconnected (status ${statusCode ?? "unknown"})`, {
      sessionKey: connectRoute.sessionKey
    });
    if (loggedOut) {
      runtime.error(`WhatsApp session logged out. Run \`${(0, _commandFormat.formatCliCommand)("openclaw channels login --channel web")}\` to relink.`);
      await closeListener();
      break;
    }
    reconnectAttempts += 1;
    status.reconnectAttempts = reconnectAttempts;
    emitStatus();
    if (reconnectPolicy.maxAttempts > 0 && reconnectAttempts >= reconnectPolicy.maxAttempts) {
      reconnectLogger.warn({
        connectionId,
        status: statusCode,
        reconnectAttempts,
        maxAttempts: reconnectPolicy.maxAttempts
      }, "web reconnect: max attempts reached; continuing in degraded mode");
      runtime.error(`WhatsApp Web reconnect: max attempts reached (${reconnectAttempts}/${reconnectPolicy.maxAttempts}). Stopping web monitoring.`);
      await closeListener();
      break;
    }
    const delay = (0, _reconnect.computeBackoff)(reconnectPolicy, reconnectAttempts);
    reconnectLogger.info({
      connectionId,
      status: statusCode,
      reconnectAttempts,
      maxAttempts: reconnectPolicy.maxAttempts || "unlimited",
      delayMs: delay
    }, "web reconnect: scheduling retry");
    runtime.error(`WhatsApp Web connection closed (status ${statusCode}). Retry ${reconnectAttempts}/${reconnectPolicy.maxAttempts || "∞"} in ${(0, _formatDuration.formatDurationMs)(delay)}… (${errorStr})`);
    await closeListener();
    try {
      await sleep(delay, abortSignal);
    }
    catch {
      break;
    }
  }
  status.running = false;
  status.connected = false;
  status.lastEventAt = Date.now();
  emitStatus();
  process.removeListener("SIGINT", handleSigint);
} /* v9-dabd326d5179dbe6 */
