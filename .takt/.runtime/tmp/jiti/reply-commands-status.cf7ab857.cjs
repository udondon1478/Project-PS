"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.buildStatusReply = buildStatusReply;var _agentScope = require("../../agents/agent-scope.js");
var _authProfiles = require("../../agents/auth-profiles.js");
var _modelAuth = require("../../agents/model-auth.js");
var _modelSelection = require("../../agents/model-selection.js");
var _subagentRegistry = require("../../agents/subagent-registry.js");
var _sessionsHelpers = require("../../agents/tools/sessions-helpers.js");
var _globals = require("../../globals.js");
var _providerUsage = require("../../infra/provider-usage.js");
var _groupActivation = require("../group-activation.js");
var _status = require("../status.js");
var _queue = require("./queue.js");
var _subagentsUtils = require("./subagents-utils.js");
function formatApiKeySnippet(apiKey) {
  const compact = apiKey.replace(/\s+/g, "");
  if (!compact) {
    return "unknown";
  }
  const edge = compact.length >= 12 ? 6 : 4;
  const head = compact.slice(0, edge);
  const tail = compact.slice(-edge);
  return `${head}…${tail}`;
}
function resolveModelAuthLabel(provider, cfg, sessionEntry, agentDir) {
  const resolved = provider?.trim();
  if (!resolved) {
    return undefined;
  }
  const providerKey = (0, _modelSelection.normalizeProviderId)(resolved);
  const store = (0, _authProfiles.ensureAuthProfileStore)(agentDir, {
    allowKeychainPrompt: false
  });
  const profileOverride = sessionEntry?.authProfileOverride?.trim();
  const order = (0, _authProfiles.resolveAuthProfileOrder)({
    cfg,
    store,
    provider: providerKey,
    preferredProfile: profileOverride
  });
  const candidates = [profileOverride, ...order].filter(Boolean);
  for (const profileId of candidates) {
    const profile = store.profiles[profileId];
    if (!profile || (0, _modelSelection.normalizeProviderId)(profile.provider) !== providerKey) {
      continue;
    }
    const label = (0, _authProfiles.resolveAuthProfileDisplayLabel)({ cfg, store, profileId });
    if (profile.type === "oauth") {
      return `oauth${label ? ` (${label})` : ""}`;
    }
    if (profile.type === "token") {
      const snippet = formatApiKeySnippet(profile.token);
      return `token ${snippet}${label ? ` (${label})` : ""}`;
    }
    const snippet = formatApiKeySnippet(profile.key);
    return `api-key ${snippet}${label ? ` (${label})` : ""}`;
  }
  const envKey = (0, _modelAuth.resolveEnvApiKey)(providerKey);
  if (envKey?.apiKey) {
    if (envKey.source.includes("OAUTH_TOKEN")) {
      return `oauth (${envKey.source})`;
    }
    return `api-key ${formatApiKeySnippet(envKey.apiKey)} (${envKey.source})`;
  }
  const customKey = (0, _modelAuth.getCustomProviderApiKey)(cfg, providerKey);
  if (customKey) {
    return `api-key ${formatApiKeySnippet(customKey)} (models.json)`;
  }
  return "unknown";
}
async function buildStatusReply(params) {
  const { cfg, command, sessionEntry, sessionKey, sessionScope, provider, model, contextTokens, resolvedThinkLevel, resolvedVerboseLevel, resolvedReasoningLevel, resolvedElevatedLevel, resolveDefaultThinkingLevel, isGroup, defaultGroupActivation } = params;
  if (!command.isAuthorizedSender) {
    (0, _globals.logVerbose)(`Ignoring /status from unauthorized sender: ${command.senderId || "<unknown>"}`);
    return undefined;
  }
  const statusAgentId = sessionKey ?
  (0, _agentScope.resolveSessionAgentId)({ sessionKey, config: cfg }) :
  (0, _agentScope.resolveDefaultAgentId)(cfg);
  const statusAgentDir = (0, _agentScope.resolveAgentDir)(cfg, statusAgentId);
  const currentUsageProvider = (() => {
    try {
      return (0, _providerUsage.resolveUsageProviderId)(provider);
    }
    catch {
      return undefined;
    }
  })();
  let usageLine = null;
  if (currentUsageProvider) {
    try {
      const usageSummary = await (0, _providerUsage.loadProviderUsageSummary)({
        timeoutMs: 3500,
        providers: [currentUsageProvider],
        agentDir: statusAgentDir
      });
      const usageEntry = usageSummary.providers[0];
      if (usageEntry && !usageEntry.error && usageEntry.windows.length > 0) {
        const summaryLine = (0, _providerUsage.formatUsageWindowSummary)(usageEntry, {
          now: Date.now(),
          maxWindows: 2,
          includeResets: true
        });
        if (summaryLine) {
          usageLine = `📊 Usage: ${summaryLine}`;
        }
      }
    }
    catch {
      usageLine = null;
    }
  }
  const queueSettings = (0, _queue.resolveQueueSettings)({
    cfg,
    channel: command.channel,
    sessionEntry
  });
  const queueKey = sessionKey ?? sessionEntry?.sessionId;
  const queueDepth = queueKey ? (0, _queue.getFollowupQueueDepth)(queueKey) : 0;
  const queueOverrides = Boolean(sessionEntry?.queueDebounceMs ?? sessionEntry?.queueCap ?? sessionEntry?.queueDrop);
  let subagentsLine;
  if (sessionKey) {
    const { mainKey, alias } = (0, _sessionsHelpers.resolveMainSessionAlias)(cfg);
    const requesterKey = (0, _sessionsHelpers.resolveInternalSessionKey)({ key: sessionKey, alias, mainKey });
    const runs = (0, _subagentRegistry.listSubagentRunsForRequester)(requesterKey);
    const verboseEnabled = resolvedVerboseLevel && resolvedVerboseLevel !== "off";
    if (runs.length > 0) {
      const active = runs.filter((entry) => !entry.endedAt);
      const done = runs.length - active.length;
      if (verboseEnabled) {
        const labels = active.
        map((entry) => (0, _subagentsUtils.resolveSubagentLabel)(entry, "")).
        filter(Boolean).
        slice(0, 3);
        const labelText = labels.length ? ` (${labels.join(", ")})` : "";
        subagentsLine = `🤖 Subagents: ${active.length} active${labelText} · ${done} done`;
      } else
      if (active.length > 0) {
        subagentsLine = `🤖 Subagents: ${active.length} active`;
      }
    }
  }
  const groupActivation = isGroup ?
  (0, _groupActivation.normalizeGroupActivation)(sessionEntry?.groupActivation) ?? defaultGroupActivation() :
  undefined;
  const agentDefaults = cfg.agents?.defaults ?? {};
  const statusText = (0, _status.buildStatusMessage)({
    config: cfg,
    agent: {
      ...agentDefaults,
      model: {
        ...agentDefaults.model,
        primary: `${provider}/${model}`
      },
      contextTokens,
      thinkingDefault: agentDefaults.thinkingDefault,
      verboseDefault: agentDefaults.verboseDefault,
      elevatedDefault: agentDefaults.elevatedDefault
    },
    sessionEntry,
    sessionKey,
    sessionScope,
    groupActivation,
    resolvedThink: resolvedThinkLevel ?? (await resolveDefaultThinkingLevel()),
    resolvedVerbose: resolvedVerboseLevel,
    resolvedReasoning: resolvedReasoningLevel,
    resolvedElevated: resolvedElevatedLevel,
    modelAuth: resolveModelAuthLabel(provider, cfg, sessionEntry, statusAgentDir),
    usageLine: usageLine ?? undefined,
    queue: {
      mode: queueSettings.mode,
      depth: queueDepth,
      debounceMs: queueSettings.debounceMs,
      cap: queueSettings.cap,
      dropPolicy: queueSettings.dropPolicy,
      showDetails: queueOverrides
    },
    subagentsLine,
    mediaDecisions: params.mediaDecisions,
    includeTranscriptUsage: false
  });
  return { text: statusText };
} /* v9-ef518ed44f652d69 */
