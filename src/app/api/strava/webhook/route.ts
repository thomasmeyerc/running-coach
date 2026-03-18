import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { syncStravaActivities } from "@/lib/strava/sync";
import type { StravaWebhookEvent } from "@/types/strava";

// GET: Strava webhook subscription verification
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === process.env.STRAVA_WEBHOOK_VERIFY_TOKEN) {
    return NextResponse.json({ "hub.challenge": challenge });
  }

  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

// POST: Receive activity events
export async function POST(request: NextRequest) {
  const event: StravaWebhookEvent = await request.json();

  // Only process activity create/update events
  if (event.object_type !== "activity") {
    return NextResponse.json({ status: "ignored" });
  }

  if (event.aspect_type === "delete") {
    // Remove deleted activity
    const supabase = createAdminClient();
    await supabase
      .from("activities")
      .delete()
      .eq("strava_activity_id", event.object_id);
    return NextResponse.json({ status: "deleted" });
  }

  // Find user by Strava athlete ID
  const supabase = createAdminClient();
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("id")
    .eq("strava_athlete_id", event.owner_id)
    .single();

  if (profile) {
    // Trigger sync for this user (will pick up the new/updated activity)
    await syncStravaActivities(profile.id);
  }

  return NextResponse.json({ status: "ok" });
}
