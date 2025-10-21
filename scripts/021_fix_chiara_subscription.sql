-- Fix subscription for chiara.bonizzi@gmail.com
-- This user purchased a Plus subscription but it was processed under a different email

DO $$
DECLARE
  user_id uuid;
  stripe_customer_id text := 'cus_TFjG2QyAVQScIa';
  stripe_subscription_id text := 'sub_1SJDqKBOPCo2uutmeqWnUh0U';
BEGIN
  -- Find the user by email
  SELECT id INTO user_id
  FROM auth.users
  WHERE email = 'chiara.bonizzi@gmail.com';

  IF user_id IS NULL THEN
    RAISE NOTICE 'User not found with email: chiara.bonizzi@gmail.com';
    RETURN;
  END IF;

  -- Update the user's profile with Plus subscription
  UPDATE public.profiles
  SET
    subscription_tier = 'plus',
    subscription_status = 'active',
    stripe_customer_id = stripe_customer_id,
    stripe_subscription_id = stripe_subscription_id,
    current_period_end = NOW() + INTERVAL '1 month',
    updated_at = NOW()
  WHERE id = user_id;

  RAISE NOTICE 'Successfully upgraded user % to Plus plan', user_id;
END $$;
