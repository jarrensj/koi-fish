/**
 * Purpose:
 * - Provide a shared Solana RPC Connection (singleton).
 * - Load a wallet Keypair from environment variables.
 * - Provide utilities for working with encrypted wallet secrets.
 */

import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import bs58 from "bs58";
import { supabase } from './supabase.js';
import { encryptWalletSecret, decryptWalletSecret, type EncryptionResult, type DecryptionInput } from './encryption.js';

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

/**
 * Store an encrypted wallet secret in the database
 * @param walletAddress - The wallet's public key address
 * @param secretKey - The wallet's private key as Uint8Array (64 bytes)
 * @returns Promise that resolves to the stored wallet secret record
 */
export async function storeEncryptedWalletSecret(
  walletAddress: string,
  secretKey: Uint8Array
): Promise<any> {
  if (secretKey.length !== 64) {
    throw new Error(`Invalid secret key length: expected 64 bytes, got ${secretKey.length}`);
  }

  // Validate wallet address
  try {
    new PublicKey(walletAddress);
  } catch (error) {
    throw new Error(`Invalid wallet address: ${walletAddress}`);
  }

  // Encrypt the secret key
  const encryptionResult = encryptWalletSecret(secretKey);

  // Store in database
  const { data, error } = await supabase
    .from('wallet_secrets')
    .insert([
      {
        wallet_address: walletAddress,
        encrypted_secret_key: encryptionResult.encryptedData,
        encryption_algorithm: encryptionResult.algorithm,
        iv: encryptionResult.iv,
        tag: encryptionResult.tag
      }
    ])
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to store encrypted wallet secret: ${error.message}`);
  }

  return data;
}

/**
 * Retrieve and decrypt a wallet secret from the database
 * @param walletAddress - The wallet's public key address
 * @returns Promise that resolves to the decrypted secret key as Uint8Array
 */
export async function getEncryptedWalletSecret(walletAddress: string): Promise<Uint8Array> {
  // Validate wallet address
  try {
    new PublicKey(walletAddress);
  } catch (error) {
    throw new Error(`Invalid wallet address: ${walletAddress}`);
  }

  // Retrieve from database
  const { data, error } = await supabase
    .from('wallet_secrets')
    .select('encrypted_secret_key, encryption_algorithm, iv, tag')
    .eq('wallet_address', walletAddress)
    .single();

  if (error || !data) {
    throw new Error(`Failed to retrieve wallet secret: ${error?.message || 'Wallet secret not found'}`);
  }

  // Decrypt the secret key
  const decryptionInput: DecryptionInput = {
    encryptedData: data.encrypted_secret_key,
    iv: data.iv,
    tag: data.tag,
    algorithm: data.encryption_algorithm
  };

  return decryptWalletSecret(decryptionInput);
}

/**
 * Create a Keypair from a wallet address stored in the database
 * @param walletAddress - The wallet's public key address
 * @returns Promise that resolves to a Solana Keypair
 */
export async function loadKeypairFromDatabase(walletAddress: string): Promise<Keypair> {
  const secretKey = await getEncryptedWalletSecret(walletAddress);
  return Keypair.fromSecretKey(secretKey);
}

/**
 * Check if a wallet secret exists in the database
 * @param walletAddress - The wallet's public key address
 * @returns Promise that resolves to true if the wallet secret exists
 */
export async function walletSecretExists(walletAddress: string): Promise<boolean> {
  try {
    new PublicKey(walletAddress);
  } catch (error) {
    return false;
  }

  const { data, error } = await supabase
    .from('wallet_secrets')
    .select('id')
    .eq('wallet_address', walletAddress)
    .single();

  return !error && !!data;
}

/**
 * Delete a wallet secret from the database (soft delete by marking as inactive)
 * Note: This function doesn't actually delete the record for audit purposes
 * @param walletAddress - The wallet's public key address
 * @returns Promise that resolves when the operation is complete
 */
export async function revokeWalletSecret(walletAddress: string): Promise<void> {
  // Validate wallet address
  try {
    new PublicKey(walletAddress);
  } catch (error) {
    throw new Error(`Invalid wallet address: ${walletAddress}`);
  }

  // For security, we'll update the record to mark it as revoked
  // In a production system, you might want to actually delete or move to archive
  const { error } = await supabase
    .from('wallet_secrets')
    .update({ 
      encrypted_secret_key: '[REVOKED]',
      updated_at: new Date().toISOString()
    })
    .eq('wallet_address', walletAddress);

  if (error) {
    throw new Error(`Failed to revoke wallet secret: ${error.message}`);
  }
}
