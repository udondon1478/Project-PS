"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.migrateLegacyConfig = migrateLegacyConfig;var _legacy = require("./legacy.js");
var _validation = require("./validation.js");
function migrateLegacyConfig(raw) {
  const { next, changes } = (0, _legacy.applyLegacyMigrations)(raw);
  if (!next) {
    return { config: null, changes: [] };
  }
  const validated = (0, _validation.validateConfigObjectWithPlugins)(next);
  if (!validated.ok) {
    changes.push("Migration applied, but config still invalid; fix remaining issues manually.");
    return { config: null, changes };
  }
  return { config: validated.config, changes };
} /* v9-fe3887577f5e6426 */
