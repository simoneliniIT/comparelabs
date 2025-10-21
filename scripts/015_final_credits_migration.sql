-- Final credits migration to ensure the column exists
-- This script will add the credits column if it doesn't exist

-- Add credits column to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS credits INTEGER DEFAULT 100;

-- Update existing users to have default credits based on their subscription tier
UPDATE public.profiles 
SET credits = CASE 
  WHEN subscription_tier = 'free' THEN 100
  WHEN subscription_tier = 'plus' THEN 1000  
  WHEN subscription_tier = 'pro' THEN 10000
  ELSE 100
END
WHERE credits IS NULL OR credits = 0;

-- Verify the column was added
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'profiles' AND column_name = 'credits';
