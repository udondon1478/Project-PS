"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.getGlobalHookRunner = getGlobalHookRunner;exports.getGlobalPluginRegistry = getGlobalPluginRegistry;exports.hasGlobalHooks = hasGlobalHooks;exports.initializeGlobalHookRunner = initializeGlobalHookRunner;exports.resetGlobalHookRunner = resetGlobalHookRunner;





var _subsystem = require("../logging/subsystem.js");
var _hooks = require("./hooks.js"); /**
 * Global Plugin Hook Runner
 *
 * Singleton hook runner that's initialized when plugins are loaded
 * and can be called from anywhere in the codebase.
 */const log = (0, _subsystem.createSubsystemLogger)("plugins");let globalHookRunner = null;let globalRegistry = null; /**
 * Initialize the global hook runner with a plugin registry.
 * Called once when plugins are loaded during gateway startup.
 */function initializeGlobalHookRunner(registry) {
  globalRegistry = registry;
  globalHookRunner = (0, _hooks.createHookRunner)(registry, {
    logger: {
      debug: (msg) => log.debug(msg),
      warn: (msg) => log.warn(msg),
      error: (msg) => log.error(msg)
    },
    catchErrors: true
  });
  const hookCount = registry.hooks.length;
  if (hookCount > 0) {
    log.info(`hook runner initialized with ${hookCount} registered hooks`);
  }
}
/**
 * Get the global hook runner.
 * Returns null if plugins haven't been loaded yet.
 */
function getGlobalHookRunner() {
  return globalHookRunner;
}
/**
 * Get the global plugin registry.
 * Returns null if plugins haven't been loaded yet.
 */
function getGlobalPluginRegistry() {
  return globalRegistry;
}
/**
 * Check if any hooks are registered for a given hook name.
 */
function hasGlobalHooks(hookName) {
  return globalHookRunner?.hasHooks(hookName) ?? false;
}
/**
 * Reset the global hook runner (for testing).
 */
function resetGlobalHookRunner() {
  globalHookRunner = null;
  globalRegistry = null;
} /* v9-5f545ca29c578a54 */
