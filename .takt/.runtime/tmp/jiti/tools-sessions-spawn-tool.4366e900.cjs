"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.createSessionsSpawnTool = createSessionsSpawnTool;var _typebox = require("@sinclair/typebox");
var _nodeCrypto = _interopRequireDefault(require("node:crypto"));
var _thinking = require("../../auto-reply/thinking.js");
var _config = require("../../config/config.js");
var _call = require("../../gateway/call.js");
var _sessionKey = require("../../routing/session-key.js");
var _deliveryContext = require("../../utils/delivery-context.js");
var _agentScope = require("../agent-scope.js");
var _lanes = require("../lanes.js");
var _typebox2 = require("../schema/typebox.js");
var _subagentAnnounce = require("../subagent-announce.js");
var _subagentRegistry = require("../subagent-registry.js");
var _common = require("./common.js");
var _sessionsHelpers = require("./sessions-helpers.js");function _interopRequireDefault(e) {return e && e.__esModule ? e : { default: e };}
const SessionsSpawnToolSchema = _typebox.Type.Object({
  task: _typebox.Type.String(),
  label: _typebox.Type.Optional(_typebox.Type.String()),
  agentId: _typebox.Type.Optional(_typebox.Type.String()),
  model: _typebox.Type.Optional(_typebox.Type.String()),
  thinking: _typebox.Type.Optional(_typebox.Type.String()),
  runTimeoutSeconds: _typebox.Type.Optional(_typebox.Type.Number({ minimum: 0 })),
  // Back-compat alias. Prefer runTimeoutSeconds.
  timeoutSeconds: _typebox.Type.Optional(_typebox.Type.Number({ minimum: 0 })),
  cleanup: (0, _typebox2.optionalStringEnum)(["delete", "keep"])
});
function splitModelRef(ref) {
  if (!ref) {
    return { provider: undefined, model: undefined };
  }
  const trimmed = ref.trim();
  if (!trimmed) {
    return { provider: undefined, model: undefined };
  }
  const [provider, model] = trimmed.split("/", 2);
  if (model) {
    return { provider, model };
  }
  return { provider: undefined, model: trimmed };
}
function normalizeModelSelection(value) {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed || undefined;
  }
  if (!value || typeof value !== "object") {
    return undefined;
  }
  const primary = value.primary;
  if (typeof primary === "string" && primary.trim()) {
    return primary.trim();
  }
  return undefined;
}
function createSessionsSpawnTool(opts) {
  return {
    label: "Sessions",
    name: "sessions_spawn",
    description: "Spawn a background sub-agent run in an isolated session and announce the result back to the requester chat.",
    parameters: SessionsSpawnToolSchema,
    execute: async (_toolCallId, args) => {
      const params = args;
      const task = (0, _common.readStringParam)(params, "task", { required: true });
      const label = typeof params.label === "string" ? params.label.trim() : "";
      const requestedAgentId = (0, _common.readStringParam)(params, "agentId");
      const modelOverride = (0, _common.readStringParam)(params, "model");
      const thinkingOverrideRaw = (0, _common.readStringParam)(params, "thinking");
      const cleanup = params.cleanup === "keep" || params.cleanup === "delete" ? params.cleanup : "keep";
      const requesterOrigin = (0, _deliveryContext.normalizeDeliveryContext)({
        channel: opts?.agentChannel,
        accountId: opts?.agentAccountId,
        to: opts?.agentTo,
        threadId: opts?.agentThreadId
      });
      const runTimeoutSeconds = (() => {
        const explicit = typeof params.runTimeoutSeconds === "number" && Number.isFinite(params.runTimeoutSeconds) ?
        Math.max(0, Math.floor(params.runTimeoutSeconds)) :
        undefined;
        if (explicit !== undefined) {
          return explicit;
        }
        const legacy = typeof params.timeoutSeconds === "number" && Number.isFinite(params.timeoutSeconds) ?
        Math.max(0, Math.floor(params.timeoutSeconds)) :
        undefined;
        return legacy ?? 0;
      })();
      let modelWarning;
      let modelApplied = false;
      const cfg = (0, _config.loadConfig)();
      const { mainKey, alias } = (0, _sessionsHelpers.resolveMainSessionAlias)(cfg);
      const requesterSessionKey = opts?.agentSessionKey;
      if (typeof requesterSessionKey === "string" && (0, _sessionKey.isSubagentSessionKey)(requesterSessionKey)) {
        return (0, _common.jsonResult)({
          status: "forbidden",
          error: "sessions_spawn is not allowed from sub-agent sessions"
        });
      }
      const requesterInternalKey = requesterSessionKey ?
      (0, _sessionsHelpers.resolveInternalSessionKey)({
        key: requesterSessionKey,
        alias,
        mainKey
      }) :
      alias;
      const requesterDisplayKey = (0, _sessionsHelpers.resolveDisplaySessionKey)({
        key: requesterInternalKey,
        alias,
        mainKey
      });
      const requesterAgentId = (0, _sessionKey.normalizeAgentId)(opts?.requesterAgentIdOverride ?? (0, _sessionKey.parseAgentSessionKey)(requesterInternalKey)?.agentId);
      const targetAgentId = requestedAgentId ?
      (0, _sessionKey.normalizeAgentId)(requestedAgentId) :
      requesterAgentId;
      if (targetAgentId !== requesterAgentId) {
        const allowAgents = (0, _agentScope.resolveAgentConfig)(cfg, requesterAgentId)?.subagents?.allowAgents ?? [];
        const allowAny = allowAgents.some((value) => value.trim() === "*");
        const normalizedTargetId = targetAgentId.toLowerCase();
        const allowSet = new Set(allowAgents.
        filter((value) => value.trim() && value.trim() !== "*").
        map((value) => (0, _sessionKey.normalizeAgentId)(value).toLowerCase()));
        if (!allowAny && !allowSet.has(normalizedTargetId)) {
          const allowedText = allowAny ?
          "*" :
          allowSet.size > 0 ?
          Array.from(allowSet).join(", ") :
          "none";
          return (0, _common.jsonResult)({
            status: "forbidden",
            error: `agentId is not allowed for sessions_spawn (allowed: ${allowedText})`
          });
        }
      }
      const childSessionKey = `agent:${targetAgentId}:subagent:${_nodeCrypto.default.randomUUID()}`;
      const spawnedByKey = requesterInternalKey;
      const targetAgentConfig = (0, _agentScope.resolveAgentConfig)(cfg, targetAgentId);
      const resolvedModel = normalizeModelSelection(modelOverride) ??
      normalizeModelSelection(targetAgentConfig?.subagents?.model) ??
      normalizeModelSelection(cfg.agents?.defaults?.subagents?.model);
      let thinkingOverride;
      if (thinkingOverrideRaw) {
        const normalized = (0, _thinking.normalizeThinkLevel)(thinkingOverrideRaw);
        if (!normalized) {
          const { provider, model } = splitModelRef(resolvedModel);
          const hint = (0, _thinking.formatThinkingLevels)(provider, model);
          return (0, _common.jsonResult)({
            status: "error",
            error: `Invalid thinking level "${thinkingOverrideRaw}". Use one of: ${hint}.`
          });
        }
        thinkingOverride = normalized;
      }
      if (resolvedModel) {
        try {
          await (0, _call.callGateway)({
            method: "sessions.patch",
            params: { key: childSessionKey, model: resolvedModel },
            timeoutMs: 10_000
          });
          modelApplied = true;
        }
        catch (err) {
          const messageText = err instanceof Error ? err.message : typeof err === "string" ? err : "error";
          const recoverable = messageText.includes("invalid model") || messageText.includes("model not allowed");
          if (!recoverable) {
            return (0, _common.jsonResult)({
              status: "error",
              error: messageText,
              childSessionKey
            });
          }
          modelWarning = messageText;
        }
      }
      const childSystemPrompt = (0, _subagentAnnounce.buildSubagentSystemPrompt)({
        requesterSessionKey,
        requesterOrigin,
        childSessionKey,
        label: label || undefined,
        task
      });
      const childIdem = _nodeCrypto.default.randomUUID();
      let childRunId = childIdem;
      try {
        const response = await (0, _call.callGateway)({
          method: "agent",
          params: {
            message: task,
            sessionKey: childSessionKey,
            channel: requesterOrigin?.channel,
            idempotencyKey: childIdem,
            deliver: false,
            lane: _lanes.AGENT_LANE_SUBAGENT,
            extraSystemPrompt: childSystemPrompt,
            thinking: thinkingOverride,
            timeout: runTimeoutSeconds > 0 ? runTimeoutSeconds : undefined,
            label: label || undefined,
            spawnedBy: spawnedByKey,
            groupId: opts?.agentGroupId ?? undefined,
            groupChannel: opts?.agentGroupChannel ?? undefined,
            groupSpace: opts?.agentGroupSpace ?? undefined
          },
          timeoutMs: 10_000
        });
        if (typeof response?.runId === "string" && response.runId) {
          childRunId = response.runId;
        }
      }
      catch (err) {
        const messageText = err instanceof Error ? err.message : typeof err === "string" ? err : "error";
        return (0, _common.jsonResult)({
          status: "error",
          error: messageText,
          childSessionKey,
          runId: childRunId
        });
      }
      (0, _subagentRegistry.registerSubagentRun)({
        runId: childRunId,
        childSessionKey,
        requesterSessionKey: requesterInternalKey,
        requesterOrigin,
        requesterDisplayKey,
        task,
        cleanup,
        label: label || undefined,
        runTimeoutSeconds
      });
      return (0, _common.jsonResult)({
        status: "accepted",
        childSessionKey,
        runId: childRunId,
        modelApplied: resolvedModel ? modelApplied : undefined,
        warning: modelWarning
      });
    }
  };
} /* v9-ec04a5ceb67e05d4 */
