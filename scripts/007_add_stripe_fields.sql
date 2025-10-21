-- Add Stripe-specific fields to profiles table for subscription management
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT,
ADD COLUMN IF NOT EXISTS current_period_end TIMESTAMP WITH TIME ZONE;

-- Update the subscription_tier constraint to remove enterprise (as per previous migration)
-- This ensures we only have 'free' and 'pro' tiers
ALTER TABLE public.profiles 
DROP CONSTRAINT IF EXISTS profiles_subscription_tier_check;

ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_subscription_tier_check 
CHECK (subscription_tier IN ('free', 'pro'));

-- Add index for faster Stripe customer lookups
CREATE INDEX IF NOT EXISTS profiles_stripe_customer_id_idx ON public.profiles(stripe_customer_id);
CREATE INDEX IF NOT EXISTS profiles_stripe_subscription_id_idx ON public.profiles(stripe_subscription_id);

-- Update subscription_limits to only include free and pro tiers
DELETE FROM public.subscription_limits WHERE tier = 'enterprise';

-- Ensure we have the correct limits for our two-tier system
INSERT INTO public.subscription_limits (tier, daily_queries, monthly_queries, available_models, priority_support) VALUES
  ('free', 10, 100, ARRAY['chatgpt', 'claude', 'gemini'], FALSE),
  ('pro', 500, 10000, ARRAY['chatgpt', 'claude', 'gemini', 'gpt-4', 'claude-3-opus'], TRUE)
ON CONFLICT (tier) DO UPDATE SET
  daily_queries = EXCLUDED.daily_queries,
  monthly_queries = EXCLUDED.monthly_queries,
  available_models = EXCLUDED.available_models,
  priority_support = EXCLUDED.priority_support;

-- Update constraint for subscription_limits table
ALTER TABLE public.subscription_limits 
DROP CONSTRAINT IF EXISTS subscription_limits_tier_check;

ALTER TABLE public.subscription_limits 
ADD CONSTRAINT subscription_limits_tier_check 
CHECK (tier IN ('free', 'pro'));
