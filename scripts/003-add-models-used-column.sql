-- Add models_used column to free_try_logs table
-- This column stores the array of model IDs used in each free try

ALTER TABLE free_try_logs
ADD COLUMN IF NOT EXISTS models_used TEXT[];

-- Add index for querying by models used
CREATE INDEX IF NOT EXISTS idx_free_try_logs_models_used 
ON free_try_logs USING GIN (models_used);

-- Add comment
COMMENT ON COLUMN free_try_logs.models_used IS 'Array of model IDs used in this free try';
