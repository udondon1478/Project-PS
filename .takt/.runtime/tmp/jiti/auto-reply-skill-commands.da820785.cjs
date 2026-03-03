"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.listSkillCommandsForAgents = listSkillCommandsForAgents;exports.listSkillCommandsForWorkspace = listSkillCommandsForWorkspace;exports.resolveSkillCommandInvocation = resolveSkillCommandInvocation;var _nodeFs = _interopRequireDefault(require("node:fs"));
var _agentScope = require("../agents/agent-scope.js");
var _skills = require("../agents/skills.js");
var _skillsRemote = require("../infra/skills-remote.js");
var _commandsRegistry = require("./commands-registry.js");function _interopRequireDefault(e) {return e && e.__esModule ? e : { default: e };}
function resolveReservedCommandNames() {
  const reserved = new Set();
  for (const command of (0, _commandsRegistry.listChatCommands)()) {
    if (command.nativeName) {
      reserved.add(command.nativeName.toLowerCase());
    }
    for (const alias of command.textAliases) {
      const trimmed = alias.trim();
      if (!trimmed.startsWith("/")) {
        continue;
      }
      reserved.add(trimmed.slice(1).toLowerCase());
    }
  }
  return reserved;
}
function listSkillCommandsForWorkspace(params) {
  return (0, _skills.buildWorkspaceSkillCommandSpecs)(params.workspaceDir, {
    config: params.cfg,
    skillFilter: params.skillFilter,
    eligibility: { remote: (0, _skillsRemote.getRemoteSkillEligibility)() },
    reservedNames: resolveReservedCommandNames()
  });
}
function listSkillCommandsForAgents(params) {
  const used = resolveReservedCommandNames();
  const entries = [];
  const agentIds = params.agentIds ?? (0, _agentScope.listAgentIds)(params.cfg);
  for (const agentId of agentIds) {
    const workspaceDir = (0, _agentScope.resolveAgentWorkspaceDir)(params.cfg, agentId);
    if (!_nodeFs.default.existsSync(workspaceDir)) {
      continue;
    }
    const commands = (0, _skills.buildWorkspaceSkillCommandSpecs)(workspaceDir, {
      config: params.cfg,
      eligibility: { remote: (0, _skillsRemote.getRemoteSkillEligibility)() },
      reservedNames: used
    });
    for (const command of commands) {
      used.add(command.name.toLowerCase());
      entries.push(command);
    }
  }
  return entries;
}
function normalizeSkillCommandLookup(value) {
  return value.
  trim().
  toLowerCase().
  replace(/[\s_]+/g, "-");
}
function findSkillCommand(skillCommands, rawName) {
  const trimmed = rawName.trim();
  if (!trimmed) {
    return undefined;
  }
  const lowered = trimmed.toLowerCase();
  const normalized = normalizeSkillCommandLookup(trimmed);
  return skillCommands.find((entry) => {
    if (entry.name.toLowerCase() === lowered) {
      return true;
    }
    if (entry.skillName.toLowerCase() === lowered) {
      return true;
    }
    return normalizeSkillCommandLookup(entry.name) === normalized ||
    normalizeSkillCommandLookup(entry.skillName) === normalized;
  });
}
function resolveSkillCommandInvocation(params) {
  const trimmed = params.commandBodyNormalized.trim();
  if (!trimmed.startsWith("/")) {
    return null;
  }
  const match = trimmed.match(/^\/([^\s]+)(?:\s+([\s\S]+))?$/);
  if (!match) {
    return null;
  }
  const commandName = match[1]?.trim().toLowerCase();
  if (!commandName) {
    return null;
  }
  if (commandName === "skill") {
    const remainder = match[2]?.trim();
    if (!remainder) {
      return null;
    }
    const skillMatch = remainder.match(/^([^\s]+)(?:\s+([\s\S]+))?$/);
    if (!skillMatch) {
      return null;
    }
    const skillCommand = findSkillCommand(params.skillCommands, skillMatch[1] ?? "");
    if (!skillCommand) {
      return null;
    }
    const args = skillMatch[2]?.trim();
    return { command: skillCommand, args: args || undefined };
  }
  const command = params.skillCommands.find((entry) => entry.name.toLowerCase() === commandName);
  if (!command) {
    return null;
  }
  const args = match[2]?.trim();
  return { command, args: args || undefined };
} /* v9-e8bf8e532d2b7a47 */
