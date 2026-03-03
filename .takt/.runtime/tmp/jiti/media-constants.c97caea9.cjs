"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.MAX_VIDEO_BYTES = exports.MAX_IMAGE_BYTES = exports.MAX_DOCUMENT_BYTES = exports.MAX_AUDIO_BYTES = void 0;exports.maxBytesForKind = maxBytesForKind;exports.mediaKindFromMime = mediaKindFromMime;const MAX_IMAGE_BYTES = exports.MAX_IMAGE_BYTES = 6 * 1024 * 1024; // 6MB
const MAX_AUDIO_BYTES = exports.MAX_AUDIO_BYTES = 16 * 1024 * 1024; // 16MB
const MAX_VIDEO_BYTES = exports.MAX_VIDEO_BYTES = 16 * 1024 * 1024; // 16MB
const MAX_DOCUMENT_BYTES = exports.MAX_DOCUMENT_BYTES = 100 * 1024 * 1024; // 100MB
function mediaKindFromMime(mime) {
  if (!mime) {
    return "unknown";
  }
  if (mime.startsWith("image/")) {
    return "image";
  }
  if (mime.startsWith("audio/")) {
    return "audio";
  }
  if (mime.startsWith("video/")) {
    return "video";
  }
  if (mime === "application/pdf") {
    return "document";
  }
  if (mime.startsWith("application/")) {
    return "document";
  }
  return "unknown";
}
function maxBytesForKind(kind) {
  switch (kind) {
    case "image":
      return MAX_IMAGE_BYTES;
    case "audio":
      return MAX_AUDIO_BYTES;
    case "video":
      return MAX_VIDEO_BYTES;
    case "document":
      return MAX_DOCUMENT_BYTES;
    default:
      return MAX_DOCUMENT_BYTES;
  }
} /* v9-d3dcec10b0a885ba */
