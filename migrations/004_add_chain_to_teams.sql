-- Add chain column to teams table
-- This migration adds the chain column to specify which blockchain network the team operates on

-- Add chain column to teams table
ALTER TABLE teams ADD COLUMN IF NOT EXISTS chain TEXT DEFAULT 'sol';

-- Create index on chain for faster lookups
CREATE INDEX IF NOT EXISTS idx_teams_chain ON teams(chain);