"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.listSandboxBrowsers = listSandboxBrowsers;exports.listSandboxContainers = listSandboxContainers;exports.removeSandboxBrowserContainer = removeSandboxBrowserContainer;exports.removeSandboxContainer = removeSandboxContainer;var _bridgeServer = require("../../browser/bridge-server.js");
var _config = require("../../config/config.js");
var _browserBridges = require("./browser-bridges.js");
var _config2 = require("./config.js");
var _docker = require("./docker.js");
var _registry = require("./registry.js");
var _shared = require("./shared.js");
async function listSandboxContainers() {
  const config = (0, _config.loadConfig)();
  const registry = await (0, _registry.readRegistry)();
  const results = [];
  for (const entry of registry.entries) {
    const state = await (0, _docker.dockerContainerState)(entry.containerName);
    // Get actual image from container
    let actualImage = entry.image;
    if (state.exists) {
      try {
        const result = await (0, _docker.execDocker)(["inspect", "-f", "{{.Config.Image}}", entry.containerName], { allowFailure: true });
        if (result.code === 0) {
          actualImage = result.stdout.trim();
        }
      }
      catch {

        // ignore
      }}
    const agentId = (0, _shared.resolveSandboxAgentId)(entry.sessionKey);
    const configuredImage = (0, _config2.resolveSandboxConfigForAgent)(config, agentId).docker.image;
    results.push({
      ...entry,
      image: actualImage,
      running: state.running,
      imageMatch: actualImage === configuredImage
    });
  }
  return results;
}
async function listSandboxBrowsers() {
  const config = (0, _config.loadConfig)();
  const registry = await (0, _registry.readBrowserRegistry)();
  const results = [];
  for (const entry of registry.entries) {
    const state = await (0, _docker.dockerContainerState)(entry.containerName);
    let actualImage = entry.image;
    if (state.exists) {
      try {
        const result = await (0, _docker.execDocker)(["inspect", "-f", "{{.Config.Image}}", entry.containerName], { allowFailure: true });
        if (result.code === 0) {
          actualImage = result.stdout.trim();
        }
      }
      catch {

        // ignore
      }}
    const agentId = (0, _shared.resolveSandboxAgentId)(entry.sessionKey);
    const configuredImage = (0, _config2.resolveSandboxConfigForAgent)(config, agentId).browser.image;
    results.push({
      ...entry,
      image: actualImage,
      running: state.running,
      imageMatch: actualImage === configuredImage
    });
  }
  return results;
}
async function removeSandboxContainer(containerName) {
  try {
    await (0, _docker.execDocker)(["rm", "-f", containerName], { allowFailure: true });
  }
  catch {

    // ignore removal failures
  }await (0, _registry.removeRegistryEntry)(containerName);
}
async function removeSandboxBrowserContainer(containerName) {
  try {
    await (0, _docker.execDocker)(["rm", "-f", containerName], { allowFailure: true });
  }
  catch {

    // ignore removal failures
  }await (0, _registry.removeBrowserRegistryEntry)(containerName);
  // Stop browser bridge if active
  for (const [sessionKey, bridge] of _browserBridges.BROWSER_BRIDGES.entries()) {
    if (bridge.containerName === containerName) {
      await (0, _bridgeServer.stopBrowserBridgeServer)(bridge.bridge.server).catch(() => undefined);
      _browserBridges.BROWSER_BRIDGES.delete(sessionKey);
    }
  }
} /* v9-fa1dfbcbc54c832f */
