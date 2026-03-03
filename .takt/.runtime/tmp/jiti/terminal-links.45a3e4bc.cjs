"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.DOCS_ROOT = void 0;exports.formatDocsLink = formatDocsLink;exports.formatDocsRootLink = formatDocsRootLink;var _utils = require("../utils.js");
const DOCS_ROOT = exports.DOCS_ROOT = "https://docs.openclaw.ai";
function formatDocsLink(path, label, opts) {
  const trimmed = path.trim();
  const url = trimmed.startsWith("http") ?
  trimmed :
  `${DOCS_ROOT}${trimmed.startsWith("/") ? trimmed : `/${trimmed}`}`;
  return (0, _utils.formatTerminalLink)(label ?? url, url, {
    fallback: opts?.fallback ?? url,
    force: opts?.force
  });
}
function formatDocsRootLink(label) {
  return (0, _utils.formatTerminalLink)(label ?? DOCS_ROOT, DOCS_ROOT, {
    fallback: DOCS_ROOT
  });
} /* v9-df08ed5612c343e3 */
