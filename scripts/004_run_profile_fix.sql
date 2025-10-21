-- Fix profile creation for existing and new users
-- This script ensures all users have proper profiles with subscription defaults

-- First, let's check if we have any users without profiles
DO $$
DECLARE
    missing_profiles_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO missing_profiles_count
    FROM auth.users u
    LEFT JOIN public.profiles p ON u.id = p.id
    WHERE p.id IS NULL;
    
    RAISE NOTICE 'Found % users without profiles', missing_profiles_count;
END $$;

-- Create profiles for any existing users who don't have them
INSERT INTO public.profiles (
    id,
    email,
    full_name,
    subscription_tier,
    subscription_status,
    created_at,
    updated_at
)
SELECT 
    u.id,
    u.email,
    COALESCE(u.raw_user_meta_data->>'full_name', split_part(u.email, '@', 1)),
    'free',
    'active',
    NOW(),
    NOW()
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
WHERE p.id IS NULL;

-- Update the trigger function to properly set defaults
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (
        id,
        email,
        full_name,
        subscription_tier,
        subscription_status,
        created_at,
        updated_at
    )
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
        'free',
        'active',
        NOW(),
        NOW()
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure the trigger exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Verify the fix worked
DO $$
DECLARE
    total_users INTEGER;
    total_profiles INTEGER;
BEGIN
    SELECT COUNT(*) INTO total_users FROM auth.users;
    SELECT COUNT(*) INTO total_profiles FROM public.profiles;
    
    RAISE NOTICE 'Total users: %, Total profiles: %', total_users, total_profiles;
    
    IF total_users = total_profiles THEN
        RAISE NOTICE 'SUCCESS: All users now have profiles!';
    ELSE
        RAISE NOTICE 'WARNING: Profile count mismatch detected';
    END IF;
END $$;
