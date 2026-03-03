"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.applyLegacyMigrations = applyLegacyMigrations;exports.findLegacyConfigIssues = findLegacyConfigIssues;var _legacyMigrations = require("./legacy.migrations.js");
var _legacyRules = require("./legacy.rules.js");
function findLegacyConfigIssues(raw) {
  if (!raw || typeof raw !== "object") {
    return [];
  }
  const root = raw;
  const issues = [];
  for (const rule of _legacyRules.LEGACY_CONFIG_RULES) {
    let cursor = root;
    for (const key of rule.path) {
      if (!cursor || typeof cursor !== "object") {
        cursor = undefined;
        break;
      }
      cursor = cursor[key];
    }
    if (cursor !== undefined && (!rule.match || rule.match(cursor, root))) {
      issues.push({ path: rule.path.join("."), message: rule.message });
    }
  }
  return issues;
}
function applyLegacyMigrations(raw) {
  if (!raw || typeof raw !== "object") {
    return { next: null, changes: [] };
  }
  const next = structuredClone(raw);
  const changes = [];
  for (const migration of _legacyMigrations.LEGACY_CONFIG_MIGRATIONS) {
    migration.apply(next, changes);
  }
  if (changes.length === 0) {
    return { next: null, changes: [] };
  }
  return { next, changes };
} /* v9-aae60ca46164ea53 */
