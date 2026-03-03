"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.describeImageWithModel = describeImageWithModel;var _piAi = require("@mariozechner/pi-ai");
var _minimaxVlm = require("../../agents/minimax-vlm.js");
var _modelAuth = require("../../agents/model-auth.js");
var _modelsConfig = require("../../agents/models-config.js");
var _piModelDiscovery = require("../../agents/pi-model-discovery.js");
var _imageToolHelpers = require("../../agents/tools/image-tool.helpers.js");
async function describeImageWithModel(params) {
  await (0, _modelsConfig.ensureOpenClawModelsJson)(params.cfg, params.agentDir);
  const authStorage = (0, _piModelDiscovery.discoverAuthStorage)(params.agentDir);
  const modelRegistry = (0, _piModelDiscovery.discoverModels)(authStorage, params.agentDir);
  const model = modelRegistry.find(params.provider, params.model);
  if (!model) {
    throw new Error(`Unknown model: ${params.provider}/${params.model}`);
  }
  if (!model.input?.includes("image")) {
    throw new Error(`Model does not support images: ${params.provider}/${params.model}`);
  }
  const apiKeyInfo = await (0, _modelAuth.getApiKeyForModel)({
    model,
    cfg: params.cfg,
    agentDir: params.agentDir,
    profileId: params.profile,
    preferredProfile: params.preferredProfile
  });
  const apiKey = (0, _modelAuth.requireApiKey)(apiKeyInfo, model.provider);
  authStorage.setRuntimeApiKey(model.provider, apiKey);
  const base64 = params.buffer.toString("base64");
  if (model.provider === "minimax") {
    const text = await (0, _minimaxVlm.minimaxUnderstandImage)({
      apiKey,
      prompt: params.prompt ?? "Describe the image.",
      imageDataUrl: `data:${params.mime ?? "image/jpeg"};base64,${base64}`,
      modelBaseUrl: model.baseUrl
    });
    return { text, model: model.id };
  }
  const context = {
    messages: [
    {
      role: "user",
      content: [
      { type: "text", text: params.prompt ?? "Describe the image." },
      { type: "image", data: base64, mimeType: params.mime ?? "image/jpeg" }],

      timestamp: Date.now()
    }]

  };
  const message = await (0, _piAi.complete)(model, context, {
    apiKey,
    maxTokens: params.maxTokens ?? 512
  });
  const text = (0, _imageToolHelpers.coerceImageAssistantText)({
    message,
    provider: model.provider,
    model: model.id
  });
  return { text, model: model.id };
} /* v9-f8b25a63fc866a5c */
