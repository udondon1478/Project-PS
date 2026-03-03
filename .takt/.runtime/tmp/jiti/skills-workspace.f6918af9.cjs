"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.buildWorkspaceSkillCommandSpecs = buildWorkspaceSkillCommandSpecs;exports.buildWorkspaceSkillSnapshot = buildWorkspaceSkillSnapshot;exports.buildWorkspaceSkillsPrompt = buildWorkspaceSkillsPrompt;exports.filterWorkspaceSkillEntries = filterWorkspaceSkillEntries;exports.loadWorkspaceSkillEntries = loadWorkspaceSkillEntries;exports.resolveSkillsPromptForRun = resolveSkillsPromptForRun;exports.syncSkillsToWorkspace = syncSkillsToWorkspace;var _piCodingAgent = require("@mariozechner/pi-coding-agent");
var _nodeFs = _interopRequireDefault(require("node:fs"));
var _nodePath = _interopRequireDefault(require("node:path"));
var _subsystem = require("../../logging/subsystem.js");
var _utils = require("../../utils.js");
var _bundledDir = require("./bundled-dir.js");
var _config = require("./config.js");
var _frontmatter = require("./frontmatter.js");
var _pluginSkills = require("./plugin-skills.js");
var _serialize = require("./serialize.js");function _interopRequireDefault(e) {return e && e.__esModule ? e : { default: e };}
const fsp = _nodeFs.default.promises;
const skillsLogger = (0, _subsystem.createSubsystemLogger)("skills");
const skillCommandDebugOnce = new Set();
function debugSkillCommandOnce(messageKey, message, meta) {
  if (skillCommandDebugOnce.has(messageKey)) {
    return;
  }
  skillCommandDebugOnce.add(messageKey);
  skillsLogger.debug(message, meta);
}
function filterSkillEntries(entries, config, skillFilter, eligibility) {
  let filtered = entries.filter((entry) => (0, _config.shouldIncludeSkill)({ entry, config, eligibility }));
  // If skillFilter is provided, only include skills in the filter list.
  if (skillFilter !== undefined) {
    const normalized = skillFilter.map((entry) => String(entry).trim()).filter(Boolean);
    const label = normalized.length > 0 ? normalized.join(", ") : "(none)";
    console.log(`[skills] Applying skill filter: ${label}`);
    filtered =
    normalized.length > 0 ?
    filtered.filter((entry) => normalized.includes(entry.skill.name)) :
    [];
    console.log(`[skills] After filter: ${filtered.map((entry) => entry.skill.name).join(", ")}`);
  }
  return filtered;
}
const SKILL_COMMAND_MAX_LENGTH = 32;
const SKILL_COMMAND_FALLBACK = "skill";
// Discord command descriptions must be ≤100 characters
const SKILL_COMMAND_DESCRIPTION_MAX_LENGTH = 100;
function sanitizeSkillCommandName(raw) {
  const normalized = raw.
  toLowerCase().
  replace(/[^a-z0-9_]+/g, "_").
  replace(/_+/g, "_").
  replace(/^_+|_+$/g, "");
  const trimmed = normalized.slice(0, SKILL_COMMAND_MAX_LENGTH);
  return trimmed || SKILL_COMMAND_FALLBACK;
}
function resolveUniqueSkillCommandName(base, used) {
  const normalizedBase = base.toLowerCase();
  if (!used.has(normalizedBase)) {
    return base;
  }
  for (let index = 2; index < 1000; index += 1) {
    const suffix = `_${index}`;
    const maxBaseLength = Math.max(1, SKILL_COMMAND_MAX_LENGTH - suffix.length);
    const trimmedBase = base.slice(0, maxBaseLength);
    const candidate = `${trimmedBase}${suffix}`;
    const candidateKey = candidate.toLowerCase();
    if (!used.has(candidateKey)) {
      return candidate;
    }
  }
  const fallback = `${base.slice(0, Math.max(1, SKILL_COMMAND_MAX_LENGTH - 2))}_x`;
  return fallback;
}
function loadSkillEntries(workspaceDir, opts) {
  const loadSkills = (params) => {
    const loaded = (0, _piCodingAgent.loadSkillsFromDir)(params);
    if (Array.isArray(loaded)) {
      return loaded;
    }
    if (loaded &&
    typeof loaded === "object" &&
    "skills" in loaded &&
    Array.isArray(loaded.skills)) {
      return loaded.skills;
    }
    return [];
  };
  const managedSkillsDir = opts?.managedSkillsDir ?? _nodePath.default.join(_utils.CONFIG_DIR, "skills");
  const workspaceSkillsDir = _nodePath.default.join(workspaceDir, "skills");
  const bundledSkillsDir = opts?.bundledSkillsDir ?? (0, _bundledDir.resolveBundledSkillsDir)();
  const extraDirsRaw = opts?.config?.skills?.load?.extraDirs ?? [];
  const extraDirs = extraDirsRaw.
  map((d) => typeof d === "string" ? d.trim() : "").
  filter(Boolean);
  const pluginSkillDirs = (0, _pluginSkills.resolvePluginSkillDirs)({
    workspaceDir,
    config: opts?.config
  });
  const mergedExtraDirs = [...extraDirs, ...pluginSkillDirs];
  const bundledSkills = bundledSkillsDir ?
  loadSkills({
    dir: bundledSkillsDir,
    source: "openclaw-bundled"
  }) :
  [];
  const extraSkills = mergedExtraDirs.flatMap((dir) => {
    const resolved = (0, _utils.resolveUserPath)(dir);
    return loadSkills({
      dir: resolved,
      source: "openclaw-extra"
    });
  });
  const managedSkills = loadSkills({
    dir: managedSkillsDir,
    source: "openclaw-managed"
  });
  const workspaceSkills = loadSkills({
    dir: workspaceSkillsDir,
    source: "openclaw-workspace"
  });
  const merged = new Map();
  // Precedence: extra < bundled < managed < workspace
  for (const skill of extraSkills) {
    merged.set(skill.name, skill);
  }
  for (const skill of bundledSkills) {
    merged.set(skill.name, skill);
  }
  for (const skill of managedSkills) {
    merged.set(skill.name, skill);
  }
  for (const skill of workspaceSkills) {
    merged.set(skill.name, skill);
  }
  const skillEntries = Array.from(merged.values()).map((skill) => {
    let frontmatter = {};
    try {
      const raw = _nodeFs.default.readFileSync(skill.filePath, "utf-8");
      frontmatter = (0, _frontmatter.parseFrontmatter)(raw);
    }
    catch {

      // ignore malformed skills
    }return {
      skill,
      frontmatter,
      metadata: (0, _frontmatter.resolveOpenClawMetadata)(frontmatter),
      invocation: (0, _frontmatter.resolveSkillInvocationPolicy)(frontmatter)
    };
  });
  return skillEntries;
}
function buildWorkspaceSkillSnapshot(workspaceDir, opts) {
  const skillEntries = opts?.entries ?? loadSkillEntries(workspaceDir, opts);
  const eligible = filterSkillEntries(skillEntries, opts?.config, opts?.skillFilter, opts?.eligibility);
  const promptEntries = eligible.filter((entry) => entry.invocation?.disableModelInvocation !== true);
  const resolvedSkills = promptEntries.map((entry) => entry.skill);
  const remoteNote = opts?.eligibility?.remote?.note?.trim();
  const prompt = [remoteNote, (0, _piCodingAgent.formatSkillsForPrompt)(resolvedSkills)].filter(Boolean).join("\n");
  return {
    prompt,
    skills: eligible.map((entry) => ({
      name: entry.skill.name,
      primaryEnv: entry.metadata?.primaryEnv
    })),
    resolvedSkills,
    version: opts?.snapshotVersion
  };
}
function buildWorkspaceSkillsPrompt(workspaceDir, opts) {
  const skillEntries = opts?.entries ?? loadSkillEntries(workspaceDir, opts);
  const eligible = filterSkillEntries(skillEntries, opts?.config, opts?.skillFilter, opts?.eligibility);
  const promptEntries = eligible.filter((entry) => entry.invocation?.disableModelInvocation !== true);
  const remoteNote = opts?.eligibility?.remote?.note?.trim();
  return [remoteNote, (0, _piCodingAgent.formatSkillsForPrompt)(promptEntries.map((entry) => entry.skill))].
  filter(Boolean).
  join("\n");
}
function resolveSkillsPromptForRun(params) {
  const snapshotPrompt = params.skillsSnapshot?.prompt?.trim();
  if (snapshotPrompt) {
    return snapshotPrompt;
  }
  if (params.entries && params.entries.length > 0) {
    const prompt = buildWorkspaceSkillsPrompt(params.workspaceDir, {
      entries: params.entries,
      config: params.config
    });
    return prompt.trim() ? prompt : "";
  }
  return "";
}
function loadWorkspaceSkillEntries(workspaceDir, opts) {
  return loadSkillEntries(workspaceDir, opts);
}
async function syncSkillsToWorkspace(params) {
  const sourceDir = (0, _utils.resolveUserPath)(params.sourceWorkspaceDir);
  const targetDir = (0, _utils.resolveUserPath)(params.targetWorkspaceDir);
  if (sourceDir === targetDir) {
    return;
  }
  await (0, _serialize.serializeByKey)(`syncSkills:${targetDir}`, async () => {
    const targetSkillsDir = _nodePath.default.join(targetDir, "skills");
    const entries = loadSkillEntries(sourceDir, {
      config: params.config,
      managedSkillsDir: params.managedSkillsDir,
      bundledSkillsDir: params.bundledSkillsDir
    });
    await fsp.rm(targetSkillsDir, { recursive: true, force: true });
    await fsp.mkdir(targetSkillsDir, { recursive: true });
    for (const entry of entries) {
      const dest = _nodePath.default.join(targetSkillsDir, entry.skill.name);
      try {
        await fsp.cp(entry.skill.baseDir, dest, {
          recursive: true,
          force: true
        });
      }
      catch (error) {
        const message = error instanceof Error ? error.message : JSON.stringify(error);
        console.warn(`[skills] Failed to copy ${entry.skill.name} to sandbox: ${message}`);
      }
    }
  });
}
function filterWorkspaceSkillEntries(entries, config) {
  return filterSkillEntries(entries, config);
}
function buildWorkspaceSkillCommandSpecs(workspaceDir, opts) {
  const skillEntries = opts?.entries ?? loadSkillEntries(workspaceDir, opts);
  const eligible = filterSkillEntries(skillEntries, opts?.config, opts?.skillFilter, opts?.eligibility);
  const userInvocable = eligible.filter((entry) => entry.invocation?.userInvocable !== false);
  const used = new Set();
  for (const reserved of opts?.reservedNames ?? []) {
    used.add(reserved.toLowerCase());
  }
  const specs = [];
  for (const entry of userInvocable) {
    const rawName = entry.skill.name;
    const base = sanitizeSkillCommandName(rawName);
    if (base !== rawName) {
      debugSkillCommandOnce(`sanitize:${rawName}:${base}`, `Sanitized skill command name "${rawName}" to "/${base}".`, { rawName, sanitized: `/${base}` });
    }
    const unique = resolveUniqueSkillCommandName(base, used);
    if (unique !== base) {
      debugSkillCommandOnce(`dedupe:${rawName}:${unique}`, `De-duplicated skill command name for "${rawName}" to "/${unique}".`, { rawName, deduped: `/${unique}` });
    }
    used.add(unique.toLowerCase());
    const rawDescription = entry.skill.description?.trim() || rawName;
    const description = rawDescription.length > SKILL_COMMAND_DESCRIPTION_MAX_LENGTH ?
    rawDescription.slice(0, SKILL_COMMAND_DESCRIPTION_MAX_LENGTH - 1) + "…" :
    rawDescription;
    const dispatch = (() => {
      const kindRaw = (entry.frontmatter?.["command-dispatch"] ??
      entry.frontmatter?.["command_dispatch"] ??
      "").
      trim().
      toLowerCase();
      if (!kindRaw) {
        return undefined;
      }
      if (kindRaw !== "tool") {
        return undefined;
      }
      const toolName = (entry.frontmatter?.["command-tool"] ??
      entry.frontmatter?.["command_tool"] ??
      "").trim();
      if (!toolName) {
        debugSkillCommandOnce(`dispatch:missingTool:${rawName}`, `Skill command "/${unique}" requested tool dispatch but did not provide command-tool. Ignoring dispatch.`, { skillName: rawName, command: unique });
        return undefined;
      }
      const argModeRaw = (entry.frontmatter?.["command-arg-mode"] ??
      entry.frontmatter?.["command_arg_mode"] ??
      "").
      trim().
      toLowerCase();
      const argMode = !argModeRaw || argModeRaw === "raw" ? "raw" : null;
      if (!argMode) {
        debugSkillCommandOnce(`dispatch:badArgMode:${rawName}:${argModeRaw}`, `Skill command "/${unique}" requested tool dispatch but has unknown command-arg-mode. Falling back to raw.`, { skillName: rawName, command: unique, argMode: argModeRaw });
      }
      return { kind: "tool", toolName, argMode: "raw" };
    })();
    specs.push({
      name: unique,
      skillName: rawName,
      description,
      ...(dispatch ? { dispatch } : {})
    });
  }
  return specs;
} /* v9-aa0747fb02563d23 */
