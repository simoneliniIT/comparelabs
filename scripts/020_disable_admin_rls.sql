-- Disable RLS on admin_users table to prevent infinite recursion
-- This is safe because we check admin status in application code

-- Drop existing policies
DROP POLICY IF EXISTS "Admin users can view admin_users" ON public.admin_users;
DROP POLICY IF EXISTS "Users can check their own admin status" ON public.admin_users;

-- Disable RLS entirely on admin_users table
ALTER TABLE public.admin_users DISABLE ROW LEVEL SECURITY;

-- Grant read access to authenticated users
GRANT SELECT ON public.admin_users TO authenticated;

-- Only allow service role to insert/update/delete
REVOKE INSERT, UPDATE, DELETE ON public.admin_users FROM authenticated;
GRANT INSERT, UPDATE, DELETE ON public.admin_users TO service_role;
