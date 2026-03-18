CREATE TABLE public.learned_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  preference_key TEXT NOT NULL,
  preference_value TEXT NOT NULL,
  confidence_score NUMERIC DEFAULT 0.5 CHECK (confidence_score BETWEEN 0 AND 1),
  source TEXT DEFAULT 'inferred' CHECK (source IN ('explicit', 'inferred')),
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, preference_key)
);

ALTER TABLE public.learned_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own preferences"
  ON public.learned_preferences FOR ALL
  USING (auth.uid() = user_id);
