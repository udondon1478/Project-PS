"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.DefaultResourceLoader = void 0;var _nodeFs = require("node:fs");
var _nodeOs = require("node:os");
var _nodePath = require("node:path");
var _chalk = _interopRequireDefault(require("chalk"));
var _config = require("../config.js");
var _theme = require("../modes/interactive/theme/theme.js");
var _eventBus = require("./event-bus.js");
var _loader = require("./extensions/loader.js");
var _packageManager = require("./package-manager.js");
var _promptTemplates = require("./prompt-templates.js");
var _settingsManager = require("./settings-manager.js");
var _skills = require("./skills.js");function _interopRequireDefault(e) {return e && e.__esModule ? e : { default: e };}
function resolvePromptInput(input, description) {
  if (!input) {
    return undefined;
  }
  if ((0, _nodeFs.existsSync)(input)) {
    try {
      return (0, _nodeFs.readFileSync)(input, "utf-8");
    }
    catch (error) {
      console.error(_chalk.default.yellow(`Warning: Could not read ${description} file ${input}: ${error}`));
      return input;
    }
  }
  return input;
}
function loadContextFileFromDir(dir) {
  const candidates = ["AGENTS.md", "CLAUDE.md"];
  for (const filename of candidates) {
    const filePath = (0, _nodePath.join)(dir, filename);
    if ((0, _nodeFs.existsSync)(filePath)) {
      try {
        return {
          path: filePath,
          content: (0, _nodeFs.readFileSync)(filePath, "utf-8")
        };
      }
      catch (error) {
        console.error(_chalk.default.yellow(`Warning: Could not read ${filePath}: ${error}`));
      }
    }
  }
  return null;
}
function loadProjectContextFiles(options = {}) {
  const resolvedCwd = options.cwd ?? process.cwd();
  const resolvedAgentDir = options.agentDir ?? (0, _config.getAgentDir)();
  const contextFiles = [];
  const seenPaths = new Set();
  const globalContext = loadContextFileFromDir(resolvedAgentDir);
  if (globalContext) {
    contextFiles.push(globalContext);
    seenPaths.add(globalContext.path);
  }
  const ancestorContextFiles = [];
  let currentDir = resolvedCwd;
  const root = (0, _nodePath.resolve)("/");
  while (true) {
    const contextFile = loadContextFileFromDir(currentDir);
    if (contextFile && !seenPaths.has(contextFile.path)) {
      ancestorContextFiles.unshift(contextFile);
      seenPaths.add(contextFile.path);
    }
    if (currentDir === root)
    break;
    const parentDir = (0, _nodePath.resolve)(currentDir, "..");
    if (parentDir === currentDir)
    break;
    currentDir = parentDir;
  }
  contextFiles.push(...ancestorContextFiles);
  return contextFiles;
}
class DefaultResourceLoader {
  cwd;
  agentDir;
  settingsManager;
  eventBus;
  packageManager;
  additionalExtensionPaths;
  additionalSkillPaths;
  additionalPromptTemplatePaths;
  additionalThemePaths;
  extensionFactories;
  noExtensions;
  noSkills;
  noPromptTemplates;
  noThemes;
  systemPromptSource;
  appendSystemPromptSource;
  extensionsOverride;
  skillsOverride;
  promptsOverride;
  themesOverride;
  agentsFilesOverride;
  systemPromptOverride;
  appendSystemPromptOverride;
  extensionsResult;
  skills;
  skillDiagnostics;
  prompts;
  promptDiagnostics;
  themes;
  themeDiagnostics;
  agentsFiles;
  systemPrompt;
  appendSystemPrompt;
  pathMetadata;
  lastSkillPaths;
  lastPromptPaths;
  lastThemePaths;
  constructor(options) {
    this.cwd = options.cwd ?? process.cwd();
    this.agentDir = options.agentDir ?? (0, _config.getAgentDir)();
    this.settingsManager = options.settingsManager ?? _settingsManager.SettingsManager.create(this.cwd, this.agentDir);
    this.eventBus = options.eventBus ?? (0, _eventBus.createEventBus)();
    this.packageManager = new _packageManager.DefaultPackageManager({
      cwd: this.cwd,
      agentDir: this.agentDir,
      settingsManager: this.settingsManager
    });
    this.additionalExtensionPaths = options.additionalExtensionPaths ?? [];
    this.additionalSkillPaths = options.additionalSkillPaths ?? [];
    this.additionalPromptTemplatePaths = options.additionalPromptTemplatePaths ?? [];
    this.additionalThemePaths = options.additionalThemePaths ?? [];
    this.extensionFactories = options.extensionFactories ?? [];
    this.noExtensions = options.noExtensions ?? false;
    this.noSkills = options.noSkills ?? false;
    this.noPromptTemplates = options.noPromptTemplates ?? false;
    this.noThemes = options.noThemes ?? false;
    this.systemPromptSource = options.systemPrompt;
    this.appendSystemPromptSource = options.appendSystemPrompt;
    this.extensionsOverride = options.extensionsOverride;
    this.skillsOverride = options.skillsOverride;
    this.promptsOverride = options.promptsOverride;
    this.themesOverride = options.themesOverride;
    this.agentsFilesOverride = options.agentsFilesOverride;
    this.systemPromptOverride = options.systemPromptOverride;
    this.appendSystemPromptOverride = options.appendSystemPromptOverride;
    this.extensionsResult = { extensions: [], errors: [], runtime: (0, _loader.createExtensionRuntime)() };
    this.skills = [];
    this.skillDiagnostics = [];
    this.prompts = [];
    this.promptDiagnostics = [];
    this.themes = [];
    this.themeDiagnostics = [];
    this.agentsFiles = [];
    this.appendSystemPrompt = [];
    this.pathMetadata = new Map();
    this.lastSkillPaths = [];
    this.lastPromptPaths = [];
    this.lastThemePaths = [];
  }
  getExtensions() {
    return this.extensionsResult;
  }
  getSkills() {
    return { skills: this.skills, diagnostics: this.skillDiagnostics };
  }
  getPrompts() {
    return { prompts: this.prompts, diagnostics: this.promptDiagnostics };
  }
  getThemes() {
    return { themes: this.themes, diagnostics: this.themeDiagnostics };
  }
  getAgentsFiles() {
    return { agentsFiles: this.agentsFiles };
  }
  getSystemPrompt() {
    return this.systemPrompt;
  }
  getAppendSystemPrompt() {
    return this.appendSystemPrompt;
  }
  getPathMetadata() {
    return this.pathMetadata;
  }
  extendResources(paths) {
    const skillPaths = this.normalizeExtensionPaths(paths.skillPaths ?? []);
    const promptPaths = this.normalizeExtensionPaths(paths.promptPaths ?? []);
    const themePaths = this.normalizeExtensionPaths(paths.themePaths ?? []);
    if (skillPaths.length > 0) {
      this.lastSkillPaths = this.mergePaths(this.lastSkillPaths, skillPaths.map((entry) => entry.path));
      this.updateSkillsFromPaths(this.lastSkillPaths, skillPaths);
    }
    if (promptPaths.length > 0) {
      this.lastPromptPaths = this.mergePaths(this.lastPromptPaths, promptPaths.map((entry) => entry.path));
      this.updatePromptsFromPaths(this.lastPromptPaths, promptPaths);
    }
    if (themePaths.length > 0) {
      this.lastThemePaths = this.mergePaths(this.lastThemePaths, themePaths.map((entry) => entry.path));
      this.updateThemesFromPaths(this.lastThemePaths, themePaths);
    }
  }
  async reload() {
    const resolvedPaths = await this.packageManager.resolve();
    const cliExtensionPaths = await this.packageManager.resolveExtensionSources(this.additionalExtensionPaths, {
      temporary: true
    });
    // Helper to extract enabled paths and store metadata
    const getEnabledResources = (resources) => {
      for (const r of resources) {
        if (!this.pathMetadata.has(r.path)) {
          this.pathMetadata.set(r.path, r.metadata);
        }
      }
      return resources.filter((r) => r.enabled);
    };
    const getEnabledPaths = (resources) => getEnabledResources(resources).map((r) => r.path);
    // Store metadata and get enabled paths
    this.pathMetadata = new Map();
    const enabledExtensions = getEnabledPaths(resolvedPaths.extensions);
    const enabledSkillResources = getEnabledResources(resolvedPaths.skills);
    const enabledPrompts = getEnabledPaths(resolvedPaths.prompts);
    const enabledThemes = getEnabledPaths(resolvedPaths.themes);
    const mapSkillPath = (resource) => {
      if (resource.metadata.source !== "auto" && resource.metadata.origin !== "package") {
        return resource.path;
      }
      try {
        const stats = (0, _nodeFs.statSync)(resource.path);
        if (!stats.isDirectory()) {
          return resource.path;
        }
      }
      catch {
        return resource.path;
      }
      const skillFile = (0, _nodePath.join)(resource.path, "SKILL.md");
      if ((0, _nodeFs.existsSync)(skillFile)) {
        if (!this.pathMetadata.has(skillFile)) {
          this.pathMetadata.set(skillFile, resource.metadata);
        }
        return skillFile;
      }
      return resource.path;
    };
    const enabledSkills = enabledSkillResources.map(mapSkillPath);
    // Add CLI paths metadata
    for (const r of cliExtensionPaths.extensions) {
      if (!this.pathMetadata.has(r.path)) {
        this.pathMetadata.set(r.path, { source: "cli", scope: "temporary", origin: "top-level" });
      }
    }
    for (const r of cliExtensionPaths.skills) {
      if (!this.pathMetadata.has(r.path)) {
        this.pathMetadata.set(r.path, { source: "cli", scope: "temporary", origin: "top-level" });
      }
    }
    const cliEnabledExtensions = getEnabledPaths(cliExtensionPaths.extensions);
    const cliEnabledSkills = getEnabledPaths(cliExtensionPaths.skills);
    const cliEnabledPrompts = getEnabledPaths(cliExtensionPaths.prompts);
    const cliEnabledThemes = getEnabledPaths(cliExtensionPaths.themes);
    const extensionPaths = this.noExtensions ?
    cliEnabledExtensions :
    this.mergePaths(enabledExtensions, cliEnabledExtensions);
    const extensionsResult = await (0, _loader.loadExtensions)(extensionPaths, this.cwd, this.eventBus);
    const inlineExtensions = await this.loadExtensionFactories(extensionsResult.runtime);
    extensionsResult.extensions.push(...inlineExtensions.extensions);
    extensionsResult.errors.push(...inlineExtensions.errors);
    // Detect extension conflicts (tools, commands, flags with same names from different extensions)
    const conflicts = this.detectExtensionConflicts(extensionsResult.extensions);
    if (conflicts.length > 0) {
      const conflictingPaths = new Set(conflicts.map((c) => c.path));
      extensionsResult.extensions = extensionsResult.extensions.filter((ext) => !conflictingPaths.has(ext.path));
      for (const conflict of conflicts) {
        extensionsResult.errors.push({ path: conflict.path, error: conflict.message });
      }
    }
    this.extensionsResult = this.extensionsOverride ? this.extensionsOverride(extensionsResult) : extensionsResult;
    const skillPaths = this.noSkills ?
    this.mergePaths(cliEnabledSkills, this.additionalSkillPaths) :
    this.mergePaths([...enabledSkills, ...cliEnabledSkills], this.additionalSkillPaths);
    this.lastSkillPaths = skillPaths;
    this.updateSkillsFromPaths(skillPaths);
    const promptPaths = this.noPromptTemplates ?
    this.mergePaths(cliEnabledPrompts, this.additionalPromptTemplatePaths) :
    this.mergePaths([...enabledPrompts, ...cliEnabledPrompts], this.additionalPromptTemplatePaths);
    this.lastPromptPaths = promptPaths;
    this.updatePromptsFromPaths(promptPaths);
    const themePaths = this.noThemes ?
    this.mergePaths(cliEnabledThemes, this.additionalThemePaths) :
    this.mergePaths([...enabledThemes, ...cliEnabledThemes], this.additionalThemePaths);
    this.lastThemePaths = themePaths;
    this.updateThemesFromPaths(themePaths);
    for (const extension of this.extensionsResult.extensions) {
      this.addDefaultMetadataForPath(extension.path);
    }
    const agentsFiles = { agentsFiles: loadProjectContextFiles({ cwd: this.cwd, agentDir: this.agentDir }) };
    const resolvedAgentsFiles = this.agentsFilesOverride ? this.agentsFilesOverride(agentsFiles) : agentsFiles;
    this.agentsFiles = resolvedAgentsFiles.agentsFiles;
    const baseSystemPrompt = resolvePromptInput(this.systemPromptSource ?? this.discoverSystemPromptFile(), "system prompt");
    this.systemPrompt = this.systemPromptOverride ? this.systemPromptOverride(baseSystemPrompt) : baseSystemPrompt;
    const appendSource = this.appendSystemPromptSource ?? this.discoverAppendSystemPromptFile();
    const resolvedAppend = resolvePromptInput(appendSource, "append system prompt");
    const baseAppend = resolvedAppend ? [resolvedAppend] : [];
    this.appendSystemPrompt = this.appendSystemPromptOverride ?
    this.appendSystemPromptOverride(baseAppend) :
    baseAppend;
  }
  normalizeExtensionPaths(entries) {
    return entries.map((entry) => ({
      path: this.resolveResourcePath(entry.path),
      metadata: entry.metadata
    }));
  }
  updateSkillsFromPaths(skillPaths, extensionPaths = []) {
    let skillsResult;
    if (this.noSkills && skillPaths.length === 0) {
      skillsResult = { skills: [], diagnostics: [] };
    } else
    {
      skillsResult = (0, _skills.loadSkills)({
        cwd: this.cwd,
        agentDir: this.agentDir,
        skillPaths,
        includeDefaults: false
      });
    }
    const resolvedSkills = this.skillsOverride ? this.skillsOverride(skillsResult) : skillsResult;
    this.skills = resolvedSkills.skills;
    this.skillDiagnostics = resolvedSkills.diagnostics;
    this.applyExtensionMetadata(extensionPaths, this.skills.map((skill) => skill.filePath));
    for (const skill of this.skills) {
      this.addDefaultMetadataForPath(skill.filePath);
    }
  }
  updatePromptsFromPaths(promptPaths, extensionPaths = []) {
    let promptsResult;
    if (this.noPromptTemplates && promptPaths.length === 0) {
      promptsResult = { prompts: [], diagnostics: [] };
    } else
    {
      const allPrompts = (0, _promptTemplates.loadPromptTemplates)({
        cwd: this.cwd,
        agentDir: this.agentDir,
        promptPaths,
        includeDefaults: false
      });
      promptsResult = this.dedupePrompts(allPrompts);
    }
    const resolvedPrompts = this.promptsOverride ? this.promptsOverride(promptsResult) : promptsResult;
    this.prompts = resolvedPrompts.prompts;
    this.promptDiagnostics = resolvedPrompts.diagnostics;
    this.applyExtensionMetadata(extensionPaths, this.prompts.map((prompt) => prompt.filePath));
    for (const prompt of this.prompts) {
      this.addDefaultMetadataForPath(prompt.filePath);
    }
  }
  updateThemesFromPaths(themePaths, extensionPaths = []) {
    let themesResult;
    if (this.noThemes && themePaths.length === 0) {
      themesResult = { themes: [], diagnostics: [] };
    } else
    {
      const loaded = this.loadThemes(themePaths, false);
      const deduped = this.dedupeThemes(loaded.themes);
      themesResult = { themes: deduped.themes, diagnostics: [...loaded.diagnostics, ...deduped.diagnostics] };
    }
    const resolvedThemes = this.themesOverride ? this.themesOverride(themesResult) : themesResult;
    this.themes = resolvedThemes.themes;
    this.themeDiagnostics = resolvedThemes.diagnostics;
    const themePathsWithSource = this.themes.flatMap((theme) => theme.sourcePath ? [theme.sourcePath] : []);
    this.applyExtensionMetadata(extensionPaths, themePathsWithSource);
    for (const theme of this.themes) {
      if (theme.sourcePath) {
        this.addDefaultMetadataForPath(theme.sourcePath);
      }
    }
  }
  applyExtensionMetadata(extensionPaths, resourcePaths) {
    if (extensionPaths.length === 0) {
      return;
    }
    const normalized = extensionPaths.map((entry) => ({
      path: (0, _nodePath.resolve)(entry.path),
      metadata: entry.metadata
    }));
    for (const entry of normalized) {
      if (!this.pathMetadata.has(entry.path)) {
        this.pathMetadata.set(entry.path, entry.metadata);
      }
    }
    for (const resourcePath of resourcePaths) {
      const normalizedResourcePath = (0, _nodePath.resolve)(resourcePath);
      if (this.pathMetadata.has(normalizedResourcePath) || this.pathMetadata.has(resourcePath)) {
        continue;
      }
      const match = normalized.find((entry) => normalizedResourcePath === entry.path || normalizedResourcePath.startsWith(`${entry.path}${_nodePath.sep}`));
      if (match) {
        this.pathMetadata.set(normalizedResourcePath, match.metadata);
      }
    }
  }
  mergePaths(primary, additional) {
    const merged = [];
    const seen = new Set();
    for (const p of [...primary, ...additional]) {
      const resolved = this.resolveResourcePath(p);
      if (seen.has(resolved))
      continue;
      seen.add(resolved);
      merged.push(resolved);
    }
    return merged;
  }
  resolveResourcePath(p) {
    const trimmed = p.trim();
    let expanded = trimmed;
    if (trimmed === "~") {
      expanded = (0, _nodeOs.homedir)();
    } else
    if (trimmed.startsWith("~/")) {
      expanded = (0, _nodePath.join)((0, _nodeOs.homedir)(), trimmed.slice(2));
    } else
    if (trimmed.startsWith("~")) {
      expanded = (0, _nodePath.join)((0, _nodeOs.homedir)(), trimmed.slice(1));
    }
    return (0, _nodePath.resolve)(this.cwd, expanded);
  }
  loadThemes(paths, includeDefaults = true) {
    const themes = [];
    const diagnostics = [];
    if (includeDefaults) {
      const defaultDirs = [(0, _nodePath.join)(this.agentDir, "themes"), (0, _nodePath.join)(this.cwd, _config.CONFIG_DIR_NAME, "themes")];
      for (const dir of defaultDirs) {
        this.loadThemesFromDir(dir, themes, diagnostics);
      }
    }
    for (const p of paths) {
      const resolved = (0, _nodePath.resolve)(this.cwd, p);
      if (!(0, _nodeFs.existsSync)(resolved)) {
        diagnostics.push({ type: "warning", message: "theme path does not exist", path: resolved });
        continue;
      }
      try {
        const stats = (0, _nodeFs.statSync)(resolved);
        if (stats.isDirectory()) {
          this.loadThemesFromDir(resolved, themes, diagnostics);
        } else
        if (stats.isFile() && resolved.endsWith(".json")) {
          this.loadThemeFromFile(resolved, themes, diagnostics);
        } else
        {
          diagnostics.push({ type: "warning", message: "theme path is not a json file", path: resolved });
        }
      }
      catch (error) {
        const message = error instanceof Error ? error.message : "failed to read theme path";
        diagnostics.push({ type: "warning", message, path: resolved });
      }
    }
    return { themes, diagnostics };
  }
  loadThemesFromDir(dir, themes, diagnostics) {
    if (!(0, _nodeFs.existsSync)(dir)) {
      return;
    }
    try {
      const entries = (0, _nodeFs.readdirSync)(dir, { withFileTypes: true });
      for (const entry of entries) {
        let isFile = entry.isFile();
        if (entry.isSymbolicLink()) {
          try {
            isFile = (0, _nodeFs.statSync)((0, _nodePath.join)(dir, entry.name)).isFile();
          }
          catch {
            continue;
          }
        }
        if (!isFile) {
          continue;
        }
        if (!entry.name.endsWith(".json")) {
          continue;
        }
        this.loadThemeFromFile((0, _nodePath.join)(dir, entry.name), themes, diagnostics);
      }
    }
    catch (error) {
      const message = error instanceof Error ? error.message : "failed to read theme directory";
      diagnostics.push({ type: "warning", message, path: dir });
    }
  }
  loadThemeFromFile(filePath, themes, diagnostics) {
    try {
      themes.push((0, _theme.loadThemeFromPath)(filePath));
    }
    catch (error) {
      const message = error instanceof Error ? error.message : "failed to load theme";
      diagnostics.push({ type: "warning", message, path: filePath });
    }
  }
  async loadExtensionFactories(runtime) {
    const extensions = [];
    const errors = [];
    for (const [index, factory] of this.extensionFactories.entries()) {
      const extensionPath = `<inline:${index + 1}>`;
      try {
        const extension = await (0, _loader.loadExtensionFromFactory)(factory, this.cwd, this.eventBus, runtime, extensionPath);
        extensions.push(extension);
      }
      catch (error) {
        const message = error instanceof Error ? error.message : "failed to load extension";
        errors.push({ path: extensionPath, error: message });
      }
    }
    return { extensions, errors };
  }
  dedupePrompts(prompts) {
    const seen = new Map();
    const diagnostics = [];
    for (const prompt of prompts) {
      const existing = seen.get(prompt.name);
      if (existing) {
        diagnostics.push({
          type: "collision",
          message: `name "/${prompt.name}" collision`,
          path: prompt.filePath,
          collision: {
            resourceType: "prompt",
            name: prompt.name,
            winnerPath: existing.filePath,
            loserPath: prompt.filePath
          }
        });
      } else
      {
        seen.set(prompt.name, prompt);
      }
    }
    return { prompts: Array.from(seen.values()), diagnostics };
  }
  dedupeThemes(themes) {
    const seen = new Map();
    const diagnostics = [];
    for (const t of themes) {
      const name = t.name ?? "unnamed";
      const existing = seen.get(name);
      if (existing) {
        diagnostics.push({
          type: "collision",
          message: `name "${name}" collision`,
          path: t.sourcePath,
          collision: {
            resourceType: "theme",
            name,
            winnerPath: existing.sourcePath ?? "<builtin>",
            loserPath: t.sourcePath ?? "<builtin>"
          }
        });
      } else
      {
        seen.set(name, t);
      }
    }
    return { themes: Array.from(seen.values()), diagnostics };
  }
  discoverSystemPromptFile() {
    const projectPath = (0, _nodePath.join)(this.cwd, _config.CONFIG_DIR_NAME, "SYSTEM.md");
    if ((0, _nodeFs.existsSync)(projectPath)) {
      return projectPath;
    }
    const globalPath = (0, _nodePath.join)(this.agentDir, "SYSTEM.md");
    if ((0, _nodeFs.existsSync)(globalPath)) {
      return globalPath;
    }
    return undefined;
  }
  discoverAppendSystemPromptFile() {
    const projectPath = (0, _nodePath.join)(this.cwd, _config.CONFIG_DIR_NAME, "APPEND_SYSTEM.md");
    if ((0, _nodeFs.existsSync)(projectPath)) {
      return projectPath;
    }
    const globalPath = (0, _nodePath.join)(this.agentDir, "APPEND_SYSTEM.md");
    if ((0, _nodeFs.existsSync)(globalPath)) {
      return globalPath;
    }
    return undefined;
  }
  addDefaultMetadataForPath(filePath) {
    if (!filePath || filePath.startsWith("<")) {
      return;
    }
    const normalizedPath = (0, _nodePath.resolve)(filePath);
    if (this.pathMetadata.has(normalizedPath) || this.pathMetadata.has(filePath)) {
      return;
    }
    const agentRoots = [
    (0, _nodePath.join)(this.agentDir, "skills"),
    (0, _nodePath.join)(this.agentDir, "prompts"),
    (0, _nodePath.join)(this.agentDir, "themes"),
    (0, _nodePath.join)(this.agentDir, "extensions")];

    const projectRoots = [
    (0, _nodePath.join)(this.cwd, _config.CONFIG_DIR_NAME, "skills"),
    (0, _nodePath.join)(this.cwd, _config.CONFIG_DIR_NAME, "prompts"),
    (0, _nodePath.join)(this.cwd, _config.CONFIG_DIR_NAME, "themes"),
    (0, _nodePath.join)(this.cwd, _config.CONFIG_DIR_NAME, "extensions")];

    for (const root of agentRoots) {
      if (this.isUnderPath(normalizedPath, root)) {
        this.pathMetadata.set(normalizedPath, { source: "local", scope: "user", origin: "top-level" });
        return;
      }
    }
    for (const root of projectRoots) {
      if (this.isUnderPath(normalizedPath, root)) {
        this.pathMetadata.set(normalizedPath, { source: "local", scope: "project", origin: "top-level" });
        return;
      }
    }
  }
  isUnderPath(target, root) {
    const normalizedRoot = (0, _nodePath.resolve)(root);
    if (target === normalizedRoot) {
      return true;
    }
    const prefix = normalizedRoot.endsWith(_nodePath.sep) ? normalizedRoot : `${normalizedRoot}${_nodePath.sep}`;
    return target.startsWith(prefix);
  }
  detectExtensionConflicts(extensions) {
    const conflicts = [];
    // Track which extension registered each tool, command, and flag
    const toolOwners = new Map();
    const commandOwners = new Map();
    const flagOwners = new Map();
    for (const ext of extensions) {
      // Check tools
      for (const toolName of ext.tools.keys()) {
        const existingOwner = toolOwners.get(toolName);
        if (existingOwner && existingOwner !== ext.path) {
          conflicts.push({
            path: ext.path,
            message: `Tool "${toolName}" conflicts with ${existingOwner}`
          });
        } else
        {
          toolOwners.set(toolName, ext.path);
        }
      }
      // Check commands
      for (const commandName of ext.commands.keys()) {
        const existingOwner = commandOwners.get(commandName);
        if (existingOwner && existingOwner !== ext.path) {
          conflicts.push({
            path: ext.path,
            message: `Command "/${commandName}" conflicts with ${existingOwner}`
          });
        } else
        {
          commandOwners.set(commandName, ext.path);
        }
      }
      // Check flags
      for (const flagName of ext.flags.keys()) {
        const existingOwner = flagOwners.get(flagName);
        if (existingOwner && existingOwner !== ext.path) {
          conflicts.push({
            path: ext.path,
            message: `Flag "--${flagName}" conflicts with ${existingOwner}`
          });
        } else
        {
          flagOwners.set(flagName, ext.path);
        }
      }
    }
    return conflicts;
  }
}exports.DefaultResourceLoader = DefaultResourceLoader; /* v9-cd977cfad2ea3d42 */
