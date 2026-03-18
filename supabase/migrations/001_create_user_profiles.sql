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
