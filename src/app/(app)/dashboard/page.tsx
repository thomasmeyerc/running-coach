export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, Calendar, Target, TrendingUp } from "lucide-react";
import { WeeklyVolumeChart } from "@/components/dashboard/weekly-volume-chart";
import { PaceTrendChart } from "@/components/dashboard/pace-trend-chart";
import { GoalProgressCard } from "@/components/dashboard/goal-progress-card";

function formatPace(secondsPerKm: number): string {
  const m = Math.floor(secondsPerKm / 60);
  const s = Math.floor(secondsPerKm % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

function getWeekStart(date: Date): string {
  const d = new Date(date);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d.toISOString().slice(0, 10);
}

function formatWeekLabel(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch data in parallel
  const [goalsResult, activitiesResult, planResult] = await Promise.all([
    supabase
      .from("goals")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .order("priority", { ascending: true }),
    supabase
      .from("activities")
      .select("*")
      .eq("user_id", user.id)
      .order("start_date", { ascending: false })
      .limit(30),
    supabase
      .from("training_plans")
      .select("*, planned_sessions(*)")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .single(),
  ]);

  const goals = goalsResult.data || [];
  const activities = activitiesResult.data || [];
  const plan = planResult.data;

  // Compute weekly volume (last 12 weeks)
  const twelveWeeksAgo = new Date();
  twelveWeeksAgo.setDate(twelveWeeksAgo.getDate() - 84);

  const weeklyMap = new Map<string, number>();

  // Initialize all 12 weeks
  for (let i = 0; i < 12; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i * 7);
    const weekKey = getWeekStart(d);
    weeklyMap.set(weekKey, 0);
  }

  for (const a of activities) {
    const actDate = new Date(a.start_date);
    if (actDate < twelveWeeksAgo) continue;
    const weekKey = getWeekStart(actDate);
    const current = weeklyMap.get(weekKey) || 0;
    weeklyMap.set(weekKey, current + (a.distance_meters || 0) / 1000);
  }

  const weeklyVolumeData = Array.from(weeklyMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([week, km]) => ({
      week: formatWeekLabel(week),
      km: Math.round(km * 10) / 10,
    }));

  // Compute pace trend (runs only, with pace data)
  const paceTrendData = activities
    .filter(
      (a) =>
        a.activity_type === "run" &&
        a.average_pace_seconds_per_km &&
        a.average_pace_seconds_per_km > 0
    )
    .reverse()
    .map((a) => ({
      date: new Date(a.start_date).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
      pace: Math.round(a.average_pace_seconds_per_km!),
    }));

  // This week's stats
  const now = new Date();
  const thisWeekStart = getWeekStart(now);
  const thisWeekActivities = activities.filter((a) => {
    const weekKey = getWeekStart(new Date(a.start_date));
    return weekKey === thisWeekStart;
  });

  const thisWeekKm =
    Math.round(
      thisWeekActivities.reduce(
        (sum, a) => sum + (a.distance_meters || 0) / 1000,
        0
      ) * 10
    ) / 10;

  // Average pace across recent runs
  const recentRuns = activities.filter(
    (a) =>
      a.activity_type === "run" &&
      a.average_pace_seconds_per_km &&
      a.average_pace_seconds_per_km > 0
  );
  const avgPace =
    recentRuns.length > 0
      ? recentRuns.reduce(
          (sum, a) => sum + a.average_pace_seconds_per_km!,
          0
        ) / recentRuns.length
      : null;

  // Goal progress
  const primaryGoal = goals.find((g) => g.priority === "primary") || goals[0];

  // Next planned session
  const todayStr = now.toISOString().slice(0, 10);
  const upcomingSessions = plan?.planned_sessions
    ?.filter(
      (s: { scheduled_date: string; is_completed: boolean }) =>
        s.scheduled_date >= todayStr && !s.is_completed
    )
    ?.sort(
      (
        a: { scheduled_date: string },
        b: { scheduled_date: string }
      ) => a.scheduled_date.localeCompare(b.scheduled_date)
    );
  const nextSession = upcomingSessions?.[0];

  // Goal progress computation
  let goalWeeklyKmTarget = 0;
  let goalTotalWeeks = 0;
  let goalCurrentWeek = 0;

  if (plan && primaryGoal) {
    goalTotalWeeks = plan.total_weeks;
    goalCurrentWeek = plan.current_week;

    // Calculate weekly target from this week's planned sessions
    const thisWeekPlanned = plan.planned_sessions?.filter(
      (s: { week_number: number }) => s.week_number === plan.current_week
    );
    goalWeeklyKmTarget =
      Math.round(
        (thisWeekPlanned || []).reduce(
          (sum: number, s: { target_distance_meters: number | null }) =>
            sum + (s.target_distance_meters || 0) / 1000,
          0
        ) * 10
      ) / 10;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Your training overview at a glance.
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          title="This Week"
          value={activities.length > 0 ? `${thisWeekKm} km` : "0 km"}
          subtitle={`${thisWeekActivities.length} ${thisWeekActivities.length === 1 ? "activity" : "activities"}`}
          icon={<Activity className="h-4 w-4 text-muted-foreground" />}
        />
        <SummaryCard
          title="Goal Progress"
          value={
            primaryGoal
              ? `Week ${goalCurrentWeek || "--"}`
              : "--"
          }
          subtitle={
            primaryGoal
              ? primaryGoal.goal_name
              : "No active goal"
          }
          icon={<Target className="h-4 w-4 text-muted-foreground" />}
        />
        <SummaryCard
          title="Avg Pace"
          value={avgPace ? `${formatPace(avgPace)}/km` : "--"}
          subtitle={
            recentRuns.length > 0
              ? `From ${recentRuns.length} recent runs`
              : "No run data yet"
          }
          icon={<TrendingUp className="h-4 w-4 text-muted-foreground" />}
        />
        <SummaryCard
          title="Next Session"
          value={
            nextSession
              ? nextSession.title
              : "--"
          }
          subtitle={
            nextSession
              ? formatSessionDate(nextSession.scheduled_date)
              : "No plan active"
          }
          icon={<Calendar className="h-4 w-4 text-muted-foreground" />}
        />
      </div>

      {/* Goal progress card */}
      {primaryGoal && (
        <GoalProgressCard
          goalName={primaryGoal.goal_name}
          raceDate={primaryGoal.race_date || undefined}
          totalWeeks={goalTotalWeeks}
          currentWeek={goalCurrentWeek}
          weeklyKmTarget={goalWeeklyKmTarget}
          weeklyKmActual={thisWeekKm}
        />
      )}

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Weekly Volume</CardTitle>
          </CardHeader>
          <CardContent>
            {activities.length > 0 ? (
              <WeeklyVolumeChart data={weeklyVolumeData} />
            ) : (
              <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
                Connect Strava or log activities to see your weekly volume
                chart.
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Pace Trend</CardTitle>
          </CardHeader>
          <CardContent>
            {paceTrendData.length > 0 ? (
              <PaceTrendChart data={paceTrendData} />
            ) : (
              <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
                Your pace trend will appear here after logging some runs.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent activities */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Activities</CardTitle>
        </CardHeader>
        <CardContent>
          {activities.length > 0 ? (
            <div className="space-y-3">
              {activities.slice(0, 10).map((a) => (
                <div
                  key={a.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-sm">{a.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(a.start_date).toLocaleDateString("en-US", {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                      })}
                      {" "}
                      {a.activity_type}
                    </p>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    {a.distance_meters && (
                      <span className="tabular-nums font-medium">
                        {(a.distance_meters / 1000).toFixed(1)} km
                      </span>
                    )}
                    {a.average_pace_seconds_per_km && (
                      <span className="tabular-nums text-muted-foreground">
                        {formatPace(a.average_pace_seconds_per_km)}/km
                      </span>
                    )}
                    <span className="tabular-nums text-muted-foreground">
                      {Math.round(a.moving_time_seconds / 60)} min
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
              No activities yet. Connect Strava or add activities manually.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function SummaryCard({
  title,
  value,
  subtitle,
  icon,
}: {
  title: string;
  value: string;
  subtitle: string;
  icon: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="truncate text-2xl font-bold">{value}</div>
        <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
      </CardContent>
    </Card>
  );
}

function formatSessionDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffDays = Math.round(
    (d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Tomorrow";
  if (diffDays < 7) {
    return d.toLocaleDateString("en-US", { weekday: "long" });
  }
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
