"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.handleCompactCommand = void 0;var _piEmbedded = require("../../agents/pi-embedded.js");
var _sessions = require("../../config/sessions.js");
var _globals = require("../../globals.js");
var _systemEvents = require("../../infra/system-events.js");
var _status = require("../status.js");
var _mentions = require("./mentions.js");
var _sessionUpdates = require("./session-updates.js");
function extractCompactInstructions(params) {
  const raw = (0, _mentions.stripStructuralPrefixes)(params.rawBody ?? "");
  const stripped = params.isGroup ?
  (0, _mentions.stripMentions)(raw, params.ctx, params.cfg, params.agentId) :
  raw;
  const trimmed = stripped.trim();
  if (!trimmed) {
    return undefined;
  }
  const lowered = trimmed.toLowerCase();
  const prefix = lowered.startsWith("/compact") ? "/compact" : null;
  if (!prefix) {
    return undefined;
  }
  let rest = trimmed.slice(prefix.length).trimStart();
  if (rest.startsWith(":")) {
    rest = rest.slice(1).trimStart();
  }
  return rest.length ? rest : undefined;
}
const handleCompactCommand = async (params) => {
  const compactRequested = params.command.commandBodyNormalized === "/compact" ||
  params.command.commandBodyNormalized.startsWith("/compact ");
  if (!compactRequested) {
    return null;
  }
  if (!params.command.isAuthorizedSender) {
    (0, _globals.logVerbose)(`Ignoring /compact from unauthorized sender: ${params.command.senderId || "<unknown>"}`);
    return { shouldContinue: false };
  }
  if (!params.sessionEntry?.sessionId) {
    return {
      shouldContinue: false,
      reply: { text: "⚙️ Compaction unavailable (missing session id)." }
    };
  }
  const sessionId = params.sessionEntry.sessionId;
  if ((0, _piEmbedded.isEmbeddedPiRunActive)(sessionId)) {
    (0, _piEmbedded.abortEmbeddedPiRun)(sessionId);
    await (0, _piEmbedded.waitForEmbeddedPiRunEnd)(sessionId, 15_000);
  }
  const customInstructions = extractCompactInstructions({
    rawBody: params.ctx.CommandBody ?? params.ctx.RawBody ?? params.ctx.Body,
    ctx: params.ctx,
    cfg: params.cfg,
    agentId: params.agentId,
    isGroup: params.isGroup
  });
  const result = await (0, _piEmbedded.compactEmbeddedPiSession)({
    sessionId,
    sessionKey: params.sessionKey,
    messageChannel: params.command.channel,
    groupId: params.sessionEntry.groupId,
    groupChannel: params.sessionEntry.groupChannel,
    groupSpace: params.sessionEntry.space,
    spawnedBy: params.sessionEntry.spawnedBy,
    sessionFile: (0, _sessions.resolveSessionFilePath)(sessionId, params.sessionEntry),
    workspaceDir: params.workspaceDir,
    config: params.cfg,
    skillsSnapshot: params.sessionEntry.skillsSnapshot,
    provider: params.provider,
    model: params.model,
    thinkLevel: params.resolvedThinkLevel ?? (await params.resolveDefaultThinkingLevel()),
    bashElevated: {
      enabled: false,
      allowed: false,
      defaultLevel: "off"
    },
    customInstructions,
    ownerNumbers: params.command.ownerList.length > 0 ? params.command.ownerList : undefined
  });
  const compactLabel = result.ok ?
  result.compacted ?
  result.result?.tokensBefore != null && result.result?.tokensAfter != null ?
  `Compacted (${(0, _status.formatTokenCount)(result.result.tokensBefore)} → ${(0, _status.formatTokenCount)(result.result.tokensAfter)})` :
  result.result?.tokensBefore ?
  `Compacted (${(0, _status.formatTokenCount)(result.result.tokensBefore)} before)` :
  "Compacted" :
  "Compaction skipped" :
  "Compaction failed";
  if (result.ok && result.compacted) {
    await (0, _sessionUpdates.incrementCompactionCount)({
      sessionEntry: params.sessionEntry,
      sessionStore: params.sessionStore,
      sessionKey: params.sessionKey,
      storePath: params.storePath,
      // Update token counts after compaction
      tokensAfter: result.result?.tokensAfter
    });
  }
  // Use the post-compaction token count for context summary if available
  const tokensAfterCompaction = result.result?.tokensAfter;
  const totalTokens = tokensAfterCompaction ??
  params.sessionEntry.totalTokens ??
  (params.sessionEntry.inputTokens ?? 0) + (params.sessionEntry.outputTokens ?? 0);
  const contextSummary = (0, _status.formatContextUsageShort)(totalTokens > 0 ? totalTokens : null, params.contextTokens ?? params.sessionEntry.contextTokens ?? null);
  const reason = result.reason?.trim();
  const line = reason ?
  `${compactLabel}: ${reason} • ${contextSummary}` :
  `${compactLabel} • ${contextSummary}`;
  (0, _systemEvents.enqueueSystemEvent)(line, { sessionKey: params.sessionKey });
  return { shouldContinue: false, reply: { text: `⚙️ ${line}` } };
};exports.handleCompactCommand = handleCompactCommand; /* v9-e49411073ecc6115 */
