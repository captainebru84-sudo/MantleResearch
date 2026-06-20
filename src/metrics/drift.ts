import type { Metric } from "../types.js";
import type { MantlePoolsResult } from "../fetchers/mantle-pools.js";
import type { ReferencePriceResult } from "../fetchers/reference-price.js";

export function scoreReferenceDriftBps(
  pools: MantlePoolsResult,
  reference: ReferencePriceResult,
): Metric<number | null> {
  if (reference.priceUsd === null) {
    return {
      value: null,
      score: "N/A",
      evidence: reference.note
        ? `no public reference price: ${reference.note}`
        : "no public reference price available",
    };
  }
  if (pools.pools.length === 0) {
    return {
      value: null,
      score: "N/A",
      evidence:
        `no Mantle pools → no Mantle mid-price to compare against ` +
        `underlying ${reference.underlying} = $${reference.priceUsd.toFixed(2)} (${reference.source})`,
    };
  }
  return {
    value: null,
    score: "N/A",
    evidence: "per-pool price extraction deferred to v1.1",
  };
}
