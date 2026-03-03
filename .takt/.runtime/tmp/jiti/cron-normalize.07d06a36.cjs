"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.normalizeCronJobCreate = normalizeCronJobCreate;exports.normalizeCronJobInput = normalizeCronJobInput;exports.normalizeCronJobPatch = normalizeCronJobPatch;var _sessionKey = require("../routing/session-key.js");
var _parse = require("./parse.js");
var _payloadMigration = require("./payload-migration.js");
const DEFAULT_OPTIONS = {
  applyDefaults: false
};
function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function coerceSchedule(schedule) {
  const next = { ...schedule };
  const kind = typeof schedule.kind === "string" ? schedule.kind : undefined;
  const atMsRaw = schedule.atMs;
  const atRaw = schedule.at;
  const parsedAtMs = typeof atMsRaw === "string" ?
  (0, _parse.parseAbsoluteTimeMs)(atMsRaw) :
  typeof atRaw === "string" ?
  (0, _parse.parseAbsoluteTimeMs)(atRaw) :
  null;
  if (!kind) {
    if (typeof schedule.atMs === "number" ||
    typeof schedule.at === "string" ||
    typeof schedule.atMs === "string") {
      next.kind = "at";
    } else
    if (typeof schedule.everyMs === "number") {
      next.kind = "every";
    } else
    if (typeof schedule.expr === "string") {
      next.kind = "cron";
    }
  }
  if (typeof schedule.atMs !== "number" && parsedAtMs !== null) {
    next.atMs = parsedAtMs;
  }
  if ("at" in next) {
    delete next.at;
  }
  return next;
}
function coercePayload(payload) {
  const next = { ...payload };
  // Back-compat: older configs used `provider` for delivery channel.
  (0, _payloadMigration.migrateLegacyCronPayload)(next);
  return next;
}
function unwrapJob(raw) {
  if (isRecord(raw.data)) {
    return raw.data;
  }
  if (isRecord(raw.job)) {
    return raw.job;
  }
  return raw;
}
function normalizeCronJobInput(raw, options = DEFAULT_OPTIONS) {
  if (!isRecord(raw)) {
    return null;
  }
  const base = unwrapJob(raw);
  const next = { ...base };
  if ("agentId" in base) {
    const agentId = base.agentId;
    if (agentId === null) {
      next.agentId = null;
    } else
    if (typeof agentId === "string") {
      const trimmed = agentId.trim();
      if (trimmed) {
        next.agentId = (0, _sessionKey.sanitizeAgentId)(trimmed);
      } else
      {
        delete next.agentId;
      }
    }
  }
  if ("enabled" in base) {
    const enabled = base.enabled;
    if (typeof enabled === "boolean") {
      next.enabled = enabled;
    } else
    if (typeof enabled === "string") {
      const trimmed = enabled.trim().toLowerCase();
      if (trimmed === "true") {
        next.enabled = true;
      }
      if (trimmed === "false") {
        next.enabled = false;
      }
    }
  }
  if (isRecord(base.schedule)) {
    next.schedule = coerceSchedule(base.schedule);
  }
  if (isRecord(base.payload)) {
    next.payload = coercePayload(base.payload);
  }
  if (options.applyDefaults) {
    if (!next.wakeMode) {
      next.wakeMode = "next-heartbeat";
    }
    if (!next.sessionTarget && isRecord(next.payload)) {
      const kind = typeof next.payload.kind === "string" ? next.payload.kind : "";
      if (kind === "systemEvent") {
        next.sessionTarget = "main";
      }
      if (kind === "agentTurn") {
        next.sessionTarget = "isolated";
      }
    }
  }
  return next;
}
function normalizeCronJobCreate(raw, options) {
  return normalizeCronJobInput(raw, {
    applyDefaults: true,
    ...options
  });
}
function normalizeCronJobPatch(raw, options) {
  return normalizeCronJobInput(raw, {
    applyDefaults: false,
    ...options
  });
} /* v9-d99e58ddd084ef85 */
