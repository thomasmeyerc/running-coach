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
