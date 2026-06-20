import type { Asset } from "../types.js";

const YF_BASE = "https://query1.finance.yahoo.com/v8/finance/chart";

export interface ReferencePriceResult {
  asset: string;
  underlying: string;
  priceUsd: number | null;
  asOf: string;
  source: string;
  note?: string;
}

export async function fetchReferencePrice(asset: Asset): Promise<ReferencePriceResult> {
  const fetchedAt = new Date().toISOString();

  if (asset.referenceSource === "none") {
    return {
      asset: asset.symbol,
      underlying: asset.underlying,
      priceUsd: null,
      asOf: fetchedAt,
      source: "none",
      note:
        asset.referenceNote ??
        "no public reference price; this is itself a distribution-friction signal",
    };
  }

  const [provider, ticker] = asset.referenceSource.split(":");
  if (provider !== "yahoo" || !ticker) {
    return {
      asset: asset.symbol,
      underlying: asset.underlying,
      priceUsd: null,
      asOf: fetchedAt,
      source: asset.referenceSource,
      note: `unsupported reference provider: ${asset.referenceSource}`,
    };
  }

  const url = `${YF_BASE}/${encodeURIComponent(ticker)}?interval=1d&range=5d`;
  let res: Response;
  try {
    res = await fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": "Mozilla/5.0 (compatible; mantle-friction-skill/0.1)",
      },
    });
  } catch (err) {
    return {
      asset: asset.symbol,
      underlying: asset.underlying,
      priceUsd: null,
      asOf: fetchedAt,
      source: url,
      note: `network error: ${(err as Error).message}`,
    };
  }

  if (!res.ok) {
    return {
      asset: asset.symbol,
      underlying: asset.underlying,
      priceUsd: null,
      asOf: fetchedAt,
      source: url,
      note: `Yahoo HTTP ${res.status}`,
    };
  }

  const json = (await res.json()) as YfChartResponse;
  const result = json.chart?.result?.[0];
  const price = result?.meta?.regularMarketPrice ?? null;
  const ts = result?.meta?.regularMarketTime;

  return {
    asset: asset.symbol,
    underlying: asset.underlying,
    priceUsd: typeof price === "number" ? price : null,
    asOf: typeof ts === "number" ? new Date(ts * 1000).toISOString() : fetchedAt,
    source: url,
  };
}

interface YfChartResponse {
  chart?: {
    result?: Array<{
      meta?: {
        regularMarketPrice?: number;
        regularMarketTime?: number;
      };
    }>;
  };
}
