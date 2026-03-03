"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.createTelegramRunnerOptions = createTelegramRunnerOptions;exports.monitorTelegramProvider = monitorTelegramProvider;var _runner = require("@grammyjs/runner");
var _agentLimits = require("../config/agent-limits.js");
var _config = require("../config/config.js");
var _backoff = require("../infra/backoff.js");
var _errors = require("../infra/errors.js");
var _formatDuration = require("../infra/format-duration.js");
var _accounts = require("./accounts.js");
var _allowedUpdates = require("./allowed-updates.js");
var _bot = require("./bot.js");
var _networkErrors = require("./network-errors.js");
var _proxy = require("./proxy.js");
var _updateOffsetStore = require("./update-offset-store.js");
var _webhook = require("./webhook.js");
function createTelegramRunnerOptions(cfg) {
  return {
    sink: {
      concurrency: (0, _agentLimits.resolveAgentMaxConcurrent)(cfg)
    },
    runner: {
      fetch: {
        // Match grammY defaults
        timeout: 30,
        // Request reactions without dropping default update types.
        allowed_updates: (0, _allowedUpdates.resolveTelegramAllowedUpdates)()
      },
      // Suppress grammY getUpdates stack traces; we log concise errors ourselves.
      silent: true,
      // Retry transient failures for a limited window before surfacing errors.
      maxRetryTime: 5 * 60 * 1000,
      retryInterval: "exponential"
    }
  };
}
const TELEGRAM_POLL_RESTART_POLICY = {
  initialMs: 2000,
  maxMs: 30_000,
  factor: 1.8,
  jitter: 0.25
};
const isGetUpdatesConflict = (err) => {
  if (!err || typeof err !== "object") {
    return false;
  }
  const typed = err;
  const errorCode = typed.error_code ?? typed.errorCode;
  if (errorCode !== 409) {
    return false;
  }
  const haystack = [typed.method, typed.description, typed.message].
  filter((value) => typeof value === "string").
  join(" ").
  toLowerCase();
  return haystack.includes("getupdates");
};
const NETWORK_ERROR_SNIPPETS = [
"fetch failed",
"network",
"timeout",
"socket",
"econnreset",
"econnrefused",
"undici"];

const isNetworkRelatedError = (err) => {
  if (!err) {
    return false;
  }
  const message = (0, _errors.formatErrorMessage)(err).toLowerCase();
  if (!message) {
    return false;
  }
  return NETWORK_ERROR_SNIPPETS.some((snippet) => message.includes(snippet));
};
async function monitorTelegramProvider(opts = {}) {
  const cfg = opts.config ?? (0, _config.loadConfig)();
  const account = (0, _accounts.resolveTelegramAccount)({
    cfg,
    accountId: opts.accountId
  });
  const token = opts.token?.trim() || account.token;
  if (!token) {
    throw new Error(`Telegram bot token missing for account "${account.accountId}" (set channels.telegram.accounts.${account.accountId}.botToken/tokenFile or TELEGRAM_BOT_TOKEN for default).`);
  }
  const proxyFetch = opts.proxyFetch ?? (account.config.proxy ? (0, _proxy.makeProxyFetch)(account.config.proxy) : undefined);
  let lastUpdateId = await (0, _updateOffsetStore.readTelegramUpdateOffset)({
    accountId: account.accountId
  });
  const persistUpdateId = async (updateId) => {
    if (lastUpdateId !== null && updateId <= lastUpdateId) {
      return;
    }
    lastUpdateId = updateId;
    try {
      await (0, _updateOffsetStore.writeTelegramUpdateOffset)({
        accountId: account.accountId,
        updateId
      });
    }
    catch (err) {
      (opts.runtime?.error ?? console.error)(`telegram: failed to persist update offset: ${String(err)}`);
    }
  };
  const bot = (0, _bot.createTelegramBot)({
    token,
    runtime: opts.runtime,
    proxyFetch,
    config: cfg,
    accountId: account.accountId,
    updateOffset: {
      lastUpdateId,
      onUpdateId: persistUpdateId
    }
  });
  if (opts.useWebhook) {
    await (0, _webhook.startTelegramWebhook)({
      token,
      accountId: account.accountId,
      config: cfg,
      path: opts.webhookPath,
      port: opts.webhookPort,
      secret: opts.webhookSecret,
      runtime: opts.runtime,
      fetch: proxyFetch,
      abortSignal: opts.abortSignal,
      publicUrl: opts.webhookUrl
    });
    return;
  }
  // Use grammyjs/runner for concurrent update processing
  let restartAttempts = 0;
  while (!opts.abortSignal?.aborted) {
    const runner = (0, _runner.run)(bot, createTelegramRunnerOptions(cfg));
    const stopOnAbort = () => {
      if (opts.abortSignal?.aborted) {
        void runner.stop();
      }
    };
    opts.abortSignal?.addEventListener("abort", stopOnAbort, { once: true });
    try {
      // runner.task() returns a promise that resolves when the runner stops
      await runner.task();
      return;
    }
    catch (err) {
      if (opts.abortSignal?.aborted) {
        throw err;
      }
      const isConflict = isGetUpdatesConflict(err);
      const isRecoverable = (0, _networkErrors.isRecoverableTelegramNetworkError)(err, { context: "polling" });
      const isNetworkError = isNetworkRelatedError(err);
      if (!isConflict && !isRecoverable && !isNetworkError) {
        throw err;
      }
      restartAttempts += 1;
      const delayMs = (0, _backoff.computeBackoff)(TELEGRAM_POLL_RESTART_POLICY, restartAttempts);
      const reason = isConflict ? "getUpdates conflict" : "network error";
      const errMsg = (0, _errors.formatErrorMessage)(err);
      (opts.runtime?.error ?? console.error)(`Telegram ${reason}: ${errMsg}; retrying in ${(0, _formatDuration.formatDurationMs)(delayMs)}.`);
      try {
        await (0, _backoff.sleepWithAbort)(delayMs, opts.abortSignal);
      }
      catch (sleepErr) {
        if (opts.abortSignal?.aborted) {
          return;
        }
        throw sleepErr;
      }
    } finally
    {
      opts.abortSignal?.removeEventListener("abort", stopOnAbort);
    }
  }
} /* v9-374d976ce2d29239 */
