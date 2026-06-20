export const MANTLE_CHAIN_ID = 5000;

// ERC-8004 contracts on Mantle Mainnet. Two deployment lineages exist; the
// "primary" pair below is the upstream canonical from erc-8004/erc-8004-contracts
// (same Identity/Reputation addresses across Eth/Base/Arbitrum/BSC/Linea/Mantle/etc.).
// This is what damli40/Verity uses and has live mainnet tx history against.
// The mantlenetworkio fork has its own separate deployment at different addresses;
// it's listed below as `fork` for reference. Override via .env if needed.
// All five addresses verified deployed via eth_getCode against rpc.mantle.xyz on 2026-06-20.
// SEPOLIA NOTE: upstream Mantle Sepolia Identity (0x8004A818...) claimed in README is NOT
// actually deployed; only the mantlenetworkio fork's Identity is live on Sepolia, and no
// Validation Registry exists in either lineage on Sepolia. Mainnet only for v1.
export const ERC8004_ADDRESSES = {
  primary: {
    identityRegistry: "0x8004A169FB4a3325136EB29fA0ceB6D2e539a432" as `0x${string}`,
    validationRegistry: "0x8004Cc8439f36fd5F9F049D9fF86523Df6dAAB58" as `0x${string}`,
    reputationRegistry: "0x8004BAa17C55a88189AE136b182e5fdA19dE9b63" as `0x${string}`,
    source: "erc-8004/erc-8004-contracts upstream canonical (multi-chain CREATE2)",
  },
  fork: {
    identityRegistry: "0x8004A3718bD35CF767BC0E718bf21Ec4073502f0" as `0x${string}`,
    reputationRegistry: "0x8004B1BcAb4228199Af728fF90Ed23dCc9b0Fa63" as `0x${string}`,
    source: "mantlenetworkio/erc-8004-contracts fork (separate deployment)",
  },
} as const;

export interface ResolvedAddresses {
  identityRegistry: `0x${string}`;
  validationRegistry: `0x${string}`;
  reputationRegistry: `0x${string}`;
  source: string;
}

export function getAddresses(): ResolvedAddresses {
  const idEnv = process.env.ERC8004_IDENTITY_REGISTRY;
  const vrEnv = process.env.ERC8004_VALIDATION_REGISTRY;
  const repEnv = process.env.ERC8004_REPUTATION_REGISTRY;
  const fromEnv = idEnv || vrEnv || repEnv;
  return {
    identityRegistry: (idEnv ?? ERC8004_ADDRESSES.primary.identityRegistry) as `0x${string}`,
    validationRegistry: (vrEnv ?? ERC8004_ADDRESSES.primary.validationRegistry) as `0x${string}`,
    reputationRegistry: (repEnv ?? ERC8004_ADDRESSES.primary.reputationRegistry) as `0x${string}`,
    source: fromEnv ? "from env" : ERC8004_ADDRESSES.primary.source,
  };
}
