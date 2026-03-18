CREATE TABLE public.coach_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  interaction_type TEXT NOT NULL CHECK (interaction_type IN ('chat', 'plan', 'analysis')),
  interaction_id UUID,
  rating TEXT NOT NULL CHECK (rating IN ('thumbs_up', 'thumbs_down')),
  comment TEXT,
  prompt_snapshot TEXT,
  response_snapshot TEXT,
  outcome TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_coach_feedback_user
  ON public.coach_feedback(user_id, created_at DESC);

ALTER TABLE public.coach_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own feedback"
  ON public.coach_feedback FOR ALL
  USING (auth.uid() = user_id);
