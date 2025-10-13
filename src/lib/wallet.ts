/**
 * Purpose:
 * - Provide a shared Solana RPC Connection (singleton).
 * - Load a wallet Keypair from environment variables.
 *
 * Used by:
 * - controllers/trade.controller.ts → to get a Connection and Keypair.
 */

import dns from "dns";
dns.setDefaultResultOrder?.("ipv4first");

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
