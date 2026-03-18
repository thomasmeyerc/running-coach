import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildFeasibilityPrompt } from "@/lib/claude/prompts";
import { generateStructuredResponse } from "@/lib/claude/streaming";
import type { FeasibilityResult } from "@/types/database";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { goal_id: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.goal_id || typeof body.goal_id !== "string") {
    return NextResponse.json(
      { error: "goal_id is required" },
      { status: 400 }
    );
  }

  // Load the goal
  const { data: goal, error: goalError } = await supabase
    .from("goals")
    .select("*")
    .eq("id", body.goal_id)
    .eq("user_id", user.id)
    .single();

  if (goalError || !goal) {
    return NextResponse.json({ error: "Goal not found" }, { status: 404 });
  }

  // Load user profile
  const { data: profile, error: profileError } = await supabase
    .from("user_profiles")
    .select("experience_level, weekly_km_current, years_running")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    return NextResponse.json(
      { error: "User profile not found" },
      { status: 404 }
    );
  }

  // Load other active goals (excluding current one)
  const { data: otherGoals } = await supabase
    .from("goals")
    .select("goal_name, goal_type, frequency_per_week")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .neq("id", body.goal_id);

  // Build the prompt
  const prompt = buildFeasibilityPrompt(
    {
      goal_name: goal.goal_name,
      goal_type: goal.goal_type,
      race_type: goal.race_type ?? undefined,
      race_date: goal.race_date ?? undefined,
      target_finish_time_seconds: goal.target_finish_time_seconds ?? undefined,
    },
    {
      experience_level: profile.experience_level,
      weekly_km_current: profile.weekly_km_current ?? undefined,
      years_running: profile.years_running ?? undefined,
    },
    otherGoals ?? []
  );

  const systemPrompt =
    "You are an expert running coach. Respond ONLY with valid JSON, no markdown fences or extra text.";

  // Call Claude for feasibility assessment
  let assessment: FeasibilityResult;
  try {
    const rawResponse = await generateStructuredResponse(
      systemPrompt,
      prompt,
      2048
    );

    // Strip markdown code fences if present
    const cleaned = rawResponse
      .replace(/```json\s*/g, "")
      .replace(/```\s*/g, "")
      .trim();

    assessment = JSON.parse(cleaned) as FeasibilityResult;
  } catch (parseError) {
    console.error("Failed to parse feasibility response:", parseError);
    return NextResponse.json(
      { error: "Failed to parse AI response" },
      { status: 500 }
    );
  }

  // Validate the structure has required fields
  if (typeof assessment.feasible !== "boolean" || typeof assessment.confidence !== "number") {
    return NextResponse.json(
      { error: "Invalid assessment structure from AI" },
      { status: 500 }
    );
  }

  // Store the assessment on the goal
  const { error: updateError } = await supabase
    .from("goals")
    .update({
      feasibility_assessment: assessment,
      updated_at: new Date().toISOString(),
    })
    .eq("id", body.goal_id)
    .eq("user_id", user.id);

  if (updateError) {
    return NextResponse.json(
      { error: "Failed to store assessment" },
      { status: 500 }
    );
  }

  return NextResponse.json({ assessment });
}
