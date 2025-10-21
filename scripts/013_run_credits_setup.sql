-- Execute the credits system setup
-- This will add the credits column and set up the credit transaction system

-- Add credits field to profiles table safely
DO $$ 
BEGIN
    -- Add credits column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' 
        AND column_name = 'credits'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.profiles ADD COLUMN credits INTEGER DEFAULT 100;
    END IF;
END $$;

-- Update existing profiles to have initial credits based on subscription tier
-- Only update profiles that have 0 or NULL credits
UPDATE public.profiles 
SET credits = CASE 
  WHEN subscription_tier = 'free' THEN 100
  WHEN subscription_tier = 'plus' THEN 1000  
  WHEN subscription_tier = 'pro' THEN 10000
  ELSE 100
END
WHERE credits IS NULL OR credits = 0;
