-- Enable UUID extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create topics table to store conversation topics
CREATE TABLE IF NOT EXISTS public.topics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create topic_messages table to store all messages in a topic
CREATE TABLE IF NOT EXISTS public.topic_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  topic_id UUID NOT NULL REFERENCES public.topics(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('question', 'answer')),
  content TEXT NOT NULL,
  model_name TEXT, -- Only for answers
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.topic_messages ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for topics
CREATE POLICY "topics_select_own" ON public.topics
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "topics_insert_own" ON public.topics
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "topics_update_own" ON public.topics
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "topics_delete_own" ON public.topics
  FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for topic_messages
CREATE POLICY "topic_messages_select_own" ON public.topic_messages
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "topic_messages_insert_own" ON public.topic_messages
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "topic_messages_update_own" ON public.topic_messages
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "topic_messages_delete_own" ON public.topic_messages
  FOR DELETE USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS topics_user_id_idx ON public.topics(user_id);
CREATE INDEX IF NOT EXISTS topics_created_at_idx ON public.topics(created_at DESC);
CREATE INDEX IF NOT EXISTS topic_messages_topic_id_idx ON public.topic_messages(topic_id);
CREATE INDEX IF NOT EXISTS topic_messages_created_at_idx ON public.topic_messages(created_at);
