-- Create topics table to store conversation topics
CREATE TABLE IF NOT EXISTS public.topics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create topic_messages table to store all messages in a topic
CREATE TABLE IF NOT EXISTS public.topic_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  topic_id UUID REFERENCES public.topics(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('question', 'answer')),
  content TEXT NOT NULL,
  model_name TEXT, -- Only for answers
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Enable Row Level Security
ALTER TABLE public.topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.topic_messages ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own topics" ON public.topics;
DROP POLICY IF EXISTS "Users can insert their own topics" ON public.topics;
DROP POLICY IF EXISTS "Users can update their own topics" ON public.topics;
DROP POLICY IF EXISTS "Users can delete their own topics" ON public.topics;

DROP POLICY IF EXISTS "Users can view their own topic messages" ON public.topic_messages;
DROP POLICY IF EXISTS "Users can insert their own topic messages" ON public.topic_messages;
DROP POLICY IF EXISTS "Users can update their own topic messages" ON public.topic_messages;
DROP POLICY IF EXISTS "Users can delete their own topic messages" ON public.topic_messages;

-- Create RLS policies for topics
CREATE POLICY "Users can view their own topics" ON public.topics
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own topics" ON public.topics
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own topics" ON public.topics
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own topics" ON public.topics
  FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for topic_messages
CREATE POLICY "Users can view their own topic messages" ON public.topic_messages
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own topic messages" ON public.topic_messages
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own topic messages" ON public.topic_messages
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own topic messages" ON public.topic_messages
  FOR DELETE USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS topics_user_id_idx ON public.topics(user_id);
CREATE INDEX IF NOT EXISTS topics_created_at_idx ON public.topics(created_at DESC);
CREATE INDEX IF NOT EXISTS topic_messages_topic_id_idx ON public.topic_messages(topic_id);
CREATE INDEX IF NOT EXISTS topic_messages_created_at_idx ON public.topic_messages(created_at);
