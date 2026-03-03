"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.getLineRuntimeState = getLineRuntimeState;exports.monitorLineProvider = monitorLineProvider;var _identity = require("../agents/identity.js");
var _chunk = require("../auto-reply/chunk.js");
var _providerDispatcher = require("../auto-reply/reply/provider-dispatcher.js");
var _globals = require("../globals.js");
var _httpPath = require("../plugins/http-path.js");
var _httpRegistry = require("../plugins/http-registry.js");
var _autoReplyDelivery = require("./auto-reply-delivery.js");
var _bot = require("./bot.js");
var _markdownToLine = require("./markdown-to-line.js");
var _replyChunks = require("./reply-chunks.js");
var _send = require("./send.js");
var _signature = require("./signature.js");
var _templateMessages = require("./template-messages.js");
// Track runtime state in memory (simplified version)
const runtimeState = new Map();
function recordChannelRuntimeState(params) {
  const key = `${params.channel}:${params.accountId}`;
  const existing = runtimeState.get(key) ?? {
    running: false,
    lastStartAt: null,
    lastStopAt: null,
    lastError: null
  };
  runtimeState.set(key, { ...existing, ...params.state });
}
function getLineRuntimeState(accountId) {
  return runtimeState.get(`line:${accountId}`);
}
async function readRequestBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf-8")));
    req.on("error", reject);
  });
}
function startLineLoadingKeepalive(params) {
  const intervalMs = params.intervalMs ?? 18_000;
  const loadingSeconds = params.loadingSeconds ?? 20;
  let stopped = false;
  const trigger = () => {
    if (stopped) {
      return;
    }
    void (0, _send.showLoadingAnimation)(params.userId, {
      accountId: params.accountId,
      loadingSeconds
    }).catch(() => {});
  };
  trigger();
  const timer = setInterval(trigger, intervalMs);
  return () => {
    if (stopped) {
      return;
    }
    stopped = true;
    clearInterval(timer);
  };
}
async function monitorLineProvider(opts) {
  const { channelAccessToken, channelSecret, accountId, config, runtime, abortSignal, webhookPath } = opts;
  const resolvedAccountId = accountId ?? "default";
  // Record starting state
  recordChannelRuntimeState({
    channel: "line",
    accountId: resolvedAccountId,
    state: {
      running: true,
      lastStartAt: Date.now()
    }
  });
  // Create the bot
  const bot = (0, _bot.createLineBot)({
    channelAccessToken,
    channelSecret,
    accountId,
    runtime,
    config,
    onMessage: async (ctx) => {
      if (!ctx) {
        return;
      }
      const { ctxPayload, replyToken, route } = ctx;
      // Record inbound activity
      recordChannelRuntimeState({
        channel: "line",
        accountId: resolvedAccountId,
        state: {
          lastInboundAt: Date.now()
        }
      });
      const shouldShowLoading = Boolean(ctx.userId && !ctx.isGroup);
      // Fetch display name for logging (non-blocking)
      const displayNamePromise = ctx.userId ?
      (0, _send.getUserDisplayName)(ctx.userId, { accountId: ctx.accountId }) :
      Promise.resolve(ctxPayload.From);
      // Show loading animation while processing (non-blocking, best-effort)
      const stopLoading = shouldShowLoading ?
      startLineLoadingKeepalive({ userId: ctx.userId, accountId: ctx.accountId }) :
      null;
      const displayName = await displayNamePromise;
      (0, _globals.logVerbose)(`line: received message from ${displayName} (${ctxPayload.From})`);
      // Dispatch to auto-reply system for AI response
      try {
        const textLimit = 5000; // LINE max message length
        let replyTokenUsed = false; // Track if we've used the one-time reply token
        const { queuedFinal } = await (0, _providerDispatcher.dispatchReplyWithBufferedBlockDispatcher)({
          ctx: ctxPayload,
          cfg: config,
          dispatcherOptions: {
            responsePrefix: (0, _identity.resolveEffectiveMessagesConfig)(config, route.agentId).responsePrefix,
            deliver: async (payload, _info) => {
              const lineData = payload.channelData?.line ?? {};
              // Show loading animation before each delivery (non-blocking)
              if (ctx.userId && !ctx.isGroup) {
                void (0, _send.showLoadingAnimation)(ctx.userId, { accountId: ctx.accountId }).catch(() => {});
              }
              const { replyTokenUsed: nextReplyTokenUsed } = await (0, _autoReplyDelivery.deliverLineAutoReply)({
                payload,
                lineData,
                to: ctxPayload.From,
                replyToken,
                replyTokenUsed,
                accountId: ctx.accountId,
                textLimit,
                deps: {
                  buildTemplateMessageFromPayload: _templateMessages.buildTemplateMessageFromPayload,
                  processLineMessage: _markdownToLine.processLineMessage,
                  chunkMarkdownText: _chunk.chunkMarkdownText,
                  sendLineReplyChunks: _replyChunks.sendLineReplyChunks,
                  replyMessageLine: _send.replyMessageLine,
                  pushMessageLine: _send.pushMessageLine,
                  pushTextMessageWithQuickReplies: _send.pushTextMessageWithQuickReplies,
                  createQuickReplyItems: _send.createQuickReplyItems,
                  createTextMessageWithQuickReplies: _send.createTextMessageWithQuickReplies,
                  pushMessagesLine: _send.pushMessagesLine,
                  createFlexMessage: _send.createFlexMessage,
                  createImageMessage: _send.createImageMessage,
                  createLocationMessage: _send.createLocationMessage,
                  onReplyError: (replyErr) => {
                    (0, _globals.logVerbose)(`line: reply token failed, falling back to push: ${String(replyErr)}`);
                  }
                }
              });
              replyTokenUsed = nextReplyTokenUsed;
              recordChannelRuntimeState({
                channel: "line",
                accountId: resolvedAccountId,
                state: {
                  lastOutboundAt: Date.now()
                }
              });
            },
            onError: (err, info) => {
              runtime.error?.((0, _globals.danger)(`line ${info.kind} reply failed: ${String(err)}`));
            }
          },
          replyOptions: {}
        });
        if (!queuedFinal) {
          (0, _globals.logVerbose)(`line: no response generated for message from ${ctxPayload.From}`);
        }
      }
      catch (err) {
        runtime.error?.((0, _globals.danger)(`line: auto-reply failed: ${String(err)}`));
        // Send error message to user
        if (replyToken) {
          try {
            await (0, _send.replyMessageLine)(replyToken, [{ type: "text", text: "Sorry, I encountered an error processing your message." }], { accountId: ctx.accountId });
          }
          catch (replyErr) {
            runtime.error?.((0, _globals.danger)(`line: error reply failed: ${String(replyErr)}`));
          }
        }
      } finally
      {
        stopLoading?.();
      }
    }
  });
  // Register HTTP webhook handler
  const normalizedPath = (0, _httpPath.normalizePluginHttpPath)(webhookPath, "/line/webhook") ?? "/line/webhook";
  const unregisterHttp = (0, _httpRegistry.registerPluginHttpRoute)({
    path: normalizedPath,
    pluginId: "line",
    accountId: resolvedAccountId,
    log: (msg) => (0, _globals.logVerbose)(msg),
    handler: async (req, res) => {
      // Handle GET requests for webhook verification
      if (req.method === "GET") {
        res.statusCode = 200;
        res.setHeader("Content-Type", "text/plain");
        res.end("OK");
        return;
      }
      // Only accept POST requests
      if (req.method !== "POST") {
        res.statusCode = 405;
        res.setHeader("Allow", "GET, POST");
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ error: "Method Not Allowed" }));
        return;
      }
      try {
        const rawBody = await readRequestBody(req);
        const signature = req.headers["x-line-signature"];
        // Validate signature
        if (!signature || typeof signature !== "string") {
          (0, _globals.logVerbose)("line: webhook missing X-Line-Signature header");
          res.statusCode = 400;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ error: "Missing X-Line-Signature header" }));
          return;
        }
        if (!(0, _signature.validateLineSignature)(rawBody, signature, channelSecret)) {
          (0, _globals.logVerbose)("line: webhook signature validation failed");
          res.statusCode = 401;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ error: "Invalid signature" }));
          return;
        }
        // Parse and process the webhook body
        const body = JSON.parse(rawBody);
        // Respond immediately with 200 to avoid LINE timeout
        res.statusCode = 200;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ status: "ok" }));
        // Process events asynchronously
        if (body.events && body.events.length > 0) {
          (0, _globals.logVerbose)(`line: received ${body.events.length} webhook events`);
          await bot.handleWebhook(body).catch((err) => {
            runtime.error?.((0, _globals.danger)(`line webhook handler failed: ${String(err)}`));
          });
        }
      }
      catch (err) {
        runtime.error?.((0, _globals.danger)(`line webhook error: ${String(err)}`));
        if (!res.headersSent) {
          res.statusCode = 500;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ error: "Internal server error" }));
        }
      }
    }
  });
  (0, _globals.logVerbose)(`line: registered webhook handler at ${normalizedPath}`);
  // Handle abort signal
  const stopHandler = () => {
    (0, _globals.logVerbose)(`line: stopping provider for account ${resolvedAccountId}`);
    unregisterHttp();
    recordChannelRuntimeState({
      channel: "line",
      accountId: resolvedAccountId,
      state: {
        running: false,
        lastStopAt: Date.now()
      }
    });
  };
  abortSignal?.addEventListener("abort", stopHandler);
  return {
    account: bot.account,
    handleWebhook: bot.handleWebhook,
    stop: () => {
      stopHandler();
      abortSignal?.removeEventListener("abort", stopHandler);
    }
  };
} /* v9-500fbf932e538a01 */
