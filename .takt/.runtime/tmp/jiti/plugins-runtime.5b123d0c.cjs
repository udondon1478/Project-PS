"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.getActivePluginRegistry = getActivePluginRegistry;exports.getActivePluginRegistryKey = getActivePluginRegistryKey;exports.requireActivePluginRegistry = requireActivePluginRegistry;exports.setActivePluginRegistry = setActivePluginRegistry;const createEmptyRegistry = () => ({
  plugins: [],
  tools: [],
  hooks: [],
  typedHooks: [],
  channels: [],
  providers: [],
  gatewayHandlers: {},
  httpHandlers: [],
  httpRoutes: [],
  cliRegistrars: [],
  services: [],
  commands: [],
  diagnostics: []
});
const REGISTRY_STATE = Symbol.for("openclaw.pluginRegistryState");
const state = (() => {
  const globalState = globalThis;
  if (!globalState[REGISTRY_STATE]) {
    globalState[REGISTRY_STATE] = {
      registry: createEmptyRegistry(),
      key: null
    };
  }
  return globalState[REGISTRY_STATE];
})();
function setActivePluginRegistry(registry, cacheKey) {
  state.registry = registry;
  state.key = cacheKey ?? null;
}
function getActivePluginRegistry() {
  return state.registry;
}
function requireActivePluginRegistry() {
  if (!state.registry) {
    state.registry = createEmptyRegistry();
  }
  return state.registry;
}
function getActivePluginRegistryKey() {
  return state.key;
} /* v9-c5064591d8090371 */
