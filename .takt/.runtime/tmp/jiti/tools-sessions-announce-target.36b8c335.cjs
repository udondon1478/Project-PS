"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.resolveAnnounceTarget = resolveAnnounceTarget;var _index = require("../../channels/plugins/index.js");
var _call = require("../../gateway/call.js");
var _sessionsSendHelpers = require("./sessions-send-helpers.js");
async function resolveAnnounceTarget(params) {
  const parsed = (0, _sessionsSendHelpers.resolveAnnounceTargetFromKey)(params.sessionKey);
  const parsedDisplay = (0, _sessionsSendHelpers.resolveAnnounceTargetFromKey)(params.displayKey);
  const fallback = parsed ?? parsedDisplay ?? null;
  if (fallback) {
    const normalized = (0, _index.normalizeChannelId)(fallback.channel);
    const plugin = normalized ? (0, _index.getChannelPlugin)(normalized) : null;
    if (!plugin?.meta?.preferSessionLookupForAnnounceTarget) {
      return fallback;
    }
  }
  try {
    const list = await (0, _call.callGateway)({
      method: "sessions.list",
      params: {
        includeGlobal: true,
        includeUnknown: true,
        limit: 200
      }
    });
    const sessions = Array.isArray(list?.sessions) ? list.sessions : [];
    const match = sessions.find((entry) => entry?.key === params.sessionKey) ??
    sessions.find((entry) => entry?.key === params.displayKey);
    const deliveryContext = match?.deliveryContext && typeof match.deliveryContext === "object" ?
    match.deliveryContext :
    undefined;
    const channel = (typeof deliveryContext?.channel === "string" ? deliveryContext.channel : undefined) ?? (
    typeof match?.lastChannel === "string" ? match.lastChannel : undefined);
    const to = (typeof deliveryContext?.to === "string" ? deliveryContext.to : undefined) ?? (
    typeof match?.lastTo === "string" ? match.lastTo : undefined);
    const accountId = (typeof deliveryContext?.accountId === "string" ? deliveryContext.accountId : undefined) ?? (
    typeof match?.lastAccountId === "string" ? match.lastAccountId : undefined);
    if (channel && to) {
      return { channel, to, accountId };
    }
  }
  catch {

    // ignore
  }return fallback;
} /* v9-0d9f028fefccee51 */
