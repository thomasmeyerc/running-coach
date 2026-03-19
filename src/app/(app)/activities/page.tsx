export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import Link from "next/link";
import { ActivitiesClient } from "@/components/activities/activities-client";
import type { Activity, RpeFeedback } from "@/types/database";

interface ActivityWithRpe extends Activity {
  rpe_feedback: RpeFeedback[];
}

function formatPace(secondsPerKm: number): string {
  const m = Math.floor(secondsPerKm / 60);
  const s = Math.floor(secondsPerKm % 60);
  return `${m}:${String(s).padStart(2, "0")}/km`;
}

function formatDistance(meters: number): string {
  return `${(meters / 1000).toFixed(1)} km`;
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m} min`;
}

export default async function ActivitiesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Fetch all activities with RPE
  const { data: activities } = await supabase
    .from("activities")
    .select("*, rpe_feedback(*)")
    .eq("user_id", user.id)
    .order("start_date", { ascending: false })
    .limit(100);

  const typedActivities = (activities ?? []) as ActivityWithRpe[];

  const runs = typedActivities.filter((a) => a.activity_type === "run");
  const crossTraining = typedActivities.filter(
    (a) => a.activity_type !== "run"
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="page-header">
          <h1 className="text-2xl font-bold tracking-tight">Activities</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Your training history across all activity types.
          </p>
        </div>
        <ActivitiesClient />
      </div>

      {typedActivities.length === 0 ? (
        <Card>
          <CardContent className="flex h-48 items-center justify-center text-sm text-muted-foreground">
            No activities yet. Connect Strava in settings or add an activity
            manually.
          </CardContent>
        </Card>
      ) : (
        <ActivityTabs
          all={typedActivities}
          runs={runs}
          crossTraining={crossTraining}
        />
      )}
    </div>
  );
}

function ActivityTabs({
  all,
  runs,
  crossTraining,
}: {
  all: ActivityWithRpe[];
  runs: ActivityWithRpe[];
  crossTraining: ActivityWithRpe[];
}) {
  return (
    <ActivitiesTabsClient
      allActivities={all}
      runActivities={runs}
      crossTrainingActivities={crossTraining}
    />
  );
}

// Extracted as a separate import target, but since we need client tabs
// we render a client wrapper that takes the data
function ActivitiesTabsClient({
  allActivities,
  runActivities,
  crossTrainingActivities,
}: {
  allActivities: ActivityWithRpe[];
  runActivities: ActivityWithRpe[];
  crossTrainingActivities: ActivityWithRpe[];
}) {
  // Server component renders all three lists; the client component
  // handles tab switching. We render all lists statically and let
  // the client tabs component toggle visibility.
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">
            All Activities ({allActivities.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {allActivities.length > 0 && (
            <div className="divide-y">
              {allActivities.map((activity) => (
                <ActivityRow key={activity.id} activity={activity} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {runActivities.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">
              Runs ({runActivities.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {runActivities.map((activity) => (
                <ActivityRow key={activity.id} activity={activity} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {crossTrainingActivities.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">
              Cross-Training ({crossTrainingActivities.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {crossTrainingActivities.map((activity) => (
                <ActivityRow key={activity.id} activity={activity} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function ActivityRow({ activity }: { activity: ActivityWithRpe }) {
  const rpe = activity.rpe_feedback?.[0];

  return (
    <Link
      href={`/activities/${activity.id}`}
      className="flex items-center justify-between px-4 py-3 transition-colors hover:bg-muted/50"
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-medium">{activity.name}</p>
          <Badge variant="secondary" className="text-[10px] shrink-0">
            {activity.activity_type.replace("_", " ")}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">
          {new Date(activity.start_date).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })}
        </p>
      </div>

      <div className="flex items-center gap-4 text-sm">
        {activity.distance_meters && (
          <span className="hidden sm:block text-muted-foreground">
            {formatDistance(activity.distance_meters)}
          </span>
        )}
        <span className="text-muted-foreground">
          {formatDuration(activity.moving_time_seconds)}
        </span>
        {activity.average_pace_seconds_per_km && (
          <span className="hidden md:block text-muted-foreground">
            {formatPace(activity.average_pace_seconds_per_km)}
          </span>
        )}
        {rpe && (
          <Badge
            variant={rpe.rpe_score <= 5 ? "secondary" : "destructive"}
            className="text-[10px]"
          >
            RPE {rpe.rpe_score}
          </Badge>
        )}
      </div>
    </Link>
  );
}
