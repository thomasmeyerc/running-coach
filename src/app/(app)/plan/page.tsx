export const dynamic = "force-dynamic";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function PlanPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Training Plan</h1>
          <p className="text-muted-foreground">Your personalized training schedule.</p>
        </div>
        <Link href="/plan/generate">
          <Button>Generate Plan</Button>
        </Link>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Plan Calendar</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
            No active training plan. Set a goal first, then generate a personalized plan.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
