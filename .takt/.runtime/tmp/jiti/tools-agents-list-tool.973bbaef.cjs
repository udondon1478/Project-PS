"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.createAgentsListTool = createAgentsListTool;var _typebox = require("@sinclair/typebox");
var _config = require("../../config/config.js");
var _sessionKey = require("../../routing/session-key.js");
var _agentScope = require("../agent-scope.js");
var _common = require("./common.js");
var _sessionsHelpers = require("./sessions-helpers.js");
const AgentsListToolSchema = _typebox.Type.Object({});
function createAgentsListTool(opts) {
  return {
    label: "Agents",
    name: "agents_list",
    description: "List agent ids you can target with sessions_spawn (based on allowlists).",
    parameters: AgentsListToolSchema,
    execute: async () => {
      const cfg = (0, _config.loadConfig)();
      const { mainKey, alias } = (0, _sessionsHelpers.resolveMainSessionAlias)(cfg);
      const requesterInternalKey = typeof opts?.agentSessionKey === "string" && opts.agentSessionKey.trim() ?
      (0, _sessionsHelpers.resolveInternalSessionKey)({
        key: opts.agentSessionKey,
        alias,
        mainKey
      }) :
      alias;
      const requesterAgentId = (0, _sessionKey.normalizeAgentId)(opts?.requesterAgentIdOverride ??
      (0, _sessionKey.parseAgentSessionKey)(requesterInternalKey)?.agentId ??
      _sessionKey.DEFAULT_AGENT_ID);
      const allowAgents = (0, _agentScope.resolveAgentConfig)(cfg, requesterAgentId)?.subagents?.allowAgents ?? [];
      const allowAny = allowAgents.some((value) => value.trim() === "*");
      const allowSet = new Set(allowAgents.
      filter((value) => value.trim() && value.trim() !== "*").
      map((value) => (0, _sessionKey.normalizeAgentId)(value)));
      const configuredAgents = Array.isArray(cfg.agents?.list) ? cfg.agents?.list : [];
      const configuredIds = configuredAgents.map((entry) => (0, _sessionKey.normalizeAgentId)(entry.id));
      const configuredNameMap = new Map();
      for (const entry of configuredAgents) {
        const name = entry?.name?.trim() ?? "";
        if (!name) {
          continue;
        }
        configuredNameMap.set((0, _sessionKey.normalizeAgentId)(entry.id), name);
      }
      const allowed = new Set();
      allowed.add(requesterAgentId);
      if (allowAny) {
        for (const id of configuredIds) {
          allowed.add(id);
        }
      } else
      {
        for (const id of allowSet) {
          allowed.add(id);
        }
      }
      const all = Array.from(allowed);
      const rest = all.
      filter((id) => id !== requesterAgentId).
      toSorted((a, b) => a.localeCompare(b));
      const ordered = [requesterAgentId, ...rest];
      const agents = ordered.map((id) => ({
        id,
        name: configuredNameMap.get(id),
        configured: configuredIds.includes(id)
      }));
      return (0, _common.jsonResult)({
        requester: requesterAgentId,
        allowAny,
        agents
      });
    }
  };
} /* v9-a09a4493c548b90a */
