"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.fetchJson = fetchJson;async function fetchJson(url, init, timeoutMs, fetchFn) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetchFn(url, { ...init, signal: controller.signal });
  } finally
  {
    clearTimeout(timer);
  }
} /* v9-5cb18e66f5d8766e */
