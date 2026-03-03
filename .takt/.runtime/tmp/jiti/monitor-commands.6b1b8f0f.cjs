"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.buildSlackSlashCommandMatcher = buildSlackSlashCommandMatcher;exports.normalizeSlackSlashCommandName = normalizeSlackSlashCommandName;exports.resolveSlackSlashCommandConfig = resolveSlackSlashCommandConfig;function normalizeSlackSlashCommandName(raw) {
  return raw.replace(/^\/+/, "");
}
function resolveSlackSlashCommandConfig(raw) {
  const normalizedName = normalizeSlackSlashCommandName(raw?.name?.trim() || "openclaw");
  const name = normalizedName || "openclaw";
  return {
    enabled: raw?.enabled === true,
    name,
    sessionPrefix: raw?.sessionPrefix?.trim() || "slack:slash",
    ephemeral: raw?.ephemeral !== false
  };
}
function buildSlackSlashCommandMatcher(name) {
  const normalized = normalizeSlackSlashCommandName(name);
  const escaped = normalized.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`^/?${escaped}$`);
} /* v9-70f4a76cdfa95a5c */
