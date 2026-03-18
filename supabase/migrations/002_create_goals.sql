CREATE TABLE public.goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  -- Goal basics
  goal_name TEXT NOT NULL,
  goal_type TEXT NOT NULL CHECK (goal_type IN ('race', 'cross_training', 'general_fitness')),
  -- Race-specific
  race_type TEXT CHECK (race_type IN ('5k', '10k', 'half_marathon', 'marathon', 'ultra', 'custom')),
  race_date DATE,
  target_finish_time_seconds INTEGER,
  custom_distance_meters NUMERIC,
  -- Cross-training specific
  activity_type TEXT,
  frequency_per_week INTEGER,
  cross_training_notes TEXT,
  -- General
  fitness_level TEXT CHECK (fitness_level IN ('beginner', 'intermediate', 'advanced', 'elite')),
  weekly_km_current NUMERIC,
  days_available_per_week INTEGER DEFAULT 5,
  priority TEXT DEFAULT 'primary' CHECK (priority IN ('primary', 'secondary')),
  feasibility_assessment JSONB,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own goals"
  ON public.goals FOR ALL
  USING (auth.uid() = user_id);
