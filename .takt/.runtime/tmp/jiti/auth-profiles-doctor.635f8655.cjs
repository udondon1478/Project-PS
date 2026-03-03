"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.formatAuthDoctorHint = formatAuthDoctorHint;var _commandFormat = require("../../cli/command-format.js");
var _modelSelection = require("../model-selection.js");
var _profiles = require("./profiles.js");
var _repair = require("./repair.js");
function formatAuthDoctorHint(params) {
  const providerKey = (0, _modelSelection.normalizeProviderId)(params.provider);
  if (providerKey !== "anthropic") {
    return "";
  }
  const legacyProfileId = params.profileId ?? "anthropic:default";
  const suggested = (0, _repair.suggestOAuthProfileIdForLegacyDefault)({
    cfg: params.cfg,
    store: params.store,
    provider: providerKey,
    legacyProfileId
  });
  if (!suggested || suggested === legacyProfileId) {
    return "";
  }
  const storeOauthProfiles = (0, _profiles.listProfilesForProvider)(params.store, providerKey).
  filter((id) => params.store.profiles[id]?.type === "oauth").
  join(", ");
  const cfgMode = params.cfg?.auth?.profiles?.[legacyProfileId]?.mode;
  const cfgProvider = params.cfg?.auth?.profiles?.[legacyProfileId]?.provider;
  return [
  "Doctor hint (for GitHub issue):",
  `- provider: ${providerKey}`,
  `- config: ${legacyProfileId}${cfgProvider || cfgMode ? ` (provider=${cfgProvider ?? "?"}, mode=${cfgMode ?? "?"})` : ""}`,
  `- auth store oauth profiles: ${storeOauthProfiles || "(none)"}`,
  `- suggested profile: ${suggested}`,
  `Fix: run "${(0, _commandFormat.formatCliCommand)("openclaw doctor --yes")}"`].
  join("\n");
} /* v9-fbaa76a81552482d */
