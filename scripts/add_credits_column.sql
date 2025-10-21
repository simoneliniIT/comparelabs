-- Add credits column to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS credits INTEGER DEFAULT 100;

-- Update existing users to have default credits
UPDATE profiles SET credits = 100 WHERE credits IS NULL;

-- Adding different credit amounts based on subscription tier
UPDATE profiles SET credits = CASE 
  WHEN subscription_tier = 'pro' THEN 1000
  WHEN subscription_tier = 'premium' THEN 5000
  ELSE 100
END;
