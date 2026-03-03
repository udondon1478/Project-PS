"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.MediaAttachmentCache = void 0;exports.isAudioAttachment = isAudioAttachment;exports.isImageAttachment = isImageAttachment;exports.isVideoAttachment = isVideoAttachment;exports.normalizeAttachments = normalizeAttachments;exports.resolveAttachmentKind = resolveAttachmentKind;exports.selectAttachments = selectAttachments;var _nodeCrypto = _interopRequireDefault(require("node:crypto"));
var _promises = _interopRequireDefault(require("node:fs/promises"));
var _nodeOs = _interopRequireDefault(require("node:os"));
var _nodePath = _interopRequireDefault(require("node:path"));
var _nodeUrl = require("node:url");
var _globals = require("../globals.js");
var _fetch = require("../media/fetch.js");
var _mime = require("../media/mime.js");
var _errors = require("./errors.js");
var _shared = require("./providers/shared.js");function _interopRequireDefault(e) {return e && e.__esModule ? e : { default: e };}
const DEFAULT_MAX_ATTACHMENTS = 1;
function normalizeAttachmentPath(raw) {
  const value = raw?.trim();
  if (!value) {
    return undefined;
  }
  if (value.startsWith("file://")) {
    try {
      return (0, _nodeUrl.fileURLToPath)(value);
    }
    catch {
      return undefined;
    }
  }
  return value;
}
function normalizeAttachments(ctx) {
  const pathsFromArray = Array.isArray(ctx.MediaPaths) ? ctx.MediaPaths : undefined;
  const urlsFromArray = Array.isArray(ctx.MediaUrls) ? ctx.MediaUrls : undefined;
  const typesFromArray = Array.isArray(ctx.MediaTypes) ? ctx.MediaTypes : undefined;
  const resolveMime = (count, index) => {
    const typeHint = typesFromArray?.[index];
    const trimmed = typeof typeHint === "string" ? typeHint.trim() : "";
    if (trimmed) {
      return trimmed;
    }
    return count === 1 ? ctx.MediaType : undefined;
  };
  if (pathsFromArray && pathsFromArray.length > 0) {
    const count = pathsFromArray.length;
    const urls = urlsFromArray && urlsFromArray.length > 0 ? urlsFromArray : undefined;
    return pathsFromArray.
    map((value, index) => ({
      path: value?.trim() || undefined,
      url: urls?.[index] ?? ctx.MediaUrl,
      mime: resolveMime(count, index),
      index
    })).
    filter((entry) => Boolean(entry.path?.trim() || entry.url?.trim()));
  }
  if (urlsFromArray && urlsFromArray.length > 0) {
    const count = urlsFromArray.length;
    return urlsFromArray.
    map((value, index) => ({
      path: undefined,
      url: value?.trim() || undefined,
      mime: resolveMime(count, index),
      index
    })).
    filter((entry) => Boolean(entry.url?.trim()));
  }
  const pathValue = ctx.MediaPath?.trim();
  const url = ctx.MediaUrl?.trim();
  if (!pathValue && !url) {
    return [];
  }
  return [
  {
    path: pathValue || undefined,
    url: url || undefined,
    mime: ctx.MediaType,
    index: 0
  }];

}
function resolveAttachmentKind(attachment) {
  const kind = (0, _mime.kindFromMime)(attachment.mime);
  if (kind === "image" || kind === "audio" || kind === "video") {
    return kind;
  }
  const ext = (0, _mime.getFileExtension)(attachment.path ?? attachment.url);
  if (!ext) {
    return "unknown";
  }
  if ([".mp4", ".mov", ".mkv", ".webm", ".avi", ".m4v"].includes(ext)) {
    return "video";
  }
  if ((0, _mime.isAudioFileName)(attachment.path ?? attachment.url)) {
    return "audio";
  }
  if ([".png", ".jpg", ".jpeg", ".webp", ".gif", ".bmp", ".tiff", ".tif"].includes(ext)) {
    return "image";
  }
  return "unknown";
}
function isVideoAttachment(attachment) {
  return resolveAttachmentKind(attachment) === "video";
}
function isAudioAttachment(attachment) {
  return resolveAttachmentKind(attachment) === "audio";
}
function isImageAttachment(attachment) {
  return resolveAttachmentKind(attachment) === "image";
}
function isAbortError(err) {
  if (!err) {
    return false;
  }
  if (err instanceof Error && err.name === "AbortError") {
    return true;
  }
  return false;
}
function resolveRequestUrl(input) {
  if (typeof input === "string") {
    return input;
  }
  if (input instanceof URL) {
    return input.toString();
  }
  return input.url;
}
function orderAttachments(attachments, prefer) {
  if (!prefer || prefer === "first") {
    return attachments;
  }
  if (prefer === "last") {
    return [...attachments].toReversed();
  }
  if (prefer === "path") {
    const withPath = attachments.filter((item) => item.path);
    const withoutPath = attachments.filter((item) => !item.path);
    return [...withPath, ...withoutPath];
  }
  if (prefer === "url") {
    const withUrl = attachments.filter((item) => item.url);
    const withoutUrl = attachments.filter((item) => !item.url);
    return [...withUrl, ...withoutUrl];
  }
  return attachments;
}
function selectAttachments(params) {
  const { capability, attachments, policy } = params;
  const matches = attachments.filter((item) => {
    if (capability === "image") {
      return isImageAttachment(item);
    }
    if (capability === "audio") {
      return isAudioAttachment(item);
    }
    return isVideoAttachment(item);
  });
  if (matches.length === 0) {
    return [];
  }
  const ordered = orderAttachments(matches, policy?.prefer);
  const mode = policy?.mode ?? "first";
  const maxAttachments = policy?.maxAttachments ?? DEFAULT_MAX_ATTACHMENTS;
  if (mode === "all") {
    return ordered.slice(0, Math.max(1, maxAttachments));
  }
  return ordered.slice(0, 1);
}
class MediaAttachmentCache {
  entries = new Map();
  attachments;
  constructor(attachments) {
    this.attachments = attachments;
    for (const attachment of attachments) {
      this.entries.set(attachment.index, { attachment });
    }
  }
  async getBuffer(params) {
    const entry = await this.ensureEntry(params.attachmentIndex);
    if (entry.buffer) {
      if (entry.buffer.length > params.maxBytes) {
        throw new _errors.MediaUnderstandingSkipError("maxBytes", `Attachment ${params.attachmentIndex + 1} exceeds maxBytes ${params.maxBytes}`);
      }
      return {
        buffer: entry.buffer,
        mime: entry.bufferMime,
        fileName: entry.bufferFileName ?? `media-${params.attachmentIndex + 1}`,
        size: entry.buffer.length
      };
    }
    if (entry.resolvedPath) {
      const size = await this.ensureLocalStat(entry);
      if (entry.resolvedPath) {
        if (size !== undefined && size > params.maxBytes) {
          throw new _errors.MediaUnderstandingSkipError("maxBytes", `Attachment ${params.attachmentIndex + 1} exceeds maxBytes ${params.maxBytes}`);
        }
        const buffer = await _promises.default.readFile(entry.resolvedPath);
        entry.buffer = buffer;
        entry.bufferMime =
        entry.bufferMime ??
        entry.attachment.mime ?? (
        await (0, _mime.detectMime)({
          buffer,
          filePath: entry.resolvedPath
        }));
        entry.bufferFileName =
        _nodePath.default.basename(entry.resolvedPath) || `media-${params.attachmentIndex + 1}`;
        return {
          buffer,
          mime: entry.bufferMime,
          fileName: entry.bufferFileName,
          size: buffer.length
        };
      }
    }
    const url = entry.attachment.url?.trim();
    if (!url) {
      throw new _errors.MediaUnderstandingSkipError("empty", `Attachment ${params.attachmentIndex + 1} has no path or URL.`);
    }
    try {
      const fetchImpl = (input, init) => (0, _shared.fetchWithTimeout)(resolveRequestUrl(input), init ?? {}, params.timeoutMs, fetch);
      const fetched = await (0, _fetch.fetchRemoteMedia)({ url, fetchImpl, maxBytes: params.maxBytes });
      entry.buffer = fetched.buffer;
      entry.bufferMime =
      entry.attachment.mime ??
      fetched.contentType ?? (
      await (0, _mime.detectMime)({
        buffer: fetched.buffer,
        filePath: fetched.fileName ?? url
      }));
      entry.bufferFileName = fetched.fileName ?? `media-${params.attachmentIndex + 1}`;
      return {
        buffer: fetched.buffer,
        mime: entry.bufferMime,
        fileName: entry.bufferFileName,
        size: fetched.buffer.length
      };
    }
    catch (err) {
      if (err instanceof _fetch.MediaFetchError && err.code === "max_bytes") {
        throw new _errors.MediaUnderstandingSkipError("maxBytes", `Attachment ${params.attachmentIndex + 1} exceeds maxBytes ${params.maxBytes}`);
      }
      if (isAbortError(err)) {
        throw new _errors.MediaUnderstandingSkipError("timeout", `Attachment ${params.attachmentIndex + 1} timed out while fetching.`);
      }
      throw err;
    }
  }
  async getPath(params) {
    const entry = await this.ensureEntry(params.attachmentIndex);
    if (entry.resolvedPath) {
      if (params.maxBytes) {
        const size = await this.ensureLocalStat(entry);
        if (entry.resolvedPath) {
          if (size !== undefined && size > params.maxBytes) {
            throw new _errors.MediaUnderstandingSkipError("maxBytes", `Attachment ${params.attachmentIndex + 1} exceeds maxBytes ${params.maxBytes}`);
          }
        }
      }
      if (entry.resolvedPath) {
        return { path: entry.resolvedPath };
      }
    }
    if (entry.tempPath) {
      if (params.maxBytes && entry.buffer && entry.buffer.length > params.maxBytes) {
        throw new _errors.MediaUnderstandingSkipError("maxBytes", `Attachment ${params.attachmentIndex + 1} exceeds maxBytes ${params.maxBytes}`);
      }
      return { path: entry.tempPath, cleanup: entry.tempCleanup };
    }
    const maxBytes = params.maxBytes ?? Number.POSITIVE_INFINITY;
    const bufferResult = await this.getBuffer({
      attachmentIndex: params.attachmentIndex,
      maxBytes,
      timeoutMs: params.timeoutMs
    });
    const extension = _nodePath.default.extname(bufferResult.fileName || "") || "";
    const tmpPath = _nodePath.default.join(_nodeOs.default.tmpdir(), `openclaw-media-${_nodeCrypto.default.randomUUID()}${extension}`);
    await _promises.default.writeFile(tmpPath, bufferResult.buffer);
    entry.tempPath = tmpPath;
    entry.tempCleanup = async () => {
      await _promises.default.unlink(tmpPath).catch(() => {});
    };
    return { path: tmpPath, cleanup: entry.tempCleanup };
  }
  async cleanup() {
    const cleanups = [];
    for (const entry of this.entries.values()) {
      if (entry.tempCleanup) {
        cleanups.push(Promise.resolve(entry.tempCleanup()));
        entry.tempCleanup = undefined;
      }
    }
    await Promise.all(cleanups);
  }
  async ensureEntry(attachmentIndex) {
    const existing = this.entries.get(attachmentIndex);
    if (existing) {
      if (!existing.resolvedPath) {
        existing.resolvedPath = this.resolveLocalPath(existing.attachment);
      }
      return existing;
    }
    const attachment = this.attachments.find((item) => item.index === attachmentIndex) ?? {
      index: attachmentIndex
    };
    const entry = {
      attachment,
      resolvedPath: this.resolveLocalPath(attachment)
    };
    this.entries.set(attachmentIndex, entry);
    return entry;
  }
  resolveLocalPath(attachment) {
    const rawPath = normalizeAttachmentPath(attachment.path);
    if (!rawPath) {
      return undefined;
    }
    return _nodePath.default.isAbsolute(rawPath) ? rawPath : _nodePath.default.resolve(rawPath);
  }
  async ensureLocalStat(entry) {
    if (!entry.resolvedPath) {
      return undefined;
    }
    if (entry.statSize !== undefined) {
      return entry.statSize;
    }
    try {
      const stat = await _promises.default.stat(entry.resolvedPath);
      if (!stat.isFile()) {
        entry.resolvedPath = undefined;
        return undefined;
      }
      entry.statSize = stat.size;
      return stat.size;
    }
    catch (err) {
      entry.resolvedPath = undefined;
      if ((0, _globals.shouldLogVerbose)()) {
        (0, _globals.logVerbose)(`Failed to read attachment ${entry.attachment.index + 1}: ${String(err)}`);
      }
      return undefined;
    }
  }
}exports.MediaAttachmentCache = MediaAttachmentCache; /* v9-8328bd93c5d9e000 */
