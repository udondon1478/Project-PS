"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.ensureSkillSnapshot = ensureSkillSnapshot;exports.incrementCompactionCount = incrementCompactionCount;exports.prependSystemEvents = prependSystemEvents;var _nodeCrypto = _interopRequireDefault(require("node:crypto"));
var _dateTime = require("../../agents/date-time.js");
var _skills = require("../../agents/skills.js");
var _refresh = require("../../agents/skills/refresh.js");
var _sessions = require("../../config/sessions.js");
var _channelSummary = require("../../infra/channel-summary.js");
var _skillsRemote = require("../../infra/skills-remote.js");
var _systemEvents = require("../../infra/system-events.js");function _interopRequireDefault(e) {return e && e.__esModule ? e : { default: e };}
async function prependSystemEvents(params) {
  const compactSystemEvent = (line) => {
    const trimmed = line.trim();
    if (!trimmed) {
      return null;
    }
    const lower = trimmed.toLowerCase();
    if (lower.includes("reason periodic")) {
      return null;
    }
    // Filter out the actual heartbeat prompt, but not cron jobs that mention "heartbeat"
    // The heartbeat prompt starts with "Read HEARTBEAT.md" - cron payloads won't match this
    if (lower.startsWith("read heartbeat.md")) {
      return null;
    }
    // Also filter heartbeat poll/wake noise
    if (lower.includes("heartbeat poll") || lower.includes("heartbeat wake")) {
      return null;
    }
    if (trimmed.startsWith("Node:")) {
      return trimmed.replace(/ · last input [^·]+/i, "").trim();
    }
    return trimmed;
  };
  const resolveExplicitTimezone = (value) => {
    try {
      new Intl.DateTimeFormat("en-US", { timeZone: value }).format(new Date());
      return value;
    }
    catch {
      return undefined;
    }
  };
  const resolveSystemEventTimezone = (cfg) => {
    const raw = cfg.agents?.defaults?.envelopeTimezone?.trim();
    if (!raw) {
      return { mode: "local" };
    }
    const lowered = raw.toLowerCase();
    if (lowered === "utc" || lowered === "gmt") {
      return { mode: "utc" };
    }
    if (lowered === "local" || lowered === "host") {
      return { mode: "local" };
    }
    if (lowered === "user") {
      return {
        mode: "iana",
        timeZone: (0, _dateTime.resolveUserTimezone)(cfg.agents?.defaults?.userTimezone)
      };
    }
    const explicit = resolveExplicitTimezone(raw);
    return explicit ? { mode: "iana", timeZone: explicit } : { mode: "local" };
  };
  const formatUtcTimestamp = (date) => {
    const yyyy = String(date.getUTCFullYear()).padStart(4, "0");
    const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
    const dd = String(date.getUTCDate()).padStart(2, "0");
    const hh = String(date.getUTCHours()).padStart(2, "0");
    const min = String(date.getUTCMinutes()).padStart(2, "0");
    const sec = String(date.getUTCSeconds()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}T${hh}:${min}:${sec}Z`;
  };
  const formatZonedTimestamp = (date, timeZone) => {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
      timeZoneName: "short"
    }).formatToParts(date);
    const pick = (type) => parts.find((part) => part.type === type)?.value;
    const yyyy = pick("year");
    const mm = pick("month");
    const dd = pick("day");
    const hh = pick("hour");
    const min = pick("minute");
    const sec = pick("second");
    const tz = [...parts].
    toReversed().
    find((part) => part.type === "timeZoneName")?.
    value?.trim();
    if (!yyyy || !mm || !dd || !hh || !min || !sec) {
      return undefined;
    }
    return `${yyyy}-${mm}-${dd} ${hh}:${min}:${sec}${tz ? ` ${tz}` : ""}`;
  };
  const formatSystemEventTimestamp = (ts, cfg) => {
    const date = new Date(ts);
    if (Number.isNaN(date.getTime())) {
      return "unknown-time";
    }
    const zone = resolveSystemEventTimezone(cfg);
    if (zone.mode === "utc") {
      return formatUtcTimestamp(date);
    }
    if (zone.mode === "local") {
      return formatZonedTimestamp(date) ?? "unknown-time";
    }
    return formatZonedTimestamp(date, zone.timeZone) ?? "unknown-time";
  };
  const systemLines = [];
  const queued = (0, _systemEvents.drainSystemEventEntries)(params.sessionKey);
  systemLines.push(...queued.
  map((event) => {
    const compacted = compactSystemEvent(event.text);
    if (!compacted) {
      return null;
    }
    return `[${formatSystemEventTimestamp(event.ts, params.cfg)}] ${compacted}`;
  }).
  filter((v) => Boolean(v)));
  if (params.isMainSession && params.isNewSession) {
    const summary = await (0, _channelSummary.buildChannelSummary)(params.cfg);
    if (summary.length > 0) {
      systemLines.unshift(...summary);
    }
  }
  if (systemLines.length === 0) {
    return params.prefixedBodyBase;
  }
  const block = systemLines.map((l) => `System: ${l}`).join("\n");
  return `${block}\n\n${params.prefixedBodyBase}`;
}
async function ensureSkillSnapshot(params) {
  const { sessionEntry, sessionStore, sessionKey, storePath, sessionId, isFirstTurnInSession, workspaceDir, cfg, skillFilter } = params;
  let nextEntry = sessionEntry;
  let systemSent = sessionEntry?.systemSent ?? false;
  const remoteEligibility = (0, _skillsRemote.getRemoteSkillEligibility)();
  const snapshotVersion = (0, _refresh.getSkillsSnapshotVersion)(workspaceDir);
  (0, _refresh.ensureSkillsWatcher)({ workspaceDir, config: cfg });
  const shouldRefreshSnapshot = snapshotVersion > 0 && (nextEntry?.skillsSnapshot?.version ?? 0) < snapshotVersion;
  if (isFirstTurnInSession && sessionStore && sessionKey) {
    const current = nextEntry ??
    sessionStore[sessionKey] ?? {
      sessionId: sessionId ?? _nodeCrypto.default.randomUUID(),
      updatedAt: Date.now()
    };
    const skillSnapshot = isFirstTurnInSession || !current.skillsSnapshot || shouldRefreshSnapshot ?
    (0, _skills.buildWorkspaceSkillSnapshot)(workspaceDir, {
      config: cfg,
      skillFilter,
      eligibility: { remote: remoteEligibility },
      snapshotVersion
    }) :
    current.skillsSnapshot;
    nextEntry = {
      ...current,
      sessionId: sessionId ?? current.sessionId ?? _nodeCrypto.default.randomUUID(),
      updatedAt: Date.now(),
      systemSent: true,
      skillsSnapshot: skillSnapshot
    };
    sessionStore[sessionKey] = { ...sessionStore[sessionKey], ...nextEntry };
    if (storePath) {
      await (0, _sessions.updateSessionStore)(storePath, (store) => {
        store[sessionKey] = { ...store[sessionKey], ...nextEntry };
      });
    }
    systemSent = true;
  }
  const skillsSnapshot = shouldRefreshSnapshot ?
  (0, _skills.buildWorkspaceSkillSnapshot)(workspaceDir, {
    config: cfg,
    skillFilter,
    eligibility: { remote: remoteEligibility },
    snapshotVersion
  }) :
  nextEntry?.skillsSnapshot ?? (
  isFirstTurnInSession ?
  undefined :
  (0, _skills.buildWorkspaceSkillSnapshot)(workspaceDir, {
    config: cfg,
    skillFilter,
    eligibility: { remote: remoteEligibility },
    snapshotVersion
  }));
  if (skillsSnapshot &&
  sessionStore &&
  sessionKey &&
  !isFirstTurnInSession && (
  !nextEntry?.skillsSnapshot || shouldRefreshSnapshot)) {
    const current = nextEntry ?? {
      sessionId: sessionId ?? _nodeCrypto.default.randomUUID(),
      updatedAt: Date.now()
    };
    nextEntry = {
      ...current,
      sessionId: sessionId ?? current.sessionId ?? _nodeCrypto.default.randomUUID(),
      updatedAt: Date.now(),
      skillsSnapshot
    };
    sessionStore[sessionKey] = { ...sessionStore[sessionKey], ...nextEntry };
    if (storePath) {
      await (0, _sessions.updateSessionStore)(storePath, (store) => {
        store[sessionKey] = { ...store[sessionKey], ...nextEntry };
      });
    }
  }
  return { sessionEntry: nextEntry, skillsSnapshot, systemSent };
}
async function incrementCompactionCount(params) {
  const { sessionEntry, sessionStore, sessionKey, storePath, now = Date.now(), tokensAfter } = params;
  if (!sessionStore || !sessionKey) {
    return undefined;
  }
  const entry = sessionStore[sessionKey] ?? sessionEntry;
  if (!entry) {
    return undefined;
  }
  const nextCount = (entry.compactionCount ?? 0) + 1;
  // Build update payload with compaction count and optionally updated token counts
  const updates = {
    compactionCount: nextCount,
    updatedAt: now
  };
  // If tokensAfter is provided, update the cached token counts to reflect post-compaction state
  if (tokensAfter != null && tokensAfter > 0) {
    updates.totalTokens = tokensAfter;
    // Clear input/output breakdown since we only have the total estimate after compaction
    updates.inputTokens = undefined;
    updates.outputTokens = undefined;
  }
  sessionStore[sessionKey] = {
    ...entry,
    ...updates
  };
  if (storePath) {
    await (0, _sessions.updateSessionStore)(storePath, (store) => {
      store[sessionKey] = {
        ...store[sessionKey],
        ...updates
      };
    });
  }
  return nextCount;
} /* v9-5ca68f51a280d228 */
