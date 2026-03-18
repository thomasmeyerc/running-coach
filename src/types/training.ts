import type { ExperienceLevel, RaceType, SessionType, PlannedActivityType, IntervalSet, CrossTrainingDetail } from "./database";

export interface PlanGenerationRequest {
  goal_id: string;
  preferences?: PlanPreferences;
}

export interface PlanPreferences {
  preferred_long_run_day?: number;
  max_session_duration_minutes?: number;
  include_cross_training?: boolean;
  cross_training_types?: string[];
}

export interface GeneratedSession {
  week_number: number;
  day_of_week: number;
  session_type: SessionType;
  activity_type: PlannedActivityType;
  title: string;
  description: string;
  target_distance_meters?: number;
  target_duration_seconds?: number;
  target_pace_seconds_per_km?: number;
  warmup_description?: string;
  cooldown_description?: string;
  intervals?: IntervalSet[];
  cross_training_details?: CrossTrainingDetail;
}

export interface GeneratedPlan {
  plan_name: string;
  total_weeks: number;
  philosophy: string;
  sessions: GeneratedSession[];
}

export interface FitnessProfile {
  experience_level: ExperienceLevel;
  weekly_km_current: number;
  longest_recent_run_km: number;
  average_pace_per_km: number;
  recent_race_results?: RaceResult[];
  injury_history?: string[];
  max_days_per_week: number;
}

export interface RaceResult {
  race_type: RaceType;
  distance_meters: number;
  time_seconds: number;
  date: string;
}

export interface SessionAdjustment {
  session_id: string;
  change_type: "modified" | "removed" | "added";
  reason: string;
  original?: Partial<GeneratedSession>;
  updated?: Partial<GeneratedSession>;
}

export interface WeekSummary {
  week_number: number;
  start_date: string;
  end_date: string;
  total_distance_km: number;
  total_duration_minutes: number;
  sessions_planned: number;
  sessions_completed: number;
  average_rpe: number | null;
  average_pace_per_km: number | null;
}
