import type { Asset } from "../types.js";

const GT_BASE = "https://api.geckoterminal.com/api/v2";

export interface PoolHit {
  address: `0x${string}`;
  dexId: string;
  liquidityUsd: number;
  volumeUsd24h: number;
  baseSymbol: string;
  quoteSymbol: string;
}

export interface MantlePoolsResult {
  asset: string;
  pools: PoolHit[];
  source: string;
  fetchedAt: string;
  note?: string;
}

export async function fetchMantlePools(asset: Asset): Promise<MantlePoolsResult> {
  const url = `${GT_BASE}/search/pools?query=${encodeURIComponent(asset.symbol)}&network=mantle`;
  const fetchedAt = new Date().toISOString();

  let res: Response;
  try {
    res = await fetch(url, { headers: { Accept: "application/json" } });
  } catch (err) {
    return {
      asset: asset.symbol,
      pools: [],
      source: url,
      fetchedAt,
      note: `network error: ${(err as Error).message}`,
    };
  }

  if (!res.ok) {
    return {
      asset: asset.symbol,
      pools: [],
      source: url,
      fetchedAt,
      note: `GeckoTerminal HTTP ${res.status}`,
    };
  }

  const json = (await res.json()) as { data?: GtPoolRaw[] };
  const pools: PoolHit[] = (json.data ?? []).map((d) => ({
    address: (d.attributes?.address ?? "0x0000000000000000000000000000000000000000") as `0x${string}`,
    dexId: d.relationships?.dex?.data?.id ?? "unknown",
    liquidityUsd: Number(d.attributes?.reserve_in_usd ?? 0),
    volumeUsd24h: Number(d.attributes?.volume_usd?.h24 ?? 0),
    baseSymbol: d.attributes?.base_token_symbol ?? "",
    quoteSymbol: d.attributes?.quote_token_symbol ?? "",
  }));

  return { asset: asset.symbol, pools, source: url, fetchedAt };
}

interface GtPoolRaw {
  attributes?: {
    address?: string;
    reserve_in_usd?: string | number;
    volume_usd?: { h24?: string | number };
    base_token_symbol?: string;
    quote_token_symbol?: string;
  };
  relationships?: {
    dex?: { data?: { id?: string } };
  };
}
