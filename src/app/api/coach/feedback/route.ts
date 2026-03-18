import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const feedbackSchema = z.object({
  interaction_type: z.enum(["chat", "plan", "analysis"]),
  interaction_id: z.string().uuid().optional(),
  rating: z.enum(["thumbs_up", "thumbs_down"]),
  comment: z.string().optional(),
  response_snapshot: z.string().optional(),
});

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = feedbackSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { data, error } = await supabase.from("coach_feedback").insert({
    user_id: user.id,
    ...parsed.data,
  }).select().single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // If thumbs_down, try to infer a negative preference
  // If thumbs_up, reinforce positive patterns
  // This is a simple heuristic — could be made more sophisticated
  if (parsed.data.comment) {
    await supabase.from("learned_preferences").upsert({
      user_id: user.id,
      preference_key: `feedback_${parsed.data.interaction_type}`,
      preference_value: parsed.data.comment,
      confidence_score: parsed.data.rating === "thumbs_down" ? 0.7 : 0.5,
      source: "inferred",
      last_updated: new Date().toISOString(),
    }, { onConflict: "user_id,preference_key" });
  }

  return NextResponse.json(data);
}
