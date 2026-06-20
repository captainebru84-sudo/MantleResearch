import type { Asset, FrictionReport, Registry } from "../types.js";
import { fetchMantlePools } from "../fetchers/mantle-pools.js";
import { fetchReferencePrice } from "../fetchers/reference-price.js";
import { fetchMantleHolders } from "../fetchers/mantle-holders.js";
import { fetchCrossChainTvl } from "../fetchers/cross-chain-tvl.js";
import { scoreVenueCount } from "../metrics/venue-count.js";
import { scoreDepthUsd } from "../metrics/depth.js";
import { scoreSpreadBps } from "../metrics/spread.js";
import { scoreReferenceDriftBps } from "../metrics/drift.js";
import { scoreConcentrationPct } from "../metrics/concentration.js";
import { synthesizeVerdict } from "./verdict.js";

export interface BuildReportOptions {
  rpcUrl: string;
  withCrossChain?: boolean;
  holdersFromBlock?: bigint;
}

export async function buildFrictionReport(
  asset: Asset,
  registry: Registry,
  opts: BuildReportOptions,
): Promise<FrictionReport> {
  const [pools, reference, holders, crossChain] = await Promise.all([
    fetchMantlePools(asset),
    fetchReferencePrice(asset),
    fetchMantleHolders(asset, {
      rpcUrl: opts.rpcUrl,
      fromBlock: opts.holdersFromBlock,
    }),
    opts.withCrossChain === false ? Promise.resolve(null) : fetchCrossChainTvl(),
  ]);

  const metrics: FrictionReport["metrics"] = {
    venueCount: scoreVenueCount(pools),
    depthUsd: scoreDepthUsd(pools),
    spreadBps: scoreSpreadBps(pools),
    referenceDriftBps: scoreReferenceDriftBps(pools, reference),
    concentrationPct: scoreConcentrationPct(holders),
  };

  const { verdict, verdictReason } = synthesizeVerdict(metrics);

  return {
    skill: "mantle-distribution-friction",
    version: "0.1.0",
    asset: {
      symbol: asset.symbol,
      name: asset.name,
      issuer: registry.issuer.name,
      chain: "Mantle",
      contract: asset.mantleContract,
    },
    measuredAt: new Date().toISOString(),
    metrics,
    ...(crossChain?.context && Object.keys(crossChain.context).length > 0
      ? { crossChainContext: crossChain.context }
      : {}),
    verdict,
    verdictReason,
  };
}
