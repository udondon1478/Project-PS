"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.parseHttpUrl = parseHttpUrl;exports.resolveBrowserConfig = resolveBrowserConfig;exports.resolveProfile = resolveProfile;exports.shouldStartLocalBrowserServer = shouldStartLocalBrowserServer;var _paths = require("../config/paths.js");
var _portDefaults = require("../config/port-defaults.js");
var _constants = require("./constants.js");
var _profiles = require("./profiles.js");
function isLoopbackHost(host) {
  const h = host.trim().toLowerCase();
  return h === "localhost" ||
  h === "127.0.0.1" ||
  h === "0.0.0.0" ||
  h === "[::1]" ||
  h === "::1" ||
  h === "[::]" ||
  h === "::";
}
function normalizeHexColor(raw) {
  const value = (raw ?? "").trim();
  if (!value) {
    return _constants.DEFAULT_OPENCLAW_BROWSER_COLOR;
  }
  const normalized = value.startsWith("#") ? value : `#${value}`;
  if (!/^#[0-9a-fA-F]{6}$/.test(normalized)) {
    return _constants.DEFAULT_OPENCLAW_BROWSER_COLOR;
  }
  return normalized.toUpperCase();
}
function normalizeTimeoutMs(raw, fallback) {
  const value = typeof raw === "number" && Number.isFinite(raw) ? Math.floor(raw) : fallback;
  return value < 0 ? fallback : value;
}
function parseHttpUrl(raw, label) {
  const trimmed = raw.trim();
  const parsed = new URL(trimmed);
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error(`${label} must be http(s), got: ${parsed.protocol.replace(":", "")}`);
  }
  const port = parsed.port && Number.parseInt(parsed.port, 10) > 0 ?
  Number.parseInt(parsed.port, 10) :
  parsed.protocol === "https:" ?
  443 :
  80;
  if (Number.isNaN(port) || port <= 0 || port > 65535) {
    throw new Error(`${label} has invalid port: ${parsed.port}`);
  }
  return {
    parsed,
    port,
    normalized: parsed.toString().replace(/\/$/, "")
  };
}
/**
 * Ensure the default "openclaw" profile exists in the profiles map.
 * Auto-creates it with the legacy CDP port (from browser.cdpUrl) or first port if missing.
 */
function ensureDefaultProfile(profiles, defaultColor, legacyCdpPort, derivedDefaultCdpPort) {
  const result = { ...profiles };
  if (!result[_constants.DEFAULT_OPENCLAW_BROWSER_PROFILE_NAME]) {
    result[_constants.DEFAULT_OPENCLAW_BROWSER_PROFILE_NAME] = {
      cdpPort: legacyCdpPort ?? derivedDefaultCdpPort ?? _profiles.CDP_PORT_RANGE_START,
      color: defaultColor
    };
  }
  return result;
}
/**
 * Ensure a built-in "chrome" profile exists for the Chrome extension relay.
 *
 * Note: this is an OpenClaw browser profile (routing config), not a Chrome user profile.
 * It points at the local relay CDP endpoint (controlPort + 1).
 */
function ensureDefaultChromeExtensionProfile(profiles, controlPort) {
  const result = { ...profiles };
  if (result.chrome) {
    return result;
  }
  const relayPort = controlPort + 1;
  if (!Number.isFinite(relayPort) || relayPort <= 0 || relayPort > 65535) {
    return result;
  }
  // Avoid adding the built-in profile if the derived relay port is already used by another profile
  // (legacy single-profile configs may use controlPort+1 for openclaw/openclaw CDP).
  if ((0, _profiles.getUsedPorts)(result).has(relayPort)) {
    return result;
  }
  result.chrome = {
    driver: "extension",
    cdpUrl: `http://127.0.0.1:${relayPort}`,
    color: "#00AA00"
  };
  return result;
}
function resolveBrowserConfig(cfg, rootConfig) {
  const enabled = cfg?.enabled ?? _constants.DEFAULT_OPENCLAW_BROWSER_ENABLED;
  const evaluateEnabled = cfg?.evaluateEnabled ?? _constants.DEFAULT_BROWSER_EVALUATE_ENABLED;
  const gatewayPort = (0, _paths.resolveGatewayPort)(rootConfig);
  const controlPort = (0, _portDefaults.deriveDefaultBrowserControlPort)(gatewayPort ?? _portDefaults.DEFAULT_BROWSER_CONTROL_PORT);
  const defaultColor = normalizeHexColor(cfg?.color);
  const remoteCdpTimeoutMs = normalizeTimeoutMs(cfg?.remoteCdpTimeoutMs, 1500);
  const remoteCdpHandshakeTimeoutMs = normalizeTimeoutMs(cfg?.remoteCdpHandshakeTimeoutMs, Math.max(2000, remoteCdpTimeoutMs * 2));
  const derivedCdpRange = (0, _portDefaults.deriveDefaultBrowserCdpPortRange)(controlPort);
  const rawCdpUrl = (cfg?.cdpUrl ?? "").trim();
  let cdpInfo;
  if (rawCdpUrl) {
    cdpInfo = parseHttpUrl(rawCdpUrl, "browser.cdpUrl");
  } else
  {
    const derivedPort = controlPort + 1;
    if (derivedPort > 65535) {
      throw new Error(`Derived CDP port (${derivedPort}) is too high; check gateway port configuration.`);
    }
    const derived = new URL(`http://127.0.0.1:${derivedPort}`);
    cdpInfo = {
      parsed: derived,
      port: derivedPort,
      normalized: derived.toString().replace(/\/$/, "")
    };
  }
  const headless = cfg?.headless === true;
  const noSandbox = cfg?.noSandbox === true;
  const attachOnly = cfg?.attachOnly === true;
  const executablePath = cfg?.executablePath?.trim() || undefined;
  const defaultProfileFromConfig = cfg?.defaultProfile?.trim() || undefined;
  // Use legacy cdpUrl port for backward compatibility when no profiles configured
  const legacyCdpPort = rawCdpUrl ? cdpInfo.port : undefined;
  const profiles = ensureDefaultChromeExtensionProfile(ensureDefaultProfile(cfg?.profiles, defaultColor, legacyCdpPort, derivedCdpRange.start), controlPort);
  const cdpProtocol = cdpInfo.parsed.protocol === "https:" ? "https" : "http";
  const defaultProfile = defaultProfileFromConfig ?? (
  profiles[_constants.DEFAULT_BROWSER_DEFAULT_PROFILE_NAME] ?
  _constants.DEFAULT_BROWSER_DEFAULT_PROFILE_NAME :
  _constants.DEFAULT_OPENCLAW_BROWSER_PROFILE_NAME);
  return {
    enabled,
    evaluateEnabled,
    controlPort,
    cdpProtocol,
    cdpHost: cdpInfo.parsed.hostname,
    cdpIsLoopback: isLoopbackHost(cdpInfo.parsed.hostname),
    remoteCdpTimeoutMs,
    remoteCdpHandshakeTimeoutMs,
    color: defaultColor,
    executablePath,
    headless,
    noSandbox,
    attachOnly,
    defaultProfile,
    profiles
  };
}
/**
 * Resolve a profile by name from the config.
 * Returns null if the profile doesn't exist.
 */
function resolveProfile(resolved, profileName) {
  const profile = resolved.profiles[profileName];
  if (!profile) {
    return null;
  }
  const rawProfileUrl = profile.cdpUrl?.trim() ?? "";
  let cdpHost = resolved.cdpHost;
  let cdpPort = profile.cdpPort ?? 0;
  let cdpUrl = "";
  const driver = profile.driver === "extension" ? "extension" : "openclaw";
  if (rawProfileUrl) {
    const parsed = parseHttpUrl(rawProfileUrl, `browser.profiles.${profileName}.cdpUrl`);
    cdpHost = parsed.parsed.hostname;
    cdpPort = parsed.port;
    cdpUrl = parsed.normalized;
  } else
  if (cdpPort) {
    cdpUrl = `${resolved.cdpProtocol}://${resolved.cdpHost}:${cdpPort}`;
  } else
  {
    throw new Error(`Profile "${profileName}" must define cdpPort or cdpUrl.`);
  }
  return {
    name: profileName,
    cdpPort,
    cdpUrl,
    cdpHost,
    cdpIsLoopback: isLoopbackHost(cdpHost),
    color: profile.color,
    driver
  };
}
function shouldStartLocalBrowserServer(_resolved) {
  return true;
} /* v9-7b31978df1aea72e */
