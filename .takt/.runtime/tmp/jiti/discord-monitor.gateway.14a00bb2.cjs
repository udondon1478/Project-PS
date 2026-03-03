"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.getDiscordGatewayEmitter = getDiscordGatewayEmitter;exports.waitForDiscordGatewayStop = waitForDiscordGatewayStop;function getDiscordGatewayEmitter(gateway) {
  return gateway?.emitter;
}
async function waitForDiscordGatewayStop(params) {
  const { gateway, abortSignal, onGatewayError, shouldStopOnError } = params;
  const emitter = gateway?.emitter;
  return await new Promise((resolve, reject) => {
    let settled = false;
    const cleanup = () => {
      abortSignal?.removeEventListener("abort", onAbort);
      emitter?.removeListener("error", onGatewayErrorEvent);
    };
    const finishResolve = () => {
      if (settled) {
        return;
      }
      settled = true;
      cleanup();
      try {
        gateway?.disconnect?.();
      } finally
      {
        resolve();
      }
    };
    const finishReject = (err) => {
      if (settled) {
        return;
      }
      settled = true;
      cleanup();
      try {
        gateway?.disconnect?.();
      } finally
      {
        reject(err);
      }
    };
    const onAbort = () => {
      finishResolve();
    };
    const onGatewayErrorEvent = (err) => {
      onGatewayError?.(err);
      const shouldStop = shouldStopOnError?.(err) ?? true;
      if (shouldStop) {
        finishReject(err);
      }
    };
    if (abortSignal?.aborted) {
      onAbort();
      return;
    }
    abortSignal?.addEventListener("abort", onAbort, { once: true });
    emitter?.on("error", onGatewayErrorEvent);
  });
} /* v9-976b0a24baf7ec48 */
