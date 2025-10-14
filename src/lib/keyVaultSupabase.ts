import bs58 from "bs58";
import { Keypair, PublicKey } from "@solana/web3.js";
import { supabase } from "../testLocal/supabase.ts";

const TABLE = process.env.SUPABASE_WALLET_SECRETS_TABLE || "wallet_secrets";

/**
 * Fetches the secret for a given public key and returns a Keypair.
 * Security:
 * - Validates public key format
 * - Uses service_role client (server-only)
 * - Never logs or returns secrets
 * - Verifies secret reconstructs the exact requested public key
 */
export async function getKeypairForPublic(pubkeyStr: string): Promise<Keypair> {
  if (!supabase) throw new Error("Supabase not configured on server");
  let pub: PublicKey;
  try {
    pub = new PublicKey(pubkeyStr);
  } catch {
    throw new Error("Invalid walletAddress");
  }

  const { data, error } = await supabase
    .from(TABLE)
    .select("public_key, secret_b58, secret_json")
    .eq("public_key", pub.toBase58())
    .maybeSingle();

  if (error) throw new Error(`Supabase error: ${error.message}`);
  if (!data) throw new Error("Wallet not found");

  const { secret_b58, secret_json } = data as {
    public_key: string;
    secret_b58?: string | null;
    secret_json?: number[] | null;
  };

  if (secret_b58) {
    const bytes = bs58.decode(secret_b58.trim());
    if (bytes.length !== 64) throw new Error("Invalid secret_b58 length");
    const kp = Keypair.fromSecretKey(bytes);
    if (!kp.publicKey.equals(pub)) throw new Error("Secret/public key mismatch");
    return kp;
  }

  if (Array.isArray(secret_json)) {
    const bytes = Uint8Array.from(secret_json);
    if (bytes.length !== 64) throw new Error("Invalid secret_json length");
    const kp = Keypair.fromSecretKey(bytes);
    if (!kp.publicKey.equals(pub)) throw new Error("Secret/public key mismatch");
    return kp;
  }

  throw new Error("No secret found for wallet");
}
