"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.DEFAULT_PI_COMPACTION_RESERVE_TOKENS_FLOOR = void 0;exports.ensurePiCompactionReserveTokens = ensurePiCompactionReserveTokens;exports.resolveCompactionReserveTokensFloor = resolveCompactionReserveTokensFloor;const DEFAULT_PI_COMPACTION_RESERVE_TOKENS_FLOOR = exports.DEFAULT_PI_COMPACTION_RESERVE_TOKENS_FLOOR = 20_000;
function ensurePiCompactionReserveTokens(params) {
  const minReserveTokens = params.minReserveTokens ?? DEFAULT_PI_COMPACTION_RESERVE_TOKENS_FLOOR;
  const current = params.settingsManager.getCompactionReserveTokens();
  if (current >= minReserveTokens) {
    return { didOverride: false, reserveTokens: current };
  }
  params.settingsManager.applyOverrides({
    compaction: { reserveTokens: minReserveTokens }
  });
  return { didOverride: true, reserveTokens: minReserveTokens };
}
function resolveCompactionReserveTokensFloor(cfg) {
  const raw = cfg?.agents?.defaults?.compaction?.reserveTokensFloor;
  if (typeof raw === "number" && Number.isFinite(raw) && raw >= 0) {
    return Math.floor(raw);
  }
  return DEFAULT_PI_COMPACTION_RESERVE_TOKENS_FLOOR;
} /* v9-d864d3c92332cf2e */
