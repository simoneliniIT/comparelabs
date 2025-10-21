-- Manual SQL to add credits column to profiles table
-- Run this directly in your Supabase SQL Editor

-- Add credits column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'credits'
    ) THEN
        ALTER TABLE profiles ADD COLUMN credits INTEGER DEFAULT 100;
    END IF;
END $$;

-- Update existing users with credits based on subscription tier
UPDATE profiles 
SET credits = CASE 
    WHEN subscription_tier = 'free' THEN 100
    WHEN subscription_tier = 'plus' THEN 1000  
    WHEN subscription_tier = 'pro' THEN 10000
    ELSE 100
END
WHERE credits IS NULL OR credits = 100;

-- Verify the column was added
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'profiles' AND column_name = 'credits';
