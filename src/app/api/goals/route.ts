import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const goalCreateSchema = z.object({
  goal_name: z.string().min(1, "Goal name is required").max(200),
  goal_type: z.enum(["race", "cross_training", "general_fitness"]),
  race_type: z.enum(["5k", "10k", "half_marathon", "marathon", "ultra", "custom"]).optional(),
  race_date: z.string().optional(),
  target_finish_time_seconds: z.number().positive().optional(),
  custom_distance_meters: z.number().positive().optional(),
  activity_type: z.string().max(100).optional(),
  frequency_per_week: z.number().int().min(1).max(14).optional(),
  cross_training_notes: z.string().max(1000).optional(),
  priority: z.enum(["primary", "secondary"]),
});

const goalUpdateSchema = goalCreateSchema.partial().extend({
  id: z.string().uuid(),
  is_active: z.boolean().optional(),
});

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: goals, error } = await supabase
    .from("goals")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ goals });
}

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

  const parsed = goalCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.issues },
      { status: 400 }
    );
  }

  const { data: goal, error } = await supabase
    .from("goals")
    .insert({
      user_id: user.id,
      ...parsed.data,
      is_active: true,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Trigger feasibility assessment in the background
  try {
    const baseUrl = request.nextUrl.origin;
    await fetch(`${baseUrl}/api/coach/assess-feasibility`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        cookie: request.headers.get("cookie") || "",
      },
      body: JSON.stringify({ goal_id: goal.id }),
    });
  } catch {
    // Feasibility assessment is non-blocking; goal is still created
  }

  return NextResponse.json({ goal }, { status: 201 });
}

export async function PUT(request: NextRequest) {
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

  const parsed = goalUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.issues },
      { status: 400 }
    );
  }

  const { id, ...updates } = parsed.data;

  // Verify ownership
  const { data: existing } = await supabase
    .from("goals")
    .select("id")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!existing) {
    return NextResponse.json({ error: "Goal not found" }, { status: 404 });
  }

  const { data: goal, error } = await supabase
    .from("goals")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ goal });
}

export async function DELETE(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const goalId = request.nextUrl.searchParams.get("id");
  if (!goalId) {
    return NextResponse.json(
      { error: "Missing goal id query parameter" },
      { status: 400 }
    );
  }

  // Verify ownership
  const { data: existing } = await supabase
    .from("goals")
    .select("id")
    .eq("id", goalId)
    .eq("user_id", user.id)
    .single();

  if (!existing) {
    return NextResponse.json({ error: "Goal not found" }, { status: 404 });
  }

  const { error } = await supabase
    .from("goals")
    .delete()
    .eq("id", goalId)
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
