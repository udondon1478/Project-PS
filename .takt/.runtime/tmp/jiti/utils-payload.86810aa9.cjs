"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.createIdentifyPayload = createIdentifyPayload;exports.createRequestGuildMembersPayload = createRequestGuildMembersPayload;exports.createResumePayload = createResumePayload;exports.createUpdatePresencePayload = createUpdatePresencePayload;exports.createUpdateVoiceStatePayload = createUpdateVoiceStatePayload;exports.validatePayload = validatePayload;var _types = require("../types.js");
function validatePayload(data) {
  try {
    const payload = JSON.parse(data);
    if (!payload || typeof payload !== "object") {
      console.error("[Gateway] Invalid payload: Not an object", { data });
      return null;
    }
    if (!("op" in payload) || typeof payload.op !== "number") {
      console.error("[Gateway] Invalid payload: Missing or invalid op code", {
        data
      });
      return null;
    }
    if (!("d" in payload)) {
      console.error("[Gateway] Invalid payload: Missing data field", { data });
      return null;
    }
    return payload;
  }
  catch (error) {
    console.error("[Gateway] Failed to validate payload:", error, { data });
    return null;
  }
}
function createIdentifyPayload(data) {
  return {
    op: _types.GatewayOpcodes.Identify,
    d: {
      token: data.token,
      properties: data.properties,
      intents: data.intents,
      ...(data.shard ? { shard: data.shard } : {})
    }
  };
}
function createResumePayload(data) {
  return {
    op: _types.GatewayOpcodes.Resume,
    d: {
      token: data.token,
      session_id: data.sessionId,
      seq: data.sequence
    }
  };
}
function createUpdatePresencePayload(data) {
  return {
    op: _types.GatewayOpcodes.PresenceUpdate,
    d: data
  };
}
function createUpdateVoiceStatePayload(data) {
  return {
    op: _types.GatewayOpcodes.VoiceStateUpdate,
    d: data
  };
}
function createRequestGuildMembersPayload(data) {
  return {
    op: _types.GatewayOpcodes.RequestGuildMembers,
    d: data
  };
} /* v9-cfd19a1f3ea94b20 */
