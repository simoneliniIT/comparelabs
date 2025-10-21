-- Clear all conversation data from the database
-- This will remove all topics and their associated messages

-- Delete all messages first (due to foreign key constraints)
DELETE FROM topic_messages;

-- Delete all topics
DELETE FROM topics;

-- Reset any sequences if needed (PostgreSQL auto-generates UUIDs, so no sequences to reset)

-- Verify cleanup
SELECT 'Topics remaining:' as info, COUNT(*) as count FROM topics
UNION ALL
SELECT 'Messages remaining:' as info, COUNT(*) as count FROM topic_messages;
