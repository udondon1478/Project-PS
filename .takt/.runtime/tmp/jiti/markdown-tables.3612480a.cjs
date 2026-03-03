"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.convertMarkdownTables = convertMarkdownTables;var _ir = require("./ir.js");
var _render = require("./render.js");
const MARKDOWN_STYLE_MARKERS = {
  bold: { open: "**", close: "**" },
  italic: { open: "_", close: "_" },
  strikethrough: { open: "~~", close: "~~" },
  code: { open: "`", close: "`" },
  code_block: { open: "```\n", close: "```" }
};
function convertMarkdownTables(markdown, mode) {
  if (!markdown || mode === "off") {
    return markdown;
  }
  const { ir, hasTables } = (0, _ir.markdownToIRWithMeta)(markdown, {
    linkify: false,
    autolink: false,
    headingStyle: "none",
    blockquotePrefix: "",
    tableMode: mode
  });
  if (!hasTables) {
    return markdown;
  }
  return (0, _render.renderMarkdownWithMarkers)(ir, {
    styleMarkers: MARKDOWN_STYLE_MARKERS,
    escapeText: (text) => text,
    buildLink: (link, text) => {
      const href = link.href.trim();
      if (!href) {
        return null;
      }
      const label = text.slice(link.start, link.end);
      if (!label) {
        return null;
      }
      return { start: link.start, end: link.end, open: "[", close: `](${href})` };
    }
  });
} /* v9-0322cb12fe472bd5 */
