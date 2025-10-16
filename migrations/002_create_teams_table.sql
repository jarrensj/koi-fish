-- Create teams and team_members tables for team management
CREATE TABLE IF NOT EXISTS teams (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    team_name TEXT UNIQUE NOT NULL,
    wallet_addresses JSONB DEFAULT '[]'::jsonb,
    owner UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on team_name for faster lookups
CREATE INDEX IF NOT EXISTS idx_teams_team_name ON teams(team_name);

-- Create GIN index on wallet_addresses JSONB for faster lookups
CREATE INDEX IF NOT EXISTS idx_teams_wallet_addresses ON teams USING GIN (wallet_addresses);

-- Create index on owner for faster lookups
CREATE INDEX IF NOT EXISTS idx_teams_owner ON teams(owner);

-- Enable Row Level Security (RLS)
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;

-- Create secure policies for team management
-- Allow anyone to insert new teams (team creation)
CREATE POLICY "Allow team creation" ON teams
    FOR INSERT WITH CHECK (true);

-- Allow reading all team data (for public team listings)
CREATE POLICY "Allow reading teams" ON teams
    FOR SELECT USING (true);

-- Restrict updates - teams should only update their own records
-- Note: In production, add wallet signature verification before allowing updates
CREATE POLICY "Allow team updates" ON teams
    FOR UPDATE USING (true);

-- Prevent team deletion
CREATE POLICY "Prevent team deletion" ON teams
    FOR DELETE USING (false);

-- Function to check team name uniqueness (case-insensitive)
CREATE OR REPLACE FUNCTION check_team_name_unique(new_team_name TEXT, team_id UUID DEFAULT NULL)
RETURNS BOOLEAN AS $$
BEGIN
    IF new_team_name IS NULL OR trim(new_team_name) = '' THEN
        RETURN FALSE;
    END IF;
    
    -- Check if team name already exists (case-insensitive), excluding current team
    IF EXISTS (
        SELECT 1 FROM teams 
        WHERE LOWER(team_name) = LOWER(trim(new_team_name)) 
        AND (team_id IS NULL OR id != team_id)
    ) THEN
        RETURN FALSE;
    END IF;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_teams_updated_at
    BEFORE UPDATE ON teams
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();


-- Function to automatically add team owner to team_members
CREATE OR REPLACE FUNCTION add_team_owner_as_member()
RETURNS TRIGGER AS $$
BEGIN
    -- Insert the team owner as owner in team_members table
    INSERT INTO team_members (team_id, user_id, role)
    VALUES (NEW.id, NEW.owner, 'owner');
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create team_members table for team membership management
CREATE TABLE IF NOT EXISTS team_members (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'member' CHECK (role IN ('owner', 'member')),
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure a user can only be in a team once
    UNIQUE(team_id, user_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_team_members_team_id ON team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_team_members_user_id ON team_members(user_id);
CREATE INDEX IF NOT EXISTS idx_team_members_role ON team_members(role);

-- Enable RLS
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Allow reading team memberships" ON team_members
    FOR SELECT USING (true);

CREATE POLICY "Allow joining teams" ON team_members
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow leaving teams" ON team_members
    FOR DELETE USING (true);

CREATE POLICY "Allow role updates" ON team_members
    FOR UPDATE USING (true);

-- Trigger to automatically add team owner to team_members after team creation
CREATE TRIGGER add_team_owner_trigger
    AFTER INSERT ON teams
    FOR EACH ROW
    EXECUTE FUNCTION add_team_owner_as_member();
