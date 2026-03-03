"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.DEFAULT_BROWSER_SCREENSHOT_MAX_SIDE = exports.DEFAULT_BROWSER_SCREENSHOT_MAX_BYTES = void 0;exports.normalizeBrowserScreenshot = normalizeBrowserScreenshot;var _imageOps = require("../media/image-ops.js");
const DEFAULT_BROWSER_SCREENSHOT_MAX_SIDE = exports.DEFAULT_BROWSER_SCREENSHOT_MAX_SIDE = 2000;
const DEFAULT_BROWSER_SCREENSHOT_MAX_BYTES = exports.DEFAULT_BROWSER_SCREENSHOT_MAX_BYTES = 5 * 1024 * 1024;
async function normalizeBrowserScreenshot(buffer, opts) {
  const maxSide = Math.max(1, Math.round(opts?.maxSide ?? DEFAULT_BROWSER_SCREENSHOT_MAX_SIDE));
  const maxBytes = Math.max(1, Math.round(opts?.maxBytes ?? DEFAULT_BROWSER_SCREENSHOT_MAX_BYTES));
  const meta = await (0, _imageOps.getImageMetadata)(buffer);
  const width = Number(meta?.width ?? 0);
  const height = Number(meta?.height ?? 0);
  const maxDim = Math.max(width, height);
  if (buffer.byteLength <= maxBytes && (maxDim === 0 || width <= maxSide && height <= maxSide)) {
    return { buffer };
  }
  const qualities = [85, 75, 65, 55, 45, 35];
  const sideStart = maxDim > 0 ? Math.min(maxSide, maxDim) : maxSide;
  const sideGrid = [sideStart, 1800, 1600, 1400, 1200, 1000, 800].
  map((v) => Math.min(maxSide, v)).
  filter((v, i, arr) => v > 0 && arr.indexOf(v) === i).
  toSorted((a, b) => b - a);
  let smallest = null;
  for (const side of sideGrid) {
    for (const quality of qualities) {
      const out = await (0, _imageOps.resizeToJpeg)({
        buffer,
        maxSide: side,
        quality,
        withoutEnlargement: true
      });
      if (!smallest || out.byteLength < smallest.size) {
        smallest = { buffer: out, size: out.byteLength };
      }
      if (out.byteLength <= maxBytes) {
        return { buffer: out, contentType: "image/jpeg" };
      }
    }
  }
  const best = smallest?.buffer ?? buffer;
  throw new Error(`Browser screenshot could not be reduced below ${(maxBytes / (1024 * 1024)).toFixed(0)}MB (got ${(best.byteLength / (1024 * 1024)).toFixed(2)}MB)`);
} /* v9-0f152dfff17d8b3e */
