"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.listProfilesForProvider = listProfilesForProvider;exports.markAuthProfileGood = markAuthProfileGood;exports.setAuthProfileOrder = setAuthProfileOrder;exports.upsertAuthProfile = upsertAuthProfile;var _modelSelection = require("../model-selection.js");
var _store = require("./store.js");
async function setAuthProfileOrder(params) {
  const providerKey = (0, _modelSelection.normalizeProviderId)(params.provider);
  const sanitized = params.order && Array.isArray(params.order) ?
  params.order.map((entry) => String(entry).trim()).filter(Boolean) :
  [];
  const deduped = [];
  for (const entry of sanitized) {
    if (!deduped.includes(entry)) {
      deduped.push(entry);
    }
  }
  return await (0, _store.updateAuthProfileStoreWithLock)({
    agentDir: params.agentDir,
    updater: (store) => {
      store.order = store.order ?? {};
      if (deduped.length === 0) {
        if (!store.order[providerKey]) {
          return false;
        }
        delete store.order[providerKey];
        if (Object.keys(store.order).length === 0) {
          store.order = undefined;
        }
        return true;
      }
      store.order[providerKey] = deduped;
      return true;
    }
  });
}
function upsertAuthProfile(params) {
  const store = (0, _store.ensureAuthProfileStore)(params.agentDir);
  store.profiles[params.profileId] = params.credential;
  (0, _store.saveAuthProfileStore)(store, params.agentDir);
}
function listProfilesForProvider(store, provider) {
  const providerKey = (0, _modelSelection.normalizeProviderId)(provider);
  return Object.entries(store.profiles).
  filter(([, cred]) => (0, _modelSelection.normalizeProviderId)(cred.provider) === providerKey).
  map(([id]) => id);
}
async function markAuthProfileGood(params) {
  const { store, provider, profileId, agentDir } = params;
  const updated = await (0, _store.updateAuthProfileStoreWithLock)({
    agentDir,
    updater: (freshStore) => {
      const profile = freshStore.profiles[profileId];
      if (!profile || profile.provider !== provider) {
        return false;
      }
      freshStore.lastGood = { ...freshStore.lastGood, [provider]: profileId };
      return true;
    }
  });
  if (updated) {
    store.lastGood = updated.lastGood;
    return;
  }
  const profile = store.profiles[profileId];
  if (!profile || profile.provider !== provider) {
    return;
  }
  store.lastGood = { ...store.lastGood, [provider]: profileId };
  (0, _store.saveAuthProfileStore)(store, agentDir);
} /* v9-d0f0e8a56468bac2 */
