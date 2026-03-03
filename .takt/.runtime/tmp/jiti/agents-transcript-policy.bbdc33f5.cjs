"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.resolveTranscriptPolicy = resolveTranscriptPolicy;var _modelSelection = require("./model-selection.js");
var _google = require("./pi-embedded-helpers/google.js");
const MISTRAL_MODEL_HINTS = [
"mistral",
"mixtral",
"codestral",
"pixtral",
"devstral",
"ministral",
"mistralai"];

const OPENAI_MODEL_APIS = new Set([
"openai",
"openai-completions",
"openai-responses",
"openai-codex-responses"]
);
const OPENAI_PROVIDERS = new Set(["openai", "openai-codex"]);
function isOpenAiApi(modelApi) {
  if (!modelApi) {
    return false;
  }
  return OPENAI_MODEL_APIS.has(modelApi);
}
function isOpenAiProvider(provider) {
  if (!provider) {
    return false;
  }
  return OPENAI_PROVIDERS.has((0, _modelSelection.normalizeProviderId)(provider));
}
function isAnthropicApi(modelApi, provider) {
  if (modelApi === "anthropic-messages") {
    return true;
  }
  const normalized = (0, _modelSelection.normalizeProviderId)(provider ?? "");
  // MiniMax now uses openai-completions API, not anthropic-messages
  return normalized === "anthropic";
}
function isMistralModel(params) {
  const provider = (0, _modelSelection.normalizeProviderId)(params.provider ?? "");
  if (provider === "mistral") {
    return true;
  }
  const modelId = (params.modelId ?? "").toLowerCase();
  if (!modelId) {
    return false;
  }
  return MISTRAL_MODEL_HINTS.some((hint) => modelId.includes(hint));
}
function resolveTranscriptPolicy(params) {
  const provider = (0, _modelSelection.normalizeProviderId)(params.provider ?? "");
  const modelId = params.modelId ?? "";
  const isGoogle = (0, _google.isGoogleModelApi)(params.modelApi);
  const isAnthropic = isAnthropicApi(params.modelApi, provider);
  const isOpenAi = isOpenAiProvider(provider) || !provider && isOpenAiApi(params.modelApi);
  const isMistral = isMistralModel({ provider, modelId });
  const isOpenRouterGemini = (provider === "openrouter" || provider === "opencode") &&
  modelId.toLowerCase().includes("gemini");
  const isAntigravityClaudeModel = (0, _google.isAntigravityClaude)({
    api: params.modelApi,
    provider,
    modelId
  });
  const needsNonImageSanitize = isGoogle || isAnthropic || isMistral || isOpenRouterGemini;
  const sanitizeToolCallIds = isGoogle || isMistral;
  const toolCallIdMode = isMistral ?
  "strict9" :
  sanitizeToolCallIds ?
  "strict" :
  undefined;
  const repairToolUseResultPairing = isGoogle || isAnthropic;
  const sanitizeThoughtSignatures = isOpenRouterGemini ?
  { allowBase64Only: true, includeCamelCase: true } :
  undefined;
  const normalizeAntigravityThinkingBlocks = isAntigravityClaudeModel;
  return {
    sanitizeMode: isOpenAi ? "images-only" : needsNonImageSanitize ? "full" : "images-only",
    sanitizeToolCallIds: !isOpenAi && sanitizeToolCallIds,
    toolCallIdMode,
    repairToolUseResultPairing: !isOpenAi && repairToolUseResultPairing,
    preserveSignatures: isAntigravityClaudeModel,
    sanitizeThoughtSignatures: isOpenAi ? undefined : sanitizeThoughtSignatures,
    normalizeAntigravityThinkingBlocks,
    applyGoogleTurnOrdering: !isOpenAi && isGoogle,
    validateGeminiTurns: !isOpenAi && isGoogle,
    validateAnthropicTurns: !isOpenAi && isAnthropic,
    allowSyntheticToolResults: !isOpenAi && (isGoogle || isAnthropic)
  };
} /* v9-985d48cab16ad261 */
