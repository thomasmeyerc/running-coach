import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildCoachSystemPrompt } from "@/lib/claude/prompts";
import { generateStructuredResponse } from "@/lib/claude/streaming";

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();

  // Get active plan
  const { data: plan } = await admin
    .from("training_plans")
    .select("*")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .single();

  if (!plan) {
    return NextResponse.json({ error: "No active plan" }, { status: 404 });
  }

  // Get this week's planned sessions
  const { data: plannedSessions } = await admin
    .from("planned_sessions")
    .select("*")
    .eq("plan_id", plan.id)
    .eq("week_number", plan.current_week)
    .order("day_of_week");

  // Get this week's completed activities
  const weekStart = getWeekStart(new Date());
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);

  const { data: completedActivities } = await admin
    .from("activities")
    .select("*, rpe_feedback(*)")
    .eq("user_id", user.id)
    .gte("start_date", weekStart.toISOString())
    .lt("start_date", weekEnd.toISOString());

  // Get recent RPE trends
  const { data: recentRpe } = await admin
    .from("rpe_feedback")
    .select("rpe_score, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(10);

  // Detect deviations
  const deviations = detectDeviations(plannedSessions || [], completedActivities || []);

  if (deviations.length === 0) {
    return NextResponse.json({ adjustments: [], message: "Plan is on track" });
  }

  // Build adaptation prompt
  const prompt = buildAdaptationPrompt(
    plannedSessions || [],
    completedActivities || [],
    deviations,
    recentRpe || []
  );

  const systemPrompt = buildCoachSystemPrompt();
  const response = await generateStructuredResponse(systemPrompt, prompt, 4096);

  // Parse adjustments
  let adjustments;
  try {
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      adjustments = JSON.parse(jsonMatch[0]);
    }
  } catch {
    return NextResponse.json({ error: "Failed to parse adaptation response" }, { status: 500 });
  }

  // Apply adjustments to remaining sessions
  if (adjustments?.sessions) {
    for (const adj of adjustments.sessions) {
      if (adj.session_id && adj.changes) {
        await admin
          .from("planned_sessions")
          .update(adj.changes)
          .eq("id", adj.session_id)
          .eq("user_id", user.id);
      }
    }
  }

  return NextResponse.json({
    adjustments: adjustments?.sessions || [],
    reasoning: adjustments?.reasoning || "",
    deviations,
  });
}

interface Deviation {
  type: "missed" | "over_distance" | "under_distance" | "high_rpe_trend" | "injury_flag";
  description: string;
  severity: "low" | "medium" | "high";
}

function detectDeviations(
  planned: { id: string; scheduled_date: string; target_distance_meters?: number; is_completed: boolean; session_type: string }[],
  completed: { distance_meters?: number; rpe_feedback?: { rpe_score: number; injury_flag?: boolean }[] }[]
): Deviation[] {
  const deviations: Deviation[] = [];
  const today = new Date();

  // Check for missed sessions
  for (const session of planned) {
    const sessionDate = new Date(session.scheduled_date);
    if (sessionDate < today && !session.is_completed && session.session_type !== "rest") {
      deviations.push({
        type: "missed",
        description: `Missed session on ${session.scheduled_date}`,
        severity: "medium",
      });
    }
  }

  // Check RPE trends
  const rpeScores = completed
    .flatMap((a) => a.rpe_feedback?.map((r) => r.rpe_score) || [])
    .filter(Boolean);

  if (rpeScores.length >= 3) {
    const avgRpe = rpeScores.reduce((a, b) => a + b, 0) / rpeScores.length;
    if (avgRpe >= 8) {
      deviations.push({
        type: "high_rpe_trend",
        description: `High average RPE (${avgRpe.toFixed(1)}/10) — athlete may be overtraining`,
        severity: "high",
      });
    }
  }

  // Check for injury flags
  const hasInjury = completed.some((a) =>
    a.rpe_feedback?.some((r) => r.injury_flag)
  );
  if (hasInjury) {
    deviations.push({
      type: "injury_flag",
      description: "Injury reported in recent activity",
      severity: "high",
    });
  }

  return deviations;
}

function buildAdaptationPrompt(
  planned: { id: string; title: string; session_type: string; scheduled_date: string; target_distance_meters?: number; is_completed: boolean }[],
  completed: { name: string; distance_meters?: number; moving_time_seconds: number; rpe_feedback?: { rpe_score: number; comment?: string }[] }[],
  deviations: Deviation[],
  recentRpe: { rpe_score: number; created_at: string }[]
): string {
  let prompt = `The athlete's training plan needs adjustment based on these deviations:\n\n`;

  prompt += `## Deviations Detected\n`;
  for (const d of deviations) {
    prompt += `- [${d.severity.toUpperCase()}] ${d.description}\n`;
  }

  prompt += `\n## This Week's Planned Sessions\n`;
  for (const s of planned) {
    prompt += `- ${s.scheduled_date} | ${s.title} (${s.session_type}) — ${s.is_completed ? "COMPLETED" : "remaining"}\n`;
  }

  prompt += `\n## Completed Activities This Week\n`;
  for (const a of completed) {
    const km = a.distance_meters ? `${(a.distance_meters / 1000).toFixed(1)}km` : "N/A";
    const rpe = a.rpe_feedback?.[0]?.rpe_score;
    prompt += `- ${a.name} | ${km} | RPE: ${rpe || "N/A"}\n`;
  }

  prompt += `\n## Recent RPE Trend\n`;
  for (const r of recentRpe.slice(0, 5)) {
    prompt += `- ${r.created_at.slice(0, 10)}: ${r.rpe_score}/10\n`;
  }

  prompt += `\nAdjust the REMAINING (not completed) sessions for this week and next week. Respond as JSON:
{
  "reasoning": "explanation of adjustments",
  "sessions": [
    {
      "session_id": "uuid of the session to modify",
      "changes": {
        "title": "updated title",
        "description": "updated description",
        "target_distance_meters": number,
        "session_type": "easy|tempo|etc"
      }
    }
  ]
}`;

  return prompt;
}

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}
