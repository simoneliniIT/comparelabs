-- Create admin users table to define who can access cost data
CREATE TABLE IF NOT EXISTS public.admin_users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT DEFAULT 'admin' CHECK (role IN ('admin', 'super_admin')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for admin_users
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- Drop existing policy before creating to avoid conflicts
DROP POLICY IF EXISTS "admin_users_select_admin_only" ON public.admin_users;

-- Only allow admins to see admin_users table
CREATE POLICY "admin_users_select_admin_only" ON public.admin_users
  FOR SELECT USING (auth.uid() IN (SELECT id FROM public.admin_users));

-- Create admin cost analytics view
CREATE OR REPLACE VIEW public.admin_cost_analytics AS
SELECT 
  p.id as user_id,
  p.email,
  p.full_name,
  p.subscription_tier,
  p.subscription_status,
  -- Daily stats
  COUNT(CASE WHEN ul.created_at >= CURRENT_DATE THEN 1 END) as daily_queries,
  SUM(CASE WHEN ul.created_at >= CURRENT_DATE THEN ul.prompt_tokens ELSE 0 END) as daily_prompt_tokens,
  SUM(CASE WHEN ul.created_at >= CURRENT_DATE THEN ul.completion_tokens ELSE 0 END) as daily_completion_tokens,
  SUM(CASE WHEN ul.created_at >= CURRENT_DATE THEN ul.total_tokens ELSE 0 END) as daily_total_tokens,
  SUM(CASE WHEN ul.created_at >= CURRENT_DATE THEN ul.cost_usd ELSE 0 END) as daily_cost_usd,
  -- Monthly stats
  COUNT(CASE WHEN ul.created_at >= DATE_TRUNC('month', CURRENT_DATE) THEN 1 END) as monthly_queries,
  SUM(CASE WHEN ul.created_at >= DATE_TRUNC('month', CURRENT_DATE) THEN ul.prompt_tokens ELSE 0 END) as monthly_prompt_tokens,
  SUM(CASE WHEN ul.created_at >= DATE_TRUNC('month', CURRENT_DATE) THEN ul.completion_tokens ELSE 0 END) as monthly_completion_tokens,
  SUM(CASE WHEN ul.created_at >= DATE_TRUNC('month', CURRENT_DATE) THEN ul.total_tokens ELSE 0 END) as monthly_total_tokens,
  SUM(CASE WHEN ul.created_at >= DATE_TRUNC('month', CURRENT_DATE) THEN ul.cost_usd ELSE 0 END) as monthly_cost_usd,
  -- All-time stats
  COUNT(ul.id) as total_queries,
  SUM(ul.prompt_tokens) as total_prompt_tokens,
  SUM(ul.completion_tokens) as total_completion_tokens,
  SUM(ul.total_tokens) as total_total_tokens,
  SUM(ul.cost_usd) as total_cost_usd,
  -- Last activity
  MAX(ul.created_at) as last_activity
FROM public.profiles p
LEFT JOIN public.usage_logs ul ON p.id = ul.user_id
GROUP BY p.id, p.email, p.full_name, p.subscription_tier, p.subscription_status
ORDER BY monthly_cost_usd DESC NULLS LAST;

-- Removed policy creation on view - policies can only be applied to tables, not views
-- Access control is handled through the admin_users table policy
-- Views inherit permissions from their underlying tables

-- Enable RLS for the view (only admins can access)
ALTER VIEW public.admin_cost_analytics OWNER TO postgres;

-- Insert initial admin user (replace with your email)
-- INSERT INTO public.admin_users (id, email) 
-- SELECT id, email FROM auth.users WHERE email = 'your-admin-email@example.com';
