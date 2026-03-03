"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.loadCostUsageSummary = loadCostUsageSummary;exports.loadSessionCostSummary = loadSessionCostSummary;var _nodeFs = _interopRequireDefault(require("node:fs"));
var _nodePath = _interopRequireDefault(require("node:path"));
var _nodeReadline = _interopRequireDefault(require("node:readline"));
var _usage = require("../agents/usage.js");
var _paths = require("../config/sessions/paths.js");
var _usageFormat = require("../utils/usage-format.js");function _interopRequireDefault(e) {return e && e.__esModule ? e : { default: e };}
const emptyTotals = () => ({
  input: 0,
  output: 0,
  cacheRead: 0,
  cacheWrite: 0,
  totalTokens: 0,
  totalCost: 0,
  missingCostEntries: 0
});
const toFiniteNumber = (value) => {
  if (typeof value !== "number") {
    return undefined;
  }
  if (!Number.isFinite(value)) {
    return undefined;
  }
  return value;
};
const extractCostTotal = (usageRaw) => {
  if (!usageRaw || typeof usageRaw !== "object") {
    return undefined;
  }
  const record = usageRaw;
  const cost = record.cost;
  const total = toFiniteNumber(cost?.total);
  if (total === undefined) {
    return undefined;
  }
  if (total < 0) {
    return undefined;
  }
  return total;
};
const parseTimestamp = (entry) => {
  const raw = entry.timestamp;
  if (typeof raw === "string") {
    const parsed = new Date(raw);
    if (!Number.isNaN(parsed.valueOf())) {
      return parsed;
    }
  }
  const message = entry.message;
  const messageTimestamp = toFiniteNumber(message?.timestamp);
  if (messageTimestamp !== undefined) {
    const parsed = new Date(messageTimestamp);
    if (!Number.isNaN(parsed.valueOf())) {
      return parsed;
    }
  }
  return undefined;
};
const parseUsageEntry = (entry) => {
  const message = entry.message;
  const role = message?.role;
  if (role !== "assistant") {
    return null;
  }
  const usageRaw = message?.usage ?? entry.usage;
  const usage = (0, _usage.normalizeUsage)(usageRaw);
  if (!usage) {
    return null;
  }
  const provider = (typeof message?.provider === "string" ? message?.provider : undefined) ?? (
  typeof entry.provider === "string" ? entry.provider : undefined);
  const model = (typeof message?.model === "string" ? message?.model : undefined) ?? (
  typeof entry.model === "string" ? entry.model : undefined);
  return {
    usage,
    costTotal: extractCostTotal(usageRaw),
    provider,
    model,
    timestamp: parseTimestamp(entry)
  };
};
const formatDayKey = (date) => date.toLocaleDateString("en-CA", { timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone });
const applyUsageTotals = (totals, usage) => {
  totals.input += usage.input ?? 0;
  totals.output += usage.output ?? 0;
  totals.cacheRead += usage.cacheRead ?? 0;
  totals.cacheWrite += usage.cacheWrite ?? 0;
  const totalTokens = usage.total ??
  (usage.input ?? 0) + (usage.output ?? 0) + (usage.cacheRead ?? 0) + (usage.cacheWrite ?? 0);
  totals.totalTokens += totalTokens;
};
const applyCostTotal = (totals, costTotal) => {
  if (costTotal === undefined) {
    totals.missingCostEntries += 1;
    return;
  }
  totals.totalCost += costTotal;
};
async function scanUsageFile(params) {
  const fileStream = _nodeFs.default.createReadStream(params.filePath, { encoding: "utf-8" });
  const rl = _nodeReadline.default.createInterface({ input: fileStream, crlfDelay: Infinity });
  for await (const line of rl) {
    const trimmed = line.trim();
    if (!trimmed) {
      continue;
    }
    try {
      const parsed = JSON.parse(trimmed);
      const entry = parseUsageEntry(parsed);
      if (!entry) {
        continue;
      }
      if (entry.costTotal === undefined) {
        const cost = (0, _usageFormat.resolveModelCostConfig)({
          provider: entry.provider,
          model: entry.model,
          config: params.config
        });
        entry.costTotal = (0, _usageFormat.estimateUsageCost)({ usage: entry.usage, cost });
      }
      params.onEntry(entry);
    }
    catch {

      // Ignore malformed lines
    }}
}
async function loadCostUsageSummary(params) {
  const days = Math.max(1, Math.floor(params?.days ?? 30));
  const now = new Date();
  const since = new Date(now);
  since.setDate(since.getDate() - (days - 1));
  const sinceTime = since.getTime();
  const dailyMap = new Map();
  const totals = emptyTotals();
  const sessionsDir = (0, _paths.resolveSessionTranscriptsDirForAgent)(params?.agentId);
  const entries = await _nodeFs.default.promises.readdir(sessionsDir, { withFileTypes: true }).catch(() => []);
  const files = (await Promise.all(entries.
  filter((entry) => entry.isFile() && entry.name.endsWith(".jsonl")).
  map(async (entry) => {
    const filePath = _nodePath.default.join(sessionsDir, entry.name);
    const stats = await _nodeFs.default.promises.stat(filePath).catch(() => null);
    if (!stats) {
      return null;
    }
    if (stats.mtimeMs < sinceTime) {
      return null;
    }
    return filePath;
  }))).filter((filePath) => Boolean(filePath));
  for (const filePath of files) {
    await scanUsageFile({
      filePath,
      config: params?.config,
      onEntry: (entry) => {
        const ts = entry.timestamp?.getTime();
        if (!ts || ts < sinceTime) {
          return;
        }
        const dayKey = formatDayKey(entry.timestamp ?? now);
        const bucket = dailyMap.get(dayKey) ?? emptyTotals();
        applyUsageTotals(bucket, entry.usage);
        applyCostTotal(bucket, entry.costTotal);
        dailyMap.set(dayKey, bucket);
        applyUsageTotals(totals, entry.usage);
        applyCostTotal(totals, entry.costTotal);
      }
    });
  }
  const daily = Array.from(dailyMap.entries()).
  map(([date, bucket]) => Object.assign({ date }, bucket)).
  toSorted((a, b) => a.date.localeCompare(b.date));
  return {
    updatedAt: Date.now(),
    days,
    daily,
    totals
  };
}
async function loadSessionCostSummary(params) {
  const sessionFile = params.sessionFile ?? (
  params.sessionId ? (0, _paths.resolveSessionFilePath)(params.sessionId, params.sessionEntry) : undefined);
  if (!sessionFile || !_nodeFs.default.existsSync(sessionFile)) {
    return null;
  }
  const totals = emptyTotals();
  let lastActivity;
  await scanUsageFile({
    filePath: sessionFile,
    config: params.config,
    onEntry: (entry) => {
      applyUsageTotals(totals, entry.usage);
      applyCostTotal(totals, entry.costTotal);
      const ts = entry.timestamp?.getTime();
      if (ts && (!lastActivity || ts > lastActivity)) {
        lastActivity = ts;
      }
    }
  });
  return {
    sessionId: params.sessionId,
    sessionFile,
    lastActivity,
    ...totals
  };
} /* v9-7640aa3c2f358a7f */
