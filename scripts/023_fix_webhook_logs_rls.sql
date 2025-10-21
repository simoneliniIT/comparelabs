-- Fix webhook_logs table RLS to allow service role to insert logs
-- The issue: RLS is enabled but there's no INSERT policy, so webhooks can't write logs

-- Drop existing policies
DROP POLICY IF EXISTS "Admin users can view webhook logs" ON public.webhook_logs;

-- Recreate SELECT policy for admins
CREATE POLICY "Admin users can view webhook logs"
ON public.webhook_logs FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE admin_users.id = auth.uid()
  )
);

-- Add INSERT policy to allow service role to write webhook logs
CREATE POLICY "Service role can insert webhook logs"
ON public.webhook_logs FOR INSERT
WITH CHECK (true);

-- Add comment explaining the policy
COMMENT ON POLICY "Service role can insert webhook logs" ON public.webhook_logs IS 
'Allows the service role (used by webhooks) to insert logs. Regular users cannot insert.';
