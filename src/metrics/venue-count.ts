import type { Metric, Score } from "../types.js";
import type { MantlePoolsResult } from "../fetchers/mantle-pools.js";

export function scoreVenueCount(pools: MantlePoolsResult): Metric<number> {
  const count = pools.pools.length;
  let score: Score;
  if (count === 0) score = "THIN";
  else if (count <= 2) score = "SHALLOW";
  else score = "DEEP";

  const evidenceBase = `GeckoTerminal ${pools.source} → ${count} pool(s)`;
  const evidence = pools.note ? `${evidenceBase} (${pools.note})` : evidenceBase;

  return { value: count, score, evidence };
}
