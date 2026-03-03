"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.applySkillEnvOverrides = applySkillEnvOverrides;exports.applySkillEnvOverridesFromSnapshot = applySkillEnvOverridesFromSnapshot;var _config = require("./config.js");
var _frontmatter = require("./frontmatter.js");
function applySkillEnvOverrides(params) {
  const { skills, config } = params;
  const updates = [];
  for (const entry of skills) {
    const skillKey = (0, _frontmatter.resolveSkillKey)(entry.skill, entry);
    const skillConfig = (0, _config.resolveSkillConfig)(config, skillKey);
    if (!skillConfig) {
      continue;
    }
    if (skillConfig.env) {
      for (const [envKey, envValue] of Object.entries(skillConfig.env)) {
        if (!envValue || process.env[envKey]) {
          continue;
        }
        updates.push({ key: envKey, prev: process.env[envKey] });
        process.env[envKey] = envValue;
      }
    }
    const primaryEnv = entry.metadata?.primaryEnv;
    if (primaryEnv && skillConfig.apiKey && !process.env[primaryEnv]) {
      updates.push({ key: primaryEnv, prev: process.env[primaryEnv] });
      process.env[primaryEnv] = skillConfig.apiKey;
    }
  }
  return () => {
    for (const update of updates) {
      if (update.prev === undefined) {
        delete process.env[update.key];
      } else
      {
        process.env[update.key] = update.prev;
      }
    }
  };
}
function applySkillEnvOverridesFromSnapshot(params) {
  const { snapshot, config } = params;
  if (!snapshot) {
    return () => {};
  }
  const updates = [];
  for (const skill of snapshot.skills) {
    const skillConfig = (0, _config.resolveSkillConfig)(config, skill.name);
    if (!skillConfig) {
      continue;
    }
    if (skillConfig.env) {
      for (const [envKey, envValue] of Object.entries(skillConfig.env)) {
        if (!envValue || process.env[envKey]) {
          continue;
        }
        updates.push({ key: envKey, prev: process.env[envKey] });
        process.env[envKey] = envValue;
      }
    }
    if (skill.primaryEnv && skillConfig.apiKey && !process.env[skill.primaryEnv]) {
      updates.push({
        key: skill.primaryEnv,
        prev: process.env[skill.primaryEnv]
      });
      process.env[skill.primaryEnv] = skillConfig.apiKey;
    }
  }
  return () => {
    for (const update of updates) {
      if (update.prev === undefined) {
        delete process.env[update.key];
      } else
      {
        process.env[update.key] = update.prev;
      }
    }
  };
} /* v9-b01dd0d0aa10d720 */
