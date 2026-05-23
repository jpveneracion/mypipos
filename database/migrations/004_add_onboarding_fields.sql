-- Add missing onboarding columns to users table
-- Run: psql -U postgres -d mypipos -f 004_add_onboarding_fields.sql

BEGIN;

-- Add onboarding_complete column if it doesn't exist
ALTER TABLE users
ADD COLUMN IF NOT EXISTS onboarding_complete BOOLEAN DEFAULT false;

-- Add merchant_id column if it doesn't exist (should reference merchants table)
ALTER TABLE users
ADD COLUMN IF NOT EXISTS merchant_id UUID REFERENCES merchants(id) ON DELETE SET NULL;

-- Update existing users to have onboarding_complete = false by default
UPDATE users
SET onboarding_complete = false
WHERE onboarding_complete IS NULL;

COMMIT;

-- Verify the changes
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'users'
AND column_name IN ('onboarding_complete', 'merchant_id');