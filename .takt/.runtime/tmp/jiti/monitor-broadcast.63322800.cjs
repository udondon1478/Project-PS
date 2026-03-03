"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.maybeBroadcastMessage = maybeBroadcastMessage;var _resolveRoute = require("../../../routing/resolve-route.js");
var _sessionKey = require("../../../routing/session-key.js");
var _session = require("../../session.js");
var _loggers = require("../loggers.js");
async function maybeBroadcastMessage(params) {
  const broadcastAgents = params.cfg.broadcast?.[params.peerId];
  if (!broadcastAgents || !Array.isArray(broadcastAgents)) {
    return false;
  }
  if (broadcastAgents.length === 0) {
    return false;
  }
  const strategy = params.cfg.broadcast?.strategy || "parallel";
  _loggers.whatsappInboundLog.info(`Broadcasting message to ${broadcastAgents.length} agents (${strategy})`);
  const agentIds = params.cfg.agents?.list?.map((agent) => (0, _sessionKey.normalizeAgentId)(agent.id));
  const hasKnownAgents = (agentIds?.length ?? 0) > 0;
  const groupHistorySnapshot = params.msg.chatType === "group" ?
  params.groupHistories.get(params.groupHistoryKey) ?? [] :
  undefined;
  const processForAgent = async (agentId) => {
    const normalizedAgentId = (0, _sessionKey.normalizeAgentId)(agentId);
    if (hasKnownAgents && !agentIds?.includes(normalizedAgentId)) {
      _loggers.whatsappInboundLog.warn(`Broadcast agent ${agentId} not found in agents.list; skipping`);
      return false;
    }
    const agentRoute = {
      ...params.route,
      agentId: normalizedAgentId,
      sessionKey: (0, _resolveRoute.buildAgentSessionKey)({
        agentId: normalizedAgentId,
        channel: "whatsapp",
        accountId: params.route.accountId,
        peer: {
          kind: params.msg.chatType === "group" ? "group" : "dm",
          id: params.peerId
        },
        dmScope: params.cfg.session?.dmScope,
        identityLinks: params.cfg.session?.identityLinks
      }),
      mainSessionKey: (0, _sessionKey.buildAgentMainSessionKey)({
        agentId: normalizedAgentId,
        mainKey: _sessionKey.DEFAULT_MAIN_KEY
      })
    };
    try {
      return await params.processMessage(params.msg, agentRoute, params.groupHistoryKey, {
        groupHistory: groupHistorySnapshot,
        suppressGroupHistoryClear: true
      });
    }
    catch (err) {
      _loggers.whatsappInboundLog.error(`Broadcast agent ${agentId} failed: ${(0, _session.formatError)(err)}`);
      return false;
    }
  };
  if (strategy === "sequential") {
    for (const agentId of broadcastAgents) {
      await processForAgent(agentId);
    }
  } else
  {
    await Promise.allSettled(broadcastAgents.map(processForAgent));
  }
  if (params.msg.chatType === "group") {
    params.groupHistories.set(params.groupHistoryKey, []);
  }
  return true;
} /* v9-0dcd563b9aa2584f */
