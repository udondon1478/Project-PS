"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.createBrowserTool = createBrowserTool;var _nodeCrypto = _interopRequireDefault(require("node:crypto"));
var _clientActions = require("../../browser/client-actions.js");
var _client = require("../../browser/client.js");
var _config = require("../../browser/config.js");
var _constants = require("../../browser/constants.js");
var _config2 = require("../../config/config.js");
var _store = require("../../media/store.js");
var _browserToolSchema = require("./browser-tool.schema.js");
var _common = require("./common.js");
var _gateway = require("./gateway.js");
var _nodesUtils = require("./nodes-utils.js");function _interopRequireDefault(e) {return e && e.__esModule ? e : { default: e };}
const DEFAULT_BROWSER_PROXY_TIMEOUT_MS = 20_000;
function isBrowserNode(node) {
  const caps = Array.isArray(node.caps) ? node.caps : [];
  const commands = Array.isArray(node.commands) ? node.commands : [];
  return caps.includes("browser") || commands.includes("browser.proxy");
}
async function resolveBrowserNodeTarget(params) {
  const cfg = (0, _config2.loadConfig)();
  const policy = cfg.gateway?.nodes?.browser;
  const mode = policy?.mode ?? "auto";
  if (mode === "off") {
    if (params.target === "node" || params.requestedNode) {
      throw new Error("Node browser proxy is disabled (gateway.nodes.browser.mode=off).");
    }
    return null;
  }
  if (params.sandboxBridgeUrl?.trim() && params.target !== "node" && !params.requestedNode) {
    return null;
  }
  if (params.target && params.target !== "node") {
    return null;
  }
  if (mode === "manual" && params.target !== "node" && !params.requestedNode) {
    return null;
  }
  const nodes = await (0, _nodesUtils.listNodes)({});
  const browserNodes = nodes.filter((node) => node.connected && isBrowserNode(node));
  if (browserNodes.length === 0) {
    if (params.target === "node" || params.requestedNode) {
      throw new Error("No connected browser-capable nodes.");
    }
    return null;
  }
  const requested = params.requestedNode?.trim() || policy?.node?.trim();
  if (requested) {
    const nodeId = (0, _nodesUtils.resolveNodeIdFromList)(browserNodes, requested, false);
    const node = browserNodes.find((entry) => entry.nodeId === nodeId);
    return { nodeId, label: node?.displayName ?? node?.remoteIp ?? nodeId };
  }
  if (params.target === "node") {
    if (browserNodes.length === 1) {
      const node = browserNodes[0];
      return { nodeId: node.nodeId, label: node.displayName ?? node.remoteIp ?? node.nodeId };
    }
    throw new Error(`Multiple browser-capable nodes connected (${browserNodes.length}). Set gateway.nodes.browser.node or pass node=<id>.`);
  }
  if (mode === "manual") {
    return null;
  }
  if (browserNodes.length === 1) {
    const node = browserNodes[0];
    return { nodeId: node.nodeId, label: node.displayName ?? node.remoteIp ?? node.nodeId };
  }
  return null;
}
async function callBrowserProxy(params) {
  const gatewayTimeoutMs = typeof params.timeoutMs === "number" && Number.isFinite(params.timeoutMs) ?
  Math.max(1, Math.floor(params.timeoutMs)) :
  DEFAULT_BROWSER_PROXY_TIMEOUT_MS;
  const payload = await (0, _gateway.callGatewayTool)("node.invoke", { timeoutMs: gatewayTimeoutMs }, {
    nodeId: params.nodeId,
    command: "browser.proxy",
    params: {
      method: params.method,
      path: params.path,
      query: params.query,
      body: params.body,
      timeoutMs: params.timeoutMs,
      profile: params.profile
    },
    idempotencyKey: _nodeCrypto.default.randomUUID()
  });
  const parsed = payload?.payload ?? (
  typeof payload?.payloadJSON === "string" && payload.payloadJSON ?
  JSON.parse(payload.payloadJSON) :
  null);
  if (!parsed || typeof parsed !== "object" || !("result" in parsed)) {
    throw new Error("browser proxy failed");
  }
  return parsed;
}
async function persistProxyFiles(files) {
  if (!files || files.length === 0) {
    return new Map();
  }
  const mapping = new Map();
  for (const file of files) {
    const buffer = Buffer.from(file.base64, "base64");
    const saved = await (0, _store.saveMediaBuffer)(buffer, file.mimeType, "browser", buffer.byteLength);
    mapping.set(file.path, saved.path);
  }
  return mapping;
}
function applyProxyPaths(result, mapping) {
  if (!result || typeof result !== "object") {
    return;
  }
  const obj = result;
  if (typeof obj.path === "string" && mapping.has(obj.path)) {
    obj.path = mapping.get(obj.path);
  }
  if (typeof obj.imagePath === "string" && mapping.has(obj.imagePath)) {
    obj.imagePath = mapping.get(obj.imagePath);
  }
  const download = obj.download;
  if (download && typeof download === "object") {
    const d = download;
    if (typeof d.path === "string" && mapping.has(d.path)) {
      d.path = mapping.get(d.path);
    }
  }
}
function resolveBrowserBaseUrl(params) {
  const cfg = (0, _config2.loadConfig)();
  const resolved = (0, _config.resolveBrowserConfig)(cfg.browser, cfg);
  const normalizedSandbox = params.sandboxBridgeUrl?.trim() ?? "";
  const target = params.target ?? (normalizedSandbox ? "sandbox" : "host");
  if (target === "sandbox") {
    if (!normalizedSandbox) {
      throw new Error('Sandbox browser is unavailable. Enable agents.defaults.sandbox.browser.enabled or use target="host" if allowed.');
    }
    return normalizedSandbox.replace(/\/$/, "");
  }
  if (params.allowHostControl === false) {
    throw new Error("Host browser control is disabled by sandbox policy.");
  }
  if (!resolved.enabled) {
    throw new Error("Browser control is disabled. Set browser.enabled=true in ~/.openclaw/openclaw.json.");
  }
  return undefined;
}
function createBrowserTool(opts) {
  const targetDefault = opts?.sandboxBridgeUrl ? "sandbox" : "host";
  const hostHint = opts?.allowHostControl === false ? "Host target blocked by policy." : "Host target allowed.";
  return {
    label: "Browser",
    name: "browser",
    description: [
    "Control the browser via OpenClaw's browser control server (status/start/stop/profiles/tabs/open/snapshot/screenshot/actions).",
    'Profiles: use profile="chrome" for Chrome extension relay takeover (your existing Chrome tabs). Use profile="openclaw" for the isolated openclaw-managed browser.',
    'If the user mentions the Chrome extension / Browser Relay / toolbar button / “attach tab”, ALWAYS use profile="chrome" (do not ask which profile).',
    'When a node-hosted browser proxy is available, the tool may auto-route to it. Pin a node with node=<id|name> or target="node".',
    "Chrome extension relay needs an attached tab: user must click the OpenClaw Browser Relay toolbar icon on the tab (badge ON). If no tab is connected, ask them to attach it.",
    "When using refs from snapshot (e.g. e12), keep the same tab: prefer passing targetId from the snapshot response into subsequent actions (act/click/type/etc).",
    'For stable, self-resolving refs across calls, use snapshot with refs="aria" (Playwright aria-ref ids). Default refs="role" are role+name-based.',
    "Use snapshot+act for UI automation. Avoid act:wait by default; use only in exceptional cases when no reliable UI state exists.",
    `target selects browser location (sandbox|host|node). Default: ${targetDefault}.`,
    hostHint].
    join(" "),
    parameters: _browserToolSchema.BrowserToolSchema,
    execute: async (_toolCallId, args) => {
      const params = args;
      const action = (0, _common.readStringParam)(params, "action", { required: true });
      const profile = (0, _common.readStringParam)(params, "profile");
      const requestedNode = (0, _common.readStringParam)(params, "node");
      let target = (0, _common.readStringParam)(params, "target");
      if (requestedNode && target && target !== "node") {
        throw new Error('node is only supported with target="node".');
      }
      if (!target && !requestedNode && profile === "chrome") {
        // Chrome extension relay takeover is a host Chrome feature; prefer host unless explicitly targeting a node.
        target = "host";
      }
      const nodeTarget = await resolveBrowserNodeTarget({
        requestedNode: requestedNode ?? undefined,
        target,
        sandboxBridgeUrl: opts?.sandboxBridgeUrl
      });
      const resolvedTarget = target === "node" ? undefined : target;
      const baseUrl = nodeTarget ?
      undefined :
      resolveBrowserBaseUrl({
        target: resolvedTarget,
        sandboxBridgeUrl: opts?.sandboxBridgeUrl,
        allowHostControl: opts?.allowHostControl
      });
      const proxyRequest = nodeTarget ?
      async (opts) => {
        const proxy = await callBrowserProxy({
          nodeId: nodeTarget.nodeId,
          method: opts.method,
          path: opts.path,
          query: opts.query,
          body: opts.body,
          timeoutMs: opts.timeoutMs,
          profile: opts.profile
        });
        const mapping = await persistProxyFiles(proxy.files);
        applyProxyPaths(proxy.result, mapping);
        return proxy.result;
      } :
      null;
      switch (action) {
        case "status":
          if (proxyRequest) {
            return (0, _common.jsonResult)(await proxyRequest({
              method: "GET",
              path: "/",
              profile
            }));
          }
          return (0, _common.jsonResult)(await (0, _client.browserStatus)(baseUrl, { profile }));
        case "start":
          if (proxyRequest) {
            await proxyRequest({
              method: "POST",
              path: "/start",
              profile
            });
            return (0, _common.jsonResult)(await proxyRequest({
              method: "GET",
              path: "/",
              profile
            }));
          }
          await (0, _client.browserStart)(baseUrl, { profile });
          return (0, _common.jsonResult)(await (0, _client.browserStatus)(baseUrl, { profile }));
        case "stop":
          if (proxyRequest) {
            await proxyRequest({
              method: "POST",
              path: "/stop",
              profile
            });
            return (0, _common.jsonResult)(await proxyRequest({
              method: "GET",
              path: "/",
              profile
            }));
          }
          await (0, _client.browserStop)(baseUrl, { profile });
          return (0, _common.jsonResult)(await (0, _client.browserStatus)(baseUrl, { profile }));
        case "profiles":
          if (proxyRequest) {
            const result = await proxyRequest({
              method: "GET",
              path: "/profiles"
            });
            return (0, _common.jsonResult)(result);
          }
          return (0, _common.jsonResult)({ profiles: await (0, _client.browserProfiles)(baseUrl) });
        case "tabs":
          if (proxyRequest) {
            const result = await proxyRequest({
              method: "GET",
              path: "/tabs",
              profile
            });
            const tabs = result.tabs ?? [];
            return (0, _common.jsonResult)({ tabs });
          }
          return (0, _common.jsonResult)({ tabs: await (0, _client.browserTabs)(baseUrl, { profile }) });
        case "open":{
            const targetUrl = (0, _common.readStringParam)(params, "targetUrl", {
              required: true
            });
            if (proxyRequest) {
              const result = await proxyRequest({
                method: "POST",
                path: "/tabs/open",
                profile,
                body: { url: targetUrl }
              });
              return (0, _common.jsonResult)(result);
            }
            return (0, _common.jsonResult)(await (0, _client.browserOpenTab)(baseUrl, targetUrl, { profile }));
          }
        case "focus":{
            const targetId = (0, _common.readStringParam)(params, "targetId", {
              required: true
            });
            if (proxyRequest) {
              const result = await proxyRequest({
                method: "POST",
                path: "/tabs/focus",
                profile,
                body: { targetId }
              });
              return (0, _common.jsonResult)(result);
            }
            await (0, _client.browserFocusTab)(baseUrl, targetId, { profile });
            return (0, _common.jsonResult)({ ok: true });
          }
        case "close":{
            const targetId = (0, _common.readStringParam)(params, "targetId");
            if (proxyRequest) {
              const result = targetId ?
              await proxyRequest({
                method: "DELETE",
                path: `/tabs/${encodeURIComponent(targetId)}`,
                profile
              }) :
              await proxyRequest({
                method: "POST",
                path: "/act",
                profile,
                body: { kind: "close" }
              });
              return (0, _common.jsonResult)(result);
            }
            if (targetId) {
              await (0, _client.browserCloseTab)(baseUrl, targetId, { profile });
            } else
            {
              await (0, _clientActions.browserAct)(baseUrl, { kind: "close" }, { profile });
            }
            return (0, _common.jsonResult)({ ok: true });
          }
        case "snapshot":{
            const snapshotDefaults = (0, _config2.loadConfig)().browser?.snapshotDefaults;
            const format = params.snapshotFormat === "ai" || params.snapshotFormat === "aria" ?
            params.snapshotFormat :
            "ai";
            const mode = params.mode === "efficient" ?
            "efficient" :
            format === "ai" && snapshotDefaults?.mode === "efficient" ?
            "efficient" :
            undefined;
            const labels = typeof params.labels === "boolean" ? params.labels : undefined;
            const refs = params.refs === "aria" || params.refs === "role" ? params.refs : undefined;
            const hasMaxChars = Object.hasOwn(params, "maxChars");
            const targetId = typeof params.targetId === "string" ? params.targetId.trim() : undefined;
            const limit = typeof params.limit === "number" && Number.isFinite(params.limit) ?
            params.limit :
            undefined;
            const maxChars = typeof params.maxChars === "number" &&
            Number.isFinite(params.maxChars) &&
            params.maxChars > 0 ?
            Math.floor(params.maxChars) :
            undefined;
            const resolvedMaxChars = format === "ai" ?
            hasMaxChars ?
            maxChars :
            mode === "efficient" ?
            undefined :
            _constants.DEFAULT_AI_SNAPSHOT_MAX_CHARS :
            undefined;
            const interactive = typeof params.interactive === "boolean" ? params.interactive : undefined;
            const compact = typeof params.compact === "boolean" ? params.compact : undefined;
            const depth = typeof params.depth === "number" && Number.isFinite(params.depth) ?
            params.depth :
            undefined;
            const selector = typeof params.selector === "string" ? params.selector.trim() : undefined;
            const frame = typeof params.frame === "string" ? params.frame.trim() : undefined;
            const snapshot = proxyRequest ?
            await proxyRequest({
              method: "GET",
              path: "/snapshot",
              profile,
              query: {
                format,
                targetId,
                limit,
                ...(typeof resolvedMaxChars === "number" ? { maxChars: resolvedMaxChars } : {}),
                refs,
                interactive,
                compact,
                depth,
                selector,
                frame,
                labels,
                mode
              }
            }) :
            await (0, _client.browserSnapshot)(baseUrl, {
              format,
              targetId,
              limit,
              ...(typeof resolvedMaxChars === "number" ? { maxChars: resolvedMaxChars } : {}),
              refs,
              interactive,
              compact,
              depth,
              selector,
              frame,
              labels,
              mode,
              profile
            });
            if (snapshot.format === "ai") {
              if (labels && snapshot.imagePath) {
                return await (0, _common.imageResultFromFile)({
                  label: "browser:snapshot",
                  path: snapshot.imagePath,
                  extraText: snapshot.snapshot,
                  details: snapshot
                });
              }
              return {
                content: [{ type: "text", text: snapshot.snapshot }],
                details: snapshot
              };
            }
            return (0, _common.jsonResult)(snapshot);
          }
        case "screenshot":{
            const targetId = (0, _common.readStringParam)(params, "targetId");
            const fullPage = Boolean(params.fullPage);
            const ref = (0, _common.readStringParam)(params, "ref");
            const element = (0, _common.readStringParam)(params, "element");
            const type = params.type === "jpeg" ? "jpeg" : "png";
            const result = proxyRequest ?
            await proxyRequest({
              method: "POST",
              path: "/screenshot",
              profile,
              body: {
                targetId,
                fullPage,
                ref,
                element,
                type
              }
            }) :
            await (0, _clientActions.browserScreenshotAction)(baseUrl, {
              targetId,
              fullPage,
              ref,
              element,
              type,
              profile
            });
            return await (0, _common.imageResultFromFile)({
              label: "browser:screenshot",
              path: result.path,
              details: result
            });
          }
        case "navigate":{
            const targetUrl = (0, _common.readStringParam)(params, "targetUrl", {
              required: true
            });
            const targetId = (0, _common.readStringParam)(params, "targetId");
            if (proxyRequest) {
              const result = await proxyRequest({
                method: "POST",
                path: "/navigate",
                profile,
                body: {
                  url: targetUrl,
                  targetId
                }
              });
              return (0, _common.jsonResult)(result);
            }
            return (0, _common.jsonResult)(await (0, _clientActions.browserNavigate)(baseUrl, {
              url: targetUrl,
              targetId,
              profile
            }));
          }
        case "console":{
            const level = typeof params.level === "string" ? params.level.trim() : undefined;
            const targetId = typeof params.targetId === "string" ? params.targetId.trim() : undefined;
            if (proxyRequest) {
              const result = await proxyRequest({
                method: "GET",
                path: "/console",
                profile,
                query: {
                  level,
                  targetId
                }
              });
              return (0, _common.jsonResult)(result);
            }
            return (0, _common.jsonResult)(await (0, _clientActions.browserConsoleMessages)(baseUrl, { level, targetId, profile }));
          }
        case "pdf":{
            const targetId = typeof params.targetId === "string" ? params.targetId.trim() : undefined;
            const result = proxyRequest ?
            await proxyRequest({
              method: "POST",
              path: "/pdf",
              profile,
              body: { targetId }
            }) :
            await (0, _clientActions.browserPdfSave)(baseUrl, { targetId, profile });
            return {
              content: [{ type: "text", text: `FILE:${result.path}` }],
              details: result
            };
          }
        case "upload":{
            const paths = Array.isArray(params.paths) ? params.paths.map((p) => String(p)) : [];
            if (paths.length === 0) {
              throw new Error("paths required");
            }
            const ref = (0, _common.readStringParam)(params, "ref");
            const inputRef = (0, _common.readStringParam)(params, "inputRef");
            const element = (0, _common.readStringParam)(params, "element");
            const targetId = typeof params.targetId === "string" ? params.targetId.trim() : undefined;
            const timeoutMs = typeof params.timeoutMs === "number" && Number.isFinite(params.timeoutMs) ?
            params.timeoutMs :
            undefined;
            if (proxyRequest) {
              const result = await proxyRequest({
                method: "POST",
                path: "/hooks/file-chooser",
                profile,
                body: {
                  paths,
                  ref,
                  inputRef,
                  element,
                  targetId,
                  timeoutMs
                }
              });
              return (0, _common.jsonResult)(result);
            }
            return (0, _common.jsonResult)(await (0, _clientActions.browserArmFileChooser)(baseUrl, {
              paths,
              ref,
              inputRef,
              element,
              targetId,
              timeoutMs,
              profile
            }));
          }
        case "dialog":{
            const accept = Boolean(params.accept);
            const promptText = typeof params.promptText === "string" ? params.promptText : undefined;
            const targetId = typeof params.targetId === "string" ? params.targetId.trim() : undefined;
            const timeoutMs = typeof params.timeoutMs === "number" && Number.isFinite(params.timeoutMs) ?
            params.timeoutMs :
            undefined;
            if (proxyRequest) {
              const result = await proxyRequest({
                method: "POST",
                path: "/hooks/dialog",
                profile,
                body: {
                  accept,
                  promptText,
                  targetId,
                  timeoutMs
                }
              });
              return (0, _common.jsonResult)(result);
            }
            return (0, _common.jsonResult)(await (0, _clientActions.browserArmDialog)(baseUrl, {
              accept,
              promptText,
              targetId,
              timeoutMs,
              profile
            }));
          }
        case "act":{
            const request = params.request;
            if (!request || typeof request !== "object") {
              throw new Error("request required");
            }
            try {
              const result = proxyRequest ?
              await proxyRequest({
                method: "POST",
                path: "/act",
                profile,
                body: request
              }) :
              await (0, _clientActions.browserAct)(baseUrl, request, {
                profile
              });
              return (0, _common.jsonResult)(result);
            }
            catch (err) {
              const msg = String(err);
              if (msg.includes("404:") && msg.includes("tab not found") && profile === "chrome") {
                const tabs = proxyRequest ?
                (await proxyRequest({
                  method: "GET",
                  path: "/tabs",
                  profile
                })).tabs ?? [] :
                await (0, _client.browserTabs)(baseUrl, { profile }).catch(() => []);
                if (!tabs.length) {
                  throw new Error("No Chrome tabs are attached via the OpenClaw Browser Relay extension. Click the toolbar icon on the tab you want to control (badge ON), then retry.", { cause: err });
                }
                throw new Error(`Chrome tab not found (stale targetId?). Run action=tabs profile="chrome" and use one of the returned targetIds.`, { cause: err });
              }
              throw err;
            }
          }
        default:
          throw new Error(`Unknown action: ${action}`);
      }
    }
  };
} /* v9-dfbf74cfaf79ab0b */
