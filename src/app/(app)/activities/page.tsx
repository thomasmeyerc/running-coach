export const dynamic = "force-dynamic";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ActivitiesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Activities</h1>
        <p className="text-muted-foreground">Your training history across all activity types.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">All Activities</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
            No activities yet. Connect Strava in settings or add an activity manually.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
