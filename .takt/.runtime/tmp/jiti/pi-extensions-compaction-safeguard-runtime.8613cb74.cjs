"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.getCompactionSafeguardRuntime = getCompactionSafeguardRuntime;exports.setCompactionSafeguardRuntime = setCompactionSafeguardRuntime; // Session-scoped runtime registry keyed by object identity.
// Follows the same WeakMap pattern as context-pruning/runtime.ts.
const REGISTRY = new WeakMap();
function setCompactionSafeguardRuntime(sessionManager, value) {
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
function getCompactionSafeguardRuntime(sessionManager) {
  if (!sessionManager || typeof sessionManager !== "object") {
    return null;
  }
  return REGISTRY.get(sessionManager) ?? null;
} /* v9-54d5940d3b91fb88 */
