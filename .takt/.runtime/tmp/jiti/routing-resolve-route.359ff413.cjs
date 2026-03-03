"use strict";Object.defineProperty(exports, "__esModule", { value: true });Object.defineProperty(exports, "DEFAULT_ACCOUNT_ID", { enumerable: true, get: function () {return _sessionKey.DEFAULT_ACCOUNT_ID;} });Object.defineProperty(exports, "DEFAULT_AGENT_ID", { enumerable: true, get: function () {return _sessionKey.DEFAULT_AGENT_ID;} });exports.buildAgentSessionKey = buildAgentSessionKey;exports.resolveAgentRoute = resolveAgentRoute;var _agentScope = require("../agents/agent-scope.js");
var _bindings = require("./bindings.js");
var _sessionKey = require("./session-key.js");

function normalizeToken(value) {
  return (value ?? "").trim().toLowerCase();
}
function normalizeId(value) {
  return (value ?? "").trim();
}
function normalizeAccountId(value) {
  const trimmed = (value ?? "").trim();
  return trimmed ? trimmed : _sessionKey.DEFAULT_ACCOUNT_ID;
}
function matchesAccountId(match, actual) {
  const trimmed = (match ?? "").trim();
  if (!trimmed) {
    return actual === _sessionKey.DEFAULT_ACCOUNT_ID;
  }
  if (trimmed === "*") {
    return true;
  }
  return trimmed === actual;
}
function buildAgentSessionKey(params) {
  const channel = normalizeToken(params.channel) || "unknown";
  const peer = params.peer;
  return (0, _sessionKey.buildAgentPeerSessionKey)({
    agentId: params.agentId,
    mainKey: _sessionKey.DEFAULT_MAIN_KEY,
    channel,
    accountId: params.accountId,
    peerKind: peer?.kind ?? "dm",
    peerId: peer ? normalizeId(peer.id) || "unknown" : null,
    dmScope: params.dmScope,
    identityLinks: params.identityLinks
  });
}
function listAgents(cfg) {
  const agents = cfg.agents?.list;
  return Array.isArray(agents) ? agents : [];
}
function pickFirstExistingAgentId(cfg, agentId) {
  const trimmed = (agentId ?? "").trim();
  if (!trimmed) {
    return (0, _sessionKey.sanitizeAgentId)((0, _agentScope.resolveDefaultAgentId)(cfg));
  }
  const normalized = (0, _sessionKey.normalizeAgentId)(trimmed);
  const agents = listAgents(cfg);
  if (agents.length === 0) {
    return (0, _sessionKey.sanitizeAgentId)(trimmed);
  }
  const match = agents.find((agent) => (0, _sessionKey.normalizeAgentId)(agent.id) === normalized);
  if (match?.id?.trim()) {
    return (0, _sessionKey.sanitizeAgentId)(match.id.trim());
  }
  return (0, _sessionKey.sanitizeAgentId)((0, _agentScope.resolveDefaultAgentId)(cfg));
}
function matchesChannel(match, channel) {
  const key = normalizeToken(match?.channel);
  if (!key) {
    return false;
  }
  return key === channel;
}
function matchesPeer(match, peer) {
  const m = match?.peer;
  if (!m) {
    return false;
  }
  const kind = normalizeToken(m.kind);
  const id = normalizeId(m.id);
  if (!kind || !id) {
    return false;
  }
  return kind === peer.kind && id === peer.id;
}
function matchesGuild(match, guildId) {
  const id = normalizeId(match?.guildId);
  if (!id) {
    return false;
  }
  return id === guildId;
}
function matchesTeam(match, teamId) {
  const id = normalizeId(match?.teamId);
  if (!id) {
    return false;
  }
  return id === teamId;
}
function resolveAgentRoute(input) {
  const channel = normalizeToken(input.channel);
  const accountId = normalizeAccountId(input.accountId);
  const peer = input.peer ? { kind: input.peer.kind, id: normalizeId(input.peer.id) } : null;
  const guildId = normalizeId(input.guildId);
  const teamId = normalizeId(input.teamId);
  const bindings = (0, _bindings.listBindings)(input.cfg).filter((binding) => {
    if (!binding || typeof binding !== "object") {
      return false;
    }
    if (!matchesChannel(binding.match, channel)) {
      return false;
    }
    return matchesAccountId(binding.match?.accountId, accountId);
  });
  const dmScope = input.cfg.session?.dmScope ?? "main";
  const identityLinks = input.cfg.session?.identityLinks;
  const choose = (agentId, matchedBy) => {
    const resolvedAgentId = pickFirstExistingAgentId(input.cfg, agentId);
    const sessionKey = buildAgentSessionKey({
      agentId: resolvedAgentId,
      channel,
      accountId,
      peer,
      dmScope,
      identityLinks
    }).toLowerCase();
    const mainSessionKey = (0, _sessionKey.buildAgentMainSessionKey)({
      agentId: resolvedAgentId,
      mainKey: _sessionKey.DEFAULT_MAIN_KEY
    }).toLowerCase();
    return {
      agentId: resolvedAgentId,
      channel,
      accountId,
      sessionKey,
      mainSessionKey,
      matchedBy
    };
  };
  if (peer) {
    const peerMatch = bindings.find((b) => matchesPeer(b.match, peer));
    if (peerMatch) {
      return choose(peerMatch.agentId, "binding.peer");
    }
  }
  // Thread parent inheritance: if peer (thread) didn't match, check parent peer binding
  const parentPeer = input.parentPeer ?
  { kind: input.parentPeer.kind, id: normalizeId(input.parentPeer.id) } :
  null;
  if (parentPeer && parentPeer.id) {
    const parentPeerMatch = bindings.find((b) => matchesPeer(b.match, parentPeer));
    if (parentPeerMatch) {
      return choose(parentPeerMatch.agentId, "binding.peer.parent");
    }
  }
  if (guildId) {
    const guildMatch = bindings.find((b) => matchesGuild(b.match, guildId));
    if (guildMatch) {
      return choose(guildMatch.agentId, "binding.guild");
    }
  }
  if (teamId) {
    const teamMatch = bindings.find((b) => matchesTeam(b.match, teamId));
    if (teamMatch) {
      return choose(teamMatch.agentId, "binding.team");
    }
  }
  const accountMatch = bindings.find((b) => b.match?.accountId?.trim() !== "*" && !b.match?.peer && !b.match?.guildId && !b.match?.teamId);
  if (accountMatch) {
    return choose(accountMatch.agentId, "binding.account");
  }
  const anyAccountMatch = bindings.find((b) => b.match?.accountId?.trim() === "*" && !b.match?.peer && !b.match?.guildId && !b.match?.teamId);
  if (anyAccountMatch) {
    return choose(anyAccountMatch.agentId, "binding.channel");
  }
  return choose((0, _agentScope.resolveDefaultAgentId)(input.cfg), "default");
} /* v9-6de53789e97251e0 */
