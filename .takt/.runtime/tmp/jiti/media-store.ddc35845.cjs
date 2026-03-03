"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.MEDIA_MAX_BYTES = void 0;exports.cleanOldMedia = cleanOldMedia;exports.ensureMediaDir = ensureMediaDir;exports.extractOriginalFilename = extractOriginalFilename;exports.getMediaDir = getMediaDir;exports.saveMediaBuffer = saveMediaBuffer;exports.saveMediaSource = saveMediaSource;var _nodeCrypto = _interopRequireDefault(require("node:crypto"));
var _nodeFs = require("node:fs");
var _promises = _interopRequireDefault(require("node:fs/promises"));
var _nodeHttp = require("node:http");
var _nodeHttps = require("node:https");
var _nodePath = _interopRequireDefault(require("node:path"));
var _promises2 = require("node:stream/promises");
var _ssrf = require("../infra/net/ssrf.js");
var _utils = require("../utils.js");
var _mime = require("./mime.js");function _interopRequireDefault(e) {return e && e.__esModule ? e : { default: e };}
const resolveMediaDir = () => _nodePath.default.join((0, _utils.resolveConfigDir)(), "media");
const MEDIA_MAX_BYTES = exports.MEDIA_MAX_BYTES = 5 * 1024 * 1024; // 5MB default
const MAX_BYTES = MEDIA_MAX_BYTES;
const DEFAULT_TTL_MS = 2 * 60 * 1000; // 2 minutes
/**
 * Sanitize a filename for cross-platform safety.
 * Removes chars unsafe on Windows/SharePoint/all platforms.
 * Keeps: alphanumeric, dots, hyphens, underscores, Unicode letters/numbers.
 */
function sanitizeFilename(name) {
  const trimmed = name.trim();
  if (!trimmed) {
    return "";
  }
  const sanitized = trimmed.replace(/[^\p{L}\p{N}._-]+/gu, "_");
  // Collapse multiple underscores, trim leading/trailing, limit length
  return sanitized.replace(/_+/g, "_").replace(/^_|_$/g, "").slice(0, 60);
}
/**
 * Extract original filename from path if it matches the embedded format.
 * Pattern: {original}---{uuid}.{ext} → returns "{original}.{ext}"
 * Falls back to basename if no pattern match, or "file.bin" if empty.
 */
function extractOriginalFilename(filePath) {
  const basename = _nodePath.default.basename(filePath);
  if (!basename) {
    return "file.bin";
  } // Fallback for empty input
  const ext = _nodePath.default.extname(basename);
  const nameWithoutExt = _nodePath.default.basename(basename, ext);
  // Check for ---{uuid} pattern (36 chars: 8-4-4-4-12 with hyphens)
  const match = nameWithoutExt.match(/^(.+)---[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i);
  if (match?.[1]) {
    return `${match[1]}${ext}`;
  }
  return basename; // Fallback: use as-is
}
function getMediaDir() {
  return resolveMediaDir();
}
async function ensureMediaDir() {
  const mediaDir = resolveMediaDir();
  await _promises.default.mkdir(mediaDir, { recursive: true, mode: 0o700 });
  return mediaDir;
}
async function cleanOldMedia(ttlMs = DEFAULT_TTL_MS) {
  const mediaDir = await ensureMediaDir();
  const entries = await _promises.default.readdir(mediaDir).catch(() => []);
  const now = Date.now();
  await Promise.all(entries.map(async (file) => {
    const full = _nodePath.default.join(mediaDir, file);
    const stat = await _promises.default.stat(full).catch(() => null);
    if (!stat) {
      return;
    }
    if (now - stat.mtimeMs > ttlMs) {
      await _promises.default.rm(full).catch(() => {});
    }
  }));
}
function looksLikeUrl(src) {
  return /^https?:\/\//i.test(src);
}
/**
 * Download media to disk while capturing the first few KB for mime sniffing.
 */
async function downloadToFile(url, dest, headers, maxRedirects = 5) {
  return await new Promise((resolve, reject) => {
    let parsedUrl;
    try {
      parsedUrl = new URL(url);
    }
    catch {
      reject(new Error("Invalid URL"));
      return;
    }
    if (!["http:", "https:"].includes(parsedUrl.protocol)) {
      reject(new Error(`Invalid URL protocol: ${parsedUrl.protocol}. Only HTTP/HTTPS allowed.`));
      return;
    }
    const requestImpl = parsedUrl.protocol === "https:" ? _nodeHttps.request : _nodeHttp.request;
    (0, _ssrf.resolvePinnedHostname)(parsedUrl.hostname).
    then((pinned) => {
      const req = requestImpl(parsedUrl, { headers, lookup: pinned.lookup }, (res) => {
        // Follow redirects
        if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400) {
          const location = res.headers.location;
          if (!location || maxRedirects <= 0) {
            reject(new Error(`Redirect loop or missing Location header`));
            return;
          }
          const redirectUrl = new URL(location, url).href;
          resolve(downloadToFile(redirectUrl, dest, headers, maxRedirects - 1));
          return;
        }
        if (!res.statusCode || res.statusCode >= 400) {
          reject(new Error(`HTTP ${res.statusCode ?? "?"} downloading media`));
          return;
        }
        let total = 0;
        const sniffChunks = [];
        let sniffLen = 0;
        const out = (0, _nodeFs.createWriteStream)(dest, { mode: 0o600 });
        res.on("data", (chunk) => {
          total += chunk.length;
          if (sniffLen < 16384) {
            sniffChunks.push(chunk);
            sniffLen += chunk.length;
          }
          if (total > MAX_BYTES) {
            req.destroy(new Error("Media exceeds 5MB limit"));
          }
        });
        (0, _promises2.pipeline)(res, out).
        then(() => {
          const sniffBuffer = Buffer.concat(sniffChunks, Math.min(sniffLen, 16384));
          const rawHeader = res.headers["content-type"];
          const headerMime = Array.isArray(rawHeader) ? rawHeader[0] : rawHeader;
          resolve({
            headerMime,
            sniffBuffer,
            size: total
          });
        }).
        catch(reject);
      });
      req.on("error", reject);
      req.end();
    }).
    catch(reject);
  });
}
async function saveMediaSource(source, headers, subdir = "") {
  const baseDir = resolveMediaDir();
  const dir = subdir ? _nodePath.default.join(baseDir, subdir) : baseDir;
  await _promises.default.mkdir(dir, { recursive: true, mode: 0o700 });
  await cleanOldMedia();
  const baseId = _nodeCrypto.default.randomUUID();
  if (looksLikeUrl(source)) {
    const tempDest = _nodePath.default.join(dir, `${baseId}.tmp`);
    const { headerMime, sniffBuffer, size } = await downloadToFile(source, tempDest, headers);
    const mime = await (0, _mime.detectMime)({
      buffer: sniffBuffer,
      headerMime,
      filePath: source
    });
    const ext = (0, _mime.extensionForMime)(mime) ?? _nodePath.default.extname(new URL(source).pathname);
    const id = ext ? `${baseId}${ext}` : baseId;
    const finalDest = _nodePath.default.join(dir, id);
    await _promises.default.rename(tempDest, finalDest);
    return { id, path: finalDest, size, contentType: mime };
  }
  // local path
  const stat = await _promises.default.stat(source);
  if (!stat.isFile()) {
    throw new Error("Media path is not a file");
  }
  if (stat.size > MAX_BYTES) {
    throw new Error("Media exceeds 5MB limit");
  }
  const buffer = await _promises.default.readFile(source);
  const mime = await (0, _mime.detectMime)({ buffer, filePath: source });
  const ext = (0, _mime.extensionForMime)(mime) ?? _nodePath.default.extname(source);
  const id = ext ? `${baseId}${ext}` : baseId;
  const dest = _nodePath.default.join(dir, id);
  await _promises.default.writeFile(dest, buffer, { mode: 0o600 });
  return { id, path: dest, size: stat.size, contentType: mime };
}
async function saveMediaBuffer(buffer, contentType, subdir = "inbound", maxBytes = MAX_BYTES, originalFilename) {
  if (buffer.byteLength > maxBytes) {
    throw new Error(`Media exceeds ${(maxBytes / (1024 * 1024)).toFixed(0)}MB limit`);
  }
  const dir = _nodePath.default.join(resolveMediaDir(), subdir);
  await _promises.default.mkdir(dir, { recursive: true, mode: 0o700 });
  const uuid = _nodeCrypto.default.randomUUID();
  const headerExt = (0, _mime.extensionForMime)(contentType?.split(";")[0]?.trim() ?? undefined);
  const mime = await (0, _mime.detectMime)({ buffer, headerMime: contentType });
  const ext = headerExt ?? (0, _mime.extensionForMime)(mime) ?? "";
  let id;
  if (originalFilename) {
    // Embed original name: {sanitized}---{uuid}.ext
    const base = _nodePath.default.parse(originalFilename).name;
    const sanitized = sanitizeFilename(base);
    id = sanitized ? `${sanitized}---${uuid}${ext}` : `${uuid}${ext}`;
  } else
  {
    // Legacy: just UUID
    id = ext ? `${uuid}${ext}` : uuid;
  }
  const dest = _nodePath.default.join(dir, id);
  await _promises.default.writeFile(dest, buffer, { mode: 0o600 });
  return { id, path: dest, size: buffer.byteLength, contentType: mime };
} /* v9-3ad924cb71ea7330 */
