"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.loadWebMedia = loadWebMedia;exports.loadWebMediaRaw = loadWebMediaRaw;exports.optimizeImageToJpeg = optimizeImageToJpeg;Object.defineProperty(exports, "optimizeImageToPng", { enumerable: true, get: function () {return _imageOps.optimizeImageToPng;} });var _promises = _interopRequireDefault(require("node:fs/promises"));
var _nodePath = _interopRequireDefault(require("node:path"));
var _nodeUrl = require("node:url");
var _globals = require("../globals.js");
var _constants = require("../media/constants.js");
var _fetch = require("../media/fetch.js");
var _imageOps = require("../media/image-ops.js");
var _mime = require("../media/mime.js");
var _utils = require("../utils.js");function _interopRequireDefault(e) {return e && e.__esModule ? e : { default: e };}
const HEIC_MIME_RE = /^image\/hei[cf]$/i;
const HEIC_EXT_RE = /\.(heic|heif)$/i;
const MB = 1024 * 1024;
function formatMb(bytes, digits = 2) {
  return (bytes / MB).toFixed(digits);
}
function formatCapLimit(label, cap, size) {
  return `${label} exceeds ${formatMb(cap, 0)}MB limit (got ${formatMb(size)}MB)`;
}
function formatCapReduce(label, cap, size) {
  return `${label} could not be reduced below ${formatMb(cap, 0)}MB (got ${formatMb(size)}MB)`;
}
function isHeicSource(opts) {
  if (opts.contentType && HEIC_MIME_RE.test(opts.contentType.trim())) {
    return true;
  }
  if (opts.fileName && HEIC_EXT_RE.test(opts.fileName.trim())) {
    return true;
  }
  return false;
}
function toJpegFileName(fileName) {
  if (!fileName) {
    return undefined;
  }
  const trimmed = fileName.trim();
  if (!trimmed) {
    return fileName;
  }
  const parsed = _nodePath.default.parse(trimmed);
  if (!parsed.ext || HEIC_EXT_RE.test(parsed.ext)) {
    return _nodePath.default.format({ dir: parsed.dir, name: parsed.name || trimmed, ext: ".jpg" });
  }
  return _nodePath.default.format({ dir: parsed.dir, name: parsed.name, ext: ".jpg" });
}
function logOptimizedImage(params) {
  if (!(0, _globals.shouldLogVerbose)()) {
    return;
  }
  if (params.optimized.optimizedSize >= params.originalSize) {
    return;
  }
  if (params.optimized.format === "png") {
    (0, _globals.logVerbose)(`Optimized PNG (preserving alpha) from ${formatMb(params.originalSize)}MB to ${formatMb(params.optimized.optimizedSize)}MB (side≤${params.optimized.resizeSide}px)`);
    return;
  }
  (0, _globals.logVerbose)(`Optimized media from ${formatMb(params.originalSize)}MB to ${formatMb(params.optimized.optimizedSize)}MB (side≤${params.optimized.resizeSide}px, q=${params.optimized.quality})`);
}
async function optimizeImageWithFallback(params) {
  const { buffer, cap, meta } = params;
  const isPng = meta?.contentType === "image/png" || meta?.fileName?.toLowerCase().endsWith(".png");
  const hasAlpha = isPng && (await (0, _imageOps.hasAlphaChannel)(buffer));
  if (hasAlpha) {
    const optimized = await (0, _imageOps.optimizeImageToPng)(buffer, cap);
    if (optimized.buffer.length <= cap) {
      return { ...optimized, format: "png" };
    }
    if ((0, _globals.shouldLogVerbose)()) {
      (0, _globals.logVerbose)(`PNG with alpha still exceeds ${formatMb(cap, 0)}MB after optimization; falling back to JPEG`);
    }
  }
  const optimized = await optimizeImageToJpeg(buffer, cap, meta);
  return { ...optimized, format: "jpeg" };
}
async function loadWebMediaInternal(mediaUrl, options = {}) {
  const { maxBytes, optimizeImages = true } = options;
  // Use fileURLToPath for proper handling of file:// URLs (handles file://localhost/path, etc.)
  if (mediaUrl.startsWith("file://")) {
    try {
      mediaUrl = (0, _nodeUrl.fileURLToPath)(mediaUrl);
    }
    catch {
      throw new Error(`Invalid file:// URL: ${mediaUrl}`);
    }
  }
  const optimizeAndClampImage = async (buffer, cap, meta) => {
    const originalSize = buffer.length;
    const optimized = await optimizeImageWithFallback({ buffer, cap, meta });
    logOptimizedImage({ originalSize, optimized });
    if (optimized.buffer.length > cap) {
      throw new Error(formatCapReduce("Media", cap, optimized.buffer.length));
    }
    const contentType = optimized.format === "png" ? "image/png" : "image/jpeg";
    const fileName = optimized.format === "jpeg" && meta && isHeicSource(meta) ?
    toJpegFileName(meta.fileName) :
    meta?.fileName;
    return {
      buffer: optimized.buffer,
      contentType,
      kind: "image",
      fileName
    };
  };
  const clampAndFinalize = async (params) => {
    // If caller explicitly provides maxBytes, trust it (for channels that handle large files).
    // Otherwise fall back to per-kind defaults.
    const cap = maxBytes !== undefined ? maxBytes : (0, _constants.maxBytesForKind)(params.kind);
    if (params.kind === "image") {
      const isGif = params.contentType === "image/gif";
      if (isGif || !optimizeImages) {
        if (params.buffer.length > cap) {
          throw new Error(formatCapLimit(isGif ? "GIF" : "Media", cap, params.buffer.length));
        }
        return {
          buffer: params.buffer,
          contentType: params.contentType,
          kind: params.kind,
          fileName: params.fileName
        };
      }
      return {
        ...(await optimizeAndClampImage(params.buffer, cap, {
          contentType: params.contentType,
          fileName: params.fileName
        }))
      };
    }
    if (params.buffer.length > cap) {
      throw new Error(formatCapLimit("Media", cap, params.buffer.length));
    }
    return {
      buffer: params.buffer,
      contentType: params.contentType ?? undefined,
      kind: params.kind,
      fileName: params.fileName
    };
  };
  if (/^https?:\/\//i.test(mediaUrl)) {
    // Enforce a download cap during fetch to avoid unbounded memory usage.
    // For optimized images, allow fetching larger payloads before compression.
    const defaultFetchCap = (0, _constants.maxBytesForKind)("unknown");
    const fetchCap = maxBytes === undefined ?
    defaultFetchCap :
    optimizeImages ?
    Math.max(maxBytes, defaultFetchCap) :
    maxBytes;
    const fetched = await (0, _fetch.fetchRemoteMedia)({ url: mediaUrl, maxBytes: fetchCap });
    const { buffer, contentType, fileName } = fetched;
    const kind = (0, _constants.mediaKindFromMime)(contentType);
    return await clampAndFinalize({ buffer, contentType, kind, fileName });
  }
  // Expand tilde paths to absolute paths (e.g., ~/Downloads/photo.jpg)
  if (mediaUrl.startsWith("~")) {
    mediaUrl = (0, _utils.resolveUserPath)(mediaUrl);
  }
  // Local path
  const data = await _promises.default.readFile(mediaUrl);
  const mime = await (0, _mime.detectMime)({ buffer: data, filePath: mediaUrl });
  const kind = (0, _constants.mediaKindFromMime)(mime);
  let fileName = _nodePath.default.basename(mediaUrl) || undefined;
  if (fileName && !_nodePath.default.extname(fileName) && mime) {
    const ext = (0, _mime.extensionForMime)(mime);
    if (ext) {
      fileName = `${fileName}${ext}`;
    }
  }
  return await clampAndFinalize({
    buffer: data,
    contentType: mime,
    kind,
    fileName
  });
}
async function loadWebMedia(mediaUrl, maxBytes) {
  return await loadWebMediaInternal(mediaUrl, {
    maxBytes,
    optimizeImages: true
  });
}
async function loadWebMediaRaw(mediaUrl, maxBytes) {
  return await loadWebMediaInternal(mediaUrl, {
    maxBytes,
    optimizeImages: false
  });
}
async function optimizeImageToJpeg(buffer, maxBytes, opts = {}) {
  // Try a grid of sizes/qualities until under the limit.
  let source = buffer;
  if (isHeicSource(opts)) {
    try {
      source = await (0, _imageOps.convertHeicToJpeg)(buffer);
    }
    catch (err) {
      throw new Error(`HEIC image conversion failed: ${String(err)}`, { cause: err });
    }
  }
  const sides = [2048, 1536, 1280, 1024, 800];
  const qualities = [80, 70, 60, 50, 40];
  let smallest = null;
  for (const side of sides) {
    for (const quality of qualities) {
      try {
        const out = await (0, _imageOps.resizeToJpeg)({
          buffer: source,
          maxSide: side,
          quality,
          withoutEnlargement: true
        });
        const size = out.length;
        if (!smallest || size < smallest.size) {
          smallest = { buffer: out, size, resizeSide: side, quality };
        }
        if (size <= maxBytes) {
          return {
            buffer: out,
            optimizedSize: size,
            resizeSide: side,
            quality
          };
        }
      }
      catch {

        // Continue trying other size/quality combinations
      }}
  }
  if (smallest) {
    return {
      buffer: smallest.buffer,
      optimizedSize: smallest.size,
      resizeSide: smallest.resizeSide,
      quality: smallest.quality
    };
  }
  throw new Error("Failed to optimize image");
} /* v9-aa1bc7edec895d74 */
