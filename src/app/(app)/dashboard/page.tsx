export const dynamic = "force-dynamic";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, Calendar, Target, TrendingUp } from "lucide-react";

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Your training overview at a glance.</p>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          title="This Week"
          value="0 km"
          subtitle="0 activities"
          icon={<Activity className="h-4 w-4 text-muted-foreground" />}
        />
        <SummaryCard
          title="Goal Progress"
          value="--"
          subtitle="No active goal"
          icon={<Target className="h-4 w-4 text-muted-foreground" />}
        />
        <SummaryCard
          title="Avg Pace"
          value="--"
          subtitle="No data yet"
          icon={<TrendingUp className="h-4 w-4 text-muted-foreground" />}
        />
        <SummaryCard
          title="Next Session"
          value="--"
          subtitle="No plan active"
          icon={<Calendar className="h-4 w-4 text-muted-foreground" />}
        />
      </div>

      {/* Placeholder charts area */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Weekly Volume</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
              Connect Strava or log activities to see your weekly volume chart.
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Pace Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
              Your pace trend will appear here after logging some runs.
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent activity */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Activities</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
            No activities yet. Connect Strava or add activities manually.
          </div>
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
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </CardContent>
    </Card>
  );
}
