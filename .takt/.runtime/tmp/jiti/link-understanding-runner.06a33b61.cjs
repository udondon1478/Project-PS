"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.runLinkUnderstanding = runLinkUnderstanding;var _templating = require("../auto-reply/templating.js");
var _globals = require("../globals.js");
var _defaults = require("../media-understanding/defaults.js");
var _resolve = require("../media-understanding/resolve.js");
var _scope = require("../media-understanding/scope.js");
var _exec = require("../process/exec.js");
var _defaults2 = require("./defaults.js");
var _detect = require("./detect.js");
function resolveScopeDecision(params) {
  return (0, _scope.resolveMediaUnderstandingScope)({
    scope: params.config?.scope,
    sessionKey: params.ctx.SessionKey,
    channel: params.ctx.Surface ?? params.ctx.Provider,
    chatType: (0, _scope.normalizeMediaUnderstandingChatType)(params.ctx.ChatType)
  });
}
function resolveTimeoutMsFromConfig(params) {
  const configured = params.entry.timeoutSeconds ?? params.config?.timeoutSeconds;
  return (0, _resolve.resolveTimeoutMs)(configured, _defaults2.DEFAULT_LINK_TIMEOUT_SECONDS);
}
async function runCliEntry(params) {
  if ((params.entry.type ?? "cli") !== "cli") {
    return null;
  }
  const command = params.entry.command.trim();
  if (!command) {
    return null;
  }
  const args = params.entry.args ?? [];
  const timeoutMs = resolveTimeoutMsFromConfig({ config: params.config, entry: params.entry });
  const templCtx = {
    ...params.ctx,
    LinkUrl: params.url
  };
  const argv = [command, ...args].map((part, index) => index === 0 ? part : (0, _templating.applyTemplate)(part, templCtx));
  if ((0, _globals.shouldLogVerbose)()) {
    (0, _globals.logVerbose)(`Link understanding via CLI: ${argv.join(" ")}`);
  }
  const { stdout } = await (0, _exec.runExec)(argv[0], argv.slice(1), {
    timeoutMs,
    maxBuffer: _defaults.CLI_OUTPUT_MAX_BUFFER
  });
  const trimmed = stdout.trim();
  return trimmed || null;
}
async function runLinkEntries(params) {
  let lastError;
  for (const entry of params.entries) {
    try {
      const output = await runCliEntry({
        entry,
        ctx: params.ctx,
        url: params.url,
        config: params.config
      });
      if (output) {
        return output;
      }
    }
    catch (err) {
      lastError = err;
      if ((0, _globals.shouldLogVerbose)()) {
        (0, _globals.logVerbose)(`Link understanding failed for ${params.url}: ${String(err)}`);
      }
    }
  }
  if (lastError && (0, _globals.shouldLogVerbose)()) {
    (0, _globals.logVerbose)(`Link understanding exhausted for ${params.url}`);
  }
  return null;
}
async function runLinkUnderstanding(params) {
  const config = params.cfg.tools?.links;
  if (!config || config.enabled === false) {
    return { urls: [], outputs: [] };
  }
  const scopeDecision = resolveScopeDecision({ config, ctx: params.ctx });
  if (scopeDecision === "deny") {
    if ((0, _globals.shouldLogVerbose)()) {
      (0, _globals.logVerbose)("Link understanding disabled by scope policy.");
    }
    return { urls: [], outputs: [] };
  }
  const message = params.message ?? params.ctx.CommandBody ?? params.ctx.RawBody ?? params.ctx.Body;
  const links = (0, _detect.extractLinksFromMessage)(message ?? "", { maxLinks: config?.maxLinks });
  if (links.length === 0) {
    return { urls: [], outputs: [] };
  }
  const entries = config?.models ?? [];
  if (entries.length === 0) {
    return { urls: links, outputs: [] };
  }
  const outputs = [];
  for (const url of links) {
    const output = await runLinkEntries({
      entries,
      ctx: params.ctx,
      url,
      config
    });
    if (output) {
      outputs.push(output);
    }
  }
  return { urls: links, outputs };
} /* v9-4b832763f3bfb4bc */
