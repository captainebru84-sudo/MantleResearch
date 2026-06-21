import { describe, expect, it } from "vitest";
import { scoreConcentrationPct } from "./concentration.js";
import type { MantleHoldersResult } from "../fetchers/mantle-holders.js";

function holders(overrides: Partial<MantleHoldersResult>): MantleHoldersResult {
  return {
    asset: "TESTx",
    totalSupply: 10_000_000_000_000_000_000_000n,
    totalSupplyFloat: 10000,
    topHolders: [],
    topNConcentrationPct: 0,
    holderCount: 0,
    source: "test",
    fetchedAt: "2026-06-22T00:00:00.000Z",
    ...overrides,
  };
}

describe("scoreConcentrationPct", () => {
  it("returns N/A when no holders enumerated", () => {
    const result = scoreConcentrationPct(holders({ holderCount: 0 }));
    expect(result.score).toBe("N/A");
    expect(result.value).toBeNull();
  });

  it("returns N/A when top-N coverage is below threshold of supply (artifact guard)", () => {
    // Reproduces the TSLAx attested-run artifact: 3 small holders surfaced,
    // 5.70% of supply, was scoring DEEP. Should now score N/A.
    const result = scoreConcentrationPct(
      holders({
        holderCount: 3,
        topHolders: [
          { address: "0xa", balance: 1n, pctOfSupply: 3.0 },
          { address: "0xb", balance: 1n, pctOfSupply: 1.5 },
          { address: "0xc", balance: 1n, pctOfSupply: 1.2 },
        ],
        topNConcentrationPct: 5.7,
      }),
    );
    expect(result.score).toBe("N/A");
    expect(result.value).toBe(5.7);
    expect(result.evidence).toContain("insufficient coverage");
  });

  it("scores DEEP for healthy distribution (top-N hold <50% but coverage ≥5%)", () => {
    const result = scoreConcentrationPct(
      holders({
        holderCount: 50,
        topHolders: Array.from({ length: 10 }, (_, i) => ({
          address: `0x${i}` as `0x${string}`,
          balance: 1n,
          pctOfSupply: 3,
        })),
        topNConcentrationPct: 30,
      }),
    );
    expect(result.score).toBe("DEEP");
    expect(result.value).toBe(30);
  });

  it("scores SHALLOW when top-N hold 50-90% of supply", () => {
    const result = scoreConcentrationPct(
      holders({
        holderCount: 20,
        topHolders: [{ address: "0xa", balance: 1n, pctOfSupply: 75 }],
        topNConcentrationPct: 75,
      }),
    );
    expect(result.score).toBe("SHALLOW");
  });

  it("scores THIN when top-N hold >90% of supply", () => {
    const result = scoreConcentrationPct(
      holders({
        holderCount: 5,
        topHolders: [{ address: "0xa", balance: 1n, pctOfSupply: 95 }],
        topNConcentrationPct: 95,
      }),
    );
    expect(result.score).toBe("THIN");
  });

  it("does not trigger guard exactly at the coverage threshold", () => {
    const result = scoreConcentrationPct(
      holders({
        holderCount: 4,
        topHolders: [{ address: "0xa", balance: 1n, pctOfSupply: 10 }],
        topNConcentrationPct: 10,
      }),
    );
    expect(result.score).toBe("DEEP");
  });
});
