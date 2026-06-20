import { createPublicClient, http, erc20Abi, formatUnits, parseAbiItem } from "viem";
import { mantle } from "viem/chains";
import type { Asset } from "../types.js";

const TRANSFER_EVENT = parseAbiItem(
  "event Transfer(address indexed from, address indexed to, uint256 value)",
);

const ZERO_ADDR = "0x0000000000000000000000000000000000000000";

const DEFAULT_TOP_N = 10;
const DEFAULT_LOG_CHUNK = 10_000n;
// Default scan window: last ~200k blocks (~4-5 days on Mantle at ~2s/block).
// For tokens with low activity this surfaces "no recent transfers" cleanly
// instead of crawling millions of blocks. Override via opts.fromBlock=0n for full history.
const DEFAULT_RECENT_WINDOW = 200_000n;

export interface HolderRow {
  address: `0x${string}`;
  balance: bigint;
  pctOfSupply: number;
}

export interface MantleHoldersResult {
  asset: string;
  totalSupply: bigint;
  totalSupplyFloat: number;
  topHolders: HolderRow[];
  topNConcentrationPct: number;
  holderCount: number;
  source: string;
  fetchedAt: string;
  note?: string;
}

export interface FetchHoldersOptions {
  rpcUrl: string;
  topN?: number;
  fromBlock?: bigint;
  toBlock?: bigint | "latest";
  chunkSize?: bigint;
}

export async function fetchMantleHolders(
  asset: Asset,
  opts: FetchHoldersOptions,
): Promise<MantleHoldersResult> {
  const fetchedAt = new Date().toISOString();
  const topN = opts.topN ?? DEFAULT_TOP_N;
  const chunkSize = opts.chunkSize ?? DEFAULT_LOG_CHUNK;

  const client = createPublicClient({
    chain: mantle,
    transport: http(opts.rpcUrl),
  });

  const totalSupply = (await client.readContract({
    address: asset.mantleContract,
    abi: erc20Abi,
    functionName: "totalSupply",
  })) as bigint;

  const toBlock = opts.toBlock === "latest" || opts.toBlock === undefined
    ? await client.getBlockNumber()
    : opts.toBlock;
  const fromBlock =
    opts.fromBlock !== undefined
      ? opts.fromBlock
      : toBlock > DEFAULT_RECENT_WINDOW
        ? toBlock - DEFAULT_RECENT_WINDOW
        : 0n;
  const partialWindow = fromBlock > 0n;

  const touchedAddresses = new Set<`0x${string}`>();
  let scanError: string | undefined;

  for (let cursor = fromBlock; cursor <= toBlock; cursor += chunkSize) {
    const chunkTo = cursor + chunkSize - 1n > toBlock ? toBlock : cursor + chunkSize - 1n;
    try {
      const logs = await client.getLogs({
        address: asset.mantleContract,
        event: TRANSFER_EVENT,
        fromBlock: cursor,
        toBlock: chunkTo,
      });
      for (const log of logs) {
        const args = log.args as { from?: `0x${string}`; to?: `0x${string}` };
        if (args.from && args.from !== ZERO_ADDR) touchedAddresses.add(args.from);
        if (args.to && args.to !== ZERO_ADDR) touchedAddresses.add(args.to);
      }
    } catch (err) {
      scanError = `log scan failed at ${cursor}-${chunkTo}: ${(err as Error).message}`;
      break;
    }
  }

  // Net-flow during a partial window is NOT current balance.
  // Call balanceOf for each touched address to get true current state.
  const balanceEntries = await Promise.all(
    [...touchedAddresses].map(async (address) => {
      try {
        const bal = (await client.readContract({
          address: asset.mantleContract,
          abi: erc20Abi,
          functionName: "balanceOf",
          args: [address],
        })) as bigint;
        return [address, bal] as const;
      } catch {
        return [address, 0n] as const;
      }
    }),
  );

  const sorted = balanceEntries
    .filter(([, bal]) => bal > 0n)
    .sort(([, a], [, b]) => (b > a ? 1 : b < a ? -1 : 0));

  const topHolders: HolderRow[] = sorted.slice(0, topN).map(([address, balance]) => ({
    address,
    balance,
    pctOfSupply:
      totalSupply === 0n ? 0 : Number((balance * 1_000_000n) / totalSupply) / 10_000,
  }));

  const topNConcentrationPct = topHolders.reduce((acc, h) => acc + h.pctOfSupply, 0);
  const totalSupplyFloat = Number(formatUnits(totalSupply, asset.decimals));

  const windowNote = partialWindow
    ? `scanned blocks ${fromBlock}-${toBlock} (recent window only — pass --from-block 0 for full history)`
    : undefined;
  const note = scanError ?? windowNote;

  return {
    asset: asset.symbol,
    totalSupply,
    totalSupplyFloat,
    topHolders,
    topNConcentrationPct,
    holderCount: sorted.length,
    source: opts.rpcUrl,
    fetchedAt,
    note,
  };
}
