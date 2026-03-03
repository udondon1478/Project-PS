"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.CONFIG_DIR = void 0;exports.assertWebChannel = assertWebChannel;exports.clampInt = clampInt;exports.clampNumber = clampNumber;exports.displayPath = displayPath;exports.displayString = displayString;exports.ensureDir = ensureDir;exports.formatTerminalLink = formatTerminalLink;exports.isSelfChatMode = isSelfChatMode;exports.jidToE164 = jidToE164;exports.normalizeE164 = normalizeE164;exports.normalizePath = normalizePath;exports.resolveConfigDir = resolveConfigDir;exports.resolveHomeDir = resolveHomeDir;exports.resolveJidToE164 = resolveJidToE164;exports.resolveUserPath = resolveUserPath;exports.shortenHomeInString = shortenHomeInString;exports.shortenHomePath = shortenHomePath;exports.sleep = sleep;exports.sliceUtf16Safe = sliceUtf16Safe;exports.toWhatsappJid = toWhatsappJid;exports.truncateUtf16Safe = truncateUtf16Safe;exports.withWhatsAppPrefix = withWhatsAppPrefix;var _nodeFs = _interopRequireDefault(require("node:fs"));
var _nodeOs = _interopRequireDefault(require("node:os"));
var _nodePath = _interopRequireDefault(require("node:path"));
var _paths = require("./config/paths.js");
var _globals = require("./globals.js");function _interopRequireDefault(e) {return e && e.__esModule ? e : { default: e };}
async function ensureDir(dir) {
  await _nodeFs.default.promises.mkdir(dir, { recursive: true });
}
function clampNumber(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
function clampInt(value, min, max) {
  return clampNumber(Math.floor(value), min, max);
}
function assertWebChannel(input) {
  if (input !== "web") {
    throw new Error("Web channel must be 'web'");
  }
}
function normalizePath(p) {
  if (!p.startsWith("/")) {
    return `/${p}`;
  }
  return p;
}
function withWhatsAppPrefix(number) {
  return number.startsWith("whatsapp:") ? number : `whatsapp:${number}`;
}
function normalizeE164(number) {
  const withoutPrefix = number.replace(/^whatsapp:/, "").trim();
  const digits = withoutPrefix.replace(/[^\d+]/g, "");
  if (digits.startsWith("+")) {
    return `+${digits.slice(1)}`;
  }
  return `+${digits}`;
}
/**
 * "Self-chat mode" heuristic (single phone): the gateway is logged in as the owner's own WhatsApp account,
 * and `channels.whatsapp.allowFrom` includes that same number. Used to avoid side-effects that make no sense when the
 * "bot" and the human are the same WhatsApp identity (e.g. auto read receipts, @mention JID triggers).
 */
function isSelfChatMode(selfE164, allowFrom) {
  if (!selfE164) {
    return false;
  }
  if (!Array.isArray(allowFrom) || allowFrom.length === 0) {
    return false;
  }
  const normalizedSelf = normalizeE164(selfE164);
  return allowFrom.some((n) => {
    if (n === "*") {
      return false;
    }
    try {
      return normalizeE164(String(n)) === normalizedSelf;
    }
    catch {
      return false;
    }
  });
}
function toWhatsappJid(number) {
  const withoutPrefix = number.replace(/^whatsapp:/, "").trim();
  if (withoutPrefix.includes("@")) {
    return withoutPrefix;
  }
  const e164 = normalizeE164(withoutPrefix);
  const digits = e164.replace(/\D/g, "");
  return `${digits}@s.whatsapp.net`;
}
function resolveLidMappingDirs(opts) {
  const dirs = new Set();
  const addDir = (dir) => {
    if (!dir) {
      return;
    }
    dirs.add(resolveUserPath(dir));
  };
  addDir(opts?.authDir);
  for (const dir of opts?.lidMappingDirs ?? []) {
    addDir(dir);
  }
  addDir((0, _paths.resolveOAuthDir)());
  addDir(_nodePath.default.join(CONFIG_DIR, "credentials"));
  return [...dirs];
}
function readLidReverseMapping(lid, opts) {
  const mappingFilename = `lid-mapping-${lid}_reverse.json`;
  const mappingDirs = resolveLidMappingDirs(opts);
  for (const dir of mappingDirs) {
    const mappingPath = _nodePath.default.join(dir, mappingFilename);
    try {
      const data = _nodeFs.default.readFileSync(mappingPath, "utf8");
      const phone = JSON.parse(data);
      if (phone === null || phone === undefined) {
        continue;
      }
      return normalizeE164(String(phone));
    }
    catch {

      // Try the next location.
    }}
  return null;
}
function jidToE164(jid, opts) {
  // Convert a WhatsApp JID (with optional device suffix, e.g. 1234:1@s.whatsapp.net) back to +1234.
  const match = jid.match(/^(\d+)(?::\d+)?@(s\.whatsapp\.net|hosted)$/);
  if (match) {
    const digits = match[1];
    return `+${digits}`;
  }
  // Support @lid format (WhatsApp Linked ID) - look up reverse mapping
  const lidMatch = jid.match(/^(\d+)(?::\d+)?@(lid|hosted\.lid)$/);
  if (lidMatch) {
    const lid = lidMatch[1];
    const phone = readLidReverseMapping(lid, opts);
    if (phone) {
      return phone;
    }
    const shouldLog = opts?.logMissing ?? (0, _globals.shouldLogVerbose)();
    if (shouldLog) {
      (0, _globals.logVerbose)(`LID mapping not found for ${lid}; skipping inbound message`);
    }
  }
  return null;
}
async function resolveJidToE164(jid, opts) {
  if (!jid) {
    return null;
  }
  const direct = jidToE164(jid, opts);
  if (direct) {
    return direct;
  }
  if (!/(@lid|@hosted\.lid)$/.test(jid)) {
    return null;
  }
  if (!opts?.lidLookup?.getPNForLID) {
    return null;
  }
  try {
    const pnJid = await opts.lidLookup.getPNForLID(jid);
    if (!pnJid) {
      return null;
    }
    return jidToE164(pnJid, opts);
  }
  catch (err) {
    if ((0, _globals.shouldLogVerbose)()) {
      (0, _globals.logVerbose)(`LID mapping lookup failed for ${jid}: ${String(err)}`);
    }
    return null;
  }
}
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
function isHighSurrogate(codeUnit) {
  return codeUnit >= 0xd800 && codeUnit <= 0xdbff;
}
function isLowSurrogate(codeUnit) {
  return codeUnit >= 0xdc00 && codeUnit <= 0xdfff;
}
function sliceUtf16Safe(input, start, end) {
  const len = input.length;
  let from = start < 0 ? Math.max(len + start, 0) : Math.min(start, len);
  let to = end === undefined ? len : end < 0 ? Math.max(len + end, 0) : Math.min(end, len);
  if (to < from) {
    const tmp = from;
    from = to;
    to = tmp;
  }
  if (from > 0 && from < len) {
    const codeUnit = input.charCodeAt(from);
    if (isLowSurrogate(codeUnit) && isHighSurrogate(input.charCodeAt(from - 1))) {
      from += 1;
    }
  }
  if (to > 0 && to < len) {
    const codeUnit = input.charCodeAt(to - 1);
    if (isHighSurrogate(codeUnit) && isLowSurrogate(input.charCodeAt(to))) {
      to -= 1;
    }
  }
  return input.slice(from, to);
}
function truncateUtf16Safe(input, maxLen) {
  const limit = Math.max(0, Math.floor(maxLen));
  if (input.length <= limit) {
    return input;
  }
  return sliceUtf16Safe(input, 0, limit);
}
function resolveUserPath(input) {
  const trimmed = input.trim();
  if (!trimmed) {
    return trimmed;
  }
  if (trimmed.startsWith("~")) {
    const expanded = trimmed.replace(/^~(?=$|[\\/])/, _nodeOs.default.homedir());
    return _nodePath.default.resolve(expanded);
  }
  return _nodePath.default.resolve(trimmed);
}
function resolveConfigDir(env = process.env, homedir = _nodeOs.default.homedir) {
  const override = env.OPENCLAW_STATE_DIR?.trim() || env.CLAWDBOT_STATE_DIR?.trim();
  if (override) {
    return resolveUserPath(override);
  }
  const newDir = _nodePath.default.join(homedir(), ".openclaw");
  try {
    const hasNew = _nodeFs.default.existsSync(newDir);
    if (hasNew) {
      return newDir;
    }
  }
  catch {

    // best-effort
  }return newDir;
}
function resolveHomeDir() {
  const envHome = process.env.HOME?.trim();
  if (envHome) {
    return envHome;
  }
  const envProfile = process.env.USERPROFILE?.trim();
  if (envProfile) {
    return envProfile;
  }
  try {
    const home = _nodeOs.default.homedir();
    return home?.trim() ? home : undefined;
  }
  catch {
    return undefined;
  }
}
function shortenHomePath(input) {
  if (!input) {
    return input;
  }
  const home = resolveHomeDir();
  if (!home) {
    return input;
  }
  if (input === home) {
    return "~";
  }
  if (input.startsWith(`${home}/`)) {
    return `~${input.slice(home.length)}`;
  }
  return input;
}
function shortenHomeInString(input) {
  if (!input) {
    return input;
  }
  const home = resolveHomeDir();
  if (!home) {
    return input;
  }
  return input.split(home).join("~");
}
function displayPath(input) {
  return shortenHomePath(input);
}
function displayString(input) {
  return shortenHomeInString(input);
}
function formatTerminalLink(label, url, opts) {
  const esc = "\u001b";
  const safeLabel = label.replaceAll(esc, "");
  const safeUrl = url.replaceAll(esc, "");
  const allow = opts?.force === true ? true : opts?.force === false ? false : Boolean(process.stdout.isTTY);
  if (!allow) {
    return opts?.fallback ?? `${safeLabel} (${safeUrl})`;
  }
  return `\u001b]8;;${safeUrl}\u0007${safeLabel}\u001b]8;;\u0007`;
}
// Configuration root; can be overridden via OPENCLAW_STATE_DIR.
const CONFIG_DIR = exports.CONFIG_DIR = resolveConfigDir(); /* v9-98ed82c97c0cc2b6 */
