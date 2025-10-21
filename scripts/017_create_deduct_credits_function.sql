-- Create the deduct_credits function for PostgreSQL/Supabase
CREATE OR REPLACE FUNCTION public.deduct_credits(
  user_id UUID,
  amount INTEGER,
  model_name TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update the user's credits by subtracting the amount
  UPDATE profiles 
  SET credits = GREATEST(credits - amount, 0)
  WHERE id = user_id;
  
  -- Log the credit deduction for audit purposes
  INSERT INTO usage_logs (
    user_id,
    model_name,
    prompt_tokens,
    completion_tokens,
    total_tokens,
    cost_usd,
    created_at
  ) VALUES (
    user_id,
    model_name,
    0, -- We're not tracking tokens for credit deductions
    0,
    0,
    0,
    NOW()
  );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.deduct_credits(UUID, INTEGER, TEXT) TO authenticated;

-- Verify the function was created
SELECT proname, proargnames, proargtypes 
FROM pg_proc 
WHERE proname = 'deduct_credits';
