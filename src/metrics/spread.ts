import type { Metric } from "../types.js";
import type { MantlePoolsResult } from "../fetchers/mantle-pools.js";

export function scoreSpreadBps(pools: MantlePoolsResult): Metric<number | null> {
  if (pools.pools.length === 0) {
    return {
      value: null,
      score: "N/A",
      evidence: "no Mantle pools — no orderbook to derive spread from",
    };
  }
  return {
    value: null,
    score: "N/A",
    evidence: "Mantle pools present but per-venue orderbook fetcher deferred to v1.1",
  };
}
