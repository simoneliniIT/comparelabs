-- Add credits field to profiles table safely
DO $$ 
BEGIN
    -- Add credits column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' 
        AND column_name = 'credits'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.profiles ADD COLUMN credits INTEGER DEFAULT 100;
    END IF;
END $$;

-- Update existing profiles to have initial credits based on subscription tier
-- Only update profiles that have 0 or NULL credits
UPDATE public.profiles 
SET credits = CASE 
  WHEN subscription_tier = 'free' THEN 100
  WHEN subscription_tier = 'plus' THEN 1000  
  WHEN subscription_tier = 'pro' THEN 10000
  ELSE 100
END
WHERE credits IS NULL OR credits = 0;

-- Create credit transaction log table for tracking credit changes
CREATE TABLE IF NOT EXISTS public.credit_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL, -- Positive for additions, negative for deductions
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('usage', 'purchase', 'refund', 'bonus')),
  description TEXT,
  model_name TEXT, -- For usage transactions
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for credit_transactions
ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for credit_transactions (only if they don't exist)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'credit_transactions' 
        AND policyname = 'credit_transactions_select_own'
    ) THEN
        CREATE POLICY "credit_transactions_select_own" ON public.credit_transactions
          FOR SELECT USING (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'credit_transactions' 
        AND policyname = 'credit_transactions_insert_own'
    ) THEN
        CREATE POLICY "credit_transactions_insert_own" ON public.credit_transactions
          FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;
END $$;

-- Create indexes for better performance (only if they don't exist)
CREATE INDEX IF NOT EXISTS idx_credit_transactions_user_id ON public.credit_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_created_at ON public.credit_transactions(created_at);
