/**
 * Chain metadata + tiny helpers shared by Solana and EVM code.
 * - CHAINS: central registry of supported chains
 * - requireEnv: fetches an env var or throws
 * - isNativeSymbol: checks if a symbol is the native coin for a chain
 * - v2 0x uses a single endpoint; no per-chain quote URL needed.
 */

export type ChainKey = "sol" | "eth" | "base" | "zora";

export const CHAINS: Record<
  ChainKey,
  {
    /** EVM only: numeric chain id */
    chainId?: number;
    /** EVM only: env var name that holds the RPC URL */
    rpcEnv?: string;
    /** Native symbol for the chain ("SOL" or "ETH") */
    nativeSymbol: string;
    /** True for EVM chains (ETH/Base/Zora), false for Solana */
    isEvm: boolean;
    /** EVM only: env var name for the 0x Quote base URL */
    oxQuoteUrlEnv?: string;
    /** EVM only: canonical WETH address (for mapping native→wrapped in 0x v2) */
    weth?: string;
  }
> = {
  sol:  { nativeSymbol: "SOL", isEvm: false },
  eth:  {
    chainId: 1,
    rpcEnv: "ETHEREUM_RPC_URL",
    nativeSymbol: "ETH",
    isEvm: true,
    weth: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
  },
  base: {
    chainId: 8453,
    rpcEnv: "BASE_RPC_URL",
    nativeSymbol: "ETH",
    isEvm: true,
    weth: "0x4200000000000000000000000000000000000006",
  },
  zora: {
    chainId: 7777777,
    rpcEnv: "ZORA_RPC_URL",
    nativeSymbol: "ETH",
    isEvm: true,
    weth: "0x4200000000000000000000000000000000000006",
  },
};

/** Require an env var and throw a helpful error if it is missing. */
export function requireEnv(name: string): string {
  const v = process.env[name]?.trim();
  if (!v) throw new Error(`${name} is required`);
  return v;
}

/** Is the given symbol (e.g. "SOL"/"ETH") the native asset for this chain? */
export function isNativeSymbol(chain: ChainKey, symbol: string) {
  return CHAINS[chain].nativeSymbol.toUpperCase() === symbol.toUpperCase();
}
