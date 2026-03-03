"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.ensureDockerContainerIsRunning = ensureDockerContainerIsRunning;exports.maybePruneSandboxes = maybePruneSandboxes;var _bridgeServer = require("../../browser/bridge-server.js");
var _runtime = require("../../runtime.js");
var _browserBridges = require("./browser-bridges.js");
var _docker = require("./docker.js");
var _registry = require("./registry.js");
let lastPruneAtMs = 0;
async function pruneSandboxContainers(cfg) {
  const now = Date.now();
  const idleHours = cfg.prune.idleHours;
  const maxAgeDays = cfg.prune.maxAgeDays;
  if (idleHours === 0 && maxAgeDays === 0) {
    return;
  }
  const registry = await (0, _registry.readRegistry)();
  for (const entry of registry.entries) {
    const idleMs = now - entry.lastUsedAtMs;
    const ageMs = now - entry.createdAtMs;
    if (idleHours > 0 && idleMs > idleHours * 60 * 60 * 1000 ||
    maxAgeDays > 0 && ageMs > maxAgeDays * 24 * 60 * 60 * 1000) {
      try {
        await (0, _docker.execDocker)(["rm", "-f", entry.containerName], {
          allowFailure: true
        });
      }
      catch {

        // ignore prune failures
      } finally {
        await (0, _registry.removeRegistryEntry)(entry.containerName);
      }
    }
  }
}
async function pruneSandboxBrowsers(cfg) {
  const now = Date.now();
  const idleHours = cfg.prune.idleHours;
  const maxAgeDays = cfg.prune.maxAgeDays;
  if (idleHours === 0 && maxAgeDays === 0) {
    return;
  }
  const registry = await (0, _registry.readBrowserRegistry)();
  for (const entry of registry.entries) {
    const idleMs = now - entry.lastUsedAtMs;
    const ageMs = now - entry.createdAtMs;
    if (idleHours > 0 && idleMs > idleHours * 60 * 60 * 1000 ||
    maxAgeDays > 0 && ageMs > maxAgeDays * 24 * 60 * 60 * 1000) {
      try {
        await (0, _docker.execDocker)(["rm", "-f", entry.containerName], {
          allowFailure: true
        });
      }
      catch {

        // ignore prune failures
      } finally {
        await (0, _registry.removeBrowserRegistryEntry)(entry.containerName);
        const bridge = _browserBridges.BROWSER_BRIDGES.get(entry.sessionKey);
        if (bridge?.containerName === entry.containerName) {
          await (0, _bridgeServer.stopBrowserBridgeServer)(bridge.bridge.server).catch(() => undefined);
          _browserBridges.BROWSER_BRIDGES.delete(entry.sessionKey);
        }
      }
    }
  }
}
async function maybePruneSandboxes(cfg) {
  const now = Date.now();
  if (now - lastPruneAtMs < 5 * 60 * 1000) {
    return;
  }
  lastPruneAtMs = now;
  try {
    await pruneSandboxContainers(cfg);
    await pruneSandboxBrowsers(cfg);
  }
  catch (error) {
    const message = error instanceof Error ?
    error.message :
    typeof error === "string" ?
    error :
    JSON.stringify(error);
    _runtime.defaultRuntime.error?.(`Sandbox prune failed: ${message ?? "unknown error"}`);
  }
}
async function ensureDockerContainerIsRunning(containerName) {
  const state = await (0, _docker.dockerContainerState)(containerName);
  if (state.exists && !state.running) {
    await (0, _docker.execDocker)(["start", containerName]);
  }
} /* v9-964538a2ff63cb91 */
