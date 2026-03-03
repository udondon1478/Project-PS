"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.createLineBot = createLineBot;exports.createLineWebhookCallback = createLineWebhookCallback;var _config = require("../config/config.js");
var _globals = require("../globals.js");
var _accounts = require("./accounts.js");
var _botHandlers = require("./bot-handlers.js");
var _webhook = require("./webhook.js");
function createLineBot(opts) {
  const runtime = opts.runtime ?? {
    log: console.log,
    error: console.error,
    exit: (code) => {
      throw new Error(`exit ${code}`);
    }
  };
  const cfg = opts.config ?? (0, _config.loadConfig)();
  const account = (0, _accounts.resolveLineAccount)({
    cfg,
    accountId: opts.accountId
  });
  const mediaMaxBytes = (opts.mediaMaxMb ?? account.config.mediaMaxMb ?? 10) * 1024 * 1024;
  const processMessage = opts.onMessage ?? (
  async () => {
    (0, _globals.logVerbose)("line: no message handler configured");
  });
  const handleWebhook = async (body) => {
    if (!body.events || body.events.length === 0) {
      return;
    }
    await (0, _botHandlers.handleLineWebhookEvents)(body.events, {
      cfg,
      account,
      runtime,
      mediaMaxBytes,
      processMessage
    });
  };
  return {
    handleWebhook,
    account
  };
}
function createLineWebhookCallback(bot, channelSecret, path = "/line/webhook") {
  const { handler } = (0, _webhook.startLineWebhook)({
    channelSecret,
    onEvents: bot.handleWebhook,
    path
  });
  return { path, handler };
} /* v9-42a0bebb0adf4ad2 */
