-- Add cost tracking fields to free_try_logs table
ALTER TABLE free_try_logs
ADD COLUMN IF NOT EXISTS cost_usd DECIMAL(10, 6) DEFAULT 0,
ADD COLUMN IF NOT EXISTS prompt_tokens INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS completion_tokens INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_tokens INTEGER DEFAULT 0,
-- Adding models_used array column to track which models were used in the free try
ADD COLUMN IF NOT EXISTS models_used TEXT[] DEFAULT '{}';

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_free_try_logs_created_at ON free_try_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_free_try_logs_ip_created ON free_try_logs(ip_address, created_at DESC);
