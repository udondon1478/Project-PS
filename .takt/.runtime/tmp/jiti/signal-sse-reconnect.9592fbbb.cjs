"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.runSignalSseLoop = runSignalSseLoop;var _globals = require("../globals.js");
var _backoff = require("../infra/backoff.js");
var _client = require("./client.js");
const DEFAULT_RECONNECT_POLICY = {
  initialMs: 1_000,
  maxMs: 10_000,
  factor: 2,
  jitter: 0.2
};
async function runSignalSseLoop({ baseUrl, account, abortSignal, runtime, onEvent, policy }) {
  const reconnectPolicy = {
    ...DEFAULT_RECONNECT_POLICY,
    ...policy
  };
  let reconnectAttempts = 0;
  const logReconnectVerbose = (message) => {
    if (!(0, _globals.shouldLogVerbose)()) {
      return;
    }
    (0, _globals.logVerbose)(message);
  };
  while (!abortSignal?.aborted) {
    try {
      await (0, _client.streamSignalEvents)({
        baseUrl,
        account,
        abortSignal,
        onEvent: (event) => {
          reconnectAttempts = 0;
          onEvent(event);
        }
      });
      if (abortSignal?.aborted) {
        return;
      }
      reconnectAttempts += 1;
      const delayMs = (0, _backoff.computeBackoff)(reconnectPolicy, reconnectAttempts);
      logReconnectVerbose(`Signal SSE stream ended, reconnecting in ${delayMs / 1000}s...`);
      await (0, _backoff.sleepWithAbort)(delayMs, abortSignal);
    }
    catch (err) {
      if (abortSignal?.aborted) {
        return;
      }
      runtime.error?.(`Signal SSE stream error: ${String(err)}`);
      reconnectAttempts += 1;
      const delayMs = (0, _backoff.computeBackoff)(reconnectPolicy, reconnectAttempts);
      runtime.log?.(`Signal SSE connection lost, reconnecting in ${delayMs / 1000}s...`);
      try {
        await (0, _backoff.sleepWithAbort)(delayMs, abortSignal);
      }
      catch (sleepErr) {
        if (abortSignal?.aborted) {
          return;
        }
        throw sleepErr;
      }
    }
  }
} /* v9-ebef4edb36ceea4a */
