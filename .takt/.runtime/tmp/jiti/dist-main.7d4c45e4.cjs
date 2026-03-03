"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.main = main;





var _piAi = require("@mariozechner/pi-ai");
var _chalk = _interopRequireDefault(require("chalk"));
var _readline = require("readline");
var _args = require("./cli/args.js");
var _configSelector = require("./cli/config-selector.js");
var _fileProcessor = require("./cli/file-processor.js");
var _listModels = require("./cli/list-models.js");
var _sessionPicker = require("./cli/session-picker.js");
var _config = require("./config.js");
var _authStorage = require("./core/auth-storage.js");
var _defaults = require("./core/defaults.js");
var _index = require("./core/export-html/index.js");
var _keybindings = require("./core/keybindings.js");
var _modelRegistry = require("./core/model-registry.js");
var _modelResolver = require("./core/model-resolver.js");
var _packageManager = require("./core/package-manager.js");
var _resourceLoader = require("./core/resource-loader.js");
var _sdk = require("./core/sdk.js");
var _sessionManager = require("./core/session-manager.js");
var _settingsManager = require("./core/settings-manager.js");
var _timings = require("./core/timings.js");
var _index2 = require("./core/tools/index.js");
var _migrations = require("./migrations.js");
var _index3 = require("./modes/index.js");
var _theme = require("./modes/interactive/theme/theme.js");function _interopRequireDefault(e) {return e && e.__esModule ? e : { default: e };} /**
 * Main entry point for the coding agent CLI.
 *
 * This file handles CLI argument parsing and translates them into
 * createAgentSession() options. The SDK does the heavy lifting.
 */ /**
 * Read all content from piped stdin.
 * Returns undefined if stdin is a TTY (interactive terminal).
 */async function readPipedStdin() {// If stdin is a TTY, we're running interactively - don't read stdin
  if (process.stdin.isTTY) {return undefined;}
  return new Promise((resolve) => {
    let data = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk) => {
      data += chunk;
    });
    process.stdin.on("end", () => {
      resolve(data.trim() || undefined);
    });
    process.stdin.resume();
  });
}
function parsePackageCommand(args) {
  const [command, ...rest] = args;
  if (command !== "install" && command !== "remove" && command !== "update" && command !== "list") {
    return undefined;
  }
  let local = false;
  const sources = [];
  for (const arg of rest) {
    if (arg === "-l" || arg === "--local") {
      local = true;
      continue;
    }
    sources.push(arg);
  }
  return { command, source: sources[0], local };
}
function normalizeExtensionSource(source) {
  if (source.startsWith("npm:")) {
    const spec = source.slice("npm:".length).trim();
    const match = spec.match(/^(@?[^@]+(?:\/[^@]+)?)(?:@.+)?$/);
    return { type: "npm", key: match?.[1] ?? spec };
  }
  if (source.startsWith("git:")) {
    const repo = source.slice("git:".length).trim().split("@")[0] ?? "";
    return { type: "git", key: repo.replace(/^https?:\/\//, "").replace(/\.git$/, "") };
  }
  // Raw git URLs
  if (source.startsWith("https://") || source.startsWith("http://")) {
    const repo = source.split("@")[0] ?? "";
    return { type: "git", key: repo.replace(/^https?:\/\//, "").replace(/\.git$/, "") };
  }
  return { type: "local", key: source };
}
function sourcesMatch(a, b) {
  const left = normalizeExtensionSource(a);
  const right = normalizeExtensionSource(b);
  return left.type === right.type && left.key === right.key;
}
function getPackageSourceString(pkg) {
  return typeof pkg === "string" ? pkg : pkg.source;
}
function packageSourcesMatch(a, b) {
  const aSource = getPackageSourceString(a);
  return sourcesMatch(aSource, b);
}
function updatePackageSources(settingsManager, source, local, action) {
  const currentSettings = local ? settingsManager.getProjectSettings() : settingsManager.getGlobalSettings();
  const currentPackages = currentSettings.packages ?? [];
  let nextPackages;
  if (action === "add") {
    const exists = currentPackages.some((existing) => packageSourcesMatch(existing, source));
    nextPackages = exists ? currentPackages : [...currentPackages, source];
  } else
  {
    nextPackages = currentPackages.filter((existing) => !packageSourcesMatch(existing, source));
  }
  if (local) {
    settingsManager.setProjectPackages(nextPackages);
  } else
  {
    settingsManager.setPackages(nextPackages);
  }
}
async function handlePackageCommand(args) {
  const options = parsePackageCommand(args);
  if (!options) {
    return false;
  }
  const cwd = process.cwd();
  const agentDir = (0, _config.getAgentDir)();
  const settingsManager = _settingsManager.SettingsManager.create(cwd, agentDir);
  const packageManager = new _packageManager.DefaultPackageManager({ cwd, agentDir, settingsManager });
  // Set up progress callback for CLI feedback
  packageManager.setProgressCallback((event) => {
    if (event.type === "start") {
      process.stdout.write(_chalk.default.dim(`${event.message}\n`));
    } else
    if (event.type === "error") {
      console.error(_chalk.default.red(`Error: ${event.message}`));
    }
  });
  if (options.command === "install") {
    if (!options.source) {
      console.error(_chalk.default.red("Missing install source."));
      process.exit(1);
    }
    await packageManager.install(options.source, { local: options.local });
    updatePackageSources(settingsManager, options.source, options.local, "add");
    console.log(_chalk.default.green(`Installed ${options.source}`));
    return true;
  }
  if (options.command === "remove") {
    if (!options.source) {
      console.error(_chalk.default.red("Missing remove source."));
      process.exit(1);
    }
    await packageManager.remove(options.source, { local: options.local });
    updatePackageSources(settingsManager, options.source, options.local, "remove");
    console.log(_chalk.default.green(`Removed ${options.source}`));
    return true;
  }
  if (options.command === "list") {
    const globalSettings = settingsManager.getGlobalSettings();
    const projectSettings = settingsManager.getProjectSettings();
    const globalPackages = globalSettings.packages ?? [];
    const projectPackages = projectSettings.packages ?? [];
    if (globalPackages.length === 0 && projectPackages.length === 0) {
      console.log(_chalk.default.dim("No packages installed."));
      return true;
    }
    const formatPackage = (pkg, scope) => {
      const source = typeof pkg === "string" ? pkg : pkg.source;
      const filtered = typeof pkg === "object";
      const display = filtered ? `${source} (filtered)` : source;
      console.log(`  ${display}`);
      // Show resolved path
      const path = packageManager.getInstalledPath(source, scope);
      if (path) {
        console.log(_chalk.default.dim(`    ${path}`));
      }
    };
    if (globalPackages.length > 0) {
      console.log(_chalk.default.bold("User packages:"));
      for (const pkg of globalPackages) {
        formatPackage(pkg, "user");
      }
    }
    if (projectPackages.length > 0) {
      if (globalPackages.length > 0)
      console.log();
      console.log(_chalk.default.bold("Project packages:"));
      for (const pkg of projectPackages) {
        formatPackage(pkg, "project");
      }
    }
    return true;
  }
  await packageManager.update(options.source);
  if (options.source) {
    console.log(_chalk.default.green(`Updated ${options.source}`));
  } else
  {
    console.log(_chalk.default.green("Updated packages"));
  }
  return true;
}
async function prepareInitialMessage(parsed, autoResizeImages) {
  if (parsed.fileArgs.length === 0) {
    return {};
  }
  const { text, images } = await (0, _fileProcessor.processFileArguments)(parsed.fileArgs, { autoResizeImages });
  let initialMessage;
  if (parsed.messages.length > 0) {
    initialMessage = text + parsed.messages[0];
    parsed.messages.shift();
  } else
  {
    initialMessage = text;
  }
  return {
    initialMessage,
    initialImages: images.length > 0 ? images : undefined
  };
}
/**
 * Resolve a session argument to a file path.
 * If it looks like a path, use as-is. Otherwise try to match as session ID prefix.
 */
async function resolveSessionPath(sessionArg, cwd, sessionDir) {
  // If it looks like a file path, use as-is
  if (sessionArg.includes("/") || sessionArg.includes("\\") || sessionArg.endsWith(".jsonl")) {
    return { type: "path", path: sessionArg };
  }
  // Try to match as session ID in current project first
  const localSessions = await _sessionManager.SessionManager.list(cwd, sessionDir);
  const localMatches = localSessions.filter((s) => s.id.startsWith(sessionArg));
  if (localMatches.length >= 1) {
    return { type: "local", path: localMatches[0].path };
  }
  // Try global search across all projects
  const allSessions = await _sessionManager.SessionManager.listAll();
  const globalMatches = allSessions.filter((s) => s.id.startsWith(sessionArg));
  if (globalMatches.length >= 1) {
    const match = globalMatches[0];
    return { type: "global", path: match.path, cwd: match.cwd };
  }
  // Not found anywhere
  return { type: "not_found", arg: sessionArg };
}
/** Prompt user for yes/no confirmation */
async function promptConfirm(message) {
  return new Promise((resolve) => {
    const rl = (0, _readline.createInterface)({
      input: process.stdin,
      output: process.stdout
    });
    rl.question(`${message} [y/N] `, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === "y" || answer.toLowerCase() === "yes");
    });
  });
}
async function createSessionManager(parsed, cwd) {
  if (parsed.noSession) {
    return _sessionManager.SessionManager.inMemory();
  }
  if (parsed.session) {
    const resolved = await resolveSessionPath(parsed.session, cwd, parsed.sessionDir);
    switch (resolved.type) {
      case "path":
      case "local":
        return _sessionManager.SessionManager.open(resolved.path, parsed.sessionDir);
      case "global":{
          // Session found in different project - ask user if they want to fork
          console.log(_chalk.default.yellow(`Session found in different project: ${resolved.cwd}`));
          const shouldFork = await promptConfirm("Fork this session into current directory?");
          if (!shouldFork) {
            console.log(_chalk.default.dim("Aborted."));
            process.exit(0);
          }
          return _sessionManager.SessionManager.forkFrom(resolved.path, cwd, parsed.sessionDir);
        }
      case "not_found":
        console.error(_chalk.default.red(`No session found matching '${resolved.arg}'`));
        process.exit(1);
    }
  }
  if (parsed.continue) {
    return _sessionManager.SessionManager.continueRecent(cwd, parsed.sessionDir);
  }
  // --resume is handled separately (needs picker UI)
  // If --session-dir provided without --continue/--resume, create new session there
  if (parsed.sessionDir) {
    return _sessionManager.SessionManager.create(cwd, parsed.sessionDir);
  }
  // Default case (new session) returns undefined, SDK will create one
  return undefined;
}
function buildSessionOptions(parsed, scopedModels, sessionManager, modelRegistry, settingsManager) {
  const options = {};
  if (sessionManager) {
    options.sessionManager = sessionManager;
  }
  // Model from CLI
  if (parsed.provider && parsed.model) {
    const model = modelRegistry.find(parsed.provider, parsed.model);
    if (!model) {
      console.error(_chalk.default.red(`Model ${parsed.provider}/${parsed.model} not found`));
      process.exit(1);
    }
    options.model = model;
  } else
  if (scopedModels.length > 0 && !parsed.continue && !parsed.resume) {
    // Check if saved default is in scoped models - use it if so, otherwise first scoped model
    const savedProvider = settingsManager.getDefaultProvider();
    const savedModelId = settingsManager.getDefaultModel();
    const savedModel = savedProvider && savedModelId ? modelRegistry.find(savedProvider, savedModelId) : undefined;
    const savedInScope = savedModel ? scopedModels.find((sm) => (0, _piAi.modelsAreEqual)(sm.model, savedModel)) : undefined;
    if (savedInScope) {
      options.model = savedInScope.model;
      // Use thinking level from scoped model config if explicitly set
      if (!parsed.thinking && savedInScope.thinkingLevel) {
        options.thinkingLevel = savedInScope.thinkingLevel;
      }
    } else
    {
      options.model = scopedModels[0].model;
      // Use thinking level from first scoped model if explicitly set
      if (!parsed.thinking && scopedModels[0].thinkingLevel) {
        options.thinkingLevel = scopedModels[0].thinkingLevel;
      }
    }
  }
  // Thinking level from CLI (takes precedence over scoped model thinking levels set above)
  if (parsed.thinking) {
    options.thinkingLevel = parsed.thinking;
  }
  // Scoped models for Ctrl+P cycling - fill in default thinking level for models without explicit level
  if (scopedModels.length > 0) {
    const defaultThinkingLevel = settingsManager.getDefaultThinkingLevel() ?? _defaults.DEFAULT_THINKING_LEVEL;
    options.scopedModels = scopedModels.map((sm) => ({
      model: sm.model,
      thinkingLevel: sm.thinkingLevel ?? defaultThinkingLevel
    }));
  }
  // API key from CLI - set in authStorage
  // (handled by caller before createAgentSession)
  // Tools
  if (parsed.noTools) {
    // --no-tools: start with no built-in tools
    // --tools can still add specific ones back
    if (parsed.tools && parsed.tools.length > 0) {
      options.tools = parsed.tools.map((name) => _index2.allTools[name]);
    } else
    {
      options.tools = [];
    }
  } else
  if (parsed.tools) {
    options.tools = parsed.tools.map((name) => _index2.allTools[name]);
  }
  return options;
}
async function handleConfigCommand(args) {
  if (args[0] !== "config") {
    return false;
  }
  const cwd = process.cwd();
  const agentDir = (0, _config.getAgentDir)();
  const settingsManager = _settingsManager.SettingsManager.create(cwd, agentDir);
  const packageManager = new _packageManager.DefaultPackageManager({ cwd, agentDir, settingsManager });
  const resolvedPaths = await packageManager.resolve();
  await (0, _configSelector.selectConfig)({
    resolvedPaths,
    settingsManager,
    cwd,
    agentDir
  });
  process.exit(0);
}
async function main(args) {
  if (await handlePackageCommand(args)) {
    return;
  }
  if (await handleConfigCommand(args)) {
    return;
  }
  // Run migrations (pass cwd for project-local migrations)
  const { migratedAuthProviders: migratedProviders, deprecationWarnings } = (0, _migrations.runMigrations)(process.cwd());
  // First pass: parse args to get --extension paths
  const firstPass = (0, _args.parseArgs)(args);
  // Early load extensions to discover their CLI flags
  const cwd = process.cwd();
  const agentDir = (0, _config.getAgentDir)();
  const settingsManager = _settingsManager.SettingsManager.create(cwd, agentDir);
  const authStorage = new _authStorage.AuthStorage();
  const modelRegistry = new _modelRegistry.ModelRegistry(authStorage, (0, _config.getModelsPath)());
  const resourceLoader = new _resourceLoader.DefaultResourceLoader({
    cwd,
    agentDir,
    settingsManager,
    additionalExtensionPaths: firstPass.extensions,
    additionalSkillPaths: firstPass.skills,
    additionalPromptTemplatePaths: firstPass.promptTemplates,
    additionalThemePaths: firstPass.themes,
    noExtensions: firstPass.noExtensions,
    noSkills: firstPass.noSkills,
    noPromptTemplates: firstPass.noPromptTemplates,
    noThemes: firstPass.noThemes,
    systemPrompt: firstPass.systemPrompt,
    appendSystemPrompt: firstPass.appendSystemPrompt
  });
  await resourceLoader.reload();
  (0, _timings.time)("resourceLoader.reload");
  const extensionsResult = resourceLoader.getExtensions();
  for (const { path, error } of extensionsResult.errors) {
    console.error(_chalk.default.red(`Failed to load extension "${path}": ${error}`));
  }
  // Apply pending provider registrations from extensions immediately
  // so they're available for model resolution before AgentSession is created
  for (const { name, config } of extensionsResult.runtime.pendingProviderRegistrations) {
    modelRegistry.registerProvider(name, config);
  }
  extensionsResult.runtime.pendingProviderRegistrations = [];
  const extensionFlags = new Map();
  for (const ext of extensionsResult.extensions) {
    for (const [name, flag] of ext.flags) {
      extensionFlags.set(name, { type: flag.type });
    }
  }
  // Second pass: parse args with extension flags
  const parsed = (0, _args.parseArgs)(args, extensionFlags);
  // Pass flag values to extensions via runtime
  for (const [name, value] of parsed.unknownFlags) {
    extensionsResult.runtime.flagValues.set(name, value);
  }
  if (parsed.version) {
    console.log(_config.VERSION);
    return;
  }
  if (parsed.help) {
    (0, _args.printHelp)();
    return;
  }
  if (parsed.listModels !== undefined) {
    const searchPattern = typeof parsed.listModels === "string" ? parsed.listModels : undefined;
    await (0, _listModels.listModels)(modelRegistry, searchPattern);
    return;
  }
  // Read piped stdin content (if any) - skip for RPC mode which uses stdin for JSON-RPC
  if (parsed.mode !== "rpc") {
    const stdinContent = await readPipedStdin();
    if (stdinContent !== undefined) {
      // Force print mode since interactive mode requires a TTY for keyboard input
      parsed.print = true;
      // Prepend stdin content to messages
      parsed.messages.unshift(stdinContent);
    }
  }
  if (parsed.export) {
    try {
      const outputPath = parsed.messages.length > 0 ? parsed.messages[0] : undefined;
      const result = await (0, _index.exportFromFile)(parsed.export, outputPath);
      console.log(`Exported to: ${result}`);
      return;
    }
    catch (error) {
      const message = error instanceof Error ? error.message : "Failed to export session";
      console.error(_chalk.default.red(`Error: ${message}`));
      process.exit(1);
    }
  }
  if (parsed.mode === "rpc" && parsed.fileArgs.length > 0) {
    console.error(_chalk.default.red("Error: @file arguments are not supported in RPC mode"));
    process.exit(1);
  }
  const { initialMessage, initialImages } = await prepareInitialMessage(parsed, settingsManager.getImageAutoResize());
  const isInteractive = !parsed.print && parsed.mode === undefined;
  const mode = parsed.mode || "text";
  (0, _theme.initTheme)(settingsManager.getTheme(), isInteractive);
  // Show deprecation warnings in interactive mode
  if (isInteractive && deprecationWarnings.length > 0) {
    await (0, _migrations.showDeprecationWarnings)(deprecationWarnings);
  }
  let scopedModels = [];
  const modelPatterns = parsed.models ?? settingsManager.getEnabledModels();
  if (modelPatterns && modelPatterns.length > 0) {
    scopedModels = await (0, _modelResolver.resolveModelScope)(modelPatterns, modelRegistry);
  }
  // Create session manager based on CLI flags
  let sessionManager = await createSessionManager(parsed, cwd);
  // Handle --resume: show session picker
  if (parsed.resume) {
    // Initialize keybindings so session picker respects user config
    _keybindings.KeybindingsManager.create();
    const selectedPath = await (0, _sessionPicker.selectSession)((onProgress) => _sessionManager.SessionManager.list(cwd, parsed.sessionDir, onProgress), _sessionManager.SessionManager.listAll);
    if (!selectedPath) {
      console.log(_chalk.default.dim("No session selected"));
      (0, _theme.stopThemeWatcher)();
      process.exit(0);
    }
    sessionManager = _sessionManager.SessionManager.open(selectedPath);
  }
  const sessionOptions = buildSessionOptions(parsed, scopedModels, sessionManager, modelRegistry, settingsManager);
  sessionOptions.authStorage = authStorage;
  sessionOptions.modelRegistry = modelRegistry;
  sessionOptions.resourceLoader = resourceLoader;
  // Handle CLI --api-key as runtime override (not persisted)
  if (parsed.apiKey) {
    if (!sessionOptions.model) {
      console.error(_chalk.default.red("--api-key requires a model to be specified via --provider/--model or -m/--models"));
      process.exit(1);
    }
    authStorage.setRuntimeApiKey(sessionOptions.model.provider, parsed.apiKey);
  }
  const { session, modelFallbackMessage } = await (0, _sdk.createAgentSession)(sessionOptions);
  if (!isInteractive && !session.model) {
    console.error(_chalk.default.red("No models available."));
    console.error(_chalk.default.yellow("\nSet an API key environment variable:"));
    console.error("  ANTHROPIC_API_KEY, OPENAI_API_KEY, GEMINI_API_KEY, etc.");
    console.error(_chalk.default.yellow(`\nOr create ${(0, _config.getModelsPath)()}`));
    process.exit(1);
  }
  // Clamp thinking level to model capabilities (for CLI override case)
  if (session.model && parsed.thinking) {
    let effectiveThinking = parsed.thinking;
    if (!session.model.reasoning) {
      effectiveThinking = "off";
    } else
    if (effectiveThinking === "xhigh" && !(0, _piAi.supportsXhigh)(session.model)) {
      effectiveThinking = "high";
    }
    if (effectiveThinking !== session.thinkingLevel) {
      session.setThinkingLevel(effectiveThinking);
    }
  }
  if (mode === "rpc") {
    await (0, _index3.runRpcMode)(session);
  } else
  if (isInteractive) {
    if (scopedModels.length > 0 && (parsed.verbose || !settingsManager.getQuietStartup())) {
      const modelList = scopedModels.
      map((sm) => {
        const thinkingStr = sm.thinkingLevel ? `:${sm.thinkingLevel}` : "";
        return `${sm.model.id}${thinkingStr}`;
      }).
      join(", ");
      console.log(_chalk.default.dim(`Model scope: ${modelList} ${_chalk.default.gray("(Ctrl+P to cycle)")}`));
    }
    (0, _timings.printTimings)();
    const mode = new _index3.InteractiveMode(session, {
      migratedProviders,
      modelFallbackMessage,
      initialMessage,
      initialImages,
      initialMessages: parsed.messages,
      verbose: parsed.verbose
    });
    await mode.run();
  } else
  {
    await (0, _index3.runPrintMode)(session, {
      mode,
      messages: parsed.messages,
      initialMessage,
      initialImages
    });
    (0, _theme.stopThemeWatcher)();
    if (process.stdout.writableLength > 0) {
      await new Promise((resolve) => process.stdout.once("drain", resolve));
    }
    process.exit(0);
  }
} /* v9-22a491e7e5b1bd27 */
