"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.appendAssistantMessageToSessionTranscript = appendAssistantMessageToSessionTranscript;exports.resolveMirroredTranscriptText = resolveMirroredTranscriptText;var _piCodingAgent = require("@mariozechner/pi-coding-agent");
var _nodeFs = _interopRequireDefault(require("node:fs"));
var _nodePath = _interopRequireDefault(require("node:path"));
var _transcriptEvents = require("../../sessions/transcript-events.js");
var _paths = require("./paths.js");
var _store = require("./store.js");function _interopRequireDefault(e) {return e && e.__esModule ? e : { default: e };}
function stripQuery(value) {
  const noHash = value.split("#")[0] ?? value;
  return noHash.split("?")[0] ?? noHash;
}
function extractFileNameFromMediaUrl(value) {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  const cleaned = stripQuery(trimmed);
  try {
    const parsed = new URL(cleaned);
    const base = _nodePath.default.basename(parsed.pathname);
    if (!base) {
      return null;
    }
    try {
      return decodeURIComponent(base);
    }
    catch {
      return base;
    }
  }
  catch {
    const base = _nodePath.default.basename(cleaned);
    if (!base || base === "/" || base === ".") {
      return null;
    }
    return base;
  }
}
function resolveMirroredTranscriptText(params) {
  const mediaUrls = params.mediaUrls?.filter((url) => url && url.trim()) ?? [];
  if (mediaUrls.length > 0) {
    const names = mediaUrls.
    map((url) => extractFileNameFromMediaUrl(url)).
    filter((name) => Boolean(name && name.trim()));
    if (names.length > 0) {
      return names.join(", ");
    }
    return "media";
  }
  const text = params.text ?? "";
  const trimmed = text.trim();
  return trimmed ? trimmed : null;
}
async function ensureSessionHeader(params) {
  if (_nodeFs.default.existsSync(params.sessionFile)) {
    return;
  }
  await _nodeFs.default.promises.mkdir(_nodePath.default.dirname(params.sessionFile), { recursive: true });
  const header = {
    type: "session",
    version: _piCodingAgent.CURRENT_SESSION_VERSION,
    id: params.sessionId,
    timestamp: new Date().toISOString(),
    cwd: process.cwd()
  };
  await _nodeFs.default.promises.writeFile(params.sessionFile, `${JSON.stringify(header)}\n`, "utf-8");
}
async function appendAssistantMessageToSessionTranscript(params) {
  const sessionKey = params.sessionKey.trim();
  if (!sessionKey) {
    return { ok: false, reason: "missing sessionKey" };
  }
  const mirrorText = resolveMirroredTranscriptText({
    text: params.text,
    mediaUrls: params.mediaUrls
  });
  if (!mirrorText) {
    return { ok: false, reason: "empty text" };
  }
  const storePath = params.storePath ?? (0, _paths.resolveDefaultSessionStorePath)(params.agentId);
  const store = (0, _store.loadSessionStore)(storePath, { skipCache: true });
  const entry = store[sessionKey];
  if (!entry?.sessionId) {
    return { ok: false, reason: `unknown sessionKey: ${sessionKey}` };
  }
  const sessionFile = entry.sessionFile?.trim() || (0, _paths.resolveSessionTranscriptPath)(entry.sessionId, params.agentId);
  await ensureSessionHeader({ sessionFile, sessionId: entry.sessionId });
  const sessionManager = _piCodingAgent.SessionManager.open(sessionFile);
  sessionManager.appendMessage({
    role: "assistant",
    content: [{ type: "text", text: mirrorText }],
    api: "openai-responses",
    provider: "openclaw",
    model: "delivery-mirror",
    usage: {
      input: 0,
      output: 0,
      cacheRead: 0,
      cacheWrite: 0,
      totalTokens: 0,
      cost: {
        input: 0,
        output: 0,
        cacheRead: 0,
        cacheWrite: 0,
        total: 0
      }
    },
    stopReason: "stop",
    timestamp: Date.now()
  });
  if (!entry.sessionFile || entry.sessionFile !== sessionFile) {
    await (0, _store.updateSessionStore)(storePath, (current) => {
      current[sessionKey] = {
        ...entry,
        sessionFile
      };
    });
  }
  (0, _transcriptEvents.emitSessionTranscriptUpdate)(sessionFile);
  return { ok: true, sessionFile };
} /* v9-012b8bcf5f7b45ab */
