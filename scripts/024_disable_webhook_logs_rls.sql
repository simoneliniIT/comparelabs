-- Completely disable RLS on webhook_logs table
-- This table is for internal logging only and doesn't need RLS protection

ALTER TABLE webhook_logs DISABLE ROW LEVEL SECURITY;

-- Drop any existing policies
DROP POLICY IF EXISTS "Admin users can view webhook logs" ON webhook_logs;
DROP POLICY IF EXISTS "Service role can insert webhook logs" ON webhook_logs;

-- Grant necessary permissions
GRANT INSERT ON webhook_logs TO authenticated;
GRANT INSERT ON webhook_logs TO service_role;
GRANT SELECT ON webhook_logs TO authenticated;
