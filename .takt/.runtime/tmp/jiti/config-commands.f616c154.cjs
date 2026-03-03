"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.isNativeCommandsExplicitlyDisabled = isNativeCommandsExplicitlyDisabled;exports.resolveNativeCommandsEnabled = resolveNativeCommandsEnabled;exports.resolveNativeSkillsEnabled = resolveNativeSkillsEnabled;var _index = require("../channels/plugins/index.js");
function resolveAutoDefault(providerId) {
  const id = (0, _index.normalizeChannelId)(providerId);
  if (!id) {
    return false;
  }
  if (id === "discord" || id === "telegram") {
    return true;
  }
  if (id === "slack") {
    return false;
  }
  return false;
}
function resolveNativeSkillsEnabled(params) {
  const { providerId, providerSetting, globalSetting } = params;
  const setting = providerSetting === undefined ? globalSetting : providerSetting;
  if (setting === true) {
    return true;
  }
  if (setting === false) {
    return false;
  }
  return resolveAutoDefault(providerId);
}
function resolveNativeCommandsEnabled(params) {
  const { providerId, providerSetting, globalSetting } = params;
  const setting = providerSetting === undefined ? globalSetting : providerSetting;
  if (setting === true) {
    return true;
  }
  if (setting === false) {
    return false;
  }
  // auto or undefined -> heuristic
  return resolveAutoDefault(providerId);
}
function isNativeCommandsExplicitlyDisabled(params) {
  const { providerSetting, globalSetting } = params;
  if (providerSetting === false) {
    return true;
  }
  if (providerSetting === undefined) {
    return globalSetting === false;
  }
  return false;
} /* v9-d229e51b90ba9a2d */
