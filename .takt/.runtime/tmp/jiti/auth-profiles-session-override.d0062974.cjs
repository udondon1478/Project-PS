"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.clearSessionAuthProfileOverride = clearSessionAuthProfileOverride;exports.resolveSessionAuthProfileOverride = resolveSessionAuthProfileOverride;var _sessions = require("../../config/sessions.js");
var _authProfiles = require("../auth-profiles.js");
var _modelSelection = require("../model-selection.js");
function isProfileForProvider(params) {
  const entry = params.store.profiles[params.profileId];
  if (!entry?.provider) {
    return false;
  }
  return (0, _modelSelection.normalizeProviderId)(entry.provider) === (0, _modelSelection.normalizeProviderId)(params.provider);
}
async function clearSessionAuthProfileOverride(params) {
  const { sessionEntry, sessionStore, sessionKey, storePath } = params;
  delete sessionEntry.authProfileOverride;
  delete sessionEntry.authProfileOverrideSource;
  delete sessionEntry.authProfileOverrideCompactionCount;
  sessionEntry.updatedAt = Date.now();
  sessionStore[sessionKey] = sessionEntry;
  if (storePath) {
    await (0, _sessions.updateSessionStore)(storePath, (store) => {
      store[sessionKey] = sessionEntry;
    });
  }
}
async function resolveSessionAuthProfileOverride(params) {
  const { cfg, provider, agentDir, sessionEntry, sessionStore, sessionKey, storePath, isNewSession } = params;
  if (!sessionEntry || !sessionStore || !sessionKey) {
    return sessionEntry?.authProfileOverride;
  }
  const store = (0, _authProfiles.ensureAuthProfileStore)(agentDir, { allowKeychainPrompt: false });
  const order = (0, _authProfiles.resolveAuthProfileOrder)({ cfg, store, provider });
  let current = sessionEntry.authProfileOverride?.trim();
  if (current && !store.profiles[current]) {
    await clearSessionAuthProfileOverride({ sessionEntry, sessionStore, sessionKey, storePath });
    current = undefined;
  }
  if (current && !isProfileForProvider({ provider, profileId: current, store })) {
    await clearSessionAuthProfileOverride({ sessionEntry, sessionStore, sessionKey, storePath });
    current = undefined;
  }
  if (current && order.length > 0 && !order.includes(current)) {
    await clearSessionAuthProfileOverride({ sessionEntry, sessionStore, sessionKey, storePath });
    current = undefined;
  }
  if (order.length === 0) {
    return undefined;
  }
  const pickFirstAvailable = () => order.find((profileId) => !(0, _authProfiles.isProfileInCooldown)(store, profileId)) ?? order[0];
  const pickNextAvailable = (active) => {
    const startIndex = order.indexOf(active);
    if (startIndex < 0) {
      return pickFirstAvailable();
    }
    for (let offset = 1; offset <= order.length; offset += 1) {
      const candidate = order[(startIndex + offset) % order.length];
      if (!(0, _authProfiles.isProfileInCooldown)(store, candidate)) {
        return candidate;
      }
    }
    return order[startIndex] ?? order[0];
  };
  const compactionCount = sessionEntry.compactionCount ?? 0;
  const storedCompaction = typeof sessionEntry.authProfileOverrideCompactionCount === "number" ?
  sessionEntry.authProfileOverrideCompactionCount :
  compactionCount;
  const source = sessionEntry.authProfileOverrideSource ?? (
  typeof sessionEntry.authProfileOverrideCompactionCount === "number" ?
  "auto" :
  current ?
  "user" :
  undefined);
  if (source === "user" && current && !isNewSession) {
    return current;
  }
  let next = current;
  if (isNewSession) {
    next = current ? pickNextAvailable(current) : pickFirstAvailable();
  } else
  if (current && compactionCount > storedCompaction) {
    next = pickNextAvailable(current);
  } else
  if (!current || (0, _authProfiles.isProfileInCooldown)(store, current)) {
    next = pickFirstAvailable();
  }
  if (!next) {
    return current;
  }
  const shouldPersist = next !== sessionEntry.authProfileOverride ||
  sessionEntry.authProfileOverrideSource !== "auto" ||
  sessionEntry.authProfileOverrideCompactionCount !== compactionCount;
  if (shouldPersist) {
    sessionEntry.authProfileOverride = next;
    sessionEntry.authProfileOverrideSource = "auto";
    sessionEntry.authProfileOverrideCompactionCount = compactionCount;
    sessionEntry.updatedAt = Date.now();
    sessionStore[sessionKey] = sessionEntry;
    if (storePath) {
      await (0, _sessions.updateSessionStore)(storePath, (store) => {
        store[sessionKey] = sessionEntry;
      });
    }
  }
  return next;
} /* v9-4448c389bc7da76d */
