"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.LEGACY_CONFIG_MIGRATIONS_PART_2 = void 0;var _legacyShared = require("./legacy.shared.js");
const LEGACY_CONFIG_MIGRATIONS_PART_2 = exports.LEGACY_CONFIG_MIGRATIONS_PART_2 = [
{
  id: "agent.model-config-v2",
  describe: "Migrate legacy agent.model/allowedModels/modelAliases/modelFallbacks/imageModelFallbacks to agent.models + model lists",
  apply: (raw, changes) => {
    const agentRoot = (0, _legacyShared.getRecord)(raw.agent);
    const defaults = (0, _legacyShared.getRecord)((0, _legacyShared.getRecord)(raw.agents)?.defaults);
    const agent = agentRoot ?? defaults;
    if (!agent) {
      return;
    }
    const label = agentRoot ? "agent" : "agents.defaults";
    const legacyModel = typeof agent.model === "string" ? String(agent.model) : undefined;
    const legacyImageModel = typeof agent.imageModel === "string" ? String(agent.imageModel) : undefined;
    const legacyAllowed = Array.isArray(agent.allowedModels) ?
    agent.allowedModels.map(String) :
    [];
    const legacyModelFallbacks = Array.isArray(agent.modelFallbacks) ?
    agent.modelFallbacks.map(String) :
    [];
    const legacyImageModelFallbacks = Array.isArray(agent.imageModelFallbacks) ?
    agent.imageModelFallbacks.map(String) :
    [];
    const legacyAliases = agent.modelAliases && typeof agent.modelAliases === "object" ?
    agent.modelAliases :
    {};
    const hasLegacy = legacyModel ||
    legacyImageModel ||
    legacyAllowed.length > 0 ||
    legacyModelFallbacks.length > 0 ||
    legacyImageModelFallbacks.length > 0 ||
    Object.keys(legacyAliases).length > 0;
    if (!hasLegacy) {
      return;
    }
    const models = agent.models && typeof agent.models === "object" ?
    agent.models :
    {};
    const ensureModel = (rawKey) => {
      if (typeof rawKey !== "string") {
        return;
      }
      const key = rawKey.trim();
      if (!key) {
        return;
      }
      if (!models[key]) {
        models[key] = {};
      }
    };
    ensureModel(legacyModel);
    ensureModel(legacyImageModel);
    for (const key of legacyAllowed) {
      ensureModel(key);
    }
    for (const key of legacyModelFallbacks) {
      ensureModel(key);
    }
    for (const key of legacyImageModelFallbacks) {
      ensureModel(key);
    }
    for (const target of Object.values(legacyAliases)) {
      if (typeof target !== "string") {
        continue;
      }
      ensureModel(target);
    }
    for (const [alias, targetRaw] of Object.entries(legacyAliases)) {
      if (typeof targetRaw !== "string") {
        continue;
      }
      const target = targetRaw.trim();
      if (!target) {
        continue;
      }
      const entry = models[target] && typeof models[target] === "object" ?
      models[target] :
      {};
      if (!("alias" in entry)) {
        entry.alias = alias;
        models[target] = entry;
      }
    }
    const currentModel = agent.model && typeof agent.model === "object" ?
    agent.model :
    null;
    if (currentModel) {
      if (!currentModel.primary && legacyModel) {
        currentModel.primary = legacyModel;
      }
      if (legacyModelFallbacks.length > 0 && (
      !Array.isArray(currentModel.fallbacks) || currentModel.fallbacks.length === 0)) {
        currentModel.fallbacks = legacyModelFallbacks;
      }
      agent.model = currentModel;
    } else
    if (legacyModel || legacyModelFallbacks.length > 0) {
      agent.model = {
        primary: legacyModel,
        fallbacks: legacyModelFallbacks.length ? legacyModelFallbacks : []
      };
    }
    const currentImageModel = agent.imageModel && typeof agent.imageModel === "object" ?
    agent.imageModel :
    null;
    if (currentImageModel) {
      if (!currentImageModel.primary && legacyImageModel) {
        currentImageModel.primary = legacyImageModel;
      }
      if (legacyImageModelFallbacks.length > 0 && (
      !Array.isArray(currentImageModel.fallbacks) || currentImageModel.fallbacks.length === 0)) {
        currentImageModel.fallbacks = legacyImageModelFallbacks;
      }
      agent.imageModel = currentImageModel;
    } else
    if (legacyImageModel || legacyImageModelFallbacks.length > 0) {
      agent.imageModel = {
        primary: legacyImageModel,
        fallbacks: legacyImageModelFallbacks.length ? legacyImageModelFallbacks : []
      };
    }
    agent.models = models;
    if (legacyModel !== undefined) {
      changes.push(`Migrated ${label}.model string → ${label}.model.primary.`);
    }
    if (legacyModelFallbacks.length > 0) {
      changes.push(`Migrated ${label}.modelFallbacks → ${label}.model.fallbacks.`);
    }
    if (legacyImageModel !== undefined) {
      changes.push(`Migrated ${label}.imageModel string → ${label}.imageModel.primary.`);
    }
    if (legacyImageModelFallbacks.length > 0) {
      changes.push(`Migrated ${label}.imageModelFallbacks → ${label}.imageModel.fallbacks.`);
    }
    if (legacyAllowed.length > 0) {
      changes.push(`Migrated ${label}.allowedModels → ${label}.models.`);
    }
    if (Object.keys(legacyAliases).length > 0) {
      changes.push(`Migrated ${label}.modelAliases → ${label}.models.*.alias.`);
    }
    delete agent.allowedModels;
    delete agent.modelAliases;
    delete agent.modelFallbacks;
    delete agent.imageModelFallbacks;
  }
},
{
  id: "routing.agents-v2",
  describe: "Move routing.agents/defaultAgentId to agents.list",
  apply: (raw, changes) => {
    const routing = (0, _legacyShared.getRecord)(raw.routing);
    if (!routing) {
      return;
    }
    const routingAgents = (0, _legacyShared.getRecord)(routing.agents);
    const agents = (0, _legacyShared.ensureRecord)(raw, "agents");
    const list = (0, _legacyShared.getAgentsList)(agents);
    if (routingAgents) {
      for (const [rawId, entryRaw] of Object.entries(routingAgents)) {
        const agentId = String(rawId ?? "").trim();
        const entry = (0, _legacyShared.getRecord)(entryRaw);
        if (!agentId || !entry) {
          continue;
        }
        const target = (0, _legacyShared.ensureAgentEntry)(list, agentId);
        const entryCopy = { ...entry };
        if ("mentionPatterns" in entryCopy) {
          const mentionPatterns = entryCopy.mentionPatterns;
          const groupChat = (0, _legacyShared.ensureRecord)(target, "groupChat");
          if (groupChat.mentionPatterns === undefined) {
            groupChat.mentionPatterns = mentionPatterns;
            changes.push(`Moved routing.agents.${agentId}.mentionPatterns → agents.list (id "${agentId}").groupChat.mentionPatterns.`);
          } else
          {
            changes.push(`Removed routing.agents.${agentId}.mentionPatterns (agents.list groupChat mentionPatterns already set).`);
          }
          delete entryCopy.mentionPatterns;
        }
        const legacyGroupChat = (0, _legacyShared.getRecord)(entryCopy.groupChat);
        if (legacyGroupChat) {
          const groupChat = (0, _legacyShared.ensureRecord)(target, "groupChat");
          (0, _legacyShared.mergeMissing)(groupChat, legacyGroupChat);
          delete entryCopy.groupChat;
        }
        const legacySandbox = (0, _legacyShared.getRecord)(entryCopy.sandbox);
        if (legacySandbox) {
          const sandboxTools = (0, _legacyShared.getRecord)(legacySandbox.tools);
          if (sandboxTools) {
            const tools = (0, _legacyShared.ensureRecord)(target, "tools");
            const sandbox = (0, _legacyShared.ensureRecord)(tools, "sandbox");
            const toolPolicy = (0, _legacyShared.ensureRecord)(sandbox, "tools");
            (0, _legacyShared.mergeMissing)(toolPolicy, sandboxTools);
            delete legacySandbox.tools;
            changes.push(`Moved routing.agents.${agentId}.sandbox.tools → agents.list (id "${agentId}").tools.sandbox.tools.`);
          }
          entryCopy.sandbox = legacySandbox;
        }
        (0, _legacyShared.mergeMissing)(target, entryCopy);
      }
      delete routing.agents;
      changes.push("Moved routing.agents → agents.list.");
    }
    const defaultAgentId = typeof routing.defaultAgentId === "string" ? routing.defaultAgentId.trim() : "";
    if (defaultAgentId) {
      const hasDefault = list.some((entry) => (0, _legacyShared.isRecord)(entry) && entry.default === true);
      if (!hasDefault) {
        const entry = (0, _legacyShared.ensureAgentEntry)(list, defaultAgentId);
        entry.default = true;
        changes.push(`Moved routing.defaultAgentId → agents.list (id "${defaultAgentId}").default.`);
      } else
      {
        changes.push("Removed routing.defaultAgentId (agents.list default already set).");
      }
      delete routing.defaultAgentId;
    }
    if (list.length > 0) {
      agents.list = list;
    }
    if (Object.keys(routing).length === 0) {
      delete raw.routing;
    }
  }
},
{
  id: "routing.config-v2",
  describe: "Move routing bindings/groupChat/queue/agentToAgent/transcribeAudio",
  apply: (raw, changes) => {
    const routing = (0, _legacyShared.getRecord)(raw.routing);
    if (!routing) {
      return;
    }
    if (routing.bindings !== undefined) {
      if (raw.bindings === undefined) {
        raw.bindings = routing.bindings;
        changes.push("Moved routing.bindings → bindings.");
      } else
      {
        changes.push("Removed routing.bindings (bindings already set).");
      }
      delete routing.bindings;
    }
    if (routing.agentToAgent !== undefined) {
      const tools = (0, _legacyShared.ensureRecord)(raw, "tools");
      if (tools.agentToAgent === undefined) {
        tools.agentToAgent = routing.agentToAgent;
        changes.push("Moved routing.agentToAgent → tools.agentToAgent.");
      } else
      {
        changes.push("Removed routing.agentToAgent (tools.agentToAgent already set).");
      }
      delete routing.agentToAgent;
    }
    if (routing.queue !== undefined) {
      const messages = (0, _legacyShared.ensureRecord)(raw, "messages");
      if (messages.queue === undefined) {
        messages.queue = routing.queue;
        changes.push("Moved routing.queue → messages.queue.");
      } else
      {
        changes.push("Removed routing.queue (messages.queue already set).");
      }
      delete routing.queue;
    }
    const groupChat = (0, _legacyShared.getRecord)(routing.groupChat);
    if (groupChat) {
      const historyLimit = groupChat.historyLimit;
      if (historyLimit !== undefined) {
        const messages = (0, _legacyShared.ensureRecord)(raw, "messages");
        const messagesGroup = (0, _legacyShared.ensureRecord)(messages, "groupChat");
        if (messagesGroup.historyLimit === undefined) {
          messagesGroup.historyLimit = historyLimit;
          changes.push("Moved routing.groupChat.historyLimit → messages.groupChat.historyLimit.");
        } else
        {
          changes.push("Removed routing.groupChat.historyLimit (messages.groupChat.historyLimit already set).");
        }
        delete groupChat.historyLimit;
      }
      const mentionPatterns = groupChat.mentionPatterns;
      if (mentionPatterns !== undefined) {
        const messages = (0, _legacyShared.ensureRecord)(raw, "messages");
        const messagesGroup = (0, _legacyShared.ensureRecord)(messages, "groupChat");
        if (messagesGroup.mentionPatterns === undefined) {
          messagesGroup.mentionPatterns = mentionPatterns;
          changes.push("Moved routing.groupChat.mentionPatterns → messages.groupChat.mentionPatterns.");
        } else
        {
          changes.push("Removed routing.groupChat.mentionPatterns (messages.groupChat.mentionPatterns already set).");
        }
        delete groupChat.mentionPatterns;
      }
      if (Object.keys(groupChat).length === 0) {
        delete routing.groupChat;
      } else
      {
        routing.groupChat = groupChat;
      }
    }
    if (routing.transcribeAudio !== undefined) {
      const mapped = (0, _legacyShared.mapLegacyAudioTranscription)(routing.transcribeAudio);
      if (mapped) {
        const tools = (0, _legacyShared.ensureRecord)(raw, "tools");
        const media = (0, _legacyShared.ensureRecord)(tools, "media");
        const mediaAudio = (0, _legacyShared.ensureRecord)(media, "audio");
        const models = Array.isArray(mediaAudio.models) ? mediaAudio.models : [];
        if (models.length === 0) {
          mediaAudio.enabled = true;
          mediaAudio.models = [mapped];
          changes.push("Moved routing.transcribeAudio → tools.media.audio.models.");
        } else
        {
          changes.push("Removed routing.transcribeAudio (tools.media.audio.models already set).");
        }
      } else
      {
        changes.push("Removed routing.transcribeAudio (unsupported transcription CLI).");
      }
      delete routing.transcribeAudio;
    }
    const audio = (0, _legacyShared.getRecord)(raw.audio);
    if (audio?.transcription !== undefined) {
      const mapped = (0, _legacyShared.mapLegacyAudioTranscription)(audio.transcription);
      if (mapped) {
        const tools = (0, _legacyShared.ensureRecord)(raw, "tools");
        const media = (0, _legacyShared.ensureRecord)(tools, "media");
        const mediaAudio = (0, _legacyShared.ensureRecord)(media, "audio");
        const models = Array.isArray(mediaAudio.models) ? mediaAudio.models : [];
        if (models.length === 0) {
          mediaAudio.enabled = true;
          mediaAudio.models = [mapped];
          changes.push("Moved audio.transcription → tools.media.audio.models.");
        } else
        {
          changes.push("Removed audio.transcription (tools.media.audio.models already set).");
        }
        delete audio.transcription;
        if (Object.keys(audio).length === 0) {
          delete raw.audio;
        } else
        {
          raw.audio = audio;
        }
      } else
      {
        delete audio.transcription;
        changes.push("Removed audio.transcription (unsupported transcription CLI).");
        if (Object.keys(audio).length === 0) {
          delete raw.audio;
        } else
        {
          raw.audio = audio;
        }
      }
    }
    if (Object.keys(routing).length === 0) {
      delete raw.routing;
    }
  }
}]; /* v9-4c0181a3ff52f49a */
