CREATE TABLE public.rpe_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  activity_id UUID NOT NULL REFERENCES public.activities(id) ON DELETE CASCADE,
  rpe_score INTEGER NOT NULL CHECK (rpe_score BETWEEN 1 AND 10),
  energy_level INTEGER CHECK (energy_level BETWEEN 1 AND 5),
  muscle_soreness INTEGER CHECK (muscle_soreness BETWEEN 1 AND 5),
  mood TEXT CHECK (mood IN ('great', 'good', 'neutral', 'tired', 'terrible')),
  comment TEXT,
  sleep_hours_prior NUMERIC,
  injury_flag BOOLEAN DEFAULT FALSE,
  injury_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(activity_id)
);

ALTER TABLE public.rpe_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own RPE"
  ON public.rpe_feedback FOR ALL
  USING (auth.uid() = user_id);
