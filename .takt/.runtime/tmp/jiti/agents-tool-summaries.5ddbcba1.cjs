"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.buildToolSummaryMap = buildToolSummaryMap;function buildToolSummaryMap(tools) {
  const summaries = {};
  for (const tool of tools) {
    const summary = tool.description?.trim() || tool.label?.trim();
    if (!summary) {
      continue;
    }
    summaries[tool.name.toLowerCase()] = summary;
  }
  return summaries;
} /* v9-620ed55b5f7b85db */
