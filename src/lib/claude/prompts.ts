import { createAdminClient } from "@/lib/supabase/admin";
import type { CoachContext } from "@/types/coach";

export function buildCoachSystemPrompt(preferences: { key: string; value: string }[] = []): string {
  let prompt = `You are an expert running coach with deep knowledge of sports science, exercise physiology, and training periodization. You provide personalized coaching advice.

Your approach:
- Give specific, actionable advice backed by sports science
- Consider the runner's full context: goals, fitness level, recent training, how they're feeling
- Be encouraging but honest — if a goal is unrealistic, say so diplomatically
- Factor in injury prevention and recovery importance
- Support cross-training activities (gym, football, yoga) as part of holistic training
- Never provide medical advice — recommend seeing a doctor for injuries or health concerns
- Keep responses conversational but concise

You understand:
- Periodization (base → build → peak → taper)
- Heart rate zones and their training effects
- RPE correlation with physiological stress
- Progressive overload principles (max 10% volume increase per week)
- The importance of easy runs (most training should be easy)
- Nutrition timing and fueling strategies for runners
- Recovery and sleep's impact on performance`;

  // Inject learned preferences
  if (preferences.length > 0) {
    prompt += "\n\nLearned preferences about this athlete:";
    for (const pref of preferences) {
      prompt += `\n- ${pref.key}: ${pref.value}`;
    }
  }

  return prompt;
}

export async function buildContextBlock(userId: string): Promise<string> {
  const supabase = createAdminClient();
  const parts: string[] = [];

  // Active goal
  const { data: goals } = await supabase
    .from("goals")
    .select("*")
    .eq("user_id", userId)
    .eq("is_active", true)
    .order("priority", { ascending: true })
    .limit(3);

  if (goals?.length) {
    parts.push("## Active Goals");
    for (const goal of goals) {
      const daysRemaining = goal.race_date
        ? Math.ceil((new Date(goal.race_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
        : null;
      parts.push(`- **${goal.goal_name}** (${goal.goal_type}${goal.race_type ? `, ${goal.race_type}` : ""})`);
      if (goal.race_date) parts.push(`  Race date: ${goal.race_date} (${daysRemaining} days away)`);
      if (goal.target_finish_time_seconds) {
        const h = Math.floor(goal.target_finish_time_seconds / 3600);
        const m = Math.floor((goal.target_finish_time_seconds % 3600) / 60);
        parts.push(`  Target time: ${h}:${String(m).padStart(2, "0")}`);
      }
      parts.push(`  Priority: ${goal.priority}`);
    }
  }

  // Current plan week
  const { data: plan } = await supabase
    .from("training_plans")
    .select("*, planned_sessions(*)")
    .eq("user_id", userId)
    .eq("is_active", true)
    .single();

  if (plan) {
    parts.push(`\n## Current Training Plan: ${plan.plan_name}`);
    parts.push(`Week ${plan.current_week} of ${plan.total_weeks}`);

    const thisWeekSessions = plan.planned_sessions
      ?.filter((s: { week_number: number }) => s.week_number === plan.current_week)
      ?.sort((a: { day_of_week: number }, b: { day_of_week: number }) => a.day_of_week - b.day_of_week);

    if (thisWeekSessions?.length) {
      parts.push("This week's sessions:");
      for (const s of thisWeekSessions) {
        const status = s.is_completed ? "DONE" : "planned";
        parts.push(`- ${s.scheduled_date} | ${s.title} (${s.session_type}) [${status}]`);
      }
    }
  }

  // Recent activities (last 10)
  const { data: activities } = await supabase
    .from("activities")
    .select("*, rpe_feedback(*)")
    .eq("user_id", userId)
    .order("start_date", { ascending: false })
    .limit(10);

  if (activities?.length) {
    parts.push("\n## Recent Activities (last 10)");
    for (const a of activities) {
      const distKm = a.distance_meters ? (a.distance_meters / 1000).toFixed(1) : "N/A";
      const pace = a.average_pace_seconds_per_km
        ? `${Math.floor(a.average_pace_seconds_per_km / 60)}:${String(Math.floor(a.average_pace_seconds_per_km % 60)).padStart(2, "0")}/km`
        : "";
      const rpe = a.rpe_feedback?.[0];
      parts.push(`- ${a.start_date.slice(0, 10)} | ${a.name} | ${a.activity_type} | ${distKm}km ${pace} | HR:${a.average_heartrate || "N/A"} | RPE:${rpe?.rpe_score || "N/A"}${rpe?.comment ? ` "${rpe.comment}"` : ""}`);
    }
  }

  // Weekly trends (last 6 weeks)
  const sixWeeksAgo = new Date(Date.now() - 42 * 24 * 60 * 60 * 1000).toISOString();
  const { data: recentActivities } = await supabase
    .from("activities")
    .select("start_date, distance_meters, average_pace_seconds_per_km, rpe_feedback(rpe_score)")
    .eq("user_id", userId)
    .gte("start_date", sixWeeksAgo)
    .order("start_date", { ascending: true });

  if (recentActivities?.length) {
    parts.push("\n## Weekly Trends (last 6 weeks)");
    const weeks = groupByWeek(recentActivities);
    for (const [weekStart, weekActivities] of Object.entries(weeks)) {
      const totalKm = weekActivities.reduce((sum, a) => sum + (((a as Record<string, unknown>).distance_meters as number || 0) / 1000), 0);
      const rpeScores = weekActivities
        .map((a) => ((a as Record<string, unknown>).rpe_feedback as { rpe_score: number }[] | undefined)?.[0]?.rpe_score)
        .filter((v): v is number => typeof v === "number");
      const avgRpe = rpeScores.length ? (rpeScores.reduce((x, y) => x + y, 0) / rpeScores.length).toFixed(1) : "N/A";
      parts.push(`- Week of ${weekStart}: ${totalKm.toFixed(1)}km | ${weekActivities.length} sessions | Avg RPE: ${avgRpe}`);
    }
  }

  return parts.join("\n");
}

function groupByWeek<T extends { start_date: string }>(activities: T[]): Record<string, T[]> {
  const weeks: Record<string, T[]> = {};
  for (const a of activities) {
    const date = new Date(a.start_date);
    const monday = new Date(date);
    monday.setDate(date.getDate() - ((date.getDay() + 6) % 7));
    const key = monday.toISOString().slice(0, 10);
    if (!weeks[key]) weeks[key] = [];
    weeks[key].push(a);
  }
  return weeks;
}

export function buildRunAnalysisPrompt(
  activity: { name: string; distance_meters: number; moving_time_seconds: number; average_heartrate?: number; splits_km?: unknown[] },
  planned?: { title: string; target_distance_meters?: number; target_pace_seconds_per_km?: number },
  rpe?: { rpe_score: number; comment?: string }
): string {
  let prompt = `Analyze this running activity and provide feedback:\n\n`;
  prompt += `**Run**: ${activity.name}\n`;
  prompt += `**Distance**: ${(activity.distance_meters / 1000).toFixed(2)} km\n`;
  prompt += `**Time**: ${Math.floor(activity.moving_time_seconds / 60)} min\n`;
  prompt += `**Avg Pace**: ${formatPace(activity.moving_time_seconds / (activity.distance_meters / 1000))}/km\n`;
  if (activity.average_heartrate) prompt += `**Avg HR**: ${activity.average_heartrate} bpm\n`;
  if (activity.splits_km) prompt += `**Splits**: ${JSON.stringify(activity.splits_km)}\n`;

  if (planned) {
    prompt += `\n**Planned session**: ${planned.title}\n`;
    if (planned.target_distance_meters) prompt += `Target distance: ${(planned.target_distance_meters / 1000).toFixed(1)} km\n`;
    if (planned.target_pace_seconds_per_km) prompt += `Target pace: ${formatPace(planned.target_pace_seconds_per_km)}/km\n`;
  }

  if (rpe) {
    prompt += `\n**RPE**: ${rpe.rpe_score}/10${rpe.comment ? ` — "${rpe.comment}"` : ""}\n`;
  }

  prompt += `\nProvide your analysis as JSON with this structure:
{
  "summary": "2-3 sentence overall assessment",
  "highlights": ["positive observations"],
  "concerns": ["things to watch or improve"],
  "recommendations": ["specific actionable advice"],
  "pace_consistency_score": 0-100,
  "effort_alignment": "under" | "on_target" | "over"
}`;

  return prompt;
}

export interface PlanProfileContext {
  experience_level: string;
  weekly_km_current?: number;
  max_days_per_week: number;
  preferred_run_days?: number[];
  display_name?: string;
  age?: number;
  gender?: string;
  height_cm?: number;
  weight_kg?: number;
  years_running?: number;
  time_preference?: string;
  injuries_history?: { type: string; date: string; notes: string; resolved: boolean }[];
}

export interface PlanActivitySummary {
  start_date: string;
  activity_type: string;
  name: string;
  distance_meters: number | null;
  moving_time_seconds: number;
  average_pace_seconds_per_km: number | null;
  average_heartrate: number | null;
}

export interface PlanWeeklyTrend {
  weekStart: string;
  totalKm: number;
  sessions: number;
  avgPace: string;
  avgHr: string;
}

export interface PlanWizardPreferences {
  preferred_long_run_day?: number;
  intensity_preference?: "conservative" | "moderate" | "aggressive";
  include_cross_training?: boolean;
  cross_training_types?: string[];
  max_session_duration_minutes?: number;
}

export function buildPlanGenerationPrompt(
  goals: { goal_name: string; goal_type: string; race_type?: string; race_date?: string; target_finish_time_seconds?: number; activity_type?: string; frequency_per_week?: number }[],
  profile: PlanProfileContext,
  weeksAvailable: number,
  recentActivities?: PlanActivitySummary[],
  weeklyTrends?: PlanWeeklyTrend[],
  wizardPrefs?: PlanWizardPreferences
): string {
  let prompt = `Generate a personalized training plan based on the following comprehensive athlete data:\n\n`;

  prompt += `## Athlete Profile\n`;
  if (profile.display_name) prompt += `- Name: ${profile.display_name}\n`;
  prompt += `- Experience: ${profile.experience_level}\n`;
  if (profile.age) prompt += `- Age: ${profile.age}\n`;
  if (profile.gender && profile.gender !== "prefer_not_to_say") prompt += `- Gender: ${profile.gender.replace("_", "-")}\n`;
  if (profile.height_cm) prompt += `- Height: ${profile.height_cm} cm\n`;
  if (profile.weight_kg) prompt += `- Weight: ${profile.weight_kg} kg\n`;
  if (profile.years_running) prompt += `- Years running: ${profile.years_running}\n`;
  prompt += `- Current weekly volume: ${profile.weekly_km_current || "unknown"} km\n`;
  prompt += `- Available training days: ${profile.max_days_per_week}/week\n`;
  if (profile.preferred_run_days?.length) {
    const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    prompt += `- Preferred days: ${profile.preferred_run_days.map(d => dayNames[d] || d).join(", ")}\n`;
  }
  if (profile.time_preference && profile.time_preference !== "no_preference") {
    prompt += `- Preferred training time: ${profile.time_preference}\n`;
  }
  if (profile.injuries_history?.length) {
    const activeInjuries = profile.injuries_history.filter(i => !i.resolved);
    const pastInjuries = profile.injuries_history.filter(i => i.resolved);
    if (activeInjuries.length) {
      prompt += `- CURRENT INJURIES (plan must accommodate): ${activeInjuries.map(i => `${i.type}${i.notes ? ` (${i.notes})` : ""}`).join("; ")}\n`;
    }
    if (pastInjuries.length) {
      prompt += `- Injury history (consider for prevention): ${pastInjuries.map(i => `${i.type} (${i.date})`).join("; ")}\n`;
    }
  }

  // Recent activity history
  if (recentActivities?.length) {
    prompt += `\n## Recent Training History (last ${recentActivities.length} activities)\n`;
    prompt += `Use this data to set appropriate starting volumes and paces.\n`;
    for (const a of recentActivities) {
      const distKm = a.distance_meters ? (a.distance_meters / 1000).toFixed(1) : "N/A";
      const pace = a.average_pace_seconds_per_km
        ? `${Math.floor(a.average_pace_seconds_per_km / 60)}:${String(Math.floor(a.average_pace_seconds_per_km % 60)).padStart(2, "0")}/km`
        : "";
      prompt += `- ${a.start_date.slice(0, 10)} | ${a.activity_type} | ${a.name} | ${distKm}km ${pace}${a.average_heartrate ? ` | HR:${a.average_heartrate}` : ""}\n`;
    }
  }

  // Weekly trends
  if (weeklyTrends?.length) {
    prompt += `\n## Weekly Volume Trends (${weeklyTrends.length} weeks)\n`;
    prompt += `Use these trends to determine safe starting volume and progression rate.\n`;
    for (const w of weeklyTrends) {
      prompt += `- Week of ${w.weekStart}: ${w.totalKm.toFixed(1)}km | ${w.sessions} sessions${w.avgPace !== "N/A" ? ` | Avg pace: ${w.avgPace}` : ""}${w.avgHr !== "N/A" ? ` | Avg HR: ${w.avgHr}` : ""}\n`;
    }
  }

  prompt += `\n## Goals\n`;
  for (const goal of goals) {
    prompt += `- **${goal.goal_name}** (${goal.goal_type})`;
    if (goal.race_type) prompt += ` — ${goal.race_type}`;
    if (goal.race_date) prompt += ` on ${goal.race_date}`;
    if (goal.target_finish_time_seconds) {
      const h = Math.floor(goal.target_finish_time_seconds / 3600);
      const m = Math.floor((goal.target_finish_time_seconds % 3600) / 60);
      prompt += ` target ${h}:${String(m).padStart(2, "0")}`;
    }
    if (goal.activity_type) prompt += ` — ${goal.activity_type} ${goal.frequency_per_week}x/week`;
    prompt += "\n";
  }

  prompt += `\n## Plan Parameters\n`;
  prompt += `- Total weeks: ${weeksAvailable}\n`;
  prompt += `- Include periodization: base → build → peak → taper (2-3 weeks taper before race)\n`;
  prompt += `- Progressive overload: max 10% volume increase per week\n`;
  prompt += `- Week 1 volume MUST match the athlete's current weekly volume from the trends above\n`;
  prompt += `- Paces MUST be based on the athlete's actual recent paces from the history above\n`;
  prompt += `- Include rest days\n`;

  // Wizard preferences
  if (wizardPrefs) {
    if (wizardPrefs.preferred_long_run_day !== undefined) {
      const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
      prompt += `- Schedule the long run on ${dayNames[wizardPrefs.preferred_long_run_day]}\n`;
    }
    if (wizardPrefs.intensity_preference) {
      const intensityDesc: Record<string, string> = {
        conservative: "Conservative approach — slower volume progression, extra recovery days, prioritize injury prevention",
        moderate: "Balanced approach — steady progression with adequate recovery",
        aggressive: "Aggressive approach — faster progression, higher intensity, for experienced athletes",
      };
      prompt += `- Intensity: ${intensityDesc[wizardPrefs.intensity_preference]}\n`;
    }
    if (wizardPrefs.include_cross_training && wizardPrefs.cross_training_types?.length) {
      prompt += `- Include cross-training: ${wizardPrefs.cross_training_types.join(", ")} on non-running days or easy days\n`;
    } else if (wizardPrefs.include_cross_training === false) {
      prompt += `- Do NOT include cross-training sessions — running only with rest days\n`;
    } else {
      prompt += `- Schedule cross-training on non-running days or easy days\n`;
    }
    if (wizardPrefs.max_session_duration_minutes) {
      prompt += `- Weekday sessions should not exceed ${wizardPrefs.max_session_duration_minutes} minutes (weekend long runs may exceed this)\n`;
    }
  } else {
    prompt += `- Schedule cross-training on non-running days or easy days\n`;
  }

  if (profile.injuries_history?.some(i => !i.resolved)) {
    prompt += `- IMPORTANT: Accommodate current injuries — avoid aggravating movements, include rehab/prehab work\n`;
  }

  prompt += `\nGenerate the plan as JSON:
{
  "plan_name": "descriptive name",
  "total_weeks": ${weeksAvailable},
  "philosophy": "brief description of the training approach, referencing the athlete's current fitness and how the plan progresses them toward the goal",
  "sessions": [
    {
      "week_number": 1,
      "day_of_week": 0,
      "session_type": "easy|tempo|interval|long_run|recovery|hill_repeats|fartlek|race_pace|rest",
      "activity_type": "run|weight_training|football|yoga|swimming|cycling|cross_train|rest",
      "title": "Easy 5km",
      "description": "conversational pace, focus on form",
      "target_distance_meters": 5000,
      "target_pace_seconds_per_km": 360,
      "warmup_description": "5 min walk, dynamic stretches",
      "cooldown_description": "5 min walk, static stretches"
    }
  ]
}`;

  return prompt;
}

export function buildFeasibilityPrompt(
  goal: { goal_name: string; goal_type: string; race_type?: string; race_date?: string; target_finish_time_seconds?: number },
  profile: { experience_level: string; weekly_km_current?: number; years_running?: number },
  otherGoals: { goal_name: string; goal_type: string; frequency_per_week?: number }[] = []
): string {
  let prompt = `Assess the feasibility of this training goal:\n\n`;
  prompt += `**Goal**: ${goal.goal_name}\n`;
  prompt += `**Type**: ${goal.goal_type}${goal.race_type ? ` (${goal.race_type})` : ""}\n`;
  if (goal.race_date) {
    const daysAway = Math.ceil((new Date(goal.race_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    prompt += `**Date**: ${goal.race_date} (${daysAway} days away)\n`;
  }
  if (goal.target_finish_time_seconds) {
    const h = Math.floor(goal.target_finish_time_seconds / 3600);
    const m = Math.floor((goal.target_finish_time_seconds % 3600) / 60);
    prompt += `**Target time**: ${h}:${String(m).padStart(2, "0")}\n`;
  }

  prompt += `\n**Athlete**: ${profile.experience_level}, ${profile.years_running || "unknown"} years running, currently ${profile.weekly_km_current || "unknown"} km/week\n`;

  if (otherGoals.length) {
    prompt += `\n**Other active goals**:\n`;
    for (const g of otherGoals) {
      prompt += `- ${g.goal_name} (${g.goal_type}${g.frequency_per_week ? `, ${g.frequency_per_week}x/week` : ""})\n`;
    }
  }

  prompt += `\nProvide your assessment as JSON:
{
  "feasible": true/false,
  "confidence": 0.0-1.0,
  "reasoning": "detailed explanation",
  "suggested_target_time_seconds": null or number,
  "risks": ["list of risks"],
  "recommendations": ["list of recommendations"]
}`;

  return prompt;
}

function formatPace(secondsPerKm: number): string {
  const m = Math.floor(secondsPerKm / 60);
  const s = Math.floor(secondsPerKm % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}
