-- Create webhook logs table to debug webhook processing
CREATE TABLE IF NOT EXISTS public.webhook_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  customer_email TEXT,
  user_id UUID,
  subscription_tier TEXT,
  success BOOLEAN NOT NULL,
  error_message TEXT,
  raw_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_webhook_logs_event_id ON public.webhook_logs(event_id);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_customer_email ON public.webhook_logs(customer_email);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_created_at ON public.webhook_logs(created_at DESC);

-- Enable RLS
ALTER TABLE public.webhook_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can view webhook logs
CREATE POLICY "Admin users can view webhook logs"
ON public.webhook_logs FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE admin_users.id = auth.uid()
  )
);
