export type Score = "THIN" | "SHALLOW" | "DEEP" | "N/A";

export interface Asset {
  symbol: string;
  name: string;
  underlying: string;
  underlyingISIN?: string;
  referenceSource: string;
  referenceNote?: string;
  mantleContract: `0x${string}`;
  decimals: number;
  coingeckoSlug?: string;
}

export interface Registry {
  version: string;
  lastUpdated: string;
  sourceNote: string;
  issuer: { name: string; brand: string; site: string };
  assets: Asset[];
}

export interface Metric<T = number | null> {
  value: T;
  score: Score;
  evidence: string;
}

export interface CrossChainContext {
  solana?: { venues: number; tvlUsd: number; source: string };
  arbitrum?: { venues: number; tvlUsd: number; source: string };
  ethereum?: { venues: number; tvlUsd: number; source: string };
}

export interface FrictionReport {
  skill: "mantle-distribution-friction";
  version: string;
  asset: {
    symbol: string;
    name: string;
    issuer: string;
    chain: "Mantle";
    contract: `0x${string}`;
  };
  measuredAt: string;
  metrics: {
    venueCount: Metric<number>;
    depthUsd: Metric<number>;
    spreadBps: Metric<number | null>;
    referenceDriftBps: Metric<number | null>;
    concentrationPct: Metric<number | null>;
  };
  crossChainContext?: CrossChainContext;
  verdict: Score;
  verdictReason: string;
  attestation?: {
    chainId: number;
    agentId: number;
    reportHash: `0x${string}`;
    txHash: `0x${string}`;
    explorerUrl: string;
  };
}
