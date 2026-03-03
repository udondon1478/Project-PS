"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.createMemoryGetTool = createMemoryGetTool;exports.createMemorySearchTool = createMemorySearchTool;var _typebox = require("@sinclair/typebox");
var _index = require("../../memory/index.js");
var _agentScope = require("../agent-scope.js");
var _memorySearch = require("../memory-search.js");
var _common = require("./common.js");
const MemorySearchSchema = _typebox.Type.Object({
  query: _typebox.Type.String(),
  maxResults: _typebox.Type.Optional(_typebox.Type.Number()),
  minScore: _typebox.Type.Optional(_typebox.Type.Number())
});
const MemoryGetSchema = _typebox.Type.Object({
  path: _typebox.Type.String(),
  from: _typebox.Type.Optional(_typebox.Type.Number()),
  lines: _typebox.Type.Optional(_typebox.Type.Number())
});
function createMemorySearchTool(options) {
  const cfg = options.config;
  if (!cfg) {
    return null;
  }
  const agentId = (0, _agentScope.resolveSessionAgentId)({
    sessionKey: options.agentSessionKey,
    config: cfg
  });
  if (!(0, _memorySearch.resolveMemorySearchConfig)(cfg, agentId)) {
    return null;
  }
  return {
    label: "Memory Search",
    name: "memory_search",
    description: "Mandatory recall step: semantically search MEMORY.md + memory/*.md (and optional session transcripts) before answering questions about prior work, decisions, dates, people, preferences, or todos; returns top snippets with path + lines.",
    parameters: MemorySearchSchema,
    execute: async (_toolCallId, params) => {
      const query = (0, _common.readStringParam)(params, "query", { required: true });
      const maxResults = (0, _common.readNumberParam)(params, "maxResults");
      const minScore = (0, _common.readNumberParam)(params, "minScore");
      const { manager, error } = await (0, _index.getMemorySearchManager)({
        cfg,
        agentId
      });
      if (!manager) {
        return (0, _common.jsonResult)({ results: [], disabled: true, error });
      }
      try {
        const results = await manager.search(query, {
          maxResults,
          minScore,
          sessionKey: options.agentSessionKey
        });
        const status = manager.status();
        return (0, _common.jsonResult)({
          results,
          provider: status.provider,
          model: status.model,
          fallback: status.fallback
        });
      }
      catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return (0, _common.jsonResult)({ results: [], disabled: true, error: message });
      }
    }
  };
}
function createMemoryGetTool(options) {
  const cfg = options.config;
  if (!cfg) {
    return null;
  }
  const agentId = (0, _agentScope.resolveSessionAgentId)({
    sessionKey: options.agentSessionKey,
    config: cfg
  });
  if (!(0, _memorySearch.resolveMemorySearchConfig)(cfg, agentId)) {
    return null;
  }
  return {
    label: "Memory Get",
    name: "memory_get",
    description: "Safe snippet read from MEMORY.md, memory/*.md, or configured memorySearch.extraPaths with optional from/lines; use after memory_search to pull only the needed lines and keep context small.",
    parameters: MemoryGetSchema,
    execute: async (_toolCallId, params) => {
      const relPath = (0, _common.readStringParam)(params, "path", { required: true });
      const from = (0, _common.readNumberParam)(params, "from", { integer: true });
      const lines = (0, _common.readNumberParam)(params, "lines", { integer: true });
      const { manager, error } = await (0, _index.getMemorySearchManager)({
        cfg,
        agentId
      });
      if (!manager) {
        return (0, _common.jsonResult)({ path: relPath, text: "", disabled: true, error });
      }
      try {
        const result = await manager.readFile({
          relPath,
          from: from ?? undefined,
          lines: lines ?? undefined
        });
        return (0, _common.jsonResult)(result);
      }
      catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return (0, _common.jsonResult)({ path: relPath, text: "", disabled: true, error: message });
      }
    }
  };
} /* v9-7729ad31e8897feb */
