export const dynamic = "force-dynamic";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function GoalsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Goals</h1>
          <p className="text-muted-foreground">Set and manage your training goals.</p>
        </div>
        <Button>Add Goal</Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Your Goals</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
            No goals set yet. Add your first goal to get started with a training plan.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
