"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.resolveDefaultSessionStorePath = resolveDefaultSessionStorePath;exports.resolveSessionFilePath = resolveSessionFilePath;exports.resolveSessionTranscriptPath = resolveSessionTranscriptPath;exports.resolveSessionTranscriptsDir = resolveSessionTranscriptsDir;exports.resolveSessionTranscriptsDirForAgent = resolveSessionTranscriptsDirForAgent;exports.resolveStorePath = resolveStorePath;var _nodeOs = _interopRequireDefault(require("node:os"));
var _nodePath = _interopRequireDefault(require("node:path"));
var _sessionKey = require("../../routing/session-key.js");
var _paths = require("../paths.js");function _interopRequireDefault(e) {return e && e.__esModule ? e : { default: e };}
function resolveAgentSessionsDir(agentId, env = process.env, homedir = _nodeOs.default.homedir) {
  const root = (0, _paths.resolveStateDir)(env, homedir);
  const id = (0, _sessionKey.normalizeAgentId)(agentId ?? _sessionKey.DEFAULT_AGENT_ID);
  return _nodePath.default.join(root, "agents", id, "sessions");
}
function resolveSessionTranscriptsDir(env = process.env, homedir = _nodeOs.default.homedir) {
  return resolveAgentSessionsDir(_sessionKey.DEFAULT_AGENT_ID, env, homedir);
}
function resolveSessionTranscriptsDirForAgent(agentId, env = process.env, homedir = _nodeOs.default.homedir) {
  return resolveAgentSessionsDir(agentId, env, homedir);
}
function resolveDefaultSessionStorePath(agentId) {
  return _nodePath.default.join(resolveAgentSessionsDir(agentId), "sessions.json");
}
function resolveSessionTranscriptPath(sessionId, agentId, topicId) {
  const safeTopicId = typeof topicId === "string" ?
  encodeURIComponent(topicId) :
  typeof topicId === "number" ?
  String(topicId) :
  undefined;
  const fileName = safeTopicId !== undefined ? `${sessionId}-topic-${safeTopicId}.jsonl` : `${sessionId}.jsonl`;
  return _nodePath.default.join(resolveAgentSessionsDir(agentId), fileName);
}
function resolveSessionFilePath(sessionId, entry, opts) {
  const candidate = entry?.sessionFile?.trim();
  return candidate ? candidate : resolveSessionTranscriptPath(sessionId, opts?.agentId);
}
function resolveStorePath(store, opts) {
  const agentId = (0, _sessionKey.normalizeAgentId)(opts?.agentId ?? _sessionKey.DEFAULT_AGENT_ID);
  if (!store) {
    return resolveDefaultSessionStorePath(agentId);
  }
  if (store.includes("{agentId}")) {
    const expanded = store.replaceAll("{agentId}", agentId);
    if (expanded.startsWith("~")) {
      return _nodePath.default.resolve(expanded.replace(/^~(?=$|[\\/])/, _nodeOs.default.homedir()));
    }
    return _nodePath.default.resolve(expanded);
  }
  if (store.startsWith("~")) {
    return _nodePath.default.resolve(store.replace(/^~(?=$|[\\/])/, _nodeOs.default.homedir()));
  }
  return _nodePath.default.resolve(store);
} /* v9-9824a68e5b55851f */
