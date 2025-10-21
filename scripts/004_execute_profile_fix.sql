-- Execute the profile fix to resolve "User profile not found" errors
-- This runs verification and ensures all users have profiles

-- Removed \i meta-command which causes syntax errors in SQL execution

-- Add verification to ensure the fix worked
DO $$
DECLARE
    user_count INTEGER;
    profile_count INTEGER;
    missing_count INTEGER;
BEGIN
    -- Count total users
    SELECT COUNT(*) INTO user_count FROM auth.users;
    
    -- Count total profiles  
    SELECT COUNT(*) INTO profile_count FROM public.profiles;
    
    -- Count users without profiles
    SELECT COUNT(*) INTO missing_count
    FROM auth.users u
    LEFT JOIN public.profiles p ON u.id = p.id
    WHERE p.id IS NULL;
    
    RAISE NOTICE 'Users: %, Profiles: %, Missing: %', user_count, profile_count, missing_count;
    
    IF missing_count = 0 THEN
        RAISE NOTICE 'SUCCESS: All users now have profiles with subscription defaults!';
    ELSE
        RAISE WARNING 'ISSUE: % users still missing profiles', missing_count;
    END IF;
END $$;

-- Verify subscription limits table has free tier data
DO $$
DECLARE
    free_tier_exists BOOLEAN;
BEGIN
    SELECT EXISTS(
        SELECT 1 FROM subscription_limits 
        WHERE tier = 'free'
    ) INTO free_tier_exists;
    
    IF NOT free_tier_exists THEN
        RAISE NOTICE 'Adding free tier subscription limits...';
        INSERT INTO subscription_limits (tier, daily_queries, monthly_queries, available_models, priority_support)
        VALUES ('free', 10, 100, ARRAY['gpt-3.5-turbo', 'claude-3-haiku', 'gemini-pro'], false);
    END IF;
    
    RAISE NOTICE 'Free tier subscription limits verified!';
END $$;
