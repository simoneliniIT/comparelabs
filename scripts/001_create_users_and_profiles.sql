-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create profiles table that references auth.users
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  subscription_tier TEXT DEFAULT 'free' CHECK (subscription_tier IN ('free', 'pro', 'enterprise')),
  subscription_status TEXT DEFAULT 'active' CHECK (subscription_status IN ('active', 'canceled', 'past_due')),
  stripe_customer_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist before recreating them
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_delete_own" ON public.profiles;

-- Create RLS policies for profiles
CREATE POLICY "profiles_select_own" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "profiles_insert_own" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "profiles_delete_own" ON public.profiles
  FOR DELETE USING (auth.uid() = id);

-- Create usage_logs table for tracking API calls
CREATE TABLE IF NOT EXISTS public.usage_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  model_name TEXT NOT NULL,
  prompt_tokens INTEGER DEFAULT 0,
  completion_tokens INTEGER DEFAULT 0,
  total_tokens INTEGER DEFAULT 0,
  cost_usd DECIMAL(10, 6) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for usage_logs
ALTER TABLE public.usage_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist before recreating them
DROP POLICY IF EXISTS "usage_logs_select_own" ON public.usage_logs;
DROP POLICY IF EXISTS "usage_logs_insert_own" ON public.usage_logs;

-- Create RLS policies for usage_logs
CREATE POLICY "usage_logs_select_own" ON public.usage_logs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "usage_logs_insert_own" ON public.usage_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create subscription_limits table
CREATE TABLE IF NOT EXISTS public.subscription_limits (
  tier TEXT PRIMARY KEY CHECK (tier IN ('free', 'pro', 'enterprise')),
  daily_queries INTEGER NOT NULL,
  monthly_queries INTEGER NOT NULL,
  available_models TEXT[] NOT NULL,
  priority_support BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default subscription limits
INSERT INTO public.subscription_limits (tier, daily_queries, monthly_queries, available_models, priority_support) VALUES
  ('free', 10, 100, ARRAY['chatgpt', 'claude', 'gemini'], FALSE),
  ('pro', 500, 10000, ARRAY['chatgpt', 'claude', 'gemini', 'gpt-4', 'claude-3-opus'], TRUE),
  ('enterprise', -1, -1, ARRAY['chatgpt', 'claude', 'gemini', 'gpt-4', 'claude-3-opus', 'custom'], TRUE)
ON CONFLICT (tier) DO NOTHING;

-- Enable RLS for subscription_limits (read-only for all authenticated users)
ALTER TABLE public.subscription_limits ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if it exists before recreating it
DROP POLICY IF EXISTS "subscription_limits_select_all" ON public.subscription_limits;

CREATE POLICY "subscription_limits_select_all" ON public.subscription_limits
  FOR SELECT TO authenticated USING (TRUE);
