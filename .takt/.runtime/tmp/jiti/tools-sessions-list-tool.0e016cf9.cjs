"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.createSessionsListTool = createSessionsListTool;var _typebox = require("@sinclair/typebox");
var _nodePath = _interopRequireDefault(require("node:path"));
var _config = require("../../config/config.js");
var _call = require("../../gateway/call.js");
var _sessionKey = require("../../routing/session-key.js");
var _common = require("./common.js");
var _sessionsHelpers = require("./sessions-helpers.js");function _interopRequireDefault(e) {return e && e.__esModule ? e : { default: e };}
const SessionsListToolSchema = _typebox.Type.Object({
  kinds: _typebox.Type.Optional(_typebox.Type.Array(_typebox.Type.String())),
  limit: _typebox.Type.Optional(_typebox.Type.Number({ minimum: 1 })),
  activeMinutes: _typebox.Type.Optional(_typebox.Type.Number({ minimum: 1 })),
  messageLimit: _typebox.Type.Optional(_typebox.Type.Number({ minimum: 0 }))
});
function resolveSandboxSessionToolsVisibility(cfg) {
  return cfg.agents?.defaults?.sandbox?.sessionToolsVisibility ?? "spawned";
}
function createSessionsListTool(opts) {
  return {
    label: "Sessions",
    name: "sessions_list",
    description: "List sessions with optional filters and last messages.",
    parameters: SessionsListToolSchema,
    execute: async (_toolCallId, args) => {
      const params = args;
      const cfg = (0, _config.loadConfig)();
      const { mainKey, alias } = (0, _sessionsHelpers.resolveMainSessionAlias)(cfg);
      const visibility = resolveSandboxSessionToolsVisibility(cfg);
      const requesterInternalKey = typeof opts?.agentSessionKey === "string" && opts.agentSessionKey.trim() ?
      (0, _sessionsHelpers.resolveInternalSessionKey)({
        key: opts.agentSessionKey,
        alias,
        mainKey
      }) :
      undefined;
      const restrictToSpawned = opts?.sandboxed === true &&
      visibility === "spawned" &&
      requesterInternalKey &&
      !(0, _sessionKey.isSubagentSessionKey)(requesterInternalKey);
      const kindsRaw = (0, _common.readStringArrayParam)(params, "kinds")?.map((value) => value.trim().toLowerCase());
      const allowedKindsList = (kindsRaw ?? []).filter((value) => ["main", "group", "cron", "hook", "node", "other"].includes(value));
      const allowedKinds = allowedKindsList.length ? new Set(allowedKindsList) : undefined;
      const limit = typeof params.limit === "number" && Number.isFinite(params.limit) ?
      Math.max(1, Math.floor(params.limit)) :
      undefined;
      const activeMinutes = typeof params.activeMinutes === "number" && Number.isFinite(params.activeMinutes) ?
      Math.max(1, Math.floor(params.activeMinutes)) :
      undefined;
      const messageLimitRaw = typeof params.messageLimit === "number" && Number.isFinite(params.messageLimit) ?
      Math.max(0, Math.floor(params.messageLimit)) :
      0;
      const messageLimit = Math.min(messageLimitRaw, 20);
      const list = await (0, _call.callGateway)({
        method: "sessions.list",
        params: {
          limit,
          activeMinutes,
          includeGlobal: !restrictToSpawned,
          includeUnknown: !restrictToSpawned,
          spawnedBy: restrictToSpawned ? requesterInternalKey : undefined
        }
      });
      const sessions = Array.isArray(list?.sessions) ? list.sessions : [];
      const storePath = typeof list?.path === "string" ? list.path : undefined;
      const a2aPolicy = (0, _sessionsHelpers.createAgentToAgentPolicy)(cfg);
      const requesterAgentId = (0, _sessionKey.resolveAgentIdFromSessionKey)(requesterInternalKey);
      const rows = [];
      for (const entry of sessions) {
        if (!entry || typeof entry !== "object") {
          continue;
        }
        const key = typeof entry.key === "string" ? entry.key : "";
        if (!key) {
          continue;
        }
        const entryAgentId = (0, _sessionKey.resolveAgentIdFromSessionKey)(key);
        const crossAgent = entryAgentId !== requesterAgentId;
        if (crossAgent && !a2aPolicy.isAllowed(requesterAgentId, entryAgentId)) {
          continue;
        }
        if (key === "unknown") {
          continue;
        }
        if (key === "global" && alias !== "global") {
          continue;
        }
        const gatewayKind = typeof entry.kind === "string" ? entry.kind : undefined;
        const kind = (0, _sessionsHelpers.classifySessionKind)({ key, gatewayKind, alias, mainKey });
        if (allowedKinds && !allowedKinds.has(kind)) {
          continue;
        }
        const displayKey = (0, _sessionsHelpers.resolveDisplaySessionKey)({
          key,
          alias,
          mainKey
        });
        const entryChannel = typeof entry.channel === "string" ? entry.channel : undefined;
        const deliveryContext = entry.deliveryContext && typeof entry.deliveryContext === "object" ?
        entry.deliveryContext :
        undefined;
        const deliveryChannel = typeof deliveryContext?.channel === "string" ? deliveryContext.channel : undefined;
        const deliveryTo = typeof deliveryContext?.to === "string" ? deliveryContext.to : undefined;
        const deliveryAccountId = typeof deliveryContext?.accountId === "string" ? deliveryContext.accountId : undefined;
        const lastChannel = deliveryChannel ?? (
        typeof entry.lastChannel === "string" ? entry.lastChannel : undefined);
        const lastAccountId = deliveryAccountId ?? (
        typeof entry.lastAccountId === "string" ? entry.lastAccountId : undefined);
        const derivedChannel = (0, _sessionsHelpers.deriveChannel)({
          key,
          kind,
          channel: entryChannel,
          lastChannel
        });
        const sessionId = typeof entry.sessionId === "string" ? entry.sessionId : undefined;
        const transcriptPath = sessionId && storePath ?
        _nodePath.default.join(_nodePath.default.dirname(storePath), `${sessionId}.jsonl`) :
        undefined;
        const row = {
          key: displayKey,
          kind,
          channel: derivedChannel,
          label: typeof entry.label === "string" ? entry.label : undefined,
          displayName: typeof entry.displayName === "string" ? entry.displayName : undefined,
          deliveryContext: deliveryChannel || deliveryTo || deliveryAccountId ?
          {
            channel: deliveryChannel,
            to: deliveryTo,
            accountId: deliveryAccountId
          } :
          undefined,
          updatedAt: typeof entry.updatedAt === "number" ? entry.updatedAt : undefined,
          sessionId,
          model: typeof entry.model === "string" ? entry.model : undefined,
          contextTokens: typeof entry.contextTokens === "number" ? entry.contextTokens : undefined,
          totalTokens: typeof entry.totalTokens === "number" ? entry.totalTokens : undefined,
          thinkingLevel: typeof entry.thinkingLevel === "string" ? entry.thinkingLevel : undefined,
          verboseLevel: typeof entry.verboseLevel === "string" ? entry.verboseLevel : undefined,
          systemSent: typeof entry.systemSent === "boolean" ? entry.systemSent : undefined,
          abortedLastRun: typeof entry.abortedLastRun === "boolean" ? entry.abortedLastRun : undefined,
          sendPolicy: typeof entry.sendPolicy === "string" ? entry.sendPolicy : undefined,
          lastChannel,
          lastTo: deliveryTo ?? (typeof entry.lastTo === "string" ? entry.lastTo : undefined),
          lastAccountId,
          transcriptPath
        };
        if (messageLimit > 0) {
          const resolvedKey = (0, _sessionsHelpers.resolveInternalSessionKey)({
            key: displayKey,
            alias,
            mainKey
          });
          const history = await (0, _call.callGateway)({
            method: "chat.history",
            params: { sessionKey: resolvedKey, limit: messageLimit }
          });
          const rawMessages = Array.isArray(history?.messages) ? history.messages : [];
          const filtered = (0, _sessionsHelpers.stripToolMessages)(rawMessages);
          row.messages = filtered.length > messageLimit ? filtered.slice(-messageLimit) : filtered;
        }
        rows.push(row);
      }
      return (0, _common.jsonResult)({
        count: rows.length,
        sessions: rows
      });
    }
  };
} /* v9-c37377e9b468f8b5 */
