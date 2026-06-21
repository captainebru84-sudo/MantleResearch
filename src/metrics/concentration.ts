import type { Metric, Score } from "../types.js";
import type { MantleHoldersResult } from "../fetchers/mantle-holders.js";

// Minimum % of total supply that surfaced holders must cover before a
// concentration verdict is meaningful. Below this, the chain has so little
// active supply that the top-N look "evenly distributed" purely by absence —
// not by real holder diversity. Return N/A instead of a misleading DEEP.
const COVERAGE_THRESHOLD_PCT = 10;

export function scoreConcentrationPct(holders: MantleHoldersResult): Metric<number | null> {
  if (holders.holderCount === 0) {
    return {
      value: null,
      score: "N/A",
      evidence: holders.note
        ? `holder enumeration failed: ${holders.note}`
        : "no positive-balance holders found",
    };
  }

  const pct = holders.topNConcentrationPct;

  if (pct < COVERAGE_THRESHOLD_PCT) {
    const base =
      `top-${holders.topHolders.length} hold only ${pct.toFixed(2)}% of ` +
      `${holders.totalSupplyFloat.toFixed(4)} total supply ` +
      `(${holders.holderCount} positive-balance addresses) — ` +
      `insufficient coverage to score concentration (threshold ${COVERAGE_THRESHOLD_PCT}%); ` +
      `remaining supply is unaccounted for in the scan window`;
    return {
      value: Number(pct.toFixed(2)),
      score: "N/A",
      evidence: holders.note ? `${base}; ${holders.note}` : base,
    };
  }

  let score: Score;
  if (pct > 90) score = "THIN";
  else if (pct >= 50) score = "SHALLOW";
  else score = "DEEP";

  const base =
    `top-${holders.topHolders.length} hold ${pct.toFixed(2)}% of ` +
    `${holders.totalSupplyFloat.toFixed(4)} total supply ` +
    `(${holders.holderCount} positive-balance addresses)`;

  return {
    value: Number(pct.toFixed(2)),
    score,
    evidence: holders.note ? `${base}; ${holders.note}` : base,
  };
}
