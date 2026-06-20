import type { Metric, Score } from "../types.js";
import type { MantlePoolsResult } from "../fetchers/mantle-pools.js";

const DEEP_THRESHOLD_USD = 50_000;

export function scoreDepthUsd(pools: MantlePoolsResult): Metric<number> {
  const totalUsd = pools.pools.reduce((acc, p) => acc + p.liquidityUsd, 0);
  let score: Score;
  if (totalUsd === 0) score = "THIN";
  else if (totalUsd < DEEP_THRESHOLD_USD) score = "SHALLOW";
  else score = "DEEP";

  return {
    value: Number(totalUsd.toFixed(2)),
    score,
    evidence: `sum reserve_in_usd across ${pools.pools.length} Mantle pool(s) = $${totalUsd.toFixed(2)}`,
  };
}
