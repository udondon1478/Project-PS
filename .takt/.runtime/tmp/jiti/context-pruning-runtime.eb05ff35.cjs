"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.getContextPruningRuntime = getContextPruningRuntime;exports.setContextPruningRuntime = setContextPruningRuntime; // Session-scoped runtime registry keyed by object identity.
// Important: this relies on Pi passing the same SessionManager object instance into
// ExtensionContext (ctx.sessionManager) that we used when calling setContextPruningRuntime.
const REGISTRY = new WeakMap();
function setContextPruningRuntime(sessionManager, value) {
  if (!sessionManager || typeof sessionManager !== "object") {
    return;
  }
  const key = sessionManager;
  if (value === null) {
    REGISTRY.delete(key);
    return;
  }
  REGISTRY.set(key, value);
}
function getContextPruningRuntime(sessionManager) {
  if (!sessionManager || typeof sessionManager !== "object") {
    return null;
  }
  return REGISTRY.get(sessionManager) ?? null;
} /* v9-9877fbf88c88c664 */
