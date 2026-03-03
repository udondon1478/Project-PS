"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.makeProxyFetch = makeProxyFetch;
var _undici = require("undici");
var _fetch = require("../infra/fetch.js"); // @ts-nocheck
function makeProxyFetch(proxyUrl) {
  const agent = new _undici.ProxyAgent(proxyUrl);
  return (0, _fetch.wrapFetchWithAbortSignal)((input, init) => {
    const base = init ? { ...init } : {};
    return (0, _undici.fetch)(input, { ...base, dispatcher: agent });
  });
} /* v9-655e23839fffbc10 */
