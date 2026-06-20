import { createWalletClient, http } from "viem";
import { mantle } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import { validationRegistryAbi } from "./abi.js";
import { getAddresses, MANTLE_CHAIN_ID } from "./addresses.js";

export interface AttestParams {
  privateKey: `0x${string}`;
  rpcUrl: string;
  validatorAddress: `0x${string}`;
  agentId: bigint;
  requestURI: string;
  requestHash: `0x${string}`;
}

export interface AttestResult {
  chainId: number;
  agentId: number;
  reportHash: `0x${string}`;
  txHash: `0x${string}`;
  explorerUrl: string;
}

export async function attest(p: AttestParams): Promise<AttestResult> {
  const account = privateKeyToAccount(p.privateKey);
  const wallet = createWalletClient({
    account,
    chain: mantle,
    transport: http(p.rpcUrl),
  });
  const addr = getAddresses();

  const txHash = await wallet.writeContract({
    address: addr.validationRegistry,
    abi: validationRegistryAbi,
    functionName: "validationRequest",
    args: [p.validatorAddress, p.agentId, p.requestURI, p.requestHash],
  });

  return {
    chainId: MANTLE_CHAIN_ID,
    agentId: Number(p.agentId),
    reportHash: p.requestHash,
    txHash,
    explorerUrl: `https://mantlescan.xyz/tx/${txHash}`,
  };
}
