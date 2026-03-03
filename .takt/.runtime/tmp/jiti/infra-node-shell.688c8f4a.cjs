"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.buildNodeShellCommand = buildNodeShellCommand;function buildNodeShellCommand(command, platform) {
  const normalized = String(platform ?? "").
  trim().
  toLowerCase();
  if (normalized.startsWith("win")) {
    return ["cmd.exe", "/d", "/s", "/c", command];
  }
  return ["/bin/sh", "-lc", command];
} /* v9-9017663bd91f088d */
