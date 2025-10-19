/**
 * EVM wallet loaders:
 * - loadEvmWal: dev/local convenience (reads EVM_WALLET_PRIVATE_KEY)
 *       stub for custody (mirror your Solana decrypt)
 *
 * Security:
 * - Never accept private keys in API input.
 * - In prod, prefer DB + encryption (same pattern as your Solana side).
 */

import { Wallet, JsonRpcProvider } from "ethers";
import { CHAINS, type ChainKey, requireEnv } from "../shared/chains.ts";

/**
 * Load an EVM wallet - uses env in development, database in production.
 * @param publicAddress - User's wallet address (only used in production)
 * @param chain - The EVM chain to connect to
 */
export async function loadEvmWallet(
  publicWallet: string,
  chain: ChainKey
): Promise<Wallet> {
  if (!CHAINS[chain]?.isEvm) throw new Error(`Chain ${chain} is not EVM`);

  const rpcUrl = requireEnv(CHAINS[chain].rpcEnv!);
  const provider = new JsonRpcProvider(rpcUrl);

  const isDevelopment = (process.env.NODE_ENV || "devlopment") !== "production";

  if(isDevelopment) {
    console.debug(`[Wallet] Loading EVM wallet from env for ${chain}`);

    const privateKey = requireEnv("EVM_WALLET_PRIVATE_KEY"); // 0x-prefixed hex

    if (!privateKey.startsWith("0x")) {
      throw new Error("EVM_WALLET_PRIVATE_KEY must be 0x-prefixed hex");
    }
    return new Wallet(privateKey, provider);
  } else {
    console.debug(`[Wallet] Loading EVM wallet from database for ${publicWallet} on ${chain}`);
    throw new Error("DB decrypt not wired yet; use loadEvmWalletFromEnv for dev.");
  }
}
