-- Combined migrations for Running Coach

-- ============================================
-- 001_create_user_profiles.sql
-- ============================================

-- User profiles extending Supabase auth.users
CREATE TABLE public.user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  display_name TEXT,
  -- Physical
  height_cm NUMERIC,
  weight_kg NUMERIC,
  date_of_birth DATE,
  gender TEXT CHECK (gender IN ('male', 'female', 'non_binary', 'prefer_not_to_say')),
  -- Running background
  experience_level TEXT DEFAULT 'beginner' CHECK (experience_level IN ('beginner', 'intermediate', 'advanced', 'elite')),
  years_running INTEGER,
  injuries_history JSONB DEFAULT '[]'::jsonb,
  -- Preferences
  preferred_units TEXT DEFAULT 'km' CHECK (preferred_units IN ('km', 'mi')),
  preferred_run_days JSONB DEFAULT '[]'::jsonb,
  max_days_per_week INTEGER DEFAULT 5,
  time_preference TEXT CHECK (time_preference IN ('morning', 'afternoon', 'evening', 'no_preference')),
  -- Strava
  strava_athlete_id BIGINT UNIQUE,
  strava_access_token TEXT,
  strava_refresh_token TEXT,
  strava_token_expires_at TIMESTAMPTZ,
  strava_scope TEXT,
  -- Onboarding
  onboarding_completed BOOLEAN DEFAULT FALSE,
  onboarding_step INTEGER DEFAULT 0,
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own profile"
  ON public.user_profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.user_profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.user_profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ============================================
-- 002_create_goals.sql
-- ============================================

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


-- ============================================
-- 003_create_training_plans.sql
-- ============================================

CREATE TABLE public.training_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  goal_id UUID NOT NULL REFERENCES public.goals(id) ON DELETE CASCADE,
  plan_name TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  total_weeks INTEGER NOT NULL,
  current_week INTEGER DEFAULT 1,
  plan_philosophy TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.training_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own plans"
  ON public.training_plans FOR ALL
  USING (auth.uid() = user_id);


-- ============================================
-- 004_create_planned_sessions.sql
-- ============================================

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


-- ============================================
-- 005_create_activities.sql
-- ============================================

CREATE TABLE public.activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  strava_activity_id BIGINT UNIQUE,
  planned_session_id UUID REFERENCES public.planned_sessions(id),
  -- Type
  activity_type TEXT NOT NULL DEFAULT 'run' CHECK (activity_type IN (
    'run', 'ride', 'swim', 'weight_training', 'football',
    'yoga', 'hike', 'walk', 'cross_train', 'other'
  )),
  sport_detail TEXT,
  name TEXT NOT NULL,
  -- Metrics
  start_date TIMESTAMPTZ NOT NULL,
  distance_meters NUMERIC,
  moving_time_seconds INTEGER NOT NULL,
  elapsed_time_seconds INTEGER,
  average_pace_seconds_per_km NUMERIC GENERATED ALWAYS AS (
    CASE WHEN distance_meters > 0 AND distance_meters IS NOT NULL
      THEN (moving_time_seconds::NUMERIC / (distance_meters / 1000.0))
      ELSE NULL
    END
  ) STORED,
  average_heartrate NUMERIC,
  max_heartrate NUMERIC,
  total_elevation_gain NUMERIC,
  average_cadence NUMERIC,
  calories INTEGER,
  -- Detailed data
  splits_km JSONB,
  polyline TEXT,
  weather_conditions JSONB,
  -- AI
  ai_analysis JSONB,
  -- Source
  source TEXT DEFAULT 'strava' CHECK (source IN ('strava', 'manual', 'garmin')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_activities_date
  ON public.activities(user_id, start_date DESC);

CREATE INDEX idx_activities_strava
  ON public.activities(strava_activity_id);

ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own activities"
  ON public.activities FOR ALL
  USING (auth.uid() = user_id);


-- ============================================
-- 006_create_rpe_feedback.sql
-- ============================================

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


-- ============================================
-- 007_create_coach_messages.sql
-- ============================================

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


-- ============================================
-- 008_create_coach_feedback.sql
-- ============================================

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


-- ============================================
-- 009_create_learned_preferences.sql
-- ============================================

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


