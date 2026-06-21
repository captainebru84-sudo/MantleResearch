import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { buildFrictionReport } from "../src/synthesize/report.js";
import type { Asset, Registry } from "../src/types.js";
import { buildAdHocAsset, InvalidErc20Error } from "./_address-asset.js";

const registryPath = resolve(process.cwd(), "data", "xstocks-registry.json");
const registry = JSON.parse(readFileSync(registryPath, "utf8")) as Registry;

function pickQuery(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function findBySymbol(symbol: string): Asset | undefined {
  return registry.assets.find(
    (a) => a.symbol.toLowerCase() === symbol.toLowerCase(),
  );
}

function findByAddress(address: string): Asset | undefined {
  const lower = address.toLowerCase();
  return registry.assets.find((a) => a.mantleContract.toLowerCase() === lower);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const symbol = pickQuery(req.query.symbol);
  const address = pickQuery(req.query.address);
  const rpcUrl = process.env.MANTLE_RPC_URL ?? "https://rpc.mantle.xyz";

  if (!symbol && !address) {
    return res
      .status(400)
      .json({ error: "Provide ?symbol=… or ?address=…" });
  }

  try {
    let asset: Asset;
    let issuerOverride: string | null = null;
    let withCrossChain = true;

    if (symbol) {
      const found = findBySymbol(symbol);
      if (!found) {
        return res.status(404).json({
          error: `Unknown symbol "${symbol}". Supported: ${registry.assets.map((a) => a.symbol).join(", ")}`,
        });
      }
      asset = found;
    } else {
      const known = findByAddress(address!);
      if (known) {
        asset = known;
      } else {
        asset = await buildAdHocAsset(address!, rpcUrl);
        issuerOverride = "Unknown (live lookup)";
        withCrossChain = false;
      }
    }

    const report = await buildFrictionReport(asset, registry, {
      rpcUrl,
      withCrossChain,
    });

    if (issuerOverride) {
      report.asset.issuer = issuerOverride;
    }

    res.setHeader(
      "Cache-Control",
      "public, s-maxage=600, stale-while-revalidate=3600",
    );
    return res.status(200).json(report);
  } catch (err) {
    if (err instanceof InvalidErc20Error) {
      return res.status(400).json({ error: err.message });
    }
    const message = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ error: message });
  }
}
