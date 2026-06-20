import type { Metric, Score } from "../types.js";
import type { MantleHoldersResult } from "../fetchers/mantle-holders.js";

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
