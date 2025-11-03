-- Create table to track free tries by IP address
CREATE TABLE IF NOT EXISTS free_try_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address TEXT NOT NULL,
  user_agent TEXT,
  prompt TEXT,
  models_used TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on ip_address and created_at for fast lookups
CREATE INDEX IF NOT EXISTS idx_free_try_logs_ip_created 
ON free_try_logs(ip_address, created_at DESC);

-- Enable RLS (but allow all for now since this is for unauthenticated users)
ALTER TABLE free_try_logs ENABLE ROW LEVEL SECURITY;

-- Create policy to allow inserts (API will handle this)
CREATE POLICY free_try_logs_insert_all ON free_try_logs
  FOR INSERT
  WITH CHECK (true);

-- Create policy to allow admin reads
CREATE POLICY free_try_logs_select_admin ON free_try_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.id = auth.uid()
    )
  );
