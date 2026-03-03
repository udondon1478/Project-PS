"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.normalizeInboundTextNewlines = normalizeInboundTextNewlines;function normalizeInboundTextNewlines(input) {
  return input.replaceAll("\r\n", "\n").replaceAll("\r", "\n").replaceAll("\\n", "\n");
} /* v9-c4c9ea8542c870b6 */
