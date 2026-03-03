"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.formatCliCommand = formatCliCommand;var _cliName = require("./cli-name.js");
var _profileUtils = require("./profile-utils.js");
const CLI_PREFIX_RE = /^(?:pnpm|npm|bunx|npx)\s+openclaw\b|^openclaw\b/;
const PROFILE_FLAG_RE = /(?:^|\s)--profile(?:\s|=|$)/;
const DEV_FLAG_RE = /(?:^|\s)--dev(?:\s|$)/;
function formatCliCommand(command, env = process.env) {
  const cliName = (0, _cliName.resolveCliName)();
  const normalizedCommand = (0, _cliName.replaceCliName)(command, cliName);
  const profile = (0, _profileUtils.normalizeProfileName)(env.OPENCLAW_PROFILE);
  if (!profile) {
    return normalizedCommand;
  }
  if (!CLI_PREFIX_RE.test(normalizedCommand)) {
    return normalizedCommand;
  }
  if (PROFILE_FLAG_RE.test(normalizedCommand) || DEV_FLAG_RE.test(normalizedCommand)) {
    return normalizedCommand;
  }
  return normalizedCommand.replace(CLI_PREFIX_RE, (match) => `${match} --profile ${profile}`);
} /* v9-86153906def2fecd */
