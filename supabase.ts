import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

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
  wallet_address: string;
  secret_key: string;
  wallet_addresses?: string[];
  owner?: string;
  created_at?: string;
  updated_at?: string;
}

export const saveWallet = async (
  secretKey: number[], 
  walletAddress: string,
  teamName?: string,
  owner?: string
): Promise<Team> => {
  const { data, error } = await supabase
    .from('teams')
    .insert([
      {
        wallet_address: walletAddress,
        secret_key: JSON.stringify(secretKey),
        team_name: teamName,
        owner: owner
      }
    ])
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to save wallet: ${error.message}`);
  }

  return data;
};



// Check if a user is the owner or a member of a team
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
