import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import type { Asset, Registry } from "./types.js";

const here = dirname(fileURLToPath(import.meta.url));
const registryPath = resolve(here, "..", "data", "xstocks-registry.json");

let cached: Registry | null = null;

export function loadRegistry(): Registry {
  if (cached) return cached;
  const raw = readFileSync(registryPath, "utf8");
  cached = JSON.parse(raw) as Registry;
  return cached;
}

export function findAsset(symbol: string): Asset {
  const registry = loadRegistry();
  const asset = registry.assets.find(
    (a) => a.symbol.toLowerCase() === symbol.toLowerCase(),
  );
  if (!asset) {
    const known = registry.assets.map((a) => a.symbol).join(", ");
    throw new Error(
      `Unknown asset "${symbol}". v1 supports: ${known}`,
    );
  }
  return asset;
}

export function allAssets(): Asset[] {
  return loadRegistry().assets;
}
