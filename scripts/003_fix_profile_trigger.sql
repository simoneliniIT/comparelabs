-- Update the function to handle new user creation with proper defaults
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, subscription_tier, subscription_status)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NULL),
    'free',
    'active'
  )
  ON CONFLICT (id) DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- Also create profiles for any existing users who don't have them
INSERT INTO public.profiles (id, email, full_name, subscription_tier, subscription_status)
SELECT 
  au.id,
  au.email,
  COALESCE(au.raw_user_meta_data ->> 'full_name', NULL),
  'free',
  'active'
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.id
WHERE p.id IS NULL;
