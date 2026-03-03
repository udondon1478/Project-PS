"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.normalizePluginHttpPath = normalizePluginHttpPath;function normalizePluginHttpPath(path, fallback) {
  const trimmed = path?.trim();
  if (!trimmed) {
    const fallbackTrimmed = fallback?.trim();
    if (!fallbackTrimmed) {
      return null;
    }
    return fallbackTrimmed.startsWith("/") ? fallbackTrimmed : `/${fallbackTrimmed}`;
  }
  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
} /* v9-005ce221870fd2c5 */
