/**
 * Purpose:
 * - Provide a shared Solana RPC Connection (singleton).
 * - Load a wallet Keypair from environment variables.
 * - Integrate with Privy for embedded wallet management.
 */
import { APIError, PrivyAPIError } from '@privy-io/node';
import { Connection, Keypair } from "@solana/web3.js";
import bs58 from "bs58";
import { PrivyClient } from "@privy-io/node";

let _conn: Connection | null = null;

export function getConnection(rpcUrl?: string): Connection {
  if (rpcUrl) return new Connection(rpcUrl, "confirmed");
  if (_conn) return _conn;

  const url = process.env.SOLANA_RPC_URL;
  if (!url) throw new Error("SOLANA_RPC_URL is required");

  _conn = new Connection(url, "confirmed");
  return _conn;
}

export function loadKeypair(): Keypair {
  const b58 = process.env.WALLET_SECRET_KEY_BASE58?.trim();
  const json = process.env.WALLET_SECRET_KEY_JSON?.trim();

  if (b58) {
    const bytes = bs58.decode(b58);
    if (bytes.length !== 64) {
      throw new Error(`Base58 secret must decode to 64 bytes, got ${bytes.length}`);
    }
    return Keypair.fromSecretKey(bytes);
  }

  if (json) {
    const arr = JSON.parse(json) as number[];
    const bytes = Uint8Array.from(arr);
    if (bytes.length !== 64) {
      throw new Error(`JSON secret must be 64 bytes, got ${bytes.length}`);
    }
    return Keypair.fromSecretKey(bytes);
  }

  throw new Error("Set WALLET_SECRET_KEY_BASE58 or WALLET_SECRET_KEY_JSON in .env");
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

  _privyClient = new PrivyClient({
    appId,
    appSecret,
  });

  return _privyClient;
}

// /**
//  * Create a new wallet for a user using Privy
//  */
// export async function createPrivyWallet(userId: string, chainType: "ethereum" | "solana" = "ethereum") {
//   const privy = getPrivyClient();
//   return await privy.wallets().create({
//     chain_type: chainType,
//     owner: { user_id: userId },
//   });
// }
/**
 * Create a new wallet for a user using Privy
 */
export async function createPrivyWallet(userId: string, chainType: "ethereum" | "solana" = "solana") {
  const privy = getPrivyClient();
  const privyUserId = userId.startsWith('did:privy:') ? userId : `did:privy:${userId}`;
  return await privy.wallets().create({
    chain_type: chainType,
    owner: { user_id: privyUserId },
  });
}

/**
 * Get wallet details by wallet ID
 */
export async function getPrivyWallet(walletId: string) {
  const privy = getPrivyClient();
  return await privy.wallets().get(walletId);
}

/**
 * Get all wallets for a specific user
 */
export async function getUserPrivyWallets(userId: string) {
  const privy = getPrivyClient();
  const privyUserId = userId.startsWith('did:privy:') ? userId : `did:privy:${userId}`;
  return await privy.wallets().list({ user_id: privyUserId });
}

/**
 * Create a wallet controlled by an authorization key (for server-side operations)
 * Note: This creates a wallet without an owner, which can be controlled by the server
 */
export async function createPrivyWalletWithAuthKey(authKey: string, chainType: "ethereum" | "solana" = "solana") {
  const privy = getPrivyClient();
  return await privy.wallets().create({
    chain_type: chainType,
    // Create wallet without owner for server control
    // The authKey parameter is kept for API compatibility but not used in the actual call
  });
}

