/**
 * EVM wallet loaders:
 * - loadEvmWalletFromEnv: dev/local convenience (reads EVM_WALLET_PRIVATE_KEY)
 * - loadEvmWalletFromDatabase: stub for custody (mirror your Solana decrypt)
 *
 * Security:
 * - Never accept private keys in API input.
 * - In prod, prefer DB + encryption (same pattern as your Solana side).
 */

import { Wallet, JsonRpcProvider } from "ethers";
import { CHAINS, type ChainKey, requireEnv } from "../shared/chains.ts";

/** Load an EVM wallet from env (dev only). */
export function loadEvmWalletFromEnv(chain: ChainKey): Wallet {
  if (!CHAINS[chain]?.isEvm) throw new Error(`Chain ${chain} is not EVM`);
  const rpcUrl = requireEnv(CHAINS[chain].rpcEnv!);
  const provider = new JsonRpcProvider(rpcUrl);

  const pk = requireEnv("EVM_WALLET_PRIVATE_KEY"); // 0x-prefixed hex
  if (!pk.startsWith("0x")) throw new Error("EVM_WALLET_PRIVATE_KEY must be 0x-prefixed hex");
  return new Wallet(pk, provider);
}

/** Load an EVM wallet from DB using public address (stub: wire decrypt). */
export async function loadEvmWalletFromDatabase(
  _publicAddress: string,
  chain: ChainKey
): Promise<Wallet> {
  if (!CHAINS[chain]?.isEvm) throw new Error(`Chain ${chain} is not EVM`);
  const rpcUrl = requireEnv(CHAINS[chain].rpcEnv!);
  const provider = new JsonRpcProvider(rpcUrl);

  throw new Error("DB decrypt not wired yet; use loadEvmWalletFromEnv for dev.");
}
