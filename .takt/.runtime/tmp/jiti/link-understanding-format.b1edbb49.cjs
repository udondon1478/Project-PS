"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.formatLinkUnderstandingBody = formatLinkUnderstandingBody;function formatLinkUnderstandingBody(params) {
  const outputs = params.outputs.map((output) => output.trim()).filter(Boolean);
  if (outputs.length === 0) {
    return params.body ?? "";
  }
  const base = (params.body ?? "").trim();
  if (!base) {
    return outputs.join("\n");
  }
  return `${base}\n\n${outputs.join("\n")}`;
} /* v9-c499d1f6c5800d74 */
