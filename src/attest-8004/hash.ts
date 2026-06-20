import { readFileSync } from "node:fs";
import { keccak256, toHex } from "viem";
import type { FrictionReport } from "../types.js";

export function hashFile(path: string): `0x${string}` {
  return keccak256(toHex(readFileSync(path)));
}

// Recursive sorted-key JSON serialization. Two semantically-identical
// reports produce byte-identical strings, so keccak256 is deterministic.
export function canonicalJson(value: unknown): string {
  if (value === null || value === undefined) return JSON.stringify(value ?? null);
  if (typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${canonicalJson(obj[k])}`).join(",")}}`;
}

export function hashReport(report: FrictionReport): `0x${string}` {
  // Strip attestation before hashing — the hash is anchored BEFORE the tx exists.
  const { attestation: _attestation, ...rest } = report;
  return keccak256(toHex(canonicalJson(rest)));
}
