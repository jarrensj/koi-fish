import { PrivyClient } from "@privy-io/node";
import type { ChainKey } from "../shared/chains.ts";


// Only these are supported for embedded wallets (for now)
export type EmbeddedChainKey = "sol" | "eth";

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

// Compile-time map (prevents accidental widening)
const TO_PRIVY: Record<EmbeddedChainKey, "solana" | "ethereum"> = {
  sol: "solana",
  eth: "ethereum",
};

// runtime guard + type narrowing; if someone passes full ChainKey by mistake
function assertEmbeddedSupported(chain: ChainKey): asserts chain is EmbeddedChainKey {
  if (chain !== "sol" && chain !== "eth") {
    throw new Error(
      `Embedded wallets are supported only for "sol" and "eth" (got "${chain}"). ` +
      `If you need "base" or "zora", open a follow-up PR or use EVM server wallet flows.`
    );
  }
}

/**
 * Create a Privy embedded wallet for a supported chain.
 * 
 * @param chain - App-level ChainKey ("sol" | "eth"). The controller defaults to "sol".
 * @returns An object { id, address, chainType, createdAt } from Privy.
 * @throws If the chain is not "sol" or "eth", or if required PRIVY_* env vars are missing.
 *
 * Security: This does not load or use any server-side private keys; it only calls Privy.
 * Notes: Uses PRIVY_PUBLIC_AUTHORIZATION_KEY as the owner identifier.
 */
export async function createEmbeddedWallet(chain: ChainKey) {
  assertEmbeddedSupported(chain);

  const authorizationKey = process.env.PRIVY_PUBLIC_AUTHORIZATION_KEY;
  if (!authorizationKey) {
    throw new Error("PRIVY_PUBLIC_AUTHORIZATION_KEY is required");
  }

  const privy = getPrivyClient();
  const wallet = await privy.wallets().create({
    chain_type: TO_PRIVY[chain],
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

