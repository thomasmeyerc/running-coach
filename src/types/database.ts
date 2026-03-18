export type Gender = "male" | "female" | "non_binary" | "prefer_not_to_say";
export type ExperienceLevel = "beginner" | "intermediate" | "advanced" | "elite";
export type TimePreference = "morning" | "afternoon" | "evening" | "no_preference";
export type PreferredUnits = "km" | "mi";

export interface UserProfile {
  id: string;
  email: string;
  display_name: string | null;
  height_cm: number | null;
  weight_kg: number | null;
  date_of_birth: string | null;
  gender: Gender | null;
  experience_level: ExperienceLevel;
  years_running: number | null;
  injuries_history: InjuryRecord[];
  preferred_units: PreferredUnits;
  preferred_run_days: number[];
  max_days_per_week: number;
  time_preference: TimePreference | null;
  strava_athlete_id: number | null;
  strava_access_token: string | null;
  strava_refresh_token: string | null;
  strava_token_expires_at: string | null;
  strava_scope: string | null;
  onboarding_completed: boolean;
  onboarding_step: number;
  created_at: string;
  updated_at: string;
}

export interface InjuryRecord {
  type: string;
  date: string;
  notes: string;
  resolved: boolean;
}

export type GoalType = "race" | "cross_training" | "general_fitness";
export type RaceType = "5k" | "10k" | "half_marathon" | "marathon" | "ultra" | "custom";
export type GoalPriority = "primary" | "secondary";

export interface Goal {
  id: string;
  user_id: string;
  goal_name: string;
  goal_type: GoalType;
  race_type: RaceType | null;
  race_date: string | null;
  target_finish_time_seconds: number | null;
  custom_distance_meters: number | null;
  activity_type: string | null;
  frequency_per_week: number | null;
  cross_training_notes: string | null;
  fitness_level: ExperienceLevel | null;
  weekly_km_current: number | null;
  days_available_per_week: number;
  priority: GoalPriority;
  feasibility_assessment: FeasibilityResult | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface FeasibilityResult {
  feasible: boolean;
  confidence: number;
  reasoning: string;
  suggested_target_time_seconds: number | null;
  risks: string[];
  recommendations: string[];
}

export type SessionType =
  | "easy" | "tempo" | "interval" | "long_run" | "recovery"
  | "hill_repeats" | "fartlek" | "race_pace" | "rest";

export type ActivityType =
  | "run" | "ride" | "swim" | "weight_training" | "football"
  | "yoga" | "hike" | "walk" | "cross_train" | "other";

export type PlannedActivityType =
  | "run" | "weight_training" | "football" | "yoga"
  | "swimming" | "cycling" | "cross_train" | "rest";

export interface TrainingPlan {
  id: string;
  user_id: string;
  goal_id: string;
  plan_name: string;
  start_date: string;
  end_date: string;
  total_weeks: number;
  current_week: number;
  plan_philosophy: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PlannedSession {
  id: string;
  plan_id: string;
  user_id: string;
  week_number: number;
  day_of_week: number;
  scheduled_date: string;
  session_type: SessionType;
  activity_type: PlannedActivityType;
  title: string;
  description: string | null;
  target_distance_meters: number | null;
  target_duration_seconds: number | null;
  target_pace_seconds_per_km: number | null;
  warmup_description: string | null;
  cooldown_description: string | null;
  intervals: IntervalSet[] | null;
  cross_training_details: CrossTrainingDetail | null;
  is_completed: boolean;
  matched_activity_id: string | null;
  created_at: string;
}

export interface IntervalSet {
  reps: number;
  distance_meters: number;
  pace_seconds_per_km: number;
  rest_seconds: number;
}

export interface CrossTrainingDetail {
  muscle_groups?: string[];
  exercises?: Exercise[];
  intensity_level?: "low" | "moderate" | "high";
  notes?: string;
}

export interface Exercise {
  name: string;
  sets: number;
  reps: number;
  weight_kg?: number;
}

export interface Activity {
  id: string;
  user_id: string;
  strava_activity_id: number | null;
  planned_session_id: string | null;
  activity_type: ActivityType;
  sport_detail: string | null;
  name: string;
  start_date: string;
  distance_meters: number | null;
  moving_time_seconds: number;
  elapsed_time_seconds: number | null;
  average_pace_seconds_per_km: number | null;
  average_heartrate: number | null;
  max_heartrate: number | null;
  total_elevation_gain: number | null;
  average_cadence: number | null;
  calories: number | null;
  splits_km: SplitData[] | null;
  polyline: string | null;
  weather_conditions: WeatherData | null;
  ai_analysis: RunAnalysis | null;
  source: "strava" | "manual" | "garmin";
  created_at: string;
}

export interface SplitData {
  split: number;
  distance: number;
  elapsed_time: number;
  moving_time: number;
  average_speed: number;
  average_heartrate?: number;
  pace_seconds_per_km: number;
}

export interface WeatherData {
  temp_c: number;
  humidity: number;
  wind_speed_kmh: number;
  conditions: string;
}

export interface RunAnalysis {
  summary: string;
  highlights: string[];
  concerns: string[];
  recommendations: string[];
  pace_consistency_score: number;
  effort_alignment: "under" | "on_target" | "over";
}

export type Mood = "great" | "good" | "neutral" | "tired" | "terrible";

export interface RpeFeedback {
  id: string;
  user_id: string;
  activity_id: string;
  rpe_score: number;
  energy_level: number | null;
  muscle_soreness: number | null;
  mood: Mood | null;
  comment: string | null;
  sleep_hours_prior: number | null;
  injury_flag: boolean;
  injury_notes: string | null;
  created_at: string;
}

export type MessageRole = "user" | "assistant";

export interface CoachMessage {
  id: string;
  user_id: string;
  role: MessageRole;
  content: string;
  context_snapshot: Record<string, unknown> | null;
  token_count: number | null;
  created_at: string;
}

export type FeedbackRating = "thumbs_up" | "thumbs_down";
export type InteractionType = "chat" | "plan" | "analysis";

export interface CoachFeedback {
  id: string;
  user_id: string;
  interaction_type: InteractionType;
  interaction_id: string | null;
  rating: FeedbackRating;
  comment: string | null;
  prompt_snapshot: string | null;
  response_snapshot: string | null;
  outcome: string | null;
  created_at: string;
}

export interface LearnedPreference {
  id: string;
  user_id: string;
  preference_key: string;
  preference_value: string;
  confidence_score: number;
  source: "explicit" | "inferred";
  last_updated: string;
  created_at: string;
}
