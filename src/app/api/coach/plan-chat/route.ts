import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildContextBlock, buildCoachSystemPrompt } from "@/lib/claude/prompts";
import { getAnthropicClient, CLAUDE_MODEL } from "@/lib/claude/client";

const PLAN_COACH_MAX_TOKENS = 4096;

interface SessionUpdate {
  session_id: string;
  changes: Record<string, unknown>;
}

interface PlanModification {
  action: "update_sessions" | "swap_days" | "remove_session" | "add_session";
  updates?: SessionUpdate[];
  new_session?: Record<string, unknown>;
  remove_session_id?: string;
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { message: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { message } = body;
  if (!message || typeof message !== "string" || message.trim().length === 0) {
    return NextResponse.json({ error: "Message is required" }, { status: 400 });
  }

  const trimmedMessage = message.trim();
  if (trimmedMessage.length > 5000) {
    return NextResponse.json({ error: "Message too long (max 5000 characters)" }, { status: 400 });
  }

  const admin = createAdminClient();

  // Load context, preferences, conversation history, and active plan in parallel
  const [contextBlock, preferencesResult, historyResult, planResult] = await Promise.all([
    buildContextBlock(user.id),
    admin
      .from("learned_preferences")
      .select("preference_key, preference_value")
      .eq("user_id", user.id),
    admin
      .from("coach_messages")
      .select("role, content")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20),
    admin
      .from("training_plans")
      .select("*, planned_sessions(*)")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .single(),
  ]);

  const preferences = (preferencesResult.data || []).map((p) => ({
    key: p.preference_key,
    value: p.preference_value,
  }));

  const baseSystemPrompt = buildCoachSystemPrompt(preferences);

  // Enhanced system prompt for plan modification
  const plan = planResult.data;
  let planContext = "";
  if (plan?.planned_sessions) {
    const sessions = plan.planned_sessions
      .sort((a: { week_number: number; day_of_week: number }, b: { week_number: number; day_of_week: number }) =>
        a.week_number !== b.week_number ? a.week_number - b.week_number : a.day_of_week - b.day_of_week
      );

    planContext = `\n\n## Current Training Plan: ${plan.plan_name}
Plan ID: ${plan.id}
Week ${plan.current_week} of ${plan.total_weeks} (${plan.start_date} to ${plan.end_date})
Philosophy: ${plan.plan_philosophy || "N/A"}

### All Sessions:
${sessions.map((s: { id: string; week_number: number; day_of_week: number; session_type: string; activity_type: string; title: string; target_distance_meters?: number; target_pace_seconds_per_km?: number; is_completed: boolean; scheduled_date: string }) => {
  const distKm = s.target_distance_meters ? `${(s.target_distance_meters / 1000).toFixed(1)}km` : "";
  const pace = s.target_pace_seconds_per_km ? `${Math.floor(s.target_pace_seconds_per_km / 60)}:${String(Math.floor(s.target_pace_seconds_per_km % 60)).padStart(2, "0")}/km` : "";
  return `- [${s.id}] W${s.week_number} D${s.day_of_week} | ${s.scheduled_date} | ${s.session_type} | ${s.activity_type} | ${s.title} ${distKm} ${pace} | ${s.is_completed ? "DONE" : "planned"}`;
}).join("\n")}`;
  }

  const systemPrompt = `${baseSystemPrompt}

You are also the athlete's training plan manager. You can discuss the plan AND modify it.

When the athlete asks you to change their plan (swap sessions, adjust paces, change distances, move rest days, etc.), respond with your explanation AND include a JSON block with the modifications.

Format plan modifications as a JSON block wrapped in <plan_changes> tags:

<plan_changes>
{
  "modifications": [
    {
      "action": "update_sessions",
      "updates": [
        {
          "session_id": "uuid-of-session",
          "changes": {
            "title": "New Title",
            "description": "New description",
            "target_distance_meters": 8000,
            "target_pace_seconds_per_km": 330,
            "session_type": "tempo",
            "day_of_week": 3,
            "warmup_description": "...",
            "cooldown_description": "..."
          }
        }
      ]
    }
  ],
  "summary": "Brief description of what was changed"
}
</plan_changes>

Rules for modifications:
- Only include fields that are actually changing in the "changes" object
- Use exact session IDs from the plan data
- Do NOT modify completed sessions (is_completed: true) unless explicitly asked
- Valid session_type values: easy, tempo, interval, long_run, recovery, hill_repeats, fartlek, race_pace, rest
- Valid activity_type values: run, weight_training, football, yoga, swimming, cycling, cross_train, rest
- When no plan changes are needed (just coaching advice), do NOT include <plan_changes> tags

If the athlete just wants advice or asks questions, respond normally without modifications.`;

  // Build messages
  const conversationHistory = (historyResult.data || [])
    .reverse()
    .map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

  const messages: Array<{ role: "user" | "assistant"; content: string }> = [];

  // Context block
  const fullContext = contextBlock.trim() + planContext;
  if (fullContext.length > 0) {
    messages.push({
      role: "user",
      content: `[CONTEXT — current athlete data and training plan. Use session IDs when making modifications.]\n\n${fullContext}`,
    });
    messages.push({
      role: "assistant",
      content: "I have your current training plan and context. How can I help you with your plan?",
    });
  }

  messages.push(...conversationHistory);
  messages.push({ role: "user", content: trimmedMessage });

  try {
    const anthropic = getAnthropicClient();
    const response = await anthropic.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: PLAN_COACH_MAX_TOKENS,
      system: systemPrompt,
      messages,
    });

    const textBlock = response.content.find((block) => block.type === "text");
    const fullResponse = textBlock?.text || "";

    // Parse plan changes if present
    const planChangesMatch = fullResponse.match(/<plan_changes>([\s\S]*?)<\/plan_changes>/);
    let appliedChanges: string[] = [];

    if (planChangesMatch && plan) {
      try {
        const modifications = JSON.parse(planChangesMatch[1]);

        for (const mod of modifications.modifications as PlanModification[]) {
          if (mod.action === "update_sessions" && mod.updates) {
            for (const update of mod.updates) {
              const { error } = await admin
                .from("planned_sessions")
                .update(update.changes)
                .eq("id", update.session_id)
                .eq("user_id", user.id);

              if (!error) {
                appliedChanges.push(`Updated session ${update.session_id}`);
              }
            }
          }
        }
      } catch (parseErr) {
        console.error("Failed to parse plan changes:", parseErr);
      }
    }

    // Strip plan_changes tags from the displayed message
    const displayMessage = fullResponse.replace(/<plan_changes>[\s\S]*?<\/plan_changes>/, "").trim();

    // Save messages to DB
    const now = new Date().toISOString();
    await admin.from("coach_messages").insert([
      {
        user_id: user.id,
        role: "user" as const,
        content: trimmedMessage,
        created_at: now,
      },
      {
        user_id: user.id,
        role: "assistant" as const,
        content: displayMessage,
        created_at: new Date(Date.now() + 1).toISOString(),
      },
    ]);
    // Ignore save errors — non-critical

    return NextResponse.json({
      message: displayMessage,
      plan_modified: appliedChanges.length > 0,
      changes_applied: appliedChanges.length,
    });
  } catch (error: unknown) {
    const err = error as { status?: number; message?: string; error?: { message?: string } };
    if (err.status === 400 || err.status === 401 || err.status === 403) {
      const apiMsg = err.error?.message || err.message || "API error";
      return NextResponse.json({ error: apiMsg }, { status: err.status ?? 500 });
    }
    return NextResponse.json(
      { error: `Coach error: ${err.message || "Unknown error"}` },
      { status: 500 }
    );
  }
}
