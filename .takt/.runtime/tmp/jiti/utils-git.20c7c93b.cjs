"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.looksLikeGitUrl = looksLikeGitUrl;const GIT_HOSTS = ["github.com", "gitlab.com", "bitbucket.org", "codeberg.org"];
function looksLikeGitUrl(source) {
  const normalized = source.replace(/^https?:\/\//, "");
  return GIT_HOSTS.some((host) => normalized.startsWith(`${host}/`));
} /* v9-5b7c77d17112e50a */
