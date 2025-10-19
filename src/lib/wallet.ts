/**
 * Purpose:
 * - Provide a shared Solana RPC Connection (singleton).
 * - Load a wallet Keypair from environment variables.
 * - Integrate with Privy for embedded wallet management.
 */
import { Connection, Keypair } from "@solana/web3.js";
import { PrivyClient } from "@privy-io/node";
import bs58 from "bs58";

let _conn: Connection | null = null;

export function getConnection(rpcUrl?: string): Connection {
  if (rpcUrl) return new Connection(rpcUrl, "confirmed");
  if (_conn) return _conn;

  const url = process.env.SOLANA_RPC_URL;
  if (!url) throw new Error("SOLANA_RPC_URL is required");

  _conn = new Connection(url, "confirmed");
  return _conn;
}

// Privy wallet management
let _privyClient: PrivyClient | null = null;

export function getPrivyClient(): PrivyClient {
  if (_privyClient) return _privyClient;

  const appId = process.env.PRIVY_APP_ID;
  const appSecret = process.env.PRIVY_APP_SECRET;

  if (!appId || !appSecret) {
    throw new Error("PRIVY_APP_ID and PRIVY_APP_SECRET are required in .env");
  }

  const clientConfig: any = {
    appId,
    appSecret,
  };

  _privyClient = new PrivyClient(clientConfig);

  return _privyClient;
}

/**
 * Create a new wallet using Privy authorization key
 * Returns wallet with address that can be passed to frontend
 */
export async function createWallet(chainType: "ethereum" | "solana" = "solana") {
  const privy = getPrivyClient();
  const authorizationKey = process.env.PRIVY_AUTHORIZATION_KEY;
  
  if (!authorizationKey) {
    throw new Error("PRIVY_AUTHORIZATION_KEY is required to create wallets");
  }
  
  return await privy.wallets().create({
    chain_type: chainType,
    owner: { public_key: authorizationKey }
  });
}

/**
 * Get wallet details by wallet ID
 */
export async function getWallet(walletId: string) {
  const privy = getPrivyClient();
  return await privy.wallets().get(walletId);
}

/**
 * Load a keypair from environment variables for server-side trading
 * This is separate from Privy embedded wallets and used for automated trading
 */
export function loadKeypair(): Keypair {
  const privateKeyBase58 = process.env.SOLANA_PRIVATE_KEY;
  
  if (!privateKeyBase58) {
    throw new Error("SOLANA_PRIVATE_KEY environment variable is required for server-side trading");
  }
  
  try {
    const privateKeyBytes = bs58.decode(privateKeyBase58);
    return Keypair.fromSecretKey(privateKeyBytes);
  } catch (error) {
    throw new Error(`Invalid SOLANA_PRIVATE_KEY format: ${error instanceof Error ? error.message : String(error)}`);
  }
}

