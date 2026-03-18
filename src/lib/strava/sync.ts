import { createAdminClient } from "@/lib/supabase/admin";
import { getValidStravaToken } from "./tokens";
import { mapStravaTypeToActivityType } from "@/types/strava";
import type { StravaActivity } from "@/types/strava";

export interface SyncResult {
  synced: number;
  matched: number;
  errors: string[];
}

export async function syncStravaActivities(userId: string): Promise<SyncResult> {
  const token = await getValidStravaToken(userId);
  if (!token) {
    return { synced: 0, matched: 0, errors: ["No valid Strava token"] };
  }

  const supabase = createAdminClient();
  const result: SyncResult = { synced: 0, matched: 0, errors: [] };

  // Get the latest synced activity date
  const { data: latestActivity } = await supabase
    .from("activities")
    .select("start_date")
    .eq("user_id", userId)
    .eq("source", "strava")
    .order("start_date", { ascending: false })
    .limit(1)
    .single();

  const after = latestActivity
    ? Math.floor(new Date(latestActivity.start_date).getTime() / 1000)
    : Math.floor((Date.now() - 90 * 24 * 60 * 60 * 1000) / 1000); // 90 days ago

  // Fetch activities from Strava (paginated)
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const url = `https://www.strava.com/api/v3/athlete/activities?after=${after}&per_page=50&page=${page}`;
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      result.errors.push(`Strava API error: ${response.status}`);
      break;
    }

    const activities: StravaActivity[] = await response.json();
    if (activities.length === 0) {
      hasMore = false;
      break;
    }

    for (const activity of activities) {
      const activityType = mapStravaTypeToActivityType(activity.type);

      const { error } = await supabase.from("activities").upsert({
        user_id: userId,
        strava_activity_id: activity.id,
        activity_type: activityType,
        name: activity.name,
        start_date: activity.start_date,
        distance_meters: activity.distance || null,
        moving_time_seconds: activity.moving_time,
        elapsed_time_seconds: activity.elapsed_time,
        average_heartrate: activity.average_heartrate || null,
        max_heartrate: activity.max_heartrate || null,
        total_elevation_gain: activity.total_elevation_gain || null,
        average_cadence: activity.average_cadence || null,
        calories: activity.calories || null,
        polyline: activity.map?.summary_polyline || null,
        splits_km: activity.splits_metric || null,
        source: "strava",
      }, { onConflict: "strava_activity_id" });

      if (error) {
        result.errors.push(`Activity ${activity.id}: ${error.message}`);
      } else {
        result.synced++;
      }
    }

    if (activities.length < 50) {
      hasMore = false;
    }
    page++;
  }

  // Auto-match to planned sessions
  result.matched = await autoMatchActivities(userId);

  return result;
}

async function autoMatchActivities(userId: string): Promise<number> {
  const supabase = createAdminClient();
  let matched = 0;

  // Get unmatched activities from last 7 days
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data: unmatchedActivities } = await supabase
    .from("activities")
    .select("id, activity_type, start_date, distance_meters")
    .eq("user_id", userId)
    .is("planned_session_id", null)
    .gte("start_date", weekAgo);

  if (!unmatchedActivities?.length) return 0;

  // Get unmatched planned sessions
  const { data: unmatchedSessions } = await supabase
    .from("planned_sessions")
    .select("id, activity_type, scheduled_date, target_distance_meters")
    .eq("user_id", userId)
    .eq("is_completed", false)
    .is("matched_activity_id", null)
    .gte("scheduled_date", weekAgo);

  if (!unmatchedSessions?.length) return 0;

  for (const activity of unmatchedActivities) {
    const activityDate = new Date(activity.start_date);

    // Find a session within ±1 day with matching activity type
    const match = unmatchedSessions.find((session) => {
      const sessionDate = new Date(session.scheduled_date);
      const dayDiff = Math.abs(activityDate.getTime() - sessionDate.getTime()) / (1000 * 60 * 60 * 24);

      if (dayDiff > 1.5) return false;

      // Type must match (run↔run, weight_training↔weight_training, etc.)
      const typeMatch = mapActivityToSessionType(activity.activity_type) === session.activity_type;
      if (!typeMatch) return false;

      // For distance-based activities, check within 20%
      if (activity.distance_meters && session.target_distance_meters) {
        const ratio = activity.distance_meters / session.target_distance_meters;
        if (ratio < 0.8 || ratio > 1.2) return false;
      }

      return true;
    });

    if (match) {
      // Link activity to session
      await supabase.from("activities")
        .update({ planned_session_id: match.id })
        .eq("id", activity.id);

      await supabase.from("planned_sessions")
        .update({ is_completed: true, matched_activity_id: activity.id })
        .eq("id", match.id);

      // Remove from candidates
      const idx = unmatchedSessions.indexOf(match);
      unmatchedSessions.splice(idx, 1);
      matched++;
    }
  }

  return matched;
}

function mapActivityToSessionType(activityType: string): string {
  const mapping: Record<string, string> = {
    run: "run",
    ride: "cycling",
    swim: "swimming",
    weight_training: "weight_training",
    football: "football",
    yoga: "yoga",
    cross_train: "cross_train",
  };
  return mapping[activityType] || "cross_train";
}
