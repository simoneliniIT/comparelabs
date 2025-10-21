-- Drop existing functions first to avoid return type conflicts
DROP FUNCTION IF EXISTS deduct_credits(UUID, INTEGER, TEXT);
DROP FUNCTION IF EXISTS get_user_credits(UUID);

-- Updated function to return boolean success/failure instead of throwing exceptions
-- Create a function to safely deduct credits
CREATE OR REPLACE FUNCTION deduct_credits(
  user_id UUID,
  amount INTEGER,
  model_name TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_credits INTEGER;
BEGIN
  -- Check current credits first
  SELECT credits INTO current_credits 
  FROM public.profiles 
  WHERE id = user_id;
  
  -- Return false if user not found or insufficient credits
  IF current_credits IS NULL OR current_credits < amount THEN
    RETURN FALSE;
  END IF;
  
  -- Update user credits
  UPDATE public.profiles 
  SET credits = credits - amount,
      updated_at = NOW()
  WHERE id = user_id;
  
  -- Log the credit transaction
  INSERT INTO public.credit_transactions (
    user_id,
    amount,
    transaction_type,
    description,
    model_name
  ) VALUES (
    user_id,
    -amount, -- Negative for deduction
    'usage',
    CASE 
      WHEN model_name LIKE '%_summary' THEN 'AI model summarization'
      ELSE 'AI model usage'
    END,
    model_name
  );
  
  RETURN TRUE;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION deduct_credits(UUID, INTEGER, TEXT) TO authenticated;

-- Added function to check credit balance
-- Create a function to check user credit balance
CREATE OR REPLACE FUNCTION get_user_credits(user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_credits INTEGER;
BEGIN
  SELECT credits INTO user_credits 
  FROM public.profiles 
  WHERE id = user_id;
  
  RETURN COALESCE(user_credits, 0);
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_user_credits(UUID) TO authenticated;
