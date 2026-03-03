"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.persistSessionUsageUpdate = persistSessionUsageUpdate;var _cliSession = require("../../agents/cli-session.js");
var _usage = require("../../agents/usage.js");
var _sessions = require("../../config/sessions.js");
var _globals = require("../../globals.js");
async function persistSessionUsageUpdate(params) {
  const { storePath, sessionKey } = params;
  if (!storePath || !sessionKey) {
    return;
  }
  const label = params.logLabel ? `${params.logLabel} ` : "";
  if ((0, _usage.hasNonzeroUsage)(params.usage)) {
    try {
      await (0, _sessions.updateSessionStoreEntry)({
        storePath,
        sessionKey,
        update: async (entry) => {
          const input = params.usage?.input ?? 0;
          const output = params.usage?.output ?? 0;
          const promptTokens = input + (params.usage?.cacheRead ?? 0) + (params.usage?.cacheWrite ?? 0);
          const patch = {
            inputTokens: input,
            outputTokens: output,
            totalTokens: promptTokens > 0 ? promptTokens : params.usage?.total ?? input,
            modelProvider: params.providerUsed ?? entry.modelProvider,
            model: params.modelUsed ?? entry.model,
            contextTokens: params.contextTokensUsed ?? entry.contextTokens,
            systemPromptReport: params.systemPromptReport ?? entry.systemPromptReport,
            updatedAt: Date.now()
          };
          const cliProvider = params.providerUsed ?? entry.modelProvider;
          if (params.cliSessionId && cliProvider) {
            const nextEntry = { ...entry, ...patch };
            (0, _cliSession.setCliSessionId)(nextEntry, cliProvider, params.cliSessionId);
            return {
              ...patch,
              cliSessionIds: nextEntry.cliSessionIds,
              claudeCliSessionId: nextEntry.claudeCliSessionId
            };
          }
          return patch;
        }
      });
    }
    catch (err) {
      (0, _globals.logVerbose)(`failed to persist ${label}usage update: ${String(err)}`);
    }
    return;
  }
  if (params.modelUsed || params.contextTokensUsed) {
    try {
      await (0, _sessions.updateSessionStoreEntry)({
        storePath,
        sessionKey,
        update: async (entry) => {
          const patch = {
            modelProvider: params.providerUsed ?? entry.modelProvider,
            model: params.modelUsed ?? entry.model,
            contextTokens: params.contextTokensUsed ?? entry.contextTokens,
            systemPromptReport: params.systemPromptReport ?? entry.systemPromptReport,
            updatedAt: Date.now()
          };
          const cliProvider = params.providerUsed ?? entry.modelProvider;
          if (params.cliSessionId && cliProvider) {
            const nextEntry = { ...entry, ...patch };
            (0, _cliSession.setCliSessionId)(nextEntry, cliProvider, params.cliSessionId);
            return {
              ...patch,
              cliSessionIds: nextEntry.cliSessionIds,
              claudeCliSessionId: nextEntry.claudeCliSessionId
            };
          }
          return patch;
        }
      });
    }
    catch (err) {
      (0, _globals.logVerbose)(`failed to persist ${label}model/context update: ${String(err)}`);
    }
  }
} /* v9-e662f68abadf7510 */
