-- Execute the credits column addition
-- This is a simple version to just add the missing credits column

-- Add credits column to profiles table with proper schema reference
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
