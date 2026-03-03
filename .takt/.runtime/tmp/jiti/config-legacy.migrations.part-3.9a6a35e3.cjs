"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.LEGACY_CONFIG_MIGRATIONS_PART_3 = void 0;var _legacyShared = require("./legacy.shared.js");
// NOTE: tools.alsoAllow was introduced after legacy migrations; no legacy migration needed.
// tools.alsoAllow legacy migration intentionally omitted (field not shipped in prod).
const LEGACY_CONFIG_MIGRATIONS_PART_3 = exports.LEGACY_CONFIG_MIGRATIONS_PART_3 = [
{
  id: "auth.anthropic-claude-cli-mode-oauth",
  describe: "Switch anthropic:claude-cli auth profile mode to oauth",
  apply: (raw, changes) => {
    const auth = (0, _legacyShared.getRecord)(raw.auth);
    const profiles = (0, _legacyShared.getRecord)(auth?.profiles);
    if (!profiles) {
      return;
    }
    const claudeCli = (0, _legacyShared.getRecord)(profiles["anthropic:claude-cli"]);
    if (!claudeCli) {
      return;
    }
    if (claudeCli.mode !== "token") {
      return;
    }
    claudeCli.mode = "oauth";
    changes.push('Updated auth.profiles["anthropic:claude-cli"].mode → "oauth".');
  }
},
// tools.alsoAllow migration removed (field not shipped in prod; enforce via schema instead).
{
  id: "tools.bash->tools.exec",
  describe: "Move tools.bash to tools.exec",
  apply: (raw, changes) => {
    const tools = (0, _legacyShared.ensureRecord)(raw, "tools");
    const bash = (0, _legacyShared.getRecord)(tools.bash);
    if (!bash) {
      return;
    }
    if (tools.exec === undefined) {
      tools.exec = bash;
      changes.push("Moved tools.bash → tools.exec.");
    } else
    {
      changes.push("Removed tools.bash (tools.exec already set).");
    }
    delete tools.bash;
  }
},
{
  id: "messages.tts.enabled->auto",
  describe: "Move messages.tts.enabled to messages.tts.auto",
  apply: (raw, changes) => {
    const messages = (0, _legacyShared.getRecord)(raw.messages);
    const tts = (0, _legacyShared.getRecord)(messages?.tts);
    if (!tts) {
      return;
    }
    if (tts.auto !== undefined) {
      if ("enabled" in tts) {
        delete tts.enabled;
        changes.push("Removed messages.tts.enabled (messages.tts.auto already set).");
      }
      return;
    }
    if (typeof tts.enabled !== "boolean") {
      return;
    }
    tts.auto = tts.enabled ? "always" : "off";
    delete tts.enabled;
    changes.push(`Moved messages.tts.enabled → messages.tts.auto (${String(tts.auto)}).`);
  }
},
{
  id: "agent.defaults-v2",
  describe: "Move agent config to agents.defaults and tools",
  apply: (raw, changes) => {
    const agent = (0, _legacyShared.getRecord)(raw.agent);
    if (!agent) {
      return;
    }
    const agents = (0, _legacyShared.ensureRecord)(raw, "agents");
    const defaults = (0, _legacyShared.getRecord)(agents.defaults) ?? {};
    const tools = (0, _legacyShared.ensureRecord)(raw, "tools");
    const agentTools = (0, _legacyShared.getRecord)(agent.tools);
    if (agentTools) {
      if (tools.allow === undefined && agentTools.allow !== undefined) {
        tools.allow = agentTools.allow;
        changes.push("Moved agent.tools.allow → tools.allow.");
      }
      if (tools.deny === undefined && agentTools.deny !== undefined) {
        tools.deny = agentTools.deny;
        changes.push("Moved agent.tools.deny → tools.deny.");
      }
    }
    const elevated = (0, _legacyShared.getRecord)(agent.elevated);
    if (elevated) {
      if (tools.elevated === undefined) {
        tools.elevated = elevated;
        changes.push("Moved agent.elevated → tools.elevated.");
      } else
      {
        changes.push("Removed agent.elevated (tools.elevated already set).");
      }
    }
    const bash = (0, _legacyShared.getRecord)(agent.bash);
    if (bash) {
      if (tools.exec === undefined) {
        tools.exec = bash;
        changes.push("Moved agent.bash → tools.exec.");
      } else
      {
        changes.push("Removed agent.bash (tools.exec already set).");
      }
    }
    const sandbox = (0, _legacyShared.getRecord)(agent.sandbox);
    if (sandbox) {
      const sandboxTools = (0, _legacyShared.getRecord)(sandbox.tools);
      if (sandboxTools) {
        const toolsSandbox = (0, _legacyShared.ensureRecord)(tools, "sandbox");
        const toolPolicy = (0, _legacyShared.ensureRecord)(toolsSandbox, "tools");
        (0, _legacyShared.mergeMissing)(toolPolicy, sandboxTools);
        delete sandbox.tools;
        changes.push("Moved agent.sandbox.tools → tools.sandbox.tools.");
      }
    }
    const subagents = (0, _legacyShared.getRecord)(agent.subagents);
    if (subagents) {
      const subagentTools = (0, _legacyShared.getRecord)(subagents.tools);
      if (subagentTools) {
        const toolsSubagents = (0, _legacyShared.ensureRecord)(tools, "subagents");
        const toolPolicy = (0, _legacyShared.ensureRecord)(toolsSubagents, "tools");
        (0, _legacyShared.mergeMissing)(toolPolicy, subagentTools);
        delete subagents.tools;
        changes.push("Moved agent.subagents.tools → tools.subagents.tools.");
      }
    }
    const agentCopy = structuredClone(agent);
    delete agentCopy.tools;
    delete agentCopy.elevated;
    delete agentCopy.bash;
    if ((0, _legacyShared.isRecord)(agentCopy.sandbox)) {
      delete agentCopy.sandbox.tools;
    }
    if ((0, _legacyShared.isRecord)(agentCopy.subagents)) {
      delete agentCopy.subagents.tools;
    }
    (0, _legacyShared.mergeMissing)(defaults, agentCopy);
    agents.defaults = defaults;
    raw.agents = agents;
    delete raw.agent;
    changes.push("Moved agent → agents.defaults.");
  }
},
{
  id: "identity->agents.list",
  describe: "Move identity to agents.list[].identity",
  apply: (raw, changes) => {
    const identity = (0, _legacyShared.getRecord)(raw.identity);
    if (!identity) {
      return;
    }
    const agents = (0, _legacyShared.ensureRecord)(raw, "agents");
    const list = (0, _legacyShared.getAgentsList)(agents);
    const defaultId = (0, _legacyShared.resolveDefaultAgentIdFromRaw)(raw);
    const entry = (0, _legacyShared.ensureAgentEntry)(list, defaultId);
    if (entry.identity === undefined) {
      entry.identity = identity;
      changes.push(`Moved identity → agents.list (id "${defaultId}").identity.`);
    } else
    {
      changes.push("Removed identity (agents.list identity already set).");
    }
    agents.list = list;
    raw.agents = agents;
    delete raw.identity;
  }
}]; /* v9-ec13e246103e8892 */
