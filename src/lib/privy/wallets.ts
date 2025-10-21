import { getPrivyClient } from "./client.ts";
import type { ChainKey } from "../shared/chains.ts";

// Narrow the chains Privy supports here
type EmbeddedChainKey = "sol" | "eth";
type PrivyChainType = "solana" | "ethereum";

const TO_PRIVY: Record<EmbeddedChainKey, PrivyChainType> = {
  sol: "solana",
  eth: "ethereum",
};

function assertEmbeddedSupported(chain: ChainKey): asserts chain is EmbeddedChainKey {
  if (chain !== "sol" && chain !== "eth") {
    throw new Error(`Embedded wallets only for "sol" and "eth" (got "${chain}").`);
  }
}

// Iterate the cursor and collect wallets
export async function listUserWallets(userId: string, chain?: PrivyChainType) {
  const privy = getPrivyClient();
  const cursor = await privy.wallets().list({ user_id: userId, ...(chain ? { chain_type: chain } : {}) });
  const out: Array<{ id: string; address: string; chain_type: string; created_at: number }> = [];
  for await (const w of cursor) {
    out.push({ id: w.id, address: w.address, chain_type: w.chain_type, created_at: w.created_at });
  }
  return out;
}

/** Resolve user's first embedded wallet address for a given chain type */
export async function getUserEmbeddedWalletAddress(userId: string, chain: EmbeddedChainKey): Promise<string> {
  const wallets = await listUserWallets(userId, TO_PRIVY[chain]);
  if (!wallets.length) throw new Error(`No ${TO_PRIVY[chain]} wallet for user ${userId}`);
  return wallets[0].address;
}

/** Create a user-owned embedded wallet for "sol" or "eth" */
export async function createUserEmbeddedWallet(userId: string, chain: ChainKey) {
  assertEmbeddedSupported(chain);
  const privy = getPrivyClient();
  const wallet = await privy.wallets().create({
    chain_type: TO_PRIVY[chain],
    owner: { user_id: userId }, // user-owned wallet
  });
  return { id: wallet.id, address: wallet.address, chainType: wallet.chain_type, createdAt: wallet.created_at };
}

/** Get a wallet by its Privy walletId */
export async function getEmbeddedWalletById(walletId: string) {
  const privy = getPrivyClient();
  const w = await privy.wallets().get(walletId);
  return { id: w.id, address: w.address, chainType: w.chain_type, createdAt: w.created_at };
}

