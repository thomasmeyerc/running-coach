import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { buildRunAnalysisPrompt } from "@/lib/claude/prompts";
import { generateStructuredResponse } from "@/lib/claude/streaming";
import type { RunAnalysis } from "@/types/database";

const analyzeSchema = z.object({
  activity_id: z.string().uuid(),
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

  const parsed = analyzeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.issues },
      { status: 400 }
    );
  }

  const { activity_id } = parsed.data;

  // Load activity
  const { data: activity, error: activityError } = await supabase
    .from("activities")
    .select("*")
    .eq("id", activity_id)
    .eq("user_id", user.id)
    .single();

  if (activityError || !activity) {
    return NextResponse.json({ error: "Activity not found" }, { status: 404 });
  }

  // Load planned session if linked
  let plannedSession = null;
  if (activity.planned_session_id) {
    const { data } = await supabase
      .from("planned_sessions")
      .select("*")
      .eq("id", activity.planned_session_id)
      .single();
    plannedSession = data;
  }

  // Load RPE feedback
  const { data: rpeFeedback } = await supabase
    .from("rpe_feedback")
    .select("*")
    .eq("activity_id", activity_id)
    .eq("user_id", user.id)
    .single();

  // Build prompt
  const prompt = buildRunAnalysisPrompt(
    {
      name: activity.name,
      distance_meters: activity.distance_meters ?? 0,
      moving_time_seconds: activity.moving_time_seconds,
      average_heartrate: activity.average_heartrate ?? undefined,
      splits_km: activity.splits_km ?? undefined,
    },
    plannedSession
      ? {
          title: plannedSession.title,
          target_distance_meters: plannedSession.target_distance_meters ?? undefined,
          target_pace_seconds_per_km: plannedSession.target_pace_seconds_per_km ?? undefined,
        }
      : undefined,
    rpeFeedback
      ? {
          rpe_score: rpeFeedback.rpe_score,
          comment: rpeFeedback.comment ?? undefined,
        }
      : undefined
  );

  const systemPrompt =
    "You are an expert running coach analyzing a workout. Respond with valid JSON only, no markdown fences.";

  try {
    const responseText = await generateStructuredResponse(systemPrompt, prompt);

    // Extract JSON from response (handle possible markdown fences)
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json(
        { error: "Failed to parse AI response" },
        { status: 500 }
      );
    }

    const analysis: RunAnalysis = JSON.parse(jsonMatch[0]);

    // Store analysis on the activity
    const { error: updateError } = await supabase
      .from("activities")
      .update({ ai_analysis: analysis })
      .eq("id", activity_id)
      .eq("user_id", user.id);

    if (updateError) {
      return NextResponse.json(
        { error: "Failed to save analysis" },
        { status: 500 }
      );
    }

    return NextResponse.json({ analysis });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `Analysis failed: ${message}` },
      { status: 500 }
    );
  }
}
