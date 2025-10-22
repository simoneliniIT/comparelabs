-- Assign 100,000,000 credits to simonelini@gmail.com
UPDATE public.profiles
SET credits = 100000000,
    updated_at = NOW()
WHERE email = 'simonelini@gmail.com';

-- Verify the update
SELECT id, email, credits, subscription_tier, updated_at
FROM public.profiles
WHERE email = 'simonelini@gmail.com';
