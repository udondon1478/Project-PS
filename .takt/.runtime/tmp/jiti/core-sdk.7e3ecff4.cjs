"use strict";Object.defineProperty(exports, "__esModule", { value: true });Object.defineProperty(exports, "allBuiltInTools", { enumerable: true, get: function () {return _index.allTools;} });Object.defineProperty(exports, "bashTool", { enumerable: true, get: function () {return _index.bashTool;} });Object.defineProperty(exports, "codingTools", { enumerable: true, get: function () {return _index.codingTools;} });exports.createAgentSession = createAgentSession;Object.defineProperty(exports, "createBashTool", { enumerable: true, get: function () {return _index.createBashTool;} });Object.defineProperty(exports, "createCodingTools", { enumerable: true, get: function () {return _index.createCodingTools;} });Object.defineProperty(exports, "createEditTool", { enumerable: true, get: function () {return _index.createEditTool;} });Object.defineProperty(exports, "createFindTool", { enumerable: true, get: function () {return _index.createFindTool;} });Object.defineProperty(exports, "createGrepTool", { enumerable: true, get: function () {return _index.createGrepTool;} });Object.defineProperty(exports, "createLsTool", { enumerable: true, get: function () {return _index.createLsTool;} });Object.defineProperty(exports, "createReadOnlyTools", { enumerable: true, get: function () {return _index.createReadOnlyTools;} });Object.defineProperty(exports, "createReadTool", { enumerable: true, get: function () {return _index.createReadTool;} });Object.defineProperty(exports, "createWriteTool", { enumerable: true, get: function () {return _index.createWriteTool;} });Object.defineProperty(exports, "editTool", { enumerable: true, get: function () {return _index.editTool;} });Object.defineProperty(exports, "findTool", { enumerable: true, get: function () {return _index.findTool;} });Object.defineProperty(exports, "grepTool", { enumerable: true, get: function () {return _index.grepTool;} });Object.defineProperty(exports, "lsTool", { enumerable: true, get: function () {return _index.lsTool;} });Object.defineProperty(exports, "readOnlyTools", { enumerable: true, get: function () {return _index.readOnlyTools;} });Object.defineProperty(exports, "readTool", { enumerable: true, get: function () {return _index.readTool;} });Object.defineProperty(exports, "writeTool", { enumerable: true, get: function () {return _index.writeTool;} });var _nodePath = require("node:path");
var _piAgentCore = require("@mariozechner/pi-agent-core");
var _config = require("../config.js");
var _agentSession = require("./agent-session.js");
var _authStorage = require("./auth-storage.js");
var _defaults = require("./defaults.js");
var _messages = require("./messages.js");
var _modelRegistry = require("./model-registry.js");
var _modelResolver = require("./model-resolver.js");
var _resourceLoader = require("./resource-loader.js");
var _sessionManager = require("./session-manager.js");
var _settingsManager = require("./settings-manager.js");
var _timings = require("./timings.js");
var _index = require("./tools/index.js");





// Helper Functions
function getDefaultAgentDir() {
  return (0, _config.getAgentDir)();
}
/**
 * Create an AgentSession with the specified options.
 *
 * @example
 * ```typescript
 * // Minimal - uses defaults
 * const { session } = await createAgentSession();
 *
 * // With explicit model
 * import { getModel } from '@mariozechner/pi-ai';
 * const { session } = await createAgentSession({
 *   model: getModel('anthropic', 'claude-opus-4-5'),
 *   thinkingLevel: 'high',
 * });
 *
 * // Continue previous session
 * const { session, modelFallbackMessage } = await createAgentSession({
 *   continueSession: true,
 * });
 *
 * // Full control
 * const loader = new DefaultResourceLoader({
 *   cwd: process.cwd(),
 *   agentDir: getAgentDir(),
 *   settingsManager: SettingsManager.create(),
 * });
 * await loader.reload();
 * const { session } = await createAgentSession({
 *   model: myModel,
 *   tools: [readTool, bashTool],
 *   resourceLoader: loader,
 *   sessionManager: SessionManager.inMemory(),
 * });
 * ```
 */
async function createAgentSession(options = {}) {
  const cwd = options.cwd ?? process.cwd();
  const agentDir = options.agentDir ?? getDefaultAgentDir();
  let resourceLoader = options.resourceLoader;
  // Use provided or create AuthStorage and ModelRegistry
  const authPath = options.agentDir ? (0, _nodePath.join)(agentDir, "auth.json") : undefined;
  const modelsPath = options.agentDir ? (0, _nodePath.join)(agentDir, "models.json") : undefined;
  const authStorage = options.authStorage ?? new _authStorage.AuthStorage(authPath);
  const modelRegistry = options.modelRegistry ?? new _modelRegistry.ModelRegistry(authStorage, modelsPath);
  const settingsManager = options.settingsManager ?? _settingsManager.SettingsManager.create(cwd, agentDir);
  const sessionManager = options.sessionManager ?? _sessionManager.SessionManager.create(cwd);
  if (!resourceLoader) {
    resourceLoader = new _resourceLoader.DefaultResourceLoader({ cwd, agentDir, settingsManager });
    await resourceLoader.reload();
    (0, _timings.time)("resourceLoader.reload");
  }
  // Check if session has existing data to restore
  const existingSession = sessionManager.buildSessionContext();
  const hasExistingSession = existingSession.messages.length > 0;
  let model = options.model;
  let modelFallbackMessage;
  // If session has data, try to restore model from it
  if (!model && hasExistingSession && existingSession.model) {
    const restoredModel = modelRegistry.find(existingSession.model.provider, existingSession.model.modelId);
    if (restoredModel && (await modelRegistry.getApiKey(restoredModel))) {
      model = restoredModel;
    }
    if (!model) {
      modelFallbackMessage = `Could not restore model ${existingSession.model.provider}/${existingSession.model.modelId}`;
    }
  }
  // If still no model, use findInitialModel (checks settings default, then provider defaults)
  if (!model) {
    const result = await (0, _modelResolver.findInitialModel)({
      scopedModels: [],
      isContinuing: hasExistingSession,
      defaultProvider: settingsManager.getDefaultProvider(),
      defaultModelId: settingsManager.getDefaultModel(),
      defaultThinkingLevel: settingsManager.getDefaultThinkingLevel(),
      modelRegistry
    });
    model = result.model;
    if (!model) {
      modelFallbackMessage = `No models available. Use /login or set an API key environment variable. See ${(0, _nodePath.join)((0, _config.getDocsPath)(), "providers.md")}. Then use /model to select a model.`;
    } else
    if (modelFallbackMessage) {
      modelFallbackMessage += `. Using ${model.provider}/${model.id}`;
    }
  }
  let thinkingLevel = options.thinkingLevel;
  // If session has data, restore thinking level from it
  if (thinkingLevel === undefined && hasExistingSession) {
    thinkingLevel = existingSession.thinkingLevel;
  }
  // Fall back to settings default
  if (thinkingLevel === undefined) {
    thinkingLevel = settingsManager.getDefaultThinkingLevel() ?? _defaults.DEFAULT_THINKING_LEVEL;
  }
  // Clamp to model capabilities
  if (!model || !model.reasoning) {
    thinkingLevel = "off";
  }
  const defaultActiveToolNames = ["read", "bash", "edit", "write"];
  const initialActiveToolNames = options.tools ?
  options.tools.map((t) => t.name).filter((n) => n in _index.allTools) :
  defaultActiveToolNames;
  let agent;
  // Create convertToLlm wrapper that filters images if blockImages is enabled (defense-in-depth)
  const convertToLlmWithBlockImages = (messages) => {
    const converted = (0, _messages.convertToLlm)(messages);
    // Check setting dynamically so mid-session changes take effect
    if (!settingsManager.getBlockImages()) {
      return converted;
    }
    // Filter out ImageContent from all messages, replacing with text placeholder
    return converted.map((msg) => {
      if (msg.role === "user" || msg.role === "toolResult") {
        const content = msg.content;
        if (Array.isArray(content)) {
          const hasImages = content.some((c) => c.type === "image");
          if (hasImages) {
            const filteredContent = content.
            map((c) => c.type === "image" ? { type: "text", text: "Image reading is disabled." } : c).
            filter((c, i, arr) =>
            // Dedupe consecutive "Image reading is disabled." texts
            !(c.type === "text" &&
            c.text === "Image reading is disabled." &&
            i > 0 &&
            arr[i - 1].type === "text" &&
            arr[i - 1].text === "Image reading is disabled."));
            return { ...msg, content: filteredContent };
          }
        }
      }
      return msg;
    });
  };
  const extensionRunnerRef = {};
  agent = new _piAgentCore.Agent({
    initialState: {
      systemPrompt: "",
      model,
      thinkingLevel,
      tools: []
    },
    convertToLlm: convertToLlmWithBlockImages,
    sessionId: sessionManager.getSessionId(),
    transformContext: async (messages) => {
      const runner = extensionRunnerRef.current;
      if (!runner)
      return messages;
      return runner.emitContext(messages);
    },
    steeringMode: settingsManager.getSteeringMode(),
    followUpMode: settingsManager.getFollowUpMode(),
    thinkingBudgets: settingsManager.getThinkingBudgets(),
    maxRetryDelayMs: settingsManager.getRetrySettings().maxDelayMs,
    getApiKey: async (provider) => {
      // Use the provider argument from the in-flight request;
      // agent.state.model may already be switched mid-turn.
      const resolvedProvider = provider || agent.state.model?.provider;
      if (!resolvedProvider) {
        throw new Error("No model selected");
      }
      const key = await modelRegistry.getApiKeyForProvider(resolvedProvider);
      if (!key) {
        const model = agent.state.model;
        const isOAuth = model && modelRegistry.isUsingOAuth(model);
        if (isOAuth) {
          throw new Error(`Authentication failed for "${resolvedProvider}". ` +
          `Credentials may have expired or network is unavailable. ` +
          `Run '/login ${resolvedProvider}' to re-authenticate.`);
        }
        throw new Error(`No API key found for "${resolvedProvider}". ` +
        `Set an API key environment variable or run '/login ${resolvedProvider}'.`);
      }
      return key;
    }
  });
  // Restore messages if session has existing data
  if (hasExistingSession) {
    agent.replaceMessages(existingSession.messages);
  } else
  {
    // Save initial model and thinking level for new sessions so they can be restored on resume
    if (model) {
      sessionManager.appendModelChange(model.provider, model.id);
    }
    sessionManager.appendThinkingLevelChange(thinkingLevel);
  }
  const session = new _agentSession.AgentSession({
    agent,
    sessionManager,
    settingsManager,
    cwd,
    scopedModels: options.scopedModels,
    resourceLoader,
    customTools: options.customTools,
    modelRegistry,
    initialActiveToolNames,
    extensionRunnerRef
  });
  const extensionsResult = resourceLoader.getExtensions();
  return {
    session,
    extensionsResult,
    modelFallbackMessage
  };
} /* v9-7864ff31a65c2345 */
