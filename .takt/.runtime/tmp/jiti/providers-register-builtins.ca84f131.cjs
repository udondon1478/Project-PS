"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.registerBuiltInApiProviders = registerBuiltInApiProviders;exports.resetApiProviders = resetApiProviders;var _apiRegistry = require("../api-registry.js");
var _amazonBedrock = require("./amazon-bedrock.js");
var _anthropic = require("./anthropic.js");
var _azureOpenaiResponses = require("./azure-openai-responses.js");
var _google = require("./google.js");
var _googleGeminiCli = require("./google-gemini-cli.js");
var _googleVertex = require("./google-vertex.js");
var _openaiCodexResponses = require("./openai-codex-responses.js");
var _openaiCompletions = require("./openai-completions.js");
var _openaiResponses = require("./openai-responses.js");
function registerBuiltInApiProviders() {
  (0, _apiRegistry.registerApiProvider)({
    api: "anthropic-messages",
    stream: _anthropic.streamAnthropic,
    streamSimple: _anthropic.streamSimpleAnthropic
  });
  (0, _apiRegistry.registerApiProvider)({
    api: "openai-completions",
    stream: _openaiCompletions.streamOpenAICompletions,
    streamSimple: _openaiCompletions.streamSimpleOpenAICompletions
  });
  (0, _apiRegistry.registerApiProvider)({
    api: "openai-responses",
    stream: _openaiResponses.streamOpenAIResponses,
    streamSimple: _openaiResponses.streamSimpleOpenAIResponses
  });
  (0, _apiRegistry.registerApiProvider)({
    api: "azure-openai-responses",
    stream: _azureOpenaiResponses.streamAzureOpenAIResponses,
    streamSimple: _azureOpenaiResponses.streamSimpleAzureOpenAIResponses
  });
  (0, _apiRegistry.registerApiProvider)({
    api: "openai-codex-responses",
    stream: _openaiCodexResponses.streamOpenAICodexResponses,
    streamSimple: _openaiCodexResponses.streamSimpleOpenAICodexResponses
  });
  (0, _apiRegistry.registerApiProvider)({
    api: "google-generative-ai",
    stream: _google.streamGoogle,
    streamSimple: _google.streamSimpleGoogle
  });
  (0, _apiRegistry.registerApiProvider)({
    api: "google-gemini-cli",
    stream: _googleGeminiCli.streamGoogleGeminiCli,
    streamSimple: _googleGeminiCli.streamSimpleGoogleGeminiCli
  });
  (0, _apiRegistry.registerApiProvider)({
    api: "google-vertex",
    stream: _googleVertex.streamGoogleVertex,
    streamSimple: _googleVertex.streamSimpleGoogleVertex
  });
  (0, _apiRegistry.registerApiProvider)({
    api: "bedrock-converse-stream",
    stream: _amazonBedrock.streamBedrock,
    streamSimple: _amazonBedrock.streamSimpleBedrock
  });
}
function resetApiProviders() {
  (0, _apiRegistry.clearApiProviders)();
  registerBuiltInApiProviders();
}
registerBuiltInApiProviders(); /* v9-6a54d0470be6618e */
