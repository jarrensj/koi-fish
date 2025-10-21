// src/lib/privy/transactions.ts
import { getPrivyClient } from "./client.ts";
import { PublicKey } from "@solana/web3.js";

// Iterate the cursor and return the first SOL wallet
async function getUserSolanaWallet(userId: string) {
  const privy = getPrivyClient();
  const cursor = await privy.wallets().list({ user_id: userId, chain_type: "solana" });
  for await (const w of cursor) {
    return { id: w.id, address: w.address };
  }
  throw new Error(`No Solana wallets found for user ${userId}`);
}

export async function sendPrivyTransaction(
  userId: string,
  serializedBase64: string,
  opts?: {
    caip2?: string;   // e.g. "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp" (mainnet)
    sponsor?: boolean;
    idempotencyKey?: string;
  }
): Promise<string> {
  if (!serializedBase64 || serializedBase64.length < 200) {
    throw new Error("serializedBase64 looks invalid or too small.");
  }

  const privy = getPrivyClient();
  const { id: walletId } = await getUserSolanaWallet(userId);

  const caip2 =
    opts?.caip2 ??
    (process.env.SOLANA_NETWORK?.toLowerCase() === "devnet"
      ? "solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1"
      : "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp");

  const res = await privy.wallets().solana().signAndSendTransaction(walletId, {
    caip2,
    sponsor: opts?.sponsor ?? false,
    transaction: serializedBase64,
    idempotency_key: opts?.idempotencyKey,
  });

  return res.hash; // the Solana signature
}

export async function getPrivyUserPubKey(userId: string): Promise<PublicKey> {
  const { address } = await getUserSolanaWallet(userId);
  return new PublicKey(address);
}

// A simple way to check if the wallet has server/extra signers configured
export async function hasSessionSignerPermission(userId: string): Promise<boolean> {
  const privy = getPrivyClient();
  const { id } = await getUserSolanaWallet(userId);
  const w = await privy.wallets().get(id);
  return Array.isArray(w.additional_signers) && w.additional_signers.length > 0;
}
