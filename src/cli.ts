import { allAssets, findAsset, loadRegistry } from "./registry.js";
import { buildFrictionReport } from "./synthesize/report.js";
import type { Asset, FrictionReport } from "./types.js";

interface CliFlags {
  symbol: string | null;
  all: boolean;
  attest: boolean;
  noCrossChain: boolean;
}

function parseArgs(argv: string[]): CliFlags | "help" {
  const args = argv.slice(2);
  if (args.length === 0 || args.includes("--help") || args.includes("-h")) {
    return "help";
  }
  const flags: CliFlags = {
    symbol: null,
    all: args.includes("--all"),
    attest: args.includes("--attest"),
    noCrossChain: args.includes("--no-cross-chain"),
  };
  if (!flags.all) {
    flags.symbol = args.find((a) => !a.startsWith("--")) ?? null;
  }
  return flags;
}

function printUsage(): void {
  console.log(
    [
      "Usage: friction <SYMBOL> [--attest] [--no-cross-chain]",
      "       friction --all [--attest] [--no-cross-chain]",
      "",
      "v1 symbols: TSLAx, NVDAx, AAPLx, MSFTx, METAx, AMZNx, SPCXx",
      "",
      "Env:",
      "  MANTLE_RPC_URL          required for holder-concentration metric",
      "  ERC8004_PRIVATE_KEY     required for --attest",
      "  ERC8004_AGENT_ID        required for --attest",
    ].join("\n"),
  );
}

async function runOne(asset: Asset, rpcUrl: string, withCrossChain: boolean): Promise<FrictionReport> {
  const registry = loadRegistry();
  return buildFrictionReport(asset, registry, {
    rpcUrl,
    withCrossChain,
  });
}

async function main(): Promise<void> {
  const parsed = parseArgs(process.argv);
  if (parsed === "help") {
    printUsage();
    process.exit(0);
  }

  const rpcUrl = process.env.MANTLE_RPC_URL ?? "https://rpc.mantle.xyz";
  const withCrossChain = !parsed.noCrossChain;

  if (parsed.attest) {
    console.error("--attest requested but attestation module not yet wired (Task #6)");
  }

  if (parsed.all) {
    const reports: FrictionReport[] = [];
    for (const asset of allAssets()) {
      console.error(`[friction] measuring ${asset.symbol}...`);
      reports.push(await runOne(asset, rpcUrl, withCrossChain));
    }
    console.log(JSON.stringify(reports, null, 2));
    return;
  }

  if (!parsed.symbol) {
    printUsage();
    process.exit(1);
  }

  const asset = findAsset(parsed.symbol);
  const report = await runOne(asset, rpcUrl, withCrossChain);
  console.log(JSON.stringify(report, null, 2));
}

main().catch((err) => {
  console.error("[friction] fatal:", err instanceof Error ? err.message : err);
  process.exit(1);
});
