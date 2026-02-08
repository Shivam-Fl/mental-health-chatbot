-- Create profiles table for user management
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create conversations table
CREATE TABLE IF NOT EXISTS public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT DEFAULT 'New Conversation',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create messages table
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'audio', 'video')),
  emotion_detected TEXT,
  audio_url TEXT,
  video_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create emotion_analysis table
CREATE TABLE IF NOT EXISTS public.emotion_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  emotion_type TEXT NOT NULL,
  confidence DECIMAL(3,2),
  analysis_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emotion_analysis ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for profiles
CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "profiles_delete_own" ON public.profiles FOR DELETE USING (auth.uid() = id);

-- Create RLS policies for conversations
CREATE POLICY "conversations_select_own" ON public.conversations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "conversations_insert_own" ON public.conversations FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "conversations_update_own" ON public.conversations FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "conversations_delete_own" ON public.conversations FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for messages
CREATE POLICY "messages_select_own" ON public.messages 
  FOR SELECT USING (
    auth.uid() IN (
      SELECT user_id FROM public.conversations WHERE id = conversation_id
    )
  );
CREATE POLICY "messages_insert_own" ON public.messages 
  FOR INSERT WITH CHECK (
    auth.uid() IN (
      SELECT user_id FROM public.conversations WHERE id = conversation_id
    )
  );
CREATE POLICY "messages_update_own" ON public.messages 
  FOR UPDATE USING (
    auth.uid() IN (
      SELECT user_id FROM public.conversations WHERE id = conversation_id
    )
  );
CREATE POLICY "messages_delete_own" ON public.messages 
  FOR DELETE USING (
    auth.uid() IN (
      SELECT user_id FROM public.conversations WHERE id = conversation_id
    )
  );

-- Create RLS policies for emotion_analysis
CREATE POLICY "emotion_analysis_select_own" ON public.emotion_analysis 
  FOR SELECT USING (
    auth.uid() IN (
      SELECT c.user_id FROM public.conversations c
      JOIN public.messages m ON c.id = m.conversation_id
      WHERE m.id = message_id
    )
  );
CREATE POLICY "emotion_analysis_insert_own" ON public.emotion_analysis 
  FOR INSERT WITH CHECK (
    auth.uid() IN (
      SELECT c.user_id FROM public.conversations c
      JOIN public.messages m ON c.id = m.conversation_id
      WHERE m.id = message_id
    )
  );
