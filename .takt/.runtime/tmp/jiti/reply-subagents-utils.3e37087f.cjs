"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.formatAgeShort = formatAgeShort;exports.formatDurationShort = formatDurationShort;exports.formatRunLabel = formatRunLabel;exports.formatRunStatus = formatRunStatus;exports.resolveSubagentLabel = resolveSubagentLabel;exports.sortSubagentRuns = sortSubagentRuns;var _utils = require("../../utils.js");
function formatDurationShort(valueMs) {
  if (!valueMs || !Number.isFinite(valueMs) || valueMs <= 0) {
    return "n/a";
  }
  const totalSeconds = Math.round(valueMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor(totalSeconds % 3600 / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) {
    return `${hours}h${minutes}m`;
  }
  if (minutes > 0) {
    return `${minutes}m${seconds}s`;
  }
  return `${seconds}s`;
}
function formatAgeShort(valueMs) {
  if (!valueMs || !Number.isFinite(valueMs) || valueMs <= 0) {
    return "n/a";
  }
  const minutes = Math.round(valueMs / 60_000);
  if (minutes < 1) {
    return "just now";
  }
  if (minutes < 60) {
    return `${minutes}m ago`;
  }
  const hours = Math.round(minutes / 60);
  if (hours < 48) {
    return `${hours}h ago`;
  }
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}
function resolveSubagentLabel(entry, fallback = "subagent") {
  const raw = entry.label?.trim() || entry.task?.trim() || "";
  return raw || fallback;
}
function formatRunLabel(entry, options) {
  const raw = resolveSubagentLabel(entry);
  const maxLength = options?.maxLength ?? 72;
  if (!Number.isFinite(maxLength) || maxLength <= 0) {
    return raw;
  }
  return raw.length > maxLength ? `${(0, _utils.truncateUtf16Safe)(raw, maxLength).trimEnd()}…` : raw;
}
function formatRunStatus(entry) {
  if (!entry.endedAt) {
    return "running";
  }
  const status = entry.outcome?.status ?? "done";
  return status === "ok" ? "done" : status;
}
function sortSubagentRuns(runs) {
  return [...runs].toSorted((a, b) => {
    const aTime = a.startedAt ?? a.createdAt ?? 0;
    const bTime = b.startedAt ?? b.createdAt ?? 0;
    return bTime - aTime;
  });
} /* v9-228cab8893b216be */
