import { createPublicClient, createWalletClient, http, parseEventLogs } from "viem";
import { mantle } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import { identityRegistryAbi } from "./abi.js";
import { getAddresses } from "./addresses.js";

export interface RegisterOptions {
  privateKey: `0x${string}`;
  rpcUrl: string;
  agentURI: string;
}

export interface RegisteredAgent {
  agentId: bigint;
  owner: `0x${string}`;
  txHash: `0x${string}`;
}

export async function registerAgent(opts: RegisterOptions): Promise<RegisteredAgent> {
  const account = privateKeyToAccount(opts.privateKey);
  const wallet = createWalletClient({
    account,
    chain: mantle,
    transport: http(opts.rpcUrl),
  });
  const pub = createPublicClient({ chain: mantle, transport: http(opts.rpcUrl) });
  const addr = getAddresses();

  const txHash = await wallet.writeContract({
    address: addr.identityRegistry,
    abi: identityRegistryAbi,
    functionName: "register",
    args: [opts.agentURI],
  });

  const receipt = await pub.waitForTransactionReceipt({ hash: txHash });
  const events = parseEventLogs({
    abi: identityRegistryAbi,
    eventName: "Registered",
    logs: receipt.logs,
  });

  const event = events.find((e) => "agentId" in (e.args as object));
  if (!event) throw new Error("no Registered event found in receipt");
  const agentId = (event.args as { agentId: bigint }).agentId;

  return { agentId, owner: account.address, txHash };
}
