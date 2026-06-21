import { createPublicClient, http, erc20Abi, getAddress, isAddress } from "viem";
import { mantle } from "viem/chains";
import type { Asset } from "../src/types.js";

export class InvalidErc20Error extends Error {
  constructor(address: string, cause?: unknown) {
    super(
      `Address ${address} did not respond to ERC-20 calls (name/symbol/decimals reverted)`,
    );
    this.name = "InvalidErc20Error";
    if (cause) (this as { cause?: unknown }).cause = cause;
  }
}

export async function buildAdHocAsset(
  address: string,
  rpcUrl: string,
): Promise<Asset> {
  if (!isAddress(address)) {
    throw new InvalidErc20Error(address, new Error("not a valid 0x address"));
  }
  const checksum = getAddress(address);
  const client = createPublicClient({ chain: mantle, transport: http(rpcUrl) });

  let name: string;
  let symbol: string;
  let decimals: number;
  try {
    [name, symbol, decimals] = await Promise.all([
      client.readContract({
        address: checksum,
        abi: erc20Abi,
        functionName: "name",
      }),
      client.readContract({
        address: checksum,
        abi: erc20Abi,
        functionName: "symbol",
      }),
      client.readContract({
        address: checksum,
        abi: erc20Abi,
        functionName: "decimals",
      }),
    ]);
  } catch (err) {
    throw new InvalidErc20Error(checksum, err);
  }

  return {
    symbol,
    name,
    underlying: "Unknown",
    referenceSource: "none",
    referenceNote: "Live ad-hoc lookup — no registered reference source.",
    mantleContract: checksum,
    decimals,
  };
}
