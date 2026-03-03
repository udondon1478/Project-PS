"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.createSessionStatusTool = createSessionStatusTool;var _typebox = require("@sinclair/typebox");
var _agentScope = require("../../agents/agent-scope.js");
var _authProfiles = require("../../agents/auth-profiles.js");
var _modelAuth = require("../../agents/model-auth.js");
var _modelCatalog = require("../../agents/model-catalog.js");
var _modelSelection = require("../../agents/model-selection.js");
var _groupActivation = require("../../auto-reply/group-activation.js");
var _queue = require("../../auto-reply/reply/queue.js");
var _status = require("../../auto-reply/status.js");
var _config = require("../../config/config.js");
var _sessions = require("../../config/sessions.js");
var _sessionUtils = require("../../gateway/session-utils.js");
var _providerUsage = require("../../infra/provider-usage.js");
var _sessionKey = require("../../routing/session-key.js");
var _modelOverrides = require("../../sessions/model-overrides.js");
var _dateTime = require("../date-time.js");
var _common = require("./common.js");
var _sessionsHelpers = require("./sessions-helpers.js");
const SessionStatusToolSchema = _typebox.Type.Object({
  sessionKey: _typebox.Type.Optional(_typebox.Type.String()),
  model: _typebox.Type.Optional(_typebox.Type.String())
});
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
function resolveModelAuthLabel(params) {
  const resolvedProvider = params.provider?.trim();
  if (!resolvedProvider) {
    return undefined;
  }
  const providerKey = (0, _modelSelection.normalizeProviderId)(resolvedProvider);
  const store = (0, _authProfiles.ensureAuthProfileStore)(params.agentDir, {
    allowKeychainPrompt: false
  });
  const profileOverride = params.sessionEntry?.authProfileOverride?.trim();
  const order = (0, _authProfiles.resolveAuthProfileOrder)({
    cfg: params.cfg,
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
    const label = (0, _authProfiles.resolveAuthProfileDisplayLabel)({
      cfg: params.cfg,
      store,
      profileId
    });
    if (profile.type === "oauth") {
      return `oauth${label ? ` (${label})` : ""}`;
    }
    if (profile.type === "token") {
      return `token ${formatApiKeySnippet(profile.token)}${label ? ` (${label})` : ""}`;
    }
    return `api-key ${formatApiKeySnippet(profile.key)}${label ? ` (${label})` : ""}`;
  }
  const envKey = (0, _modelAuth.resolveEnvApiKey)(providerKey);
  if (envKey?.apiKey) {
    if (envKey.source.includes("OAUTH_TOKEN")) {
      return `oauth (${envKey.source})`;
    }
    return `api-key ${formatApiKeySnippet(envKey.apiKey)} (${envKey.source})`;
  }
  const customKey = (0, _modelAuth.getCustomProviderApiKey)(params.cfg, providerKey);
  if (customKey) {
    return `api-key ${formatApiKeySnippet(customKey)} (models.json)`;
  }
  return "unknown";
}
function resolveSessionEntry(params) {
  const keyRaw = params.keyRaw.trim();
  if (!keyRaw) {
    return null;
  }
  const internal = (0, _sessionsHelpers.resolveInternalSessionKey)({
    key: keyRaw,
    alias: params.alias,
    mainKey: params.mainKey
  });
  const candidates = new Set([keyRaw, internal]);
  if (!keyRaw.startsWith("agent:")) {
    candidates.add(`agent:${_sessionKey.DEFAULT_AGENT_ID}:${keyRaw}`);
    candidates.add(`agent:${_sessionKey.DEFAULT_AGENT_ID}:${internal}`);
  }
  if (keyRaw === "main") {
    candidates.add((0, _sessionKey.buildAgentMainSessionKey)({
      agentId: _sessionKey.DEFAULT_AGENT_ID,
      mainKey: params.mainKey
    }));
  }
  for (const key of candidates) {
    const entry = params.store[key];
    if (entry) {
      return { key, entry };
    }
  }
  return null;
}
function resolveSessionKeyFromSessionId(params) {
  const trimmed = params.sessionId.trim();
  if (!trimmed) {
    return null;
  }
  const { store } = (0, _sessionUtils.loadCombinedSessionStoreForGateway)(params.cfg);
  const match = Object.entries(store).find(([key, entry]) => {
    if (entry?.sessionId !== trimmed) {
      return false;
    }
    if (!params.agentId) {
      return true;
    }
    return (0, _sessionKey.resolveAgentIdFromSessionKey)(key) === params.agentId;
  });
  return match?.[0] ?? null;
}
async function resolveModelOverride(params) {
  const raw = params.raw.trim();
  if (!raw) {
    return { kind: "reset" };
  }
  if (raw.toLowerCase() === "default") {
    return { kind: "reset" };
  }
  const configDefault = (0, _modelSelection.resolveDefaultModelForAgent)({
    cfg: params.cfg,
    agentId: params.agentId
  });
  const currentProvider = params.sessionEntry?.providerOverride?.trim() || configDefault.provider;
  const currentModel = params.sessionEntry?.modelOverride?.trim() || configDefault.model;
  const aliasIndex = (0, _modelSelection.buildModelAliasIndex)({
    cfg: params.cfg,
    defaultProvider: currentProvider
  });
  const catalog = await (0, _modelCatalog.loadModelCatalog)({ config: params.cfg });
  const allowed = (0, _modelSelection.buildAllowedModelSet)({
    cfg: params.cfg,
    catalog,
    defaultProvider: currentProvider,
    defaultModel: currentModel
  });
  const resolved = (0, _modelSelection.resolveModelRefFromString)({
    raw,
    defaultProvider: currentProvider,
    aliasIndex
  });
  if (!resolved) {
    throw new Error(`Unrecognized model "${raw}".`);
  }
  const key = (0, _modelSelection.modelKey)(resolved.ref.provider, resolved.ref.model);
  if (allowed.allowedKeys.size > 0 && !allowed.allowedKeys.has(key)) {
    throw new Error(`Model "${key}" is not allowed.`);
  }
  const isDefault = resolved.ref.provider === configDefault.provider && resolved.ref.model === configDefault.model;
  return {
    kind: "set",
    provider: resolved.ref.provider,
    model: resolved.ref.model,
    isDefault
  };
}
function createSessionStatusTool(opts) {
  return {
    label: "Session Status",
    name: "session_status",
    description: "Show a /status-equivalent session status card (usage + time + cost when available). Use for model-use questions (📊 session_status). Optional: set per-session model override (model=default resets overrides).",
    parameters: SessionStatusToolSchema,
    execute: async (_toolCallId, args) => {
      const params = args;
      const cfg = opts?.config ?? (0, _config.loadConfig)();
      const { mainKey, alias } = (0, _sessionsHelpers.resolveMainSessionAlias)(cfg);
      const a2aPolicy = (0, _sessionsHelpers.createAgentToAgentPolicy)(cfg);
      const requestedKeyParam = (0, _common.readStringParam)(params, "sessionKey");
      let requestedKeyRaw = requestedKeyParam ?? opts?.agentSessionKey;
      if (!requestedKeyRaw?.trim()) {
        throw new Error("sessionKey required");
      }
      const requesterAgentId = (0, _sessionKey.resolveAgentIdFromSessionKey)(opts?.agentSessionKey ?? requestedKeyRaw);
      const ensureAgentAccess = (targetAgentId) => {
        if (targetAgentId === requesterAgentId) {
          return;
        }
        // Gate cross-agent access behind tools.agentToAgent settings.
        if (!a2aPolicy.enabled) {
          throw new Error("Agent-to-agent status is disabled. Set tools.agentToAgent.enabled=true to allow cross-agent access.");
        }
        if (!a2aPolicy.isAllowed(requesterAgentId, targetAgentId)) {
          throw new Error("Agent-to-agent session status denied by tools.agentToAgent.allow.");
        }
      };
      if (requestedKeyRaw.startsWith("agent:")) {
        ensureAgentAccess((0, _sessionKey.resolveAgentIdFromSessionKey)(requestedKeyRaw));
      }
      const isExplicitAgentKey = requestedKeyRaw.startsWith("agent:");
      let agentId = isExplicitAgentKey ?
      (0, _sessionKey.resolveAgentIdFromSessionKey)(requestedKeyRaw) :
      requesterAgentId;
      let storePath = (0, _sessions.resolveStorePath)(cfg.session?.store, { agentId });
      let store = (0, _sessions.loadSessionStore)(storePath);
      // Resolve against the requester-scoped store first to avoid leaking default agent data.
      let resolved = resolveSessionEntry({
        store,
        keyRaw: requestedKeyRaw,
        alias,
        mainKey
      });
      if (!resolved && (0, _sessionsHelpers.shouldResolveSessionIdInput)(requestedKeyRaw)) {
        const resolvedKey = resolveSessionKeyFromSessionId({
          cfg,
          sessionId: requestedKeyRaw,
          agentId: a2aPolicy.enabled ? undefined : requesterAgentId
        });
        if (resolvedKey) {
          // If resolution points at another agent, enforce A2A policy before switching stores.
          ensureAgentAccess((0, _sessionKey.resolveAgentIdFromSessionKey)(resolvedKey));
          requestedKeyRaw = resolvedKey;
          agentId = (0, _sessionKey.resolveAgentIdFromSessionKey)(resolvedKey);
          storePath = (0, _sessions.resolveStorePath)(cfg.session?.store, { agentId });
          store = (0, _sessions.loadSessionStore)(storePath);
          resolved = resolveSessionEntry({
            store,
            keyRaw: requestedKeyRaw,
            alias,
            mainKey
          });
        }
      }
      if (!resolved) {
        const kind = (0, _sessionsHelpers.shouldResolveSessionIdInput)(requestedKeyRaw) ? "sessionId" : "sessionKey";
        throw new Error(`Unknown ${kind}: ${requestedKeyRaw}`);
      }
      const configured = (0, _modelSelection.resolveDefaultModelForAgent)({ cfg, agentId });
      const modelRaw = (0, _common.readStringParam)(params, "model");
      let changedModel = false;
      if (typeof modelRaw === "string") {
        const selection = await resolveModelOverride({
          cfg,
          raw: modelRaw,
          sessionEntry: resolved.entry,
          agentId
        });
        const nextEntry = { ...resolved.entry };
        const applied = (0, _modelOverrides.applyModelOverrideToSessionEntry)({
          entry: nextEntry,
          selection: selection.kind === "reset" ?
          {
            provider: configured.provider,
            model: configured.model,
            isDefault: true
          } :
          {
            provider: selection.provider,
            model: selection.model,
            isDefault: selection.isDefault
          }
        });
        if (applied.updated) {
          store[resolved.key] = nextEntry;
          await (0, _sessions.updateSessionStore)(storePath, (nextStore) => {
            nextStore[resolved.key] = nextEntry;
          });
          resolved.entry = nextEntry;
          changedModel = true;
        }
      }
      const agentDir = (0, _agentScope.resolveAgentDir)(cfg, agentId);
      const providerForCard = resolved.entry.providerOverride?.trim() || configured.provider;
      const usageProvider = (0, _providerUsage.resolveUsageProviderId)(providerForCard);
      let usageLine;
      if (usageProvider) {
        try {
          const usageSummary = await (0, _providerUsage.loadProviderUsageSummary)({
            timeoutMs: 3500,
            providers: [usageProvider],
            agentDir
          });
          const snapshot = usageSummary.providers.find((entry) => entry.provider === usageProvider);
          if (snapshot) {
            const formatted = (0, _providerUsage.formatUsageWindowSummary)(snapshot, {
              now: Date.now(),
              maxWindows: 2,
              includeResets: true
            });
            if (formatted && !formatted.startsWith("error:")) {
              usageLine = `📊 Usage: ${formatted}`;
            }
          }
        }
        catch {

          // ignore
        }}
      const isGroup = resolved.entry.chatType === "group" ||
      resolved.entry.chatType === "channel" ||
      resolved.key.includes(":group:") ||
      resolved.key.includes(":channel:");
      const groupActivation = isGroup ?
      (0, _groupActivation.normalizeGroupActivation)(resolved.entry.groupActivation) ?? "mention" :
      undefined;
      const queueSettings = (0, _queue.resolveQueueSettings)({
        cfg,
        channel: resolved.entry.channel ?? resolved.entry.lastChannel ?? "unknown",
        sessionEntry: resolved.entry
      });
      const queueKey = resolved.key ?? resolved.entry.sessionId;
      const queueDepth = queueKey ? (0, _queue.getFollowupQueueDepth)(queueKey) : 0;
      const queueOverrides = Boolean(resolved.entry.queueDebounceMs ?? resolved.entry.queueCap ?? resolved.entry.queueDrop);
      const userTimezone = (0, _dateTime.resolveUserTimezone)(cfg.agents?.defaults?.userTimezone);
      const userTimeFormat = (0, _dateTime.resolveUserTimeFormat)(cfg.agents?.defaults?.timeFormat);
      const userTime = (0, _dateTime.formatUserTime)(new Date(), userTimezone, userTimeFormat);
      const timeLine = userTime ?
      `🕒 Time: ${userTime} (${userTimezone})` :
      `🕒 Time zone: ${userTimezone}`;
      const agentDefaults = cfg.agents?.defaults ?? {};
      const defaultLabel = `${configured.provider}/${configured.model}`;
      const agentModel = typeof agentDefaults.model === "object" && agentDefaults.model ?
      { ...agentDefaults.model, primary: defaultLabel } :
      { primary: defaultLabel };
      const statusText = (0, _status.buildStatusMessage)({
        config: cfg,
        agent: {
          ...agentDefaults,
          model: agentModel
        },
        sessionEntry: resolved.entry,
        sessionKey: resolved.key,
        groupActivation,
        modelAuth: resolveModelAuthLabel({
          provider: providerForCard,
          cfg,
          sessionEntry: resolved.entry,
          agentDir
        }),
        usageLine,
        timeLine,
        queue: {
          mode: queueSettings.mode,
          depth: queueDepth,
          debounceMs: queueSettings.debounceMs,
          cap: queueSettings.cap,
          dropPolicy: queueSettings.dropPolicy,
          showDetails: queueOverrides
        },
        includeTranscriptUsage: false
      });
      return {
        content: [{ type: "text", text: statusText }],
        details: {
          ok: true,
          sessionKey: resolved.key,
          changedModel,
          statusText
        }
      };
    }
  };
} /* v9-d21cb5ec9687141d */
