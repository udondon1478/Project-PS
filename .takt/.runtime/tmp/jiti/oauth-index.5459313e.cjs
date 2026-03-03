"use strict";Object.defineProperty(exports, "__esModule", { value: true });var _exportNames = { getOAuthProvider: true, registerOAuthProvider: true, getOAuthProviders: true, getOAuthProviderInfoList: true, refreshOAuthToken: true, getOAuthApiKey: true, anthropicOAuthProvider: true, loginAnthropic: true, refreshAnthropicToken: true, getGitHubCopilotBaseUrl: true, githubCopilotOAuthProvider: true, loginGitHubCopilot: true, normalizeDomain: true, refreshGitHubCopilotToken: true, antigravityOAuthProvider: true, loginAntigravity: true, refreshAntigravityToken: true, geminiCliOAuthProvider: true, loginGeminiCli: true, refreshGoogleCloudToken: true, loginOpenAICodex: true, openaiCodexOAuthProvider: true, refreshOpenAICodexToken: true };Object.defineProperty(exports, "anthropicOAuthProvider", { enumerable: true, get: function () {return _anthropic.anthropicOAuthProvider;} });Object.defineProperty(exports, "antigravityOAuthProvider", { enumerable: true, get: function () {return _googleAntigravity.antigravityOAuthProvider;} });Object.defineProperty(exports, "geminiCliOAuthProvider", { enumerable: true, get: function () {return _googleGeminiCli.geminiCliOAuthProvider;} });Object.defineProperty(exports, "getGitHubCopilotBaseUrl", { enumerable: true, get: function () {return _githubCopilot.getGitHubCopilotBaseUrl;} });exports.getOAuthApiKey = getOAuthApiKey;exports.getOAuthProvider = getOAuthProvider;exports.getOAuthProviderInfoList = getOAuthProviderInfoList;exports.getOAuthProviders = getOAuthProviders;Object.defineProperty(exports, "githubCopilotOAuthProvider", { enumerable: true, get: function () {return _githubCopilot.githubCopilotOAuthProvider;} });Object.defineProperty(exports, "loginAnthropic", { enumerable: true, get: function () {return _anthropic.loginAnthropic;} });Object.defineProperty(exports, "loginAntigravity", { enumerable: true, get: function () {return _googleAntigravity.loginAntigravity;} });Object.defineProperty(exports, "loginGeminiCli", { enumerable: true, get: function () {return _googleGeminiCli.loginGeminiCli;} });Object.defineProperty(exports, "loginGitHubCopilot", { enumerable: true, get: function () {return _githubCopilot.loginGitHubCopilot;} });Object.defineProperty(exports, "loginOpenAICodex", { enumerable: true, get: function () {return _openaiCodex.loginOpenAICodex;} });Object.defineProperty(exports, "normalizeDomain", { enumerable: true, get: function () {return _githubCopilot.normalizeDomain;} });Object.defineProperty(exports, "openaiCodexOAuthProvider", { enumerable: true, get: function () {return _openaiCodex.openaiCodexOAuthProvider;} });Object.defineProperty(exports, "refreshAnthropicToken", { enumerable: true, get: function () {return _anthropic.refreshAnthropicToken;} });Object.defineProperty(exports, "refreshAntigravityToken", { enumerable: true, get: function () {return _googleAntigravity.refreshAntigravityToken;} });Object.defineProperty(exports, "refreshGitHubCopilotToken", { enumerable: true, get: function () {return _githubCopilot.refreshGitHubCopilotToken;} });Object.defineProperty(exports, "refreshGoogleCloudToken", { enumerable: true, get: function () {return _googleGeminiCli.refreshGoogleCloudToken;} });exports.refreshOAuthToken = refreshOAuthToken;Object.defineProperty(exports, "refreshOpenAICodexToken", { enumerable: true, get: function () {return _openaiCodex.refreshOpenAICodexToken;} });exports.registerOAuthProvider = registerOAuthProvider;










require("../http-proxy.js");

var _anthropic = require("./anthropic.js");

var _githubCopilot = require("./github-copilot.js");

var _googleAntigravity = require("./google-antigravity.js");

var _googleGeminiCli = require("./google-gemini-cli.js");

var _openaiCodex = require("./openai-codex.js");
var _types = require("./types.js");Object.keys(_types).forEach(function (key) {if (key === "default" || key === "__esModule") return;if (Object.prototype.hasOwnProperty.call(_exportNames, key)) return;if (key in exports && exports[key] === _types[key]) return;Object.defineProperty(exports, key, { enumerable: true, get: function () {return _types[key];} });}); /**
 * OAuth credential management for AI providers.
 *
 * This module handles login, token refresh, and credential storage
 * for OAuth-based providers:
 * - Anthropic (Claude Pro/Max)
 * - GitHub Copilot
 * - Google Cloud Code Assist (Gemini CLI)
 * - Antigravity (Gemini 3, Claude, GPT-OSS via Google Cloud)
 */ // Set up HTTP proxy for fetch() calls (respects HTTP_PROXY, HTTPS_PROXY env vars)
// Anthropic
// GitHub Copilot
// Google Antigravity
// Google Gemini CLI
// OpenAI Codex (ChatGPT OAuth)
// ============================================================================
// Provider Registry
// ============================================================================
const oauthProviderRegistry = new Map([[_anthropic.anthropicOAuthProvider.id, _anthropic.anthropicOAuthProvider], [_githubCopilot.githubCopilotOAuthProvider.id, _githubCopilot.githubCopilotOAuthProvider], [_googleGeminiCli.geminiCliOAuthProvider.id, _googleGeminiCli.geminiCliOAuthProvider], [_googleAntigravity.antigravityOAuthProvider.id, _googleAntigravity.antigravityOAuthProvider], [_openaiCodex.openaiCodexOAuthProvider.id, _openaiCodex.openaiCodexOAuthProvider]]); /**
 * Get an OAuth provider by ID
 */function getOAuthProvider(id) {return oauthProviderRegistry.get(id);
}
/**
 * Register a custom OAuth provider
 */
function registerOAuthProvider(provider) {
  oauthProviderRegistry.set(provider.id, provider);
}
/**
 * Get all registered OAuth providers
 */
function getOAuthProviders() {
  return Array.from(oauthProviderRegistry.values());
}
/**
 * @deprecated Use getOAuthProviders() which returns OAuthProviderInterface[]
 */
function getOAuthProviderInfoList() {
  return getOAuthProviders().map((p) => ({
    id: p.id,
    name: p.name,
    available: true
  }));
}
// ============================================================================
// High-level API (uses provider registry)
// ============================================================================
/**
 * Refresh token for any OAuth provider.
 * @deprecated Use getOAuthProvider(id).refreshToken() instead
 */
async function refreshOAuthToken(providerId, credentials) {
  const provider = getOAuthProvider(providerId);
  if (!provider) {
    throw new Error(`Unknown OAuth provider: ${providerId}`);
  }
  return provider.refreshToken(credentials);
}
/**
 * Get API key for a provider from OAuth credentials.
 * Automatically refreshes expired tokens.
 *
 * @returns API key string and updated credentials, or null if no credentials
 * @throws Error if refresh fails
 */
async function getOAuthApiKey(providerId, credentials) {
  const provider = getOAuthProvider(providerId);
  if (!provider) {
    throw new Error(`Unknown OAuth provider: ${providerId}`);
  }
  let creds = credentials[providerId];
  if (!creds) {
    return null;
  }
  // Refresh if expired
  if (Date.now() >= creds.expires) {
    try {
      creds = await provider.refreshToken(creds);
    }
    catch (_error) {
      throw new Error(`Failed to refresh OAuth token for ${providerId}`);
    }
  }
  const apiKey = provider.getApiKey(creds);
  return { newCredentials: creds, apiKey };
} /* v9-41016b8d9ef28916 */
