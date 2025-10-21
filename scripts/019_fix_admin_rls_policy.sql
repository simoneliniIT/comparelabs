-- Drop the existing problematic RLS policy that causes infinite recursion
DROP POLICY IF EXISTS "Admin users can view admin_users" ON public.admin_users;

-- Create a new policy that doesn't cause recursion
-- This policy allows anyone to check if they are an admin by querying with their own ID
-- It doesn't recursively check the admin_users table
CREATE POLICY "Users can check their own admin status"
ON public.admin_users FOR SELECT
USING (id = auth.uid());

-- Alternatively, you can disable RLS entirely for admin_users since we're checking
-- admin status in the application code using the service role key
-- Uncomment the line below if you prefer this approach:
-- ALTER TABLE public.admin_users DISABLE ROW LEVEL SECURITY;
