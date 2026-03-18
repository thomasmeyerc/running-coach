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
