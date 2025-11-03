-- Create table to track free try usage by IP address for rate limiting
CREATE TABLE IF NOT EXISTS public.free_try_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address TEXT NOT NULL,
  user_agent TEXT,
  prompt TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on ip_address and created_at for efficient rate limit queries
CREATE INDEX IF NOT EXISTS idx_free_try_logs_ip_created 
ON public.free_try_logs(ip_address, created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.free_try_logs ENABLE ROW LEVEL SECURITY;

-- Create policy to allow service role to manage all records
CREATE POLICY "Service role can manage free try logs"
ON public.free_try_logs
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Create policy to allow anonymous users to insert their own logs
CREATE POLICY "Anonymous users can insert free try logs"
ON public.free_try_logs
FOR INSERT
TO anon
WITH CHECK (true);
