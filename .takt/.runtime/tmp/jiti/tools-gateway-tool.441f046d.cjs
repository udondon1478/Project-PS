"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.createGatewayTool = createGatewayTool;var _typebox = require("@sinclair/typebox");
var _io = require("../../config/io.js");
var _sessions = require("../../config/sessions.js");
var _restartSentinel = require("../../infra/restart-sentinel.js");
var _restart = require("../../infra/restart.js");
var _typebox2 = require("../schema/typebox.js");
var _common = require("./common.js");
var _gateway = require("./gateway.js");
function resolveBaseHashFromSnapshot(snapshot) {
  if (!snapshot || typeof snapshot !== "object") {
    return undefined;
  }
  const hashValue = snapshot.hash;
  const rawValue = snapshot.raw;
  const hash = (0, _io.resolveConfigSnapshotHash)({
    hash: typeof hashValue === "string" ? hashValue : undefined,
    raw: typeof rawValue === "string" ? rawValue : undefined
  });
  return hash ?? undefined;
}
const GATEWAY_ACTIONS = [
"restart",
"config.get",
"config.schema",
"config.apply",
"config.patch",
"update.run"];

// NOTE: Using a flattened object schema instead of Type.Union([Type.Object(...), ...])
// because Claude API on Vertex AI rejects nested anyOf schemas as invalid JSON Schema.
// The discriminator (action) determines which properties are relevant; runtime validates.
const GatewayToolSchema = _typebox.Type.Object({
  action: (0, _typebox2.stringEnum)(GATEWAY_ACTIONS),
  // restart
  delayMs: _typebox.Type.Optional(_typebox.Type.Number()),
  reason: _typebox.Type.Optional(_typebox.Type.String()),
  // config.get, config.schema, config.apply, update.run
  gatewayUrl: _typebox.Type.Optional(_typebox.Type.String()),
  gatewayToken: _typebox.Type.Optional(_typebox.Type.String()),
  timeoutMs: _typebox.Type.Optional(_typebox.Type.Number()),
  // config.apply, config.patch
  raw: _typebox.Type.Optional(_typebox.Type.String()),
  baseHash: _typebox.Type.Optional(_typebox.Type.String()),
  // config.apply, config.patch, update.run
  sessionKey: _typebox.Type.Optional(_typebox.Type.String()),
  note: _typebox.Type.Optional(_typebox.Type.String()),
  restartDelayMs: _typebox.Type.Optional(_typebox.Type.Number())
});
// NOTE: We intentionally avoid top-level `allOf`/`anyOf`/`oneOf` conditionals here:
// - OpenAI rejects tool schemas that include these keywords at the *top-level*.
// - Claude/Vertex has other JSON Schema quirks.
// Conditional requirements (like `raw` for config.apply) are enforced at runtime.
function createGatewayTool(opts) {
  return {
    label: "Gateway",
    name: "gateway",
    description: "Restart, apply config, or update the gateway in-place (SIGUSR1). Use config.patch for safe partial config updates (merges with existing). Use config.apply only when replacing entire config. Both trigger restart after writing.",
    parameters: GatewayToolSchema,
    execute: async (_toolCallId, args) => {
      const params = args;
      const action = (0, _common.readStringParam)(params, "action", { required: true });
      if (action === "restart") {
        if (opts?.config?.commands?.restart !== true) {
          throw new Error("Gateway restart is disabled. Set commands.restart=true to enable.");
        }
        const sessionKey = typeof params.sessionKey === "string" && params.sessionKey.trim() ?
        params.sessionKey.trim() :
        opts?.agentSessionKey?.trim() || undefined;
        const delayMs = typeof params.delayMs === "number" && Number.isFinite(params.delayMs) ?
        Math.floor(params.delayMs) :
        undefined;
        const reason = typeof params.reason === "string" && params.reason.trim() ?
        params.reason.trim().slice(0, 200) :
        undefined;
        const note = typeof params.note === "string" && params.note.trim() ? params.note.trim() : undefined;
        // Extract channel + threadId for routing after restart
        let deliveryContext;
        let threadId;
        if (sessionKey) {
          const threadMarker = ":thread:";
          const threadIndex = sessionKey.lastIndexOf(threadMarker);
          const baseSessionKey = threadIndex === -1 ? sessionKey : sessionKey.slice(0, threadIndex);
          const threadIdRaw = threadIndex === -1 ? undefined : sessionKey.slice(threadIndex + threadMarker.length);
          threadId = threadIdRaw?.trim() || undefined;
          try {
            const cfg = (0, _io.loadConfig)();
            const storePath = (0, _sessions.resolveStorePath)(cfg.session?.store);
            const store = (0, _sessions.loadSessionStore)(storePath);
            let entry = store[sessionKey];
            if (!entry?.deliveryContext && threadIndex !== -1 && baseSessionKey) {
              entry = store[baseSessionKey];
            }
            if (entry?.deliveryContext) {
              deliveryContext = {
                channel: entry.deliveryContext.channel,
                to: entry.deliveryContext.to,
                accountId: entry.deliveryContext.accountId
              };
            }
          }
          catch {

            // ignore: best-effort
          }}
        const payload = {
          kind: "restart",
          status: "ok",
          ts: Date.now(),
          sessionKey,
          deliveryContext,
          threadId,
          message: note ?? reason ?? null,
          doctorHint: (0, _restartSentinel.formatDoctorNonInteractiveHint)(),
          stats: {
            mode: "gateway.restart",
            reason
          }
        };
        try {
          await (0, _restartSentinel.writeRestartSentinel)(payload);
        }
        catch {

          // ignore: sentinel is best-effort
        }console.info(`gateway tool: restart requested (delayMs=${delayMs ?? "default"}, reason=${reason ?? "none"})`);
        const scheduled = (0, _restart.scheduleGatewaySigusr1Restart)({
          delayMs,
          reason
        });
        return (0, _common.jsonResult)(scheduled);
      }
      const gatewayUrl = typeof params.gatewayUrl === "string" && params.gatewayUrl.trim() ?
      params.gatewayUrl.trim() :
      undefined;
      const gatewayToken = typeof params.gatewayToken === "string" && params.gatewayToken.trim() ?
      params.gatewayToken.trim() :
      undefined;
      const timeoutMs = typeof params.timeoutMs === "number" && Number.isFinite(params.timeoutMs) ?
      Math.max(1, Math.floor(params.timeoutMs)) :
      undefined;
      const gatewayOpts = { gatewayUrl, gatewayToken, timeoutMs };
      if (action === "config.get") {
        const result = await (0, _gateway.callGatewayTool)("config.get", gatewayOpts, {});
        return (0, _common.jsonResult)({ ok: true, result });
      }
      if (action === "config.schema") {
        const result = await (0, _gateway.callGatewayTool)("config.schema", gatewayOpts, {});
        return (0, _common.jsonResult)({ ok: true, result });
      }
      if (action === "config.apply") {
        const raw = (0, _common.readStringParam)(params, "raw", { required: true });
        let baseHash = (0, _common.readStringParam)(params, "baseHash");
        if (!baseHash) {
          const snapshot = await (0, _gateway.callGatewayTool)("config.get", gatewayOpts, {});
          baseHash = resolveBaseHashFromSnapshot(snapshot);
        }
        const sessionKey = typeof params.sessionKey === "string" && params.sessionKey.trim() ?
        params.sessionKey.trim() :
        opts?.agentSessionKey?.trim() || undefined;
        const note = typeof params.note === "string" && params.note.trim() ? params.note.trim() : undefined;
        const restartDelayMs = typeof params.restartDelayMs === "number" && Number.isFinite(params.restartDelayMs) ?
        Math.floor(params.restartDelayMs) :
        undefined;
        const result = await (0, _gateway.callGatewayTool)("config.apply", gatewayOpts, {
          raw,
          baseHash,
          sessionKey,
          note,
          restartDelayMs
        });
        return (0, _common.jsonResult)({ ok: true, result });
      }
      if (action === "config.patch") {
        const raw = (0, _common.readStringParam)(params, "raw", { required: true });
        let baseHash = (0, _common.readStringParam)(params, "baseHash");
        if (!baseHash) {
          const snapshot = await (0, _gateway.callGatewayTool)("config.get", gatewayOpts, {});
          baseHash = resolveBaseHashFromSnapshot(snapshot);
        }
        const sessionKey = typeof params.sessionKey === "string" && params.sessionKey.trim() ?
        params.sessionKey.trim() :
        opts?.agentSessionKey?.trim() || undefined;
        const note = typeof params.note === "string" && params.note.trim() ? params.note.trim() : undefined;
        const restartDelayMs = typeof params.restartDelayMs === "number" && Number.isFinite(params.restartDelayMs) ?
        Math.floor(params.restartDelayMs) :
        undefined;
        const result = await (0, _gateway.callGatewayTool)("config.patch", gatewayOpts, {
          raw,
          baseHash,
          sessionKey,
          note,
          restartDelayMs
        });
        return (0, _common.jsonResult)({ ok: true, result });
      }
      if (action === "update.run") {
        const sessionKey = typeof params.sessionKey === "string" && params.sessionKey.trim() ?
        params.sessionKey.trim() :
        opts?.agentSessionKey?.trim() || undefined;
        const note = typeof params.note === "string" && params.note.trim() ? params.note.trim() : undefined;
        const restartDelayMs = typeof params.restartDelayMs === "number" && Number.isFinite(params.restartDelayMs) ?
        Math.floor(params.restartDelayMs) :
        undefined;
        const result = await (0, _gateway.callGatewayTool)("update.run", gatewayOpts, {
          sessionKey,
          note,
          restartDelayMs,
          timeoutMs
        });
        return (0, _common.jsonResult)({ ok: true, result });
      }
      throw new Error(`Unknown action: ${action}`);
    }
  };
} /* v9-e3222b38e22d613e */
