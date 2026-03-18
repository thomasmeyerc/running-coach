import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const rpeSchema = z.object({
  rpe_score: z.number().int().min(1).max(10),
  energy_level: z.number().int().min(1).max(5).optional(),
  muscle_soreness: z.number().int().min(1).max(5).optional(),
  mood: z.enum(["great", "good", "neutral", "tired", "terrible"]).optional(),
  comment: z.string().max(1000).optional(),
  sleep_hours_prior: z.number().min(0).max(24).optional(),
  injury_flag: z.boolean().optional(),
  injury_notes: z.string().max(500).optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: activityId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify the activity belongs to the user
  const { data: activity } = await supabase
    .from("activities")
    .select("id")
    .eq("id", activityId)
    .eq("user_id", user.id)
    .single();

  if (!activity) {
    return NextResponse.json({ error: "Activity not found" }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = rpeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.issues },
      { status: 400 }
    );
  }

  // Check if RPE feedback already exists
  const { data: existing } = await supabase
    .from("rpe_feedback")
    .select("id")
    .eq("activity_id", activityId)
    .eq("user_id", user.id)
    .single();

  if (existing) {
    return NextResponse.json(
      { error: "RPE feedback already exists. Use PUT to update." },
      { status: 409 }
    );
  }

  const { data: feedback, error } = await supabase
    .from("rpe_feedback")
    .insert({
      user_id: user.id,
      activity_id: activityId,
      ...parsed.data,
      injury_flag: parsed.data.injury_flag ?? false,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ feedback }, { status: 201 });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: activityId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify the activity belongs to the user
  const { data: activity } = await supabase
    .from("activities")
    .select("id")
    .eq("id", activityId)
    .eq("user_id", user.id)
    .single();

  if (!activity) {
    return NextResponse.json({ error: "Activity not found" }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = rpeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.issues },
      { status: 400 }
    );
  }

  const { data: feedback, error } = await supabase
    .from("rpe_feedback")
    .update({
      ...parsed.data,
      injury_flag: parsed.data.injury_flag ?? false,
    })
    .eq("activity_id", activityId)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!feedback) {
    return NextResponse.json(
      { error: "No existing RPE feedback to update" },
      { status: 404 }
    );
  }

  return NextResponse.json({ feedback });
}
