-- Update the default credits for free tier from 100 to 500
-- This ensures new users get 500 credits instead of 100

-- First, alter the column default to 500
ALTER TABLE public.profiles 
ALTER COLUMN credits SET DEFAULT 500;

-- Update existing free tier users who have 100 credits to 500
-- Only update users who haven't used any credits yet (still have exactly 100)
UPDATE public.profiles
SET credits = 500
WHERE subscription_tier = 'free' 
  AND credits = 100;

-- Also update users who might have used some credits but are still on free tier
-- Give them the difference (400 more credits)
UPDATE public.profiles
SET credits = credits + 400
WHERE subscription_tier = 'free' 
  AND credits > 0 
  AND credits < 100;
