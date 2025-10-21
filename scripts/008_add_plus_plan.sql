-- Add Plus tier to subscription system
-- This script adds support for the new Plus plan ($9.99/month)

-- Update profiles table constraint to include 'plus'
ALTER TABLE public.profiles 
DROP CONSTRAINT IF EXISTS profiles_subscription_tier_check;

ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_subscription_tier_check 
CHECK (subscription_tier IN ('free', 'plus', 'pro'));

-- Update subscription_limits table constraint to include 'plus'
ALTER TABLE public.subscription_limits
DROP CONSTRAINT IF EXISTS subscription_limits_tier_check;

ALTER TABLE public.subscription_limits
ADD CONSTRAINT subscription_limits_tier_check
CHECK (tier IN ('free', 'plus', 'pro'));

-- Add Plus tier limits (positioned between Free and Pro)
INSERT INTO public.subscription_limits (tier, daily_queries, monthly_queries, available_models, priority_support) VALUES
('plus', 100, 2000, ARRAY['chatgpt', 'claude', 'gemini', 'gpt-4'], FALSE)
ON CONFLICT (tier) DO UPDATE SET
  daily_queries = EXCLUDED.daily_queries,
  monthly_queries = EXCLUDED.monthly_queries,
  available_models = EXCLUDED.available_models,
  priority_support = EXCLUDED.priority_support;

-- Verify the changes
SELECT tier, daily_queries, monthly_queries, available_models, priority_support 
FROM public.subscription_limits 
ORDER BY 
  CASE tier 
    WHEN 'free' THEN 1 
    WHEN 'plus' THEN 2 
    WHEN 'pro' THEN 3 
    ELSE 4 
  END;
