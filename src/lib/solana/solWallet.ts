/**
 * Purpose:
 * - Provide a shared Solana RPC Connection (singleton).
 * - Load a wallet Keypair from environment variables.
 * - Provide utilities for working with encrypted wallet secrets.
 * - If/when you store Sol secrets in DB, mirror your EVM decrypt flow here.
 */

import { Connection, Keypair } from "@solana/web3.js";
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

export function loadKeypair(): Keypair {
  const solKey = process.env.SOL_WALLET_SECRET_KEY?.trim();
  const solJson = process.env.SOL_WALLET_SECRET_KEY_JSON?.trim();

  if (solKey) {
    const bytes = bs58.decode(solKey);
    if (bytes.length !== 64) {
      throw new Error(`Base58 secret must decode to 64 bytes`);
    }
    return Keypair.fromSecretKey(bytes);
  }

  if (solJson) {
    try {
      const arr = JSON.parse(solJson) as number[];
      const bytes = Uint8Array.from(arr);
      if (bytes.length !== 64) {
        throw new Error(`JSON secret must be 64 bytes`);
      }
      return Keypair.fromSecretKey(bytes);
    } catch (error) {
      throw new Error("Failed to load keypair from SOL_WALLET_SECRET_KEY_JSON");
    }
  }

  throw new Error("Set SOL_WALLET_SECRET_KEY or SOL_WALLET_SECRET_KEY_JSON in .env");
}
