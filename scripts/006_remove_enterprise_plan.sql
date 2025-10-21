-- Remove Enterprise plan from the database
-- This script removes Enterprise tier references and migrates any existing Enterprise users to Pro

-- First, update any existing Enterprise users to Pro tier
UPDATE profiles 
SET subscription_tier = 'pro', updated_at = NOW()
WHERE subscription_tier = 'enterprise';

-- Remove Enterprise tier from subscription_limits table
DELETE FROM subscription_limits WHERE tier = 'enterprise';

-- Update the CHECK constraints to remove 'enterprise' option
ALTER TABLE profiles 
DROP CONSTRAINT IF EXISTS profiles_subscription_tier_check;

ALTER TABLE profiles 
ADD CONSTRAINT profiles_subscription_tier_check 
CHECK (subscription_tier IN ('free', 'pro'));

ALTER TABLE subscription_limits 
DROP CONSTRAINT IF EXISTS subscription_limits_tier_check;

ALTER TABLE subscription_limits 
ADD CONSTRAINT subscription_limits_tier_check 
CHECK (tier IN ('free', 'pro'));

-- Log the migration
INSERT INTO migration_log (script_name, executed_at, description) 
VALUES ('006_remove_enterprise_plan.sql', NOW(), 'Removed Enterprise plan and migrated users to Pro');
