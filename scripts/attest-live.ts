import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { registerAgent } from "../src/attest-8004/register.js";
import { attest } from "../src/attest-8004/attest.js";
import { hashReport } from "../src/attest-8004/hash.js";
import { findAsset, loadRegistry } from "../src/registry.js";
import { buildFrictionReport } from "../src/synthesize/report.js";

type Hex = `0x${string}`;

const USAGE = `Usage:
  attest-live register
  attest-live attest <SYMBOL> [--out PATH]

Env vars:
  ERC8004_PRIVATE_KEY        required (0x-prefixed 32-byte hex)
  MANTLE_RPC_URL             default https://rpc.mantle.xyz
  ERC8004_AGENT_URI          default https://github.com/your-username/MantleResearch
  ERC8004_AGENT_ID           required for attest (output of register)
  ERC8004_VALIDATOR_ADDRESS  required for attest (output of register)
  ERC8004_REQUEST_URI        default points to examples/<symbol>-friction-report.json on github
`;

function requirePk(): Hex {
  const pk = process.env.ERC8004_PRIVATE_KEY;
  if (!pk) throw new Error("ERC8004_PRIVATE_KEY required in .env");
  if (!pk.startsWith("0x") || pk.length !== 66) {
    throw new Error("ERC8004_PRIVATE_KEY must be 0x-prefixed 32-byte hex");
  }
  return pk as Hex;
}

async function cmdRegister(): Promise<void> {
  const pk = requirePk();
  const rpcUrl = process.env.MANTLE_RPC_URL ?? "https://rpc.mantle.xyz";
  const agentURI = process.env.ERC8004_AGENT_URI ?? "https://github.com/your-username/MantleResearch";
  console.error(`[register] sending tx with agentURI=${agentURI}...`);
  const result = await registerAgent({ privateKey: pk, rpcUrl, agentURI });
  const payload = {
    agentId: result.agentId.toString(),
    owner: result.owner,
    txHash: result.txHash,
    explorerUrl: `https://mantlescan.xyz/tx/${result.txHash}`,
    addToEnv: {
      ERC8004_AGENT_ID: result.agentId.toString(),
      ERC8004_VALIDATOR_ADDRESS: result.owner,
    },
  };
  console.log(JSON.stringify(payload, null, 2));
}

async function cmdAttest(symbol: string, outArgPath: string | undefined): Promise<void> {
  const pk = requirePk();
  const rpcUrl = process.env.MANTLE_RPC_URL ?? "https://rpc.mantle.xyz";
  const agentIdRaw = process.env.ERC8004_AGENT_ID;
  const validator = process.env.ERC8004_VALIDATOR_ADDRESS as Hex | undefined;
  if (!agentIdRaw || !validator) {
    throw new Error("ERC8004_AGENT_ID and ERC8004_VALIDATOR_ADDRESS required (run `attest-live register` first)");
  }

  const asset = findAsset(symbol);
  const registry = loadRegistry();
  console.error(`[attest] building report for ${asset.symbol}...`);
  const report = await buildFrictionReport(asset, registry, { rpcUrl });

  const hash = hashReport(report);
  const defaultUri = `https://github.com/your-username/MantleResearch/blob/main/examples/${asset.symbol.toLowerCase()}-friction-report.json`;
  const requestURI = process.env.ERC8004_REQUEST_URI ?? defaultUri;

  console.error(`[attest] hash=${hash}, sending validationRequest...`);
  const attestation = await attest({
    privateKey: pk,
    rpcUrl,
    validatorAddress: validator,
    agentId: BigInt(agentIdRaw),
    requestURI,
    requestHash: hash,
  });

  const attested = { ...report, attestation };
  const outPath = outArgPath
    ? resolve(outArgPath)
    : resolve("examples", `${asset.symbol.toLowerCase()}-friction-report.json`);
  writeFileSync(outPath, JSON.stringify(attested, null, 2));
  console.error(`[attest] saved attested report to ${outPath}`);
  console.log(JSON.stringify(attestation, null, 2));
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  if (args.length === 0 || args.includes("--help") || args.includes("-h")) {
    console.log(USAGE);
    process.exit(args.length === 0 ? 1 : 0);
  }

  const cmd = args[0];
  if (cmd === "register") {
    await cmdRegister();
    return;
  }
  if (cmd === "attest") {
    const symbol = args[1];
    if (!symbol) {
      console.error("symbol required");
      console.log(USAGE);
      process.exit(1);
    }
    const outIdx = args.indexOf("--out");
    const outPath = outIdx !== -1 && args[outIdx + 1] ? args[outIdx + 1] : undefined;
    await cmdAttest(symbol, outPath);
    return;
  }
  console.error(`unknown command: ${cmd}`);
  console.log(USAGE);
  process.exit(1);
}

main().catch((err) => {
  console.error("[attest-live] fatal:", err instanceof Error ? err.message : err);
  process.exit(1);
});
