"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.applySystemPromptOverrideToSession = applySystemPromptOverrideToSession;exports.buildEmbeddedSystemPrompt = buildEmbeddedSystemPrompt;exports.createSystemPromptOverride = createSystemPromptOverride;var _systemPrompt = require("../system-prompt.js");
var _toolSummaries = require("../tool-summaries.js");
function buildEmbeddedSystemPrompt(params) {
  return (0, _systemPrompt.buildAgentSystemPrompt)({
    workspaceDir: params.workspaceDir,
    defaultThinkLevel: params.defaultThinkLevel,
    reasoningLevel: params.reasoningLevel,
    extraSystemPrompt: params.extraSystemPrompt,
    ownerNumbers: params.ownerNumbers,
    reasoningTagHint: params.reasoningTagHint,
    heartbeatPrompt: params.heartbeatPrompt,
    skillsPrompt: params.skillsPrompt,
    docsPath: params.docsPath,
    ttsHint: params.ttsHint,
    workspaceNotes: params.workspaceNotes,
    reactionGuidance: params.reactionGuidance,
    promptMode: params.promptMode,
    runtimeInfo: params.runtimeInfo,
    messageToolHints: params.messageToolHints,
    sandboxInfo: params.sandboxInfo,
    toolNames: params.tools.map((tool) => tool.name),
    toolSummaries: (0, _toolSummaries.buildToolSummaryMap)(params.tools),
    modelAliasLines: params.modelAliasLines,
    userTimezone: params.userTimezone,
    userTime: params.userTime,
    userTimeFormat: params.userTimeFormat,
    contextFiles: params.contextFiles
  });
}
function createSystemPromptOverride(systemPrompt) {
  const override = systemPrompt.trim();
  return (_defaultPrompt) => override;
}
function applySystemPromptOverrideToSession(session, override) {
  const prompt = typeof override === "function" ? override() : override.trim();
  session.agent.setSystemPrompt(prompt);
  const mutableSession = session;
  mutableSession._baseSystemPrompt = prompt;
  mutableSession._rebuildSystemPrompt = () => prompt;
} /* v9-b80007579fed6ac7 */
