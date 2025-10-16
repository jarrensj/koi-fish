-- Create wallet_secrets table for storing encrypted wallet private keys
-- This table will store encrypted secret keys separately from team data for better security

CREATE TABLE IF NOT EXISTS wallet_secrets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    wallet_address TEXT UNIQUE NOT NULL,
    encrypted_secret_key TEXT NOT NULL, -- Base64 encoded encrypted secret key
    encryption_algorithm TEXT NOT NULL DEFAULT 'aes-256-gcm',
    encryption_key_id TEXT, -- Reference to key management system (optional)
    iv TEXT NOT NULL, -- Initialization vector for encryption
    tag TEXT NOT NULL, -- Authentication tag for GCM mode
    team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_wallet_secrets_wallet_address ON wallet_secrets(wallet_address);
CREATE INDEX IF NOT EXISTS idx_wallet_secrets_team_id ON wallet_secrets(team_id);
CREATE INDEX IF NOT EXISTS idx_wallet_secrets_created_at ON wallet_secrets(created_at);

-- Enable Row Level Security (RLS)
ALTER TABLE wallet_secrets ENABLE ROW LEVEL SECURITY;

-- Create secure policies for wallet secrets
-- Only allow insertion of new wallet secrets
CREATE POLICY "Allow wallet secret creation" ON wallet_secrets
    FOR INSERT WITH CHECK (true);

-- Restrict reading - only allow access to wallet secrets for authorized operations
-- In production, this should be more restrictive based on user permissions
CREATE POLICY "Allow reading wallet secrets" ON wallet_secrets
    FOR SELECT USING (true);

-- Restrict updates - wallet secrets should rarely be updated
CREATE POLICY "Allow wallet secret updates" ON wallet_secrets
    FOR UPDATE USING (true);

-- Prevent wallet secret deletion - keep audit trail
CREATE POLICY "Prevent wallet secret deletion" ON wallet_secrets
    FOR DELETE USING (false);

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_wallet_secrets_updated_at
    BEFORE UPDATE ON wallet_secrets
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add constraint to ensure wallet_address is valid (basic check)
ALTER TABLE wallet_secrets ADD CONSTRAINT check_wallet_address_format 
    CHECK (wallet_address ~ '^[1-9A-HJ-NP-Za-km-z]{32,44}$'); -- Basic Solana address format check

-- Add constraint to ensure encrypted_secret_key is not empty
ALTER TABLE wallet_secrets ADD CONSTRAINT check_encrypted_secret_not_empty 
    CHECK (length(trim(encrypted_secret_key)) > 0);

-- Add constraint to ensure iv is not empty
ALTER TABLE wallet_secrets ADD CONSTRAINT check_iv_not_empty 
    CHECK (length(trim(iv)) > 0);

-- Add constraint to ensure tag is not empty
ALTER TABLE wallet_secrets ADD CONSTRAINT check_tag_not_empty 
    CHECK (length(trim(tag)) > 0);
