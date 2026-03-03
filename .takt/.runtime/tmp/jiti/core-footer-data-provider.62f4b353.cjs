"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.FooterDataProvider = void 0;var _fs = require("fs");
var _path = require("path");
/**
 * Find the git HEAD path by walking up from cwd.
 * Handles both regular git repos (.git is a directory) and worktrees (.git is a file).
 */
function findGitHeadPath() {
  let dir = process.cwd();
  while (true) {
    const gitPath = (0, _path.join)(dir, ".git");
    if ((0, _fs.existsSync)(gitPath)) {
      try {
        const stat = (0, _fs.statSync)(gitPath);
        if (stat.isFile()) {
          const content = (0, _fs.readFileSync)(gitPath, "utf8").trim();
          if (content.startsWith("gitdir: ")) {
            const gitDir = content.slice(8);
            const headPath = (0, _path.resolve)(dir, gitDir, "HEAD");
            if ((0, _fs.existsSync)(headPath))
            return headPath;
          }
        } else
        if (stat.isDirectory()) {
          const headPath = (0, _path.join)(gitPath, "HEAD");
          if ((0, _fs.existsSync)(headPath))
          return headPath;
        }
      }
      catch {
        return null;
      }
    }
    const parent = (0, _path.dirname)(dir);
    if (parent === dir)
    return null;
    dir = parent;
  }
}
/**
 * Provides git branch and extension statuses - data not otherwise accessible to extensions.
 * Token stats, model info available via ctx.sessionManager and ctx.model.
 */
class FooterDataProvider {
  extensionStatuses = new Map();
  cachedBranch = undefined;
  gitWatcher = null;
  branchChangeCallbacks = new Set();
  availableProviderCount = 0;
  constructor() {
    this.setupGitWatcher();
  }
  /** Current git branch, null if not in repo, "detached" if detached HEAD */
  getGitBranch() {
    if (this.cachedBranch !== undefined)
    return this.cachedBranch;
    try {
      const gitHeadPath = findGitHeadPath();
      if (!gitHeadPath) {
        this.cachedBranch = null;
        return null;
      }
      const content = (0, _fs.readFileSync)(gitHeadPath, "utf8").trim();
      this.cachedBranch = content.startsWith("ref: refs/heads/") ? content.slice(16) : "detached";
    }
    catch {
      this.cachedBranch = null;
    }
    return this.cachedBranch;
  }
  /** Extension status texts set via ctx.ui.setStatus() */
  getExtensionStatuses() {
    return this.extensionStatuses;
  }
  /** Subscribe to git branch changes. Returns unsubscribe function. */
  onBranchChange(callback) {
    this.branchChangeCallbacks.add(callback);
    return () => this.branchChangeCallbacks.delete(callback);
  }
  /** Internal: set extension status */
  setExtensionStatus(key, text) {
    if (text === undefined) {
      this.extensionStatuses.delete(key);
    } else
    {
      this.extensionStatuses.set(key, text);
    }
  }
  /** Internal: clear extension statuses */
  clearExtensionStatuses() {
    this.extensionStatuses.clear();
  }
  /** Number of unique providers with available models (for footer display) */
  getAvailableProviderCount() {
    return this.availableProviderCount;
  }
  /** Internal: update available provider count */
  setAvailableProviderCount(count) {
    this.availableProviderCount = count;
  }
  /** Internal: cleanup */
  dispose() {
    if (this.gitWatcher) {
      this.gitWatcher.close();
      this.gitWatcher = null;
    }
    this.branchChangeCallbacks.clear();
  }
  setupGitWatcher() {
    if (this.gitWatcher) {
      this.gitWatcher.close();
      this.gitWatcher = null;
    }
    const gitHeadPath = findGitHeadPath();
    if (!gitHeadPath)
    return;
    // Watch the directory containing HEAD, not HEAD itself.
    // Git uses atomic writes (write temp, rename over HEAD), which changes the inode.
    // fs.watch on a file stops working after the inode changes.
    const gitDir = (0, _path.dirname)(gitHeadPath);
    try {
      this.gitWatcher = (0, _fs.watch)(gitDir, (_eventType, filename) => {
        if (filename === "HEAD") {
          this.cachedBranch = undefined;
          for (const cb of this.branchChangeCallbacks)
          cb();
        }
      });
    }
    catch {

      // Silently fail if we can't watch
    }}
}exports.FooterDataProvider = FooterDataProvider; /* v9-b448689cff37d915 */
