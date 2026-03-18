CREATE TABLE public.coach_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  context_snapshot JSONB,
  token_count INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_coach_messages_user
  ON public.coach_messages(user_id, created_at DESC);

ALTER TABLE public.coach_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own messages"
  ON public.coach_messages FOR ALL
  USING (auth.uid() = user_id);
