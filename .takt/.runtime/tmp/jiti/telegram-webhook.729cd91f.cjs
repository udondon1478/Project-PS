"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.startTelegramWebhook = startTelegramWebhook;var _grammy = require("grammy");
var _nodeHttp = require("node:http");
var _diagnosticEvents = require("../infra/diagnostic-events.js");
var _errors = require("../infra/errors.js");
var _diagnostic = require("../logging/diagnostic.js");
var _runtime = require("../runtime.js");
var _allowedUpdates = require("./allowed-updates.js");
var _apiLogging = require("./api-logging.js");
var _bot = require("./bot.js");
async function startTelegramWebhook(opts) {
  const path = opts.path ?? "/telegram-webhook";
  const healthPath = opts.healthPath ?? "/healthz";
  const port = opts.port ?? 8787;
  const host = opts.host ?? "0.0.0.0";
  const runtime = opts.runtime ?? _runtime.defaultRuntime;
  const diagnosticsEnabled = (0, _diagnosticEvents.isDiagnosticsEnabled)(opts.config);
  const bot = (0, _bot.createTelegramBot)({
    token: opts.token,
    runtime,
    proxyFetch: opts.fetch,
    config: opts.config,
    accountId: opts.accountId
  });
  const handler = (0, _grammy.webhookCallback)(bot, "http", {
    secretToken: opts.secret
  });
  if (diagnosticsEnabled) {
    (0, _diagnostic.startDiagnosticHeartbeat)();
  }
  const server = (0, _nodeHttp.createServer)((req, res) => {
    if (req.url === healthPath) {
      res.writeHead(200);
      res.end("ok");
      return;
    }
    if (req.url !== path || req.method !== "POST") {
      res.writeHead(404);
      res.end();
      return;
    }
    const startTime = Date.now();
    if (diagnosticsEnabled) {
      (0, _diagnostic.logWebhookReceived)({ channel: "telegram", updateType: "telegram-post" });
    }
    const handled = handler(req, res);
    if (handled && typeof handled.catch === "function") {
      void handled.
      then(() => {
        if (diagnosticsEnabled) {
          (0, _diagnostic.logWebhookProcessed)({
            channel: "telegram",
            updateType: "telegram-post",
            durationMs: Date.now() - startTime
          });
        }
      }).
      catch((err) => {
        const errMsg = (0, _errors.formatErrorMessage)(err);
        if (diagnosticsEnabled) {
          (0, _diagnostic.logWebhookError)({
            channel: "telegram",
            updateType: "telegram-post",
            error: errMsg
          });
        }
        runtime.log?.(`webhook handler failed: ${errMsg}`);
        if (!res.headersSent) {
          res.writeHead(500);
        }
        res.end();
      });
    }
  });
  const publicUrl = opts.publicUrl ?? `http://${host === "0.0.0.0" ? "localhost" : host}:${port}${path}`;
  await (0, _apiLogging.withTelegramApiErrorLogging)({
    operation: "setWebhook",
    runtime,
    fn: () => bot.api.setWebhook(publicUrl, {
      secret_token: opts.secret,
      allowed_updates: (0, _allowedUpdates.resolveTelegramAllowedUpdates)()
    })
  });
  await new Promise((resolve) => server.listen(port, host, resolve));
  runtime.log?.(`webhook listening on ${publicUrl}`);
  const shutdown = () => {
    server.close();
    void bot.stop();
    if (diagnosticsEnabled) {
      (0, _diagnostic.stopDiagnosticHeartbeat)();
    }
  };
  if (opts.abortSignal) {
    opts.abortSignal.addEventListener("abort", shutdown, { once: true });
  }
  return { server, bot, stop: shutdown };
} /* v9-72dc4a9164b5b484 */
