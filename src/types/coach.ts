export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
}

export interface ChatRequest {
  message: string;
}

export interface CoachContext {
  active_goal: GoalSummary | null;
  current_plan_week: PlanWeekSummary | null;
  recent_activities: ActivitySummary[];
  weekly_trends: WeeklyTrend[];
  learned_preferences: PreferenceSummary[];
}

export interface GoalSummary {
  name: string;
  type: string;
  race_date?: string;
  target_time?: string;
  days_remaining?: number;
}

export interface PlanWeekSummary {
  week_number: number;
  total_weeks: number;
  sessions: SessionSummary[];
}

export interface SessionSummary {
  title: string;
  session_type: string;
  activity_type: string;
  scheduled_date: string;
  is_completed: boolean;
  target_distance_km?: number;
}

export interface ActivitySummary {
  name: string;
  activity_type: string;
  date: string;
  distance_km?: number;
  pace_per_km?: string;
  duration_minutes: number;
  rpe_score?: number;
  rpe_comment?: string;
}

export interface WeeklyTrend {
  week_start: string;
  total_km: number;
  average_pace_per_km: number | null;
  average_rpe: number | null;
  sessions_completed: number;
}

export interface PreferenceSummary {
  key: string;
  value: string;
  confidence: number;
}

export interface AnalyzeRunRequest {
  activity_id: string;
}

export interface GeneratePlanRequest {
  goal_id: string;
}
