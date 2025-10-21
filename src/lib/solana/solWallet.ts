// src/lib/solana/solWallet.ts
/**
 * Purpose:
 * - Provide a shared Solana RPC Connection (singleton).
 * - (Optional) helpers: CAIP-2 for Privy, confirmation/simulation utils.
 * - NO server-side key management here. Privy signs on behalf of the user.
 */

import { Connection, Finality } from "@solana/web3.js";

let _conn: Connection | null = null;

export function getConnection(rpcUrl?: string, commitment: Finality = "confirmed"): Connection {
  if (rpcUrl) return new Connection(rpcUrl, commitment);
  if (_conn) return _conn;

  const url = process.env.SOLANA_RPC_URL;
  if (!url) throw new Error("SOLANA_RPC_URL is required");

  _conn = new Connection(url, commitment);
  return _conn;
}

/**
 * Resolve CAIP-2 chain id for Privy.
 * mainnet: solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp
 * devnet:  solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1
 * testnet: solana:4uhcVJyU9P8JkvQyS88uRDiswHXSCkY3z
 */
export function getSolanaCaip2(): string {
  const net = (process.env.SOLANA_NETWORK ?? "mainnet").toLowerCase();
  if (net === "devnet") return "solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1";
  if (net === "testnet") return "solana:4uhcVJyU9P8JkvQyS88uRDiswHXSCkY3z";
  return "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp";
}

/** Optional: confirm a signature if you want server-side assurance. */
export async function confirmSig(signature: string, commitment: Finality = "confirmed") {
  const conn = getConnection(undefined, commitment);
  const latest = await conn.getLatestBlockhash(commitment);
  return conn.confirmTransaction(
    { signature, blockhash: latest.blockhash, lastValidBlockHeight: latest.lastValidBlockHeight },
    commitment
  );
}
