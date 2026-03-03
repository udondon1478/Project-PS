"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.SLACK_DEFAULT_RETRY_OPTIONS = void 0;exports.createSlackWebClient = createSlackWebClient;exports.resolveSlackWebClientOptions = resolveSlackWebClientOptions;var _webApi = require("@slack/web-api");
const SLACK_DEFAULT_RETRY_OPTIONS = exports.SLACK_DEFAULT_RETRY_OPTIONS = {
  retries: 2,
  factor: 2,
  minTimeout: 500,
  maxTimeout: 3000,
  randomize: true
};
function resolveSlackWebClientOptions(options = {}) {
  return {
    ...options,
    retryConfig: options.retryConfig ?? SLACK_DEFAULT_RETRY_OPTIONS
  };
}
function createSlackWebClient(token, options = {}) {
  return new _webApi.WebClient(token, resolveSlackWebClientOptions(options));
} /* v9-967c1702a2b10db4 */
