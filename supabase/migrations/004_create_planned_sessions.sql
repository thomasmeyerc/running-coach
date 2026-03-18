CREATE TABLE public.planned_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES public.training_plans(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  week_number INTEGER NOT NULL,
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  scheduled_date DATE NOT NULL,
  -- Type
  session_type TEXT NOT NULL CHECK (session_type IN (
    'easy', 'tempo', 'interval', 'long_run', 'recovery',
    'hill_repeats', 'fartlek', 'race_pace', 'rest'
  )),
  activity_type TEXT NOT NULL DEFAULT 'run' CHECK (activity_type IN (
    'run', 'weight_training', 'football', 'yoga',
    'swimming', 'cycling', 'cross_train', 'rest'
  )),
  -- Details
  title TEXT NOT NULL,
  description TEXT,
  target_distance_meters NUMERIC,
  target_duration_seconds INTEGER,
  target_pace_seconds_per_km NUMERIC,
  warmup_description TEXT,
  cooldown_description TEXT,
  intervals JSONB,
  cross_training_details JSONB,
  -- Status
  is_completed BOOLEAN DEFAULT FALSE,
  matched_activity_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_planned_sessions_date
  ON public.planned_sessions(user_id, scheduled_date);

ALTER TABLE public.planned_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own sessions"
  ON public.planned_sessions FOR ALL
  USING (auth.uid() = user_id);
