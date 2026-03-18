import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const activityCreateSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  activity_type: z.enum([
    "run", "ride", "swim", "weight_training", "football",
    "yoga", "hike", "walk", "cross_train", "other",
  ]),
  start_date: z.string().min(1, "Start date is required"),
  distance_meters: z.number().positive().optional(),
  moving_time_seconds: z.number().int().positive("Duration is required"),
  average_heartrate: z.number().int().min(30).max(250).optional(),
  sport_detail: z.string().max(1000).optional(),
  calories: z.number().int().positive().optional(),
});

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const typeFilter = searchParams.get("type");
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));
  const offset = (page - 1) * limit;

  let query = supabase
    .from("activities")
    .select("*, rpe_feedback(*)", { count: "exact" })
    .eq("user_id", user.id)
    .order("start_date", { ascending: false })
    .range(offset, offset + limit - 1);

  if (typeFilter && typeFilter !== "all") {
    if (typeFilter === "runs") {
      query = query.eq("activity_type", "run");
    } else if (typeFilter === "cross_training") {
      query = query.neq("activity_type", "run");
    } else {
      query = query.eq("activity_type", typeFilter);
    }
  }

  const { data: activities, error, count } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    activities: activities ?? [],
    pagination: {
      page,
      limit,
      total: count ?? 0,
      totalPages: Math.ceil((count ?? 0) / limit),
    },
  });
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

  const parsed = activityCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.issues },
      { status: 400 }
    );
  }

  const { data: activity, error } = await supabase
    .from("activities")
    .insert({
      user_id: user.id,
      ...parsed.data,
      source: "manual" as const,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ activity }, { status: 201 });
}
