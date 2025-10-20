import { PrivyClient } from "@privy-io/node";
import type { ChainKey } from "../shared/chains.ts";



let _privyClient: PrivyClient | null = null;

export function getPrivyClient(): PrivyClient {
  if (_privyClient) return _privyClient;

  const appId = process.env.PRIVY_APP_ID;
  const appSecret = process.env.PRIVY_APP_SECRET;

  if (!appId || !appSecret) {
    throw new Error("PRIVY_APP_ID and PRIVY_APP_SECRET are required");
  }

  _privyClient = new PrivyClient({ appId, appSecret });
  return _privyClient;
}

/**
 * Map your app's ChainKey → Privy chain_type
 * Your ChainKey: "sol" | "eth" | "base" | "zora"
 * Privy chain_type: "solana" | "ethereum"
 */
function toPrivyChain(chain: ChainKey): "solana" | "ethereum" {
  return chain === "sol" ? "solana" : "ethereum";
}

/**
 * Create an embedded wallet for a given app-level chain key.
 * Example: chain="sol" | "eth" | "base" | "zora"
 */
export async function createEmbeddedWallet(chain: ChainKey) {
  const authorizationKey = process.env.PRIVY_PUBLIC_AUTHORIZATION_KEY;

  if (!authorizationKey) {
    throw new Error("PRIVY_PUBLIC_AUTHORIZATION_KEY is required");
  }

  const privy = getPrivyClient();

  const wallet = await privy.wallets().create({
    chain_type: toPrivyChain(chain),
    owner: { public_key: authorizationKey },
  });

  return {
    id: wallet.id,
    address: wallet.address,
    chainType: wallet.chain_type,
    createdAt: wallet.created_at,
  };
}

/** Fetch an embedded wallet by its Privy walletId. */
export async function getEmbeddedWallet(walletId: string) {
  const privy = getPrivyClient();
  const wallet = await privy.wallets().get(walletId);
  return {
    id: wallet.id,
    address: wallet.address,
    chainType: wallet.chain_type,
    createdAt: wallet.created_at,
  };
}

