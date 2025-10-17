import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { storeEncryptedWalletSecret } from './wallet.js';
import { Keypair } from '@solana/web3.js';

const getSupabaseConfig = () => {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error('Missing Supabase environment variables. Please check your .env.local file.');
  }

  return { supabaseUrl, supabaseServiceRoleKey };
};

// IMPORTANT: Using service_role key to bypass RLS for backend operations
// This allows us to access secret_key while keeping it hidden from client-side queries
export const getSupabaseClient = (): SupabaseClient => {
  const { supabaseUrl, supabaseServiceRoleKey } = getSupabaseConfig();
  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    },
    db: {
      schema: 'public'
    },
    global: {
      headers: {
        'x-my-custom-header': 'monkfish-backend'
      }
    }
  });
};

// For backward compatibility, create a lazy-loaded supabase instance
export const supabase: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(target, prop) {
    const client = getSupabaseClient();
    return client[prop as keyof SupabaseClient];
  }
});

/**
 * Create a new wallet and store the encrypted secret key
 * @param secretKey - The wallet's private key as number array (64 bytes)
 * @param walletAddress - The wallet's public key address
 * @returns Promise that resolves to the wallet address
 */
export const createWallet = async (
  secretKey: number[], 
  walletAddress: string
): Promise<string> => {
  // Convert the secret key to Uint8Array and store it encrypted
  try {
    const secretKeyUint8 = new Uint8Array(secretKey);
    await storeEncryptedWalletSecret(walletAddress, secretKeyUint8);
  } catch (encryptionError) {
    throw new Error(`Failed to encrypt and store wallet secret: ${encryptionError}`);
  }

  return walletAddress;
};

/**
 * Get a wallet keypair for operations
 * @param walletAddress - The wallet's public key address
 * @returns Promise that resolves to the wallet keypair
 */
export const getWalletKeypair = async (walletAddress: string): Promise<Keypair> => {
  // Load the keypair from encrypted storage
  const { loadKeypairFromDatabase } = await import('./wallet.js');
  return await loadKeypairFromDatabase(walletAddress);
};
