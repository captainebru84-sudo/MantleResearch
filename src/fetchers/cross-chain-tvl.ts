import type { CrossChainContext } from "../types.js";

const LLAMA_PROTOCOL = "https://api.llama.fi/protocol/xstocks";

export interface CrossChainTvlResult {
  context: CrossChainContext;
  source: string;
  fetchedAt: string;
  note?: string;
}

export async function fetchCrossChainTvl(): Promise<CrossChainTvlResult> {
  const fetchedAt = new Date().toISOString();
  const empty: CrossChainTvlResult = {
    context: {},
    source: LLAMA_PROTOCOL,
    fetchedAt,
  };

  let res: Response;
  try {
    res = await fetch(LLAMA_PROTOCOL, { headers: { Accept: "application/json" } });
  } catch (err) {
    return { ...empty, note: `network error: ${(err as Error).message}` };
  }

  if (!res.ok) {
    return { ...empty, note: `DefiLlama HTTP ${res.status}` };
  }

  const json = (await res.json()) as { currentChainTvls?: Record<string, unknown> };
  const tvlByChain: Record<string, number> = {};
  for (const [chain, tvl] of Object.entries(json.currentChainTvls ?? {})) {
    if (typeof tvl === "number") tvlByChain[chain] = tvl;
  }

  const context: CrossChainContext = {};
  if (typeof tvlByChain.Solana === "number") {
    context.solana = { venues: 0, tvlUsd: tvlByChain.Solana, source: LLAMA_PROTOCOL };
  }
  if (typeof tvlByChain.Arbitrum === "number") {
    context.arbitrum = { venues: 0, tvlUsd: tvlByChain.Arbitrum, source: LLAMA_PROTOCOL };
  }
  if (typeof tvlByChain.Ethereum === "number") {
    context.ethereum = { venues: 0, tvlUsd: tvlByChain.Ethereum, source: LLAMA_PROTOCOL };
  }

  return { context, source: LLAMA_PROTOCOL, fetchedAt };
}
