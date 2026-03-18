export const dynamic = "force-dynamic";

import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ActivityDetailClient } from "@/components/activities/activity-detail-client";
import type { Activity, RpeFeedback, PlannedSession } from "@/types/database";

interface ActivityDetailPageProps {
  params: Promise<{ id: string }>;
}

function formatPace(secondsPerKm: number): string {
  const m = Math.floor(secondsPerKm / 60);
  const s = Math.floor(secondsPerKm % 60);
  return `${m}:${String(s).padStart(2, "0")}/km`;
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default async function ActivityDetailPage({
  params,
}: ActivityDetailPageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Fetch activity
  const { data: activity } = await supabase
    .from("activities")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!activity) notFound();

  const typedActivity = activity as Activity;

  // Fetch RPE feedback
  const { data: rpeFeedback } = await supabase
    .from("rpe_feedback")
    .select("*")
    .eq("activity_id", id)
    .eq("user_id", user.id)
    .single();

  const typedRpe = rpeFeedback as RpeFeedback | null;

  // Fetch planned session if linked
  let plannedSession: PlannedSession | null = null;
  if (typedActivity.planned_session_id) {
    const { data } = await supabase
      .from("planned_sessions")
      .select("*")
      .eq("id", typedActivity.planned_session_id)
      .single();
    plannedSession = data as PlannedSession | null;
  }

  const distanceKm = typedActivity.distance_meters
    ? (typedActivity.distance_meters / 1000).toFixed(2)
    : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold tracking-tight">
            {typedActivity.name}
          </h1>
          <Badge variant="secondary">
            {typedActivity.activity_type.replace("_", " ")}
          </Badge>
          <Badge variant="outline">{typedActivity.source}</Badge>
        </div>
        <p className="text-muted-foreground">
          {new Date(typedActivity.start_date).toLocaleDateString("en-US", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
          })}
        </p>
      </div>

      {/* Linked Session */}
      {plannedSession && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              Planned Session
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-medium">{plannedSession.title}</p>
            {plannedSession.description && (
              <p className="mt-1 text-sm text-muted-foreground">
                {plannedSession.description}
              </p>
            )}
            <div className="mt-2 flex gap-3 text-sm text-muted-foreground">
              <Badge variant="secondary">
                {plannedSession.session_type.replace("_", " ")}
              </Badge>
              {plannedSession.target_distance_meters && (
                <span>
                  Target: {(plannedSession.target_distance_meters / 1000).toFixed(1)} km
                </span>
              )}
              {plannedSession.target_pace_seconds_per_km && (
                <span>
                  Pace: {formatPace(plannedSession.target_pace_seconds_per_km)}
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Key Metrics */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Metrics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {distanceKm && (
              <MetricItem label="Distance" value={`${distanceKm} km`} />
            )}
            <MetricItem
              label="Duration"
              value={formatDuration(typedActivity.moving_time_seconds)}
            />
            {typedActivity.average_pace_seconds_per_km && (
              <MetricItem
                label="Avg Pace"
                value={formatPace(typedActivity.average_pace_seconds_per_km)}
              />
            )}
            {typedActivity.average_heartrate && (
              <MetricItem
                label="Avg HR"
                value={`${typedActivity.average_heartrate} bpm`}
              />
            )}
            {typedActivity.max_heartrate && (
              <MetricItem
                label="Max HR"
                value={`${typedActivity.max_heartrate} bpm`}
              />
            )}
            {typedActivity.total_elevation_gain != null &&
              typedActivity.total_elevation_gain > 0 && (
                <MetricItem
                  label="Elevation"
                  value={`${typedActivity.total_elevation_gain} m`}
                />
              )}
            {typedActivity.average_cadence && (
              <MetricItem
                label="Cadence"
                value={`${typedActivity.average_cadence} spm`}
              />
            )}
            {typedActivity.calories && (
              <MetricItem
                label="Calories"
                value={`${typedActivity.calories} kcal`}
              />
            )}
          </div>
        </CardContent>
      </Card>

      {/* Splits */}
      {typedActivity.splits_km && typedActivity.splits_km.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Splits</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-2 pr-4 font-medium">Km</th>
                    <th className="pb-2 pr-4 font-medium">Pace</th>
                    <th className="pb-2 pr-4 font-medium">Time</th>
                    <th className="pb-2 font-medium">HR</th>
                  </tr>
                </thead>
                <tbody>
                  {typedActivity.splits_km.map((split) => (
                    <tr key={split.split} className="border-b last:border-0">
                      <td className="py-2 pr-4 font-medium">{split.split}</td>
                      <td className="py-2 pr-4">
                        {formatPace(split.pace_seconds_per_km)}
                      </td>
                      <td className="py-2 pr-4">
                        {formatDuration(split.moving_time)}
                      </td>
                      <td className="py-2">
                        {split.average_heartrate ?? "--"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* AI Analysis */}
      {typedActivity.ai_analysis && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">AI Analysis</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm">{typedActivity.ai_analysis.summary}</p>

            <Separator />

            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                Effort Alignment:
              </span>
              <Badge
                variant={
                  typedActivity.ai_analysis.effort_alignment === "on_target"
                    ? "secondary"
                    : "destructive"
                }
              >
                {typedActivity.ai_analysis.effort_alignment.replace("_", " ")}
              </Badge>
              <span className="text-xs text-muted-foreground">
                Pace Consistency:
              </span>
              <Badge variant="outline">
                {typedActivity.ai_analysis.pace_consistency_score}/100
              </Badge>
            </div>

            {typedActivity.ai_analysis.highlights.length > 0 && (
              <div>
                <p className="mb-1 text-xs font-medium text-muted-foreground">
                  Highlights
                </p>
                <ul className="list-inside list-disc space-y-0.5 text-sm">
                  {typedActivity.ai_analysis.highlights.map((h, i) => (
                    <li key={i}>{h}</li>
                  ))}
                </ul>
              </div>
            )}

            {typedActivity.ai_analysis.concerns.length > 0 && (
              <div>
                <p className="mb-1 text-xs font-medium text-muted-foreground">
                  Concerns
                </p>
                <ul className="list-inside list-disc space-y-0.5 text-sm">
                  {typedActivity.ai_analysis.concerns.map((c, i) => (
                    <li key={i}>{c}</li>
                  ))}
                </ul>
              </div>
            )}

            {typedActivity.ai_analysis.recommendations.length > 0 && (
              <div>
                <p className="mb-1 text-xs font-medium text-muted-foreground">
                  Recommendations
                </p>
                <ul className="list-inside list-disc space-y-0.5 text-sm">
                  {typedActivity.ai_analysis.recommendations.map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* RPE Section + Analyze Button (client component) */}
      <ActivityDetailClient
        activityId={typedActivity.id}
        existingRpe={typedRpe}
        hasAnalysis={!!typedActivity.ai_analysis}
        isRun={typedActivity.activity_type === "run"}
      />
    </div>
  );
}

function MetricItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-0.5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold">{value}</p>
    </div>
  );
}
