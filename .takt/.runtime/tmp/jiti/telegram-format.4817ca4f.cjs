"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.markdownToTelegramChunks = markdownToTelegramChunks;exports.markdownToTelegramHtml = markdownToTelegramHtml;exports.markdownToTelegramHtmlChunks = markdownToTelegramHtmlChunks;exports.renderTelegramHtmlText = renderTelegramHtmlText;var _ir = require("../markdown/ir.js");
var _render = require("../markdown/render.js");
function escapeHtml(text) {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function escapeHtmlAttr(text) {
  return escapeHtml(text).replace(/"/g, "&quot;");
}
function buildTelegramLink(link, _text) {
  const href = link.href.trim();
  if (!href) {
    return null;
  }
  if (link.start === link.end) {
    return null;
  }
  const safeHref = escapeHtmlAttr(href);
  return {
    start: link.start,
    end: link.end,
    open: `<a href="${safeHref}">`,
    close: "</a>"
  };
}
function renderTelegramHtml(ir) {
  return (0, _render.renderMarkdownWithMarkers)(ir, {
    styleMarkers: {
      bold: { open: "<b>", close: "</b>" },
      italic: { open: "<i>", close: "</i>" },
      strikethrough: { open: "<s>", close: "</s>" },
      code: { open: "<code>", close: "</code>" },
      code_block: { open: "<pre><code>", close: "</code></pre>" }
    },
    escapeText: escapeHtml,
    buildLink: buildTelegramLink
  });
}
function markdownToTelegramHtml(markdown, options = {}) {
  const ir = (0, _ir.markdownToIR)(markdown ?? "", {
    linkify: true,
    headingStyle: "none",
    blockquotePrefix: "",
    tableMode: options.tableMode
  });
  return renderTelegramHtml(ir);
}
function renderTelegramHtmlText(text, options = {}) {
  const textMode = options.textMode ?? "markdown";
  if (textMode === "html") {
    return text;
  }
  return markdownToTelegramHtml(text, { tableMode: options.tableMode });
}
function markdownToTelegramChunks(markdown, limit, options = {}) {
  const ir = (0, _ir.markdownToIR)(markdown ?? "", {
    linkify: true,
    headingStyle: "none",
    blockquotePrefix: "",
    tableMode: options.tableMode
  });
  const chunks = (0, _ir.chunkMarkdownIR)(ir, limit);
  return chunks.map((chunk) => ({
    html: renderTelegramHtml(chunk),
    text: chunk.text
  }));
}
function markdownToTelegramHtmlChunks(markdown, limit) {
  return markdownToTelegramChunks(markdown, limit).map((chunk) => chunk.html);
} /* v9-b5bd26f580d93915 */
