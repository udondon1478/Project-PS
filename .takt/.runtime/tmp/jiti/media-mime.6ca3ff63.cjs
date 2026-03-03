"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.detectMime = detectMime;exports.extensionForMime = extensionForMime;exports.getFileExtension = getFileExtension;exports.imageMimeFromFormat = imageMimeFromFormat;exports.isAudioFileName = isAudioFileName;exports.isGifMedia = isGifMedia;exports.kindFromMime = kindFromMime;var _fileType = require("file-type");
var _nodePath = _interopRequireDefault(require("node:path"));
var _constants = require("./constants.js");function _interopRequireDefault(e) {return e && e.__esModule ? e : { default: e };}
// Map common mimes to preferred file extensions.
const EXT_BY_MIME = {
  "image/heic": ".heic",
  "image/heif": ".heif",
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
  "audio/ogg": ".ogg",
  "audio/mpeg": ".mp3",
  "audio/x-m4a": ".m4a",
  "audio/mp4": ".m4a",
  "video/mp4": ".mp4",
  "video/quicktime": ".mov",
  "application/pdf": ".pdf",
  "application/json": ".json",
  "application/zip": ".zip",
  "application/gzip": ".gz",
  "application/x-tar": ".tar",
  "application/x-7z-compressed": ".7z",
  "application/vnd.rar": ".rar",
  "application/msword": ".doc",
  "application/vnd.ms-excel": ".xls",
  "application/vnd.ms-powerpoint": ".ppt",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ".xlsx",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": ".pptx",
  "text/csv": ".csv",
  "text/plain": ".txt",
  "text/markdown": ".md"
};
const MIME_BY_EXT = {
  ...Object.fromEntries(Object.entries(EXT_BY_MIME).map(([mime, ext]) => [ext, mime])),
  // Additional extension aliases
  ".jpeg": "image/jpeg"
};
const AUDIO_FILE_EXTENSIONS = new Set([
".aac",
".flac",
".m4a",
".mp3",
".oga",
".ogg",
".opus",
".wav"]
);
function normalizeHeaderMime(mime) {
  if (!mime) {
    return undefined;
  }
  const cleaned = mime.split(";")[0]?.trim().toLowerCase();
  return cleaned || undefined;
}
async function sniffMime(buffer) {
  if (!buffer) {
    return undefined;
  }
  try {
    const type = await (0, _fileType.fileTypeFromBuffer)(buffer);
    return type?.mime ?? undefined;
  }
  catch {
    return undefined;
  }
}
function getFileExtension(filePath) {
  if (!filePath) {
    return undefined;
  }
  try {
    if (/^https?:\/\//i.test(filePath)) {
      const url = new URL(filePath);
      return _nodePath.default.extname(url.pathname).toLowerCase() || undefined;
    }
  }
  catch {

    // fall back to plain path parsing
  }const ext = _nodePath.default.extname(filePath).toLowerCase();
  return ext || undefined;
}
function isAudioFileName(fileName) {
  const ext = getFileExtension(fileName);
  if (!ext) {
    return false;
  }
  return AUDIO_FILE_EXTENSIONS.has(ext);
}
function detectMime(opts) {
  return detectMimeImpl(opts);
}
function isGenericMime(mime) {
  if (!mime) {
    return true;
  }
  const m = mime.toLowerCase();
  return m === "application/octet-stream" || m === "application/zip";
}
async function detectMimeImpl(opts) {
  const ext = getFileExtension(opts.filePath);
  const extMime = ext ? MIME_BY_EXT[ext] : undefined;
  const headerMime = normalizeHeaderMime(opts.headerMime);
  const sniffed = await sniffMime(opts.buffer);
  // Prefer sniffed types, but don't let generic container types override a more
  // specific extension mapping (e.g. XLSX vs ZIP).
  if (sniffed && (!isGenericMime(sniffed) || !extMime)) {
    return sniffed;
  }
  if (extMime) {
    return extMime;
  }
  if (headerMime && !isGenericMime(headerMime)) {
    return headerMime;
  }
  if (sniffed) {
    return sniffed;
  }
  if (headerMime) {
    return headerMime;
  }
  return undefined;
}
function extensionForMime(mime) {
  if (!mime) {
    return undefined;
  }
  return EXT_BY_MIME[mime.toLowerCase()];
}
function isGifMedia(opts) {
  if (opts.contentType?.toLowerCase() === "image/gif") {
    return true;
  }
  const ext = getFileExtension(opts.fileName);
  return ext === ".gif";
}
function imageMimeFromFormat(format) {
  if (!format) {
    return undefined;
  }
  switch (format.toLowerCase()) {
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "heic":
      return "image/heic";
    case "heif":
      return "image/heif";
    case "png":
      return "image/png";
    case "webp":
      return "image/webp";
    case "gif":
      return "image/gif";
    default:
      return undefined;
  }
}
function kindFromMime(mime) {
  return (0, _constants.mediaKindFromMime)(mime);
} /* v9-7d54f45dcc435dd0 */
