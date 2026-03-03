"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.registerMemoryCli = registerMemoryCli;exports.runMemoryStatus = runMemoryStatus;var _nodeFs = _interopRequireDefault(require("node:fs"));
var _promises = _interopRequireDefault(require("node:fs/promises"));
var _nodeOs = _interopRequireDefault(require("node:os"));
var _nodePath = _interopRequireDefault(require("node:path"));
var _agentScope = require("../agents/agent-scope.js");
var _config = require("../config/config.js");
var _paths = require("../config/paths.js");
var _paths2 = require("../config/sessions/paths.js");
var _globals = require("../globals.js");
var _index = require("../memory/index.js");
var _internal = require("../memory/internal.js");
var _runtime = require("../runtime.js");
var _links = require("../terminal/links.js");
var _theme = require("../terminal/theme.js");
var _utils = require("../utils.js");
var _cliUtils = require("./cli-utils.js");
var _progress = require("./progress.js");function _interopRequireDefault(e) {return e && e.__esModule ? e : { default: e };}
function formatSourceLabel(source, workspaceDir, agentId) {
  if (source === "memory") {
    return (0, _utils.shortenHomeInString)(`memory (MEMORY.md + ${_nodePath.default.join(workspaceDir, "memory")}${_nodePath.default.sep}*.md)`);
  }
  if (source === "sessions") {
    const stateDir = (0, _paths.resolveStateDir)(process.env, _nodeOs.default.homedir);
    return (0, _utils.shortenHomeInString)(`sessions (${_nodePath.default.join(stateDir, "agents", agentId, "sessions")}${_nodePath.default.sep}*.jsonl)`);
  }
  return source;
}
function resolveAgent(cfg, agent) {
  const trimmed = agent?.trim();
  if (trimmed) {
    return trimmed;
  }
  return (0, _agentScope.resolveDefaultAgentId)(cfg);
}
function resolveAgentIds(cfg, agent) {
  const trimmed = agent?.trim();
  if (trimmed) {
    return [trimmed];
  }
  const list = cfg.agents?.list ?? [];
  if (list.length > 0) {
    return list.map((entry) => entry.id).filter(Boolean);
  }
  return [(0, _agentScope.resolveDefaultAgentId)(cfg)];
}
function formatExtraPaths(workspaceDir, extraPaths) {
  return (0, _internal.normalizeExtraMemoryPaths)(workspaceDir, extraPaths).map((entry) => (0, _utils.shortenHomePath)(entry));
}
async function checkReadableFile(pathname) {
  try {
    await _promises.default.access(pathname, _nodeFs.default.constants.R_OK);
    return { exists: true };
  }
  catch (err) {
    const code = err.code;
    if (code === "ENOENT") {
      return { exists: false };
    }
    return {
      exists: true,
      issue: `${(0, _utils.shortenHomePath)(pathname)} not readable (${code ?? "error"})`
    };
  }
}
async function scanSessionFiles(agentId) {
  const issues = [];
  const sessionsDir = (0, _paths2.resolveSessionTranscriptsDirForAgent)(agentId);
  try {
    const entries = await _promises.default.readdir(sessionsDir, { withFileTypes: true });
    const totalFiles = entries.filter((entry) => entry.isFile() && entry.name.endsWith(".jsonl")).length;
    return { source: "sessions", totalFiles, issues };
  }
  catch (err) {
    const code = err.code;
    if (code === "ENOENT") {
      issues.push(`sessions directory missing (${(0, _utils.shortenHomePath)(sessionsDir)})`);
      return { source: "sessions", totalFiles: 0, issues };
    }
    issues.push(`sessions directory not accessible (${(0, _utils.shortenHomePath)(sessionsDir)}): ${code ?? "error"}`);
    return { source: "sessions", totalFiles: null, issues };
  }
}
async function scanMemoryFiles(workspaceDir, extraPaths = []) {
  const issues = [];
  const memoryFile = _nodePath.default.join(workspaceDir, "MEMORY.md");
  const altMemoryFile = _nodePath.default.join(workspaceDir, "memory.md");
  const memoryDir = _nodePath.default.join(workspaceDir, "memory");
  const primary = await checkReadableFile(memoryFile);
  const alt = await checkReadableFile(altMemoryFile);
  if (primary.issue) {
    issues.push(primary.issue);
  }
  if (alt.issue) {
    issues.push(alt.issue);
  }
  const resolvedExtraPaths = (0, _internal.normalizeExtraMemoryPaths)(workspaceDir, extraPaths);
  for (const extraPath of resolvedExtraPaths) {
    try {
      const stat = await _promises.default.lstat(extraPath);
      if (stat.isSymbolicLink()) {
        continue;
      }
      const extraCheck = await checkReadableFile(extraPath);
      if (extraCheck.issue) {
        issues.push(extraCheck.issue);
      }
    }
    catch (err) {
      const code = err.code;
      if (code === "ENOENT") {
        issues.push(`additional memory path missing (${(0, _utils.shortenHomePath)(extraPath)})`);
      } else
      {
        issues.push(`additional memory path not accessible (${(0, _utils.shortenHomePath)(extraPath)}): ${code ?? "error"}`);
      }
    }
  }
  let dirReadable = null;
  try {
    await _promises.default.access(memoryDir, _nodeFs.default.constants.R_OK);
    dirReadable = true;
  }
  catch (err) {
    const code = err.code;
    if (code === "ENOENT") {
      issues.push(`memory directory missing (${(0, _utils.shortenHomePath)(memoryDir)})`);
      dirReadable = false;
    } else
    {
      issues.push(`memory directory not accessible (${(0, _utils.shortenHomePath)(memoryDir)}): ${code ?? "error"}`);
      dirReadable = null;
    }
  }
  let listed = [];
  let listedOk = false;
  try {
    listed = await (0, _internal.listMemoryFiles)(workspaceDir, resolvedExtraPaths);
    listedOk = true;
  }
  catch (err) {
    const code = err.code;
    if (dirReadable !== null) {
      issues.push(`memory directory scan failed (${(0, _utils.shortenHomePath)(memoryDir)}): ${code ?? "error"}`);
      dirReadable = null;
    }
  }
  let totalFiles = 0;
  if (dirReadable === null) {
    totalFiles = null;
  } else
  {
    const files = new Set(listedOk ? listed : []);
    if (!listedOk) {
      if (primary.exists) {
        files.add(memoryFile);
      }
      if (alt.exists) {
        files.add(altMemoryFile);
      }
    }
    totalFiles = files.size;
  }
  if ((totalFiles ?? 0) === 0 && issues.length === 0) {
    issues.push(`no memory files found in ${(0, _utils.shortenHomePath)(workspaceDir)}`);
  }
  return { source: "memory", totalFiles, issues };
}
async function scanMemorySources(params) {
  const scans = [];
  const extraPaths = params.extraPaths ?? [];
  for (const source of params.sources) {
    if (source === "memory") {
      scans.push(await scanMemoryFiles(params.workspaceDir, extraPaths));
    }
    if (source === "sessions") {
      scans.push(await scanSessionFiles(params.agentId));
    }
  }
  const issues = scans.flatMap((scan) => scan.issues);
  const totals = scans.map((scan) => scan.totalFiles);
  const numericTotals = totals.filter((total) => total !== null);
  const totalFiles = totals.some((total) => total === null) ?
  null :
  numericTotals.reduce((sum, total) => sum + total, 0);
  return { sources: scans, totalFiles, issues };
}
async function runMemoryStatus(opts) {
  (0, _globals.setVerbose)(Boolean(opts.verbose));
  const cfg = (0, _config.loadConfig)();
  const agentIds = resolveAgentIds(cfg, opts.agent);
  const allResults = [];
  for (const agentId of agentIds) {
    await (0, _cliUtils.withManager)({
      getManager: () => (0, _index.getMemorySearchManager)({ cfg, agentId }),
      onMissing: (error) => _runtime.defaultRuntime.log(error ?? "Memory search disabled."),
      onCloseError: (err) => _runtime.defaultRuntime.error(`Memory manager close failed: ${(0, _cliUtils.formatErrorMessage)(err)}`),
      close: (manager) => manager.close(),
      run: async (manager) => {
        const deep = Boolean(opts.deep || opts.index);
        let embeddingProbe;
        let indexError;
        if (deep) {
          await (0, _progress.withProgress)({ label: "Checking memory…", total: 2 }, async (progress) => {
            progress.setLabel("Probing vector…");
            await manager.probeVectorAvailability();
            progress.tick();
            progress.setLabel("Probing embeddings…");
            embeddingProbe = await manager.probeEmbeddingAvailability();
            progress.tick();
          });
          if (opts.index) {
            await (0, _progress.withProgressTotals)({
              label: "Indexing memory…",
              total: 0,
              fallback: opts.verbose ? "line" : undefined
            }, async (update, progress) => {
              try {
                await manager.sync({
                  reason: "cli",
                  progress: (syncUpdate) => {
                    update({
                      completed: syncUpdate.completed,
                      total: syncUpdate.total,
                      label: syncUpdate.label
                    });
                    if (syncUpdate.label) {
                      progress.setLabel(syncUpdate.label);
                    }
                  }
                });
              }
              catch (err) {
                indexError = (0, _cliUtils.formatErrorMessage)(err);
                _runtime.defaultRuntime.error(`Memory index failed: ${indexError}`);
                process.exitCode = 1;
              }
            });
          }
        } else
        {
          await manager.probeVectorAvailability();
        }
        const status = manager.status();
        const sources = status.sources?.length ? status.sources : ["memory"];
        const scan = await scanMemorySources({
          workspaceDir: status.workspaceDir,
          agentId,
          sources,
          extraPaths: status.extraPaths
        });
        allResults.push({ agentId, status, embeddingProbe, indexError, scan });
      }
    });
  }
  if (opts.json) {
    _runtime.defaultRuntime.log(JSON.stringify(allResults, null, 2));
    return;
  }
  const rich = (0, _theme.isRich)();
  const heading = (text) => (0, _theme.colorize)(rich, _theme.theme.heading, text);
  const muted = (text) => (0, _theme.colorize)(rich, _theme.theme.muted, text);
  const info = (text) => (0, _theme.colorize)(rich, _theme.theme.info, text);
  const success = (text) => (0, _theme.colorize)(rich, _theme.theme.success, text);
  const warn = (text) => (0, _theme.colorize)(rich, _theme.theme.warn, text);
  const accent = (text) => (0, _theme.colorize)(rich, _theme.theme.accent, text);
  const label = (text) => muted(`${text}:`);
  for (const result of allResults) {
    const { agentId, status, embeddingProbe, indexError, scan } = result;
    const totalFiles = scan?.totalFiles ?? null;
    const indexedLabel = totalFiles === null ?
    `${status.files}/? files · ${status.chunks} chunks` :
    `${status.files}/${totalFiles} files · ${status.chunks} chunks`;
    if (opts.index) {
      const line = indexError ? `Memory index failed: ${indexError}` : "Memory index complete.";
      _runtime.defaultRuntime.log(line);
    }
    const extraPaths = formatExtraPaths(status.workspaceDir, status.extraPaths ?? []);
    const lines = [
    `${heading("Memory Search")} ${muted(`(${agentId})`)}`,
    `${label("Provider")} ${info(status.provider)} ${muted(`(requested: ${status.requestedProvider})`)}`,
    `${label("Model")} ${info(status.model)}`,
    status.sources?.length ? `${label("Sources")} ${info(status.sources.join(", "))}` : null,
    extraPaths.length ? `${label("Extra paths")} ${info(extraPaths.join(", "))}` : null,
    `${label("Indexed")} ${success(indexedLabel)}`,
    `${label("Dirty")} ${status.dirty ? warn("yes") : muted("no")}`,
    `${label("Store")} ${info((0, _utils.shortenHomePath)(status.dbPath))}`,
    `${label("Workspace")} ${info((0, _utils.shortenHomePath)(status.workspaceDir))}`].
    filter(Boolean);
    if (embeddingProbe) {
      const state = embeddingProbe.ok ? "ready" : "unavailable";
      const stateColor = embeddingProbe.ok ? _theme.theme.success : _theme.theme.warn;
      lines.push(`${label("Embeddings")} ${(0, _theme.colorize)(rich, stateColor, state)}`);
      if (embeddingProbe.error) {
        lines.push(`${label("Embeddings error")} ${warn(embeddingProbe.error)}`);
      }
    }
    if (status.sourceCounts?.length) {
      lines.push(label("By source"));
      for (const entry of status.sourceCounts) {
        const total = scan?.sources.find((scanEntry) => scanEntry.source === entry.source)?.totalFiles;
        const counts = total === null ?
        `${entry.files}/? files · ${entry.chunks} chunks` :
        `${entry.files}/${total} files · ${entry.chunks} chunks`;
        lines.push(`  ${accent(entry.source)} ${muted("·")} ${muted(counts)}`);
      }
    }
    if (status.fallback) {
      lines.push(`${label("Fallback")} ${warn(status.fallback.from)}`);
    }
    if (status.vector) {
      const vectorState = status.vector.enabled ?
      status.vector.available === undefined ?
      "unknown" :
      status.vector.available ?
      "ready" :
      "unavailable" :
      "disabled";
      const vectorColor = vectorState === "ready" ?
      _theme.theme.success :
      vectorState === "unavailable" ?
      _theme.theme.warn :
      _theme.theme.muted;
      lines.push(`${label("Vector")} ${(0, _theme.colorize)(rich, vectorColor, vectorState)}`);
      if (status.vector.dims) {
        lines.push(`${label("Vector dims")} ${info(String(status.vector.dims))}`);
      }
      if (status.vector.extensionPath) {
        lines.push(`${label("Vector path")} ${info((0, _utils.shortenHomePath)(status.vector.extensionPath))}`);
      }
      if (status.vector.loadError) {
        lines.push(`${label("Vector error")} ${warn(status.vector.loadError)}`);
      }
    }
    if (status.fts) {
      const ftsState = status.fts.enabled ?
      status.fts.available ?
      "ready" :
      "unavailable" :
      "disabled";
      const ftsColor = ftsState === "ready" ?
      _theme.theme.success :
      ftsState === "unavailable" ?
      _theme.theme.warn :
      _theme.theme.muted;
      lines.push(`${label("FTS")} ${(0, _theme.colorize)(rich, ftsColor, ftsState)}`);
      if (status.fts.error) {
        lines.push(`${label("FTS error")} ${warn(status.fts.error)}`);
      }
    }
    if (status.cache) {
      const cacheState = status.cache.enabled ? "enabled" : "disabled";
      const cacheColor = status.cache.enabled ? _theme.theme.success : _theme.theme.muted;
      const suffix = status.cache.enabled && typeof status.cache.entries === "number" ?
      ` (${status.cache.entries} entries)` :
      "";
      lines.push(`${label("Embedding cache")} ${(0, _theme.colorize)(rich, cacheColor, cacheState)}${suffix}`);
      if (status.cache.enabled && typeof status.cache.maxEntries === "number") {
        lines.push(`${label("Cache cap")} ${info(String(status.cache.maxEntries))}`);
      }
    }
    if (status.batch) {
      const batchState = status.batch.enabled ? "enabled" : "disabled";
      const batchColor = status.batch.enabled ? _theme.theme.success : _theme.theme.warn;
      const batchSuffix = ` (failures ${status.batch.failures}/${status.batch.limit})`;
      lines.push(`${label("Batch")} ${(0, _theme.colorize)(rich, batchColor, batchState)}${muted(batchSuffix)}`);
      if (status.batch.lastError) {
        lines.push(`${label("Batch error")} ${warn(status.batch.lastError)}`);
      }
    }
    if (status.fallback?.reason) {
      lines.push(muted(status.fallback.reason));
    }
    if (indexError) {
      lines.push(`${label("Index error")} ${warn(indexError)}`);
    }
    if (scan?.issues.length) {
      lines.push(label("Issues"));
      for (const issue of scan.issues) {
        lines.push(`  ${warn(issue)}`);
      }
    }
    _runtime.defaultRuntime.log(lines.join("\n"));
    _runtime.defaultRuntime.log("");
  }
}
function registerMemoryCli(program) {
  const memory = program.
  command("memory").
  description("Memory search tools").
  addHelpText("after", () => `\n${_theme.theme.muted("Docs:")} ${(0, _links.formatDocsLink)("/cli/memory", "docs.openclaw.ai/cli/memory")}\n`);
  memory.
  command("status").
  description("Show memory search index status").
  option("--agent <id>", "Agent id (default: default agent)").
  option("--json", "Print JSON").
  option("--deep", "Probe embedding provider availability").
  option("--index", "Reindex if dirty (implies --deep)").
  option("--verbose", "Verbose logging", false).
  action(async (opts) => {
    await runMemoryStatus(opts);
  });
  memory.
  command("index").
  description("Reindex memory files").
  option("--agent <id>", "Agent id (default: default agent)").
  option("--force", "Force full reindex", false).
  option("--verbose", "Verbose logging", false).
  action(async (opts) => {
    (0, _globals.setVerbose)(Boolean(opts.verbose));
    const cfg = (0, _config.loadConfig)();
    const agentIds = resolveAgentIds(cfg, opts.agent);
    for (const agentId of agentIds) {
      await (0, _cliUtils.withManager)({
        getManager: () => (0, _index.getMemorySearchManager)({ cfg, agentId }),
        onMissing: (error) => _runtime.defaultRuntime.log(error ?? "Memory search disabled."),
        onCloseError: (err) => _runtime.defaultRuntime.error(`Memory manager close failed: ${(0, _cliUtils.formatErrorMessage)(err)}`),
        close: (manager) => manager.close(),
        run: async (manager) => {
          try {
            if (opts.verbose) {
              const status = manager.status();
              const rich = (0, _theme.isRich)();
              const heading = (text) => (0, _theme.colorize)(rich, _theme.theme.heading, text);
              const muted = (text) => (0, _theme.colorize)(rich, _theme.theme.muted, text);
              const info = (text) => (0, _theme.colorize)(rich, _theme.theme.info, text);
              const warn = (text) => (0, _theme.colorize)(rich, _theme.theme.warn, text);
              const label = (text) => muted(`${text}:`);
              const sourceLabels = status.sources.map((source) => formatSourceLabel(source, status.workspaceDir, agentId));
              const extraPaths = formatExtraPaths(status.workspaceDir, status.extraPaths ?? []);
              const lines = [
              `${heading("Memory Index")} ${muted(`(${agentId})`)}`,
              `${label("Provider")} ${info(status.provider)} ${muted(`(requested: ${status.requestedProvider})`)}`,
              `${label("Model")} ${info(status.model)}`,
              sourceLabels.length ?
              `${label("Sources")} ${info(sourceLabels.join(", "))}` :
              null,
              extraPaths.length ?
              `${label("Extra paths")} ${info(extraPaths.join(", "))}` :
              null].
              filter(Boolean);
              if (status.fallback) {
                lines.push(`${label("Fallback")} ${warn(status.fallback.from)}`);
              }
              _runtime.defaultRuntime.log(lines.join("\n"));
              _runtime.defaultRuntime.log("");
            }
            const startedAt = Date.now();
            let lastLabel = "Indexing memory…";
            let lastCompleted = 0;
            let lastTotal = 0;
            const formatElapsed = () => {
              const elapsedMs = Math.max(0, Date.now() - startedAt);
              const seconds = Math.floor(elapsedMs / 1000);
              const minutes = Math.floor(seconds / 60);
              const remainingSeconds = seconds % 60;
              return `${minutes}:${String(remainingSeconds).padStart(2, "0")}`;
            };
            const formatEta = () => {
              if (lastTotal <= 0 || lastCompleted <= 0) {
                return null;
              }
              const elapsedMs = Math.max(1, Date.now() - startedAt);
              const rate = lastCompleted / elapsedMs;
              if (!Number.isFinite(rate) || rate <= 0) {
                return null;
              }
              const remainingMs = Math.max(0, (lastTotal - lastCompleted) / rate);
              const seconds = Math.floor(remainingMs / 1000);
              const minutes = Math.floor(seconds / 60);
              const remainingSeconds = seconds % 60;
              return `${minutes}:${String(remainingSeconds).padStart(2, "0")}`;
            };
            const buildLabel = () => {
              const elapsed = formatElapsed();
              const eta = formatEta();
              return eta ?
              `${lastLabel} · elapsed ${elapsed} · eta ${eta}` :
              `${lastLabel} · elapsed ${elapsed}`;
            };
            await (0, _progress.withProgressTotals)({
              label: "Indexing memory…",
              total: 0,
              fallback: opts.verbose ? "line" : undefined
            }, async (update, progress) => {
              const interval = setInterval(() => {
                progress.setLabel(buildLabel());
              }, 1000);
              try {
                await manager.sync({
                  reason: "cli",
                  force: opts.force,
                  progress: (syncUpdate) => {
                    if (syncUpdate.label) {
                      lastLabel = syncUpdate.label;
                    }
                    lastCompleted = syncUpdate.completed;
                    lastTotal = syncUpdate.total;
                    update({
                      completed: syncUpdate.completed,
                      total: syncUpdate.total,
                      label: buildLabel()
                    });
                    progress.setLabel(buildLabel());
                  }
                });
              } finally
              {
                clearInterval(interval);
              }
            });
            _runtime.defaultRuntime.log(`Memory index updated (${agentId}).`);
          }
          catch (err) {
            const message = (0, _cliUtils.formatErrorMessage)(err);
            _runtime.defaultRuntime.error(`Memory index failed (${agentId}): ${message}`);
            process.exitCode = 1;
          }
        }
      });
    }
  });
  memory.
  command("search").
  description("Search memory files").
  argument("<query>", "Search query").
  option("--agent <id>", "Agent id (default: default agent)").
  option("--max-results <n>", "Max results", (value) => Number(value)).
  option("--min-score <n>", "Minimum score", (value) => Number(value)).
  option("--json", "Print JSON").
  action(async (query, opts) => {
    const cfg = (0, _config.loadConfig)();
    const agentId = resolveAgent(cfg, opts.agent);
    await (0, _cliUtils.withManager)({
      getManager: () => (0, _index.getMemorySearchManager)({ cfg, agentId }),
      onMissing: (error) => _runtime.defaultRuntime.log(error ?? "Memory search disabled."),
      onCloseError: (err) => _runtime.defaultRuntime.error(`Memory manager close failed: ${(0, _cliUtils.formatErrorMessage)(err)}`),
      close: (manager) => manager.close(),
      run: async (manager) => {
        let results;
        try {
          results = await manager.search(query, {
            maxResults: opts.maxResults,
            minScore: opts.minScore
          });
        }
        catch (err) {
          const message = (0, _cliUtils.formatErrorMessage)(err);
          _runtime.defaultRuntime.error(`Memory search failed: ${message}`);
          process.exitCode = 1;
          return;
        }
        if (opts.json) {
          _runtime.defaultRuntime.log(JSON.stringify({ results }, null, 2));
          return;
        }
        if (results.length === 0) {
          _runtime.defaultRuntime.log("No matches.");
          return;
        }
        const rich = (0, _theme.isRich)();
        const lines = [];
        for (const result of results) {
          lines.push(`${(0, _theme.colorize)(rich, _theme.theme.success, result.score.toFixed(3))} ${(0, _theme.colorize)(rich, _theme.theme.accent, `${(0, _utils.shortenHomePath)(result.path)}:${result.startLine}-${result.endLine}`)}`);
          lines.push((0, _theme.colorize)(rich, _theme.theme.muted, result.snippet));
          lines.push("");
        }
        _runtime.defaultRuntime.log(lines.join("\n").trim());
      }
    });
  });
} /* v9-b1f30a797d9d2e28 */
