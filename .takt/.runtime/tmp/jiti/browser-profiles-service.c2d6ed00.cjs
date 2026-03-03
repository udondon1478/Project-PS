"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.createBrowserProfilesService = createBrowserProfilesService;var _nodeFs = _interopRequireDefault(require("node:fs"));
var _nodePath = _interopRequireDefault(require("node:path"));
var _config = require("../config/config.js");
var _portDefaults = require("../config/port-defaults.js");
var _chrome = require("./chrome.js");
var _config2 = require("./config.js");
var _constants = require("./constants.js");
var _profiles = require("./profiles.js");
var _trash = require("./trash.js");function _interopRequireDefault(e) {return e && e.__esModule ? e : { default: e };}
const HEX_COLOR_RE = /^#[0-9A-Fa-f]{6}$/;
function createBrowserProfilesService(ctx) {
  const listProfiles = async () => {
    return await ctx.listProfiles();
  };
  const createProfile = async (params) => {
    const name = params.name.trim();
    const rawCdpUrl = params.cdpUrl?.trim() || undefined;
    const driver = params.driver === "extension" ? "extension" : undefined;
    if (!(0, _profiles.isValidProfileName)(name)) {
      throw new Error("invalid profile name: use lowercase letters, numbers, and hyphens only");
    }
    const state = ctx.state();
    const resolvedProfiles = state.resolved.profiles;
    if (name in resolvedProfiles) {
      throw new Error(`profile "${name}" already exists`);
    }
    const cfg = (0, _config.loadConfig)();
    const rawProfiles = cfg.browser?.profiles ?? {};
    if (name in rawProfiles) {
      throw new Error(`profile "${name}" already exists`);
    }
    const usedColors = (0, _profiles.getUsedColors)(resolvedProfiles);
    const profileColor = params.color && HEX_COLOR_RE.test(params.color) ? params.color : (0, _profiles.allocateColor)(usedColors);
    let profileConfig;
    if (rawCdpUrl) {
      const parsed = (0, _config2.parseHttpUrl)(rawCdpUrl, "browser.profiles.cdpUrl");
      profileConfig = {
        cdpUrl: parsed.normalized,
        ...(driver ? { driver } : {}),
        color: profileColor
      };
    } else
    {
      const usedPorts = (0, _profiles.getUsedPorts)(resolvedProfiles);
      const range = (0, _portDefaults.deriveDefaultBrowserCdpPortRange)(state.resolved.controlPort);
      const cdpPort = (0, _profiles.allocateCdpPort)(usedPorts, range);
      if (cdpPort === null) {
        throw new Error("no available CDP ports in range");
      }
      profileConfig = {
        cdpPort,
        ...(driver ? { driver } : {}),
        color: profileColor
      };
    }
    const nextConfig = {
      ...cfg,
      browser: {
        ...cfg.browser,
        profiles: {
          ...rawProfiles,
          [name]: profileConfig
        }
      }
    };
    await (0, _config.writeConfigFile)(nextConfig);
    state.resolved.profiles[name] = profileConfig;
    const resolved = (0, _config2.resolveProfile)(state.resolved, name);
    if (!resolved) {
      throw new Error(`profile "${name}" not found after creation`);
    }
    return {
      ok: true,
      profile: name,
      cdpPort: resolved.cdpPort,
      cdpUrl: resolved.cdpUrl,
      color: resolved.color,
      isRemote: !resolved.cdpIsLoopback
    };
  };
  const deleteProfile = async (nameRaw) => {
    const name = nameRaw.trim();
    if (!name) {
      throw new Error("profile name is required");
    }
    if (!(0, _profiles.isValidProfileName)(name)) {
      throw new Error("invalid profile name");
    }
    const cfg = (0, _config.loadConfig)();
    const profiles = cfg.browser?.profiles ?? {};
    if (!(name in profiles)) {
      throw new Error(`profile "${name}" not found`);
    }
    const defaultProfile = cfg.browser?.defaultProfile ?? _constants.DEFAULT_BROWSER_DEFAULT_PROFILE_NAME;
    if (name === defaultProfile) {
      throw new Error(`cannot delete the default profile "${name}"; change browser.defaultProfile first`);
    }
    let deleted = false;
    const state = ctx.state();
    const resolved = (0, _config2.resolveProfile)(state.resolved, name);
    if (resolved?.cdpIsLoopback) {
      try {
        await ctx.forProfile(name).stopRunningBrowser();
      }
      catch {

        // ignore
      }const userDataDir = (0, _chrome.resolveOpenClawUserDataDir)(name);
      const profileDir = _nodePath.default.dirname(userDataDir);
      if (_nodeFs.default.existsSync(profileDir)) {
        await (0, _trash.movePathToTrash)(profileDir);
        deleted = true;
      }
    }
    const { [name]: _removed, ...remainingProfiles } = profiles;
    const nextConfig = {
      ...cfg,
      browser: {
        ...cfg.browser,
        profiles: remainingProfiles
      }
    };
    await (0, _config.writeConfigFile)(nextConfig);
    delete state.resolved.profiles[name];
    state.profiles.delete(name);
    return { ok: true, profile: name, deleted };
  };
  return {
    listProfiles,
    createProfile,
    deleteProfile
  };
} /* v9-8f2765ea8a5a301a */
