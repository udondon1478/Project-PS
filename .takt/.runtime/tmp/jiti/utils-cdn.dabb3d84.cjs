"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.buildCDNUrl = buildCDNUrl; /**
 * Builds a Discord CDN URL with optional format and size parameters
 * @param baseUrl The base URL without extension or query parameters
 * @param hash The image hash (returns null if hash is null/undefined)
 * @param options Optional format and size parameters
 * @returns The complete CDN URL or null if hash is not provided
 */
function buildCDNUrl(baseUrl, hash, options = {}) {
  if (!hash)
  return null;
  const format = options.format ?? "png";
  const url = `${baseUrl}/${hash}.${format}`;
  if (options.size) {
    return `${url}?size=${options.size}`;
  }
  return url;
} /* v9-863e1404b8a03802 */
