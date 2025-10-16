import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { storeEncryptedWalletSecret } from './wallet.js';
import { Keypair } from '@solana/web3.js';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error('Missing Supabase environment variables. Please check your .env file.');
}

// IMPORTANT: Using service_role key to bypass RLS for backend operations
// This allows us to access secret_key while keeping it hidden from client-side queries
export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
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

export interface Team {
  id?: string;
  team_name?: string;
  wallet_addresses?: string[];
  owner?: string;
  chain?: string;
  created_at?: string;
  updated_at?: string;
}

export const saveWallet = async (
  secretKey: number[], 
  walletAddress: string,
  teamName?: string,
  owner?: string,
  chain?: string
): Promise<Team> => {
  // First, create the team record without the secret key
  const { data: teamData, error: teamError } = await supabase
    .from('teams')
    .insert([
      {
        team_name: teamName,
        owner: owner,
        chain: chain,
        wallet_addresses: [walletAddress] // Store wallet address in the JSONB array
      }
    ])
    .select()
    .single();

  if (teamError) {
    throw new Error(`Failed to save team: ${teamError.message}`);
  }

  // Convert the secret key to Uint8Array and store it encrypted
  try {
    const secretKeyUint8 = new Uint8Array(secretKey);
    await storeEncryptedWalletSecret(walletAddress, secretKeyUint8, teamData.id);
  } catch (encryptionError) {
    // If encryption fails, we should clean up the team record
    await supabase.from('teams').delete().eq('id', teamData.id);
    throw new Error(`Failed to encrypt and store wallet secret: ${encryptionError}`);
  }

  return teamData;
};



// Check if a user is the owner or a member of a team
// Check if a team already has a wallet
export const checkTeamWallet = async (teamName: string): Promise<Team | null> => {
  const { data: team, error } = await supabase
    .from('teams')
    .select('*')
    .eq('team_name', teamName)
    .single();

  if (error || !team) {
    return null;
  }

  return team;
};

export const checkTeamMembership = async (
  userId: string, 
  teamName: string
): Promise<{ isAuthorized: boolean; role?: 'owner' | 'member' }> => {
  // First, get the team by name
  const { data: team, error: teamError } = await supabase
    .from('teams')
    .select('id, owner')
    .eq('team_name', teamName)
    .single();

  if (teamError || !team) {
    // Team doesn't exist yet, so we need to verify they're the owner they claim to be
    // For new teams, we'll allow creation if userId matches owner in the request
    return { isAuthorized: false };
  }

  // Check if user is the team owner
  if (team.owner === userId) {
    return { isAuthorized: true, role: 'owner' };
  }

  // Check if user is a team member
  const { data: membership, error: memberError } = await supabase
    .from('team_members')
    .select('role')
    .eq('team_id', team.id)
    .eq('user_id', userId)
    .single();

  if (memberError || !membership) {
    return { isAuthorized: false };
  }

  return { isAuthorized: true, role: membership.role };
};

/**
 * Get a team's wallet keypair for authorized operations
 * @param teamName - The team name
 * @param userId - The user ID requesting access
 * @returns Promise that resolves to the team's wallet keypair
 */
export const getTeamWalletKeypair = async (
  teamName: string,
  userId: string
): Promise<Keypair> => {
  // First check authorization
  const { isAuthorized, role } = await checkTeamMembership(userId, teamName);
  
  if (!isAuthorized) {
    throw new Error('User not authorized to access team wallet');
  }

  // Get the team data
  const { data: team, error: teamError } = await supabase
    .from('teams')
    .select('wallet_addresses')
    .eq('team_name', teamName)
    .single();

  if (teamError || !team) {
    throw new Error(`Team not found: ${teamName}`);
  }

  // Get the first wallet address from the array
  const walletAddress = team.wallet_addresses?.[0];
  if (!walletAddress) {
    throw new Error(`No wallet found for team: ${teamName}`);
  }

  // Load the keypair from encrypted storage
  const { loadKeypairFromDatabase } = await import('./wallet.js');
  return await loadKeypairFromDatabase(walletAddress);
};
