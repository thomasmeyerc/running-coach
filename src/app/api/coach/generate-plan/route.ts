import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { buildPlanGenerationPrompt } from "@/lib/claude/prompts";
import type { PlanActivitySummary, PlanWeeklyTrend } from "@/lib/claude/prompts";
import { generateStructuredResponse } from "@/lib/claude/streaming";
import { PLAN_MAX_TOKENS } from "@/lib/claude/client";
import type { GeneratedPlan, GeneratedSession } from "@/types/training";

const generatePlanSchema = z.object({
  goal_id: z.string().uuid(),
});

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = generatePlanSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.issues },
      { status: 400 }
    );
  }

  const { goal_id } = parsed.data;

  // Load goal
  const { data: goal, error: goalError } = await supabase
    .from("goals")
    .select("*")
    .eq("id", goal_id)
    .eq("user_id", user.id)
    .single();

  if (goalError || !goal) {
    return NextResponse.json({ error: "Goal not found" }, { status: 404 });
  }

  // Load user profile
  const { data: profile, error: profileError } = await supabase
    .from("user_profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    return NextResponse.json({ error: "User profile not found" }, { status: 404 });
  }

  // Load other active goals
  const { data: otherGoals } = await supabase
    .from("goals")
    .select("*")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .neq("id", goal_id);

  // Calculate weeks available
  let weeksAvailable = 12; // default
  if (goal.race_date) {
    const raceDate = new Date(goal.race_date);
    const now = new Date();
    const diffMs = raceDate.getTime() - now.getTime();
    const diffWeeks = Math.floor(diffMs / (1000 * 60 * 60 * 24 * 7));
    weeksAvailable = Math.max(4, Math.min(diffWeeks, 52));
  }

  // Build all goals for the prompt (primary first, then others)
  const allGoals = [
    {
      goal_name: goal.goal_name,
      goal_type: goal.goal_type,
      race_type: goal.race_type ?? undefined,
      race_date: goal.race_date ?? undefined,
      target_finish_time_seconds: goal.target_finish_time_seconds ?? undefined,
      activity_type: goal.activity_type ?? undefined,
      frequency_per_week: goal.frequency_per_week ?? undefined,
    },
    ...(otherGoals ?? []).map((g) => ({
      goal_name: g.goal_name,
      goal_type: g.goal_type,
      activity_type: g.activity_type ?? undefined,
      frequency_per_week: g.frequency_per_week ?? undefined,
    })),
  ];

  // Fetch recent activities (last 30) for context
  const { data: activities } = await supabase
    .from("activities")
    .select("start_date, activity_type, name, distance_meters, moving_time_seconds, average_pace_seconds_per_km, average_heartrate")
    .eq("user_id", user.id)
    .order("start_date", { ascending: false })
    .limit(30);

  const recentActivities: PlanActivitySummary[] = (activities ?? []).map((a) => ({
    start_date: a.start_date,
    activity_type: a.activity_type,
    name: a.name,
    distance_meters: a.distance_meters,
    moving_time_seconds: a.moving_time_seconds,
    average_pace_seconds_per_km: a.average_pace_seconds_per_km,
    average_heartrate: a.average_heartrate,
  }));

  // Build weekly trends from all activities in the last 12 weeks
  const twelveWeeksAgo = new Date(Date.now() - 84 * 24 * 60 * 60 * 1000).toISOString();
  const { data: trendActivities } = await supabase
    .from("activities")
    .select("start_date, distance_meters, average_pace_seconds_per_km, average_heartrate")
    .eq("user_id", user.id)
    .gte("start_date", twelveWeeksAgo)
    .order("start_date", { ascending: true });

  const weeklyTrends: PlanWeeklyTrend[] = [];
  if (trendActivities?.length) {
    const weeks: Record<string, typeof trendActivities> = {};
    for (const a of trendActivities) {
      const date = new Date(a.start_date);
      const monday = new Date(date);
      monday.setDate(date.getDate() - ((date.getDay() + 6) % 7));
      const key = monday.toISOString().slice(0, 10);
      if (!weeks[key]) weeks[key] = [];
      weeks[key].push(a);
    }
    for (const [weekStart, weekActs] of Object.entries(weeks)) {
      const totalKm = weekActs.reduce((s, a) => s + ((a.distance_meters || 0) / 1000), 0);
      const paces = weekActs.map(a => a.average_pace_seconds_per_km).filter((v): v is number => v != null);
      const hrs = weekActs.map(a => a.average_heartrate).filter((v): v is number => v != null);
      const avgPaceSec = paces.length ? paces.reduce((a, b) => a + b, 0) / paces.length : null;
      const avgHr = hrs.length ? Math.round(hrs.reduce((a, b) => a + b, 0) / hrs.length) : null;
      weeklyTrends.push({
        weekStart,
        totalKm,
        sessions: weekActs.length,
        avgPace: avgPaceSec ? `${Math.floor(avgPaceSec / 60)}:${String(Math.floor(avgPaceSec % 60)).padStart(2, "0")}/km` : "N/A",
        avgHr: avgHr ? String(avgHr) : "N/A",
      });
    }
  }

  // Calculate age from date_of_birth
  let age: number | undefined;
  if (profile.date_of_birth) {
    const birth = new Date(profile.date_of_birth);
    const now = new Date();
    age = now.getFullYear() - birth.getFullYear();
    if (now.getMonth() < birth.getMonth() || (now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate())) {
      age--;
    }
  }

  const prompt = buildPlanGenerationPrompt(
    allGoals,
    {
      experience_level: profile.experience_level,
      weekly_km_current: goal.weekly_km_current ?? undefined,
      max_days_per_week: profile.max_days_per_week,
      preferred_run_days: profile.preferred_run_days ?? undefined,
      display_name: profile.display_name ?? undefined,
      age,
      gender: profile.gender ?? undefined,
      height_cm: profile.height_cm ? Number(profile.height_cm) : undefined,
      weight_kg: profile.weight_kg ? Number(profile.weight_kg) : undefined,
      years_running: profile.years_running ?? undefined,
      time_preference: profile.time_preference ?? undefined,
      injuries_history: profile.injuries_history ?? undefined,
    },
    weeksAvailable,
    recentActivities.length > 0 ? recentActivities : undefined,
    weeklyTrends.length > 0 ? weeklyTrends : undefined
  );

  const systemPrompt =
    "You are an expert running coach creating a structured training plan. Respond with valid JSON only, no markdown fences.";

  try {
    const responseText = await generateStructuredResponse(
      systemPrompt,
      prompt,
      PLAN_MAX_TOKENS
    );

    // Extract JSON from response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json(
        { error: "Failed to parse AI response" },
        { status: 500 }
      );
    }

    const generatedPlan: GeneratedPlan = JSON.parse(jsonMatch[0]);

    // Deactivate any existing active plans for this user
    await supabase
      .from("training_plans")
      .update({ is_active: false })
      .eq("user_id", user.id)
      .eq("is_active", true);

    // Calculate start and end dates
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - startDate.getDay() + 1); // Next Monday
    if (startDate < new Date()) {
      startDate.setDate(startDate.getDate() + 7);
    }
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + generatedPlan.total_weeks * 7 - 1);

    // Create training plan row
    const { data: plan, error: planError } = await supabase
      .from("training_plans")
      .insert({
        user_id: user.id,
        goal_id,
        plan_name: generatedPlan.plan_name,
        start_date: startDate.toISOString().slice(0, 10),
        end_date: endDate.toISOString().slice(0, 10),
        total_weeks: generatedPlan.total_weeks,
        current_week: 1,
        plan_philosophy: generatedPlan.philosophy,
        is_active: true,
      })
      .select()
      .single();

    if (planError || !plan) {
      return NextResponse.json(
        { error: planError?.message ?? "Failed to create plan" },
        { status: 500 }
      );
    }

    // Build planned sessions with calculated dates
    const sessionsToInsert = generatedPlan.sessions.map(
      (session: GeneratedSession) => {
        const sessionDate = new Date(startDate);
        sessionDate.setDate(
          sessionDate.getDate() +
            (session.week_number - 1) * 7 +
            session.day_of_week
        );

        return {
          plan_id: plan.id,
          user_id: user.id,
          week_number: session.week_number,
          day_of_week: session.day_of_week,
          scheduled_date: sessionDate.toISOString().slice(0, 10),
          session_type: session.session_type,
          activity_type: session.activity_type,
          title: session.title,
          description: session.description ?? null,
          target_distance_meters: session.target_distance_meters ?? null,
          target_duration_seconds: session.target_duration_seconds ?? null,
          target_pace_seconds_per_km: session.target_pace_seconds_per_km ?? null,
          warmup_description: session.warmup_description ?? null,
          cooldown_description: session.cooldown_description ?? null,
          intervals: session.intervals ?? null,
          cross_training_details: session.cross_training_details ?? null,
          is_completed: false,
        };
      }
    );

    // Insert all sessions
    const { error: sessionsError } = await supabase
      .from("planned_sessions")
      .insert(sessionsToInsert);

    if (sessionsError) {
      // Rollback: delete the plan
      await supabase.from("training_plans").delete().eq("id", plan.id);
      return NextResponse.json(
        { error: `Failed to create sessions: ${sessionsError.message}` },
        { status: 500 }
      );
    }

    // Fetch the complete plan with sessions
    const { data: completePlan } = await supabase
      .from("training_plans")
      .select("*, planned_sessions(*)")
      .eq("id", plan.id)
      .single();

    return NextResponse.json({ plan: completePlan }, { status: 201 });
  } catch (error: unknown) {
    const err = error as { status?: number; message?: string; error?: { message?: string } };
    // Surface Anthropic billing/auth errors clearly
    if (err.status === 400 || err.status === 401 || err.status === 403) {
      const apiMsg = err.error?.message || err.message || "API error";
      return NextResponse.json({ error: apiMsg }, { status: err.status });
    }
    const message = err.message || "Unknown error";
    return NextResponse.json(
      { error: `Plan generation failed: ${message}` },
      { status: 500 }
    );
  }
}
