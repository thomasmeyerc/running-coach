export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { PlanCalendar } from "@/components/plan/plan-calendar";
import type { TrainingPlan, PlannedSession } from "@/types/database";
import { Calendar, Target } from "lucide-react";

interface PlanWithSessions extends TrainingPlan {
  planned_sessions: PlannedSession[];
}

export default async function PlanPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Fetch active training plan with sessions
  const { data: plan } = await supabase
    .from("training_plans")
    .select("*, planned_sessions(*)")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .single();

  const typedPlan = plan as PlanWithSessions | null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Training Plan</h1>
          <p className="text-muted-foreground">
            Your personalized training schedule.
          </p>
        </div>
      </div>

      {!typedPlan ? (
        <EmptyPlanState />
      ) : (
        <PlanView plan={typedPlan} />
      )}
    </div>
  );
}

function EmptyPlanState() {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-16 text-center">
        <Calendar className="mb-4 h-12 w-12 text-muted-foreground/50" />
        <h2 className="text-lg font-semibold">No Active Training Plan</h2>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          Set a goal first, then generate a personalized training plan tailored
          to your fitness level and schedule.
        </p>
        <div className="mt-6 flex gap-3">
          <Link href="/goals">
            <Button>
              <Target className="mr-2 h-4 w-4" />
              Set a Goal
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

function PlanView({ plan }: { plan: PlanWithSessions }) {
  const sessions = plan.planned_sessions ?? [];
  const completedCount = sessions.filter(
    (s) => s.is_completed && s.session_type !== "rest"
  ).length;
  const totalActionable = sessions.filter(
    (s) => s.session_type !== "rest"
  ).length;

  return (
    <div className="space-y-4">
      {/* Plan Header */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">{plan.plan_name}</CardTitle>
              {plan.plan_philosophy && (
                <p className="mt-1 text-sm text-muted-foreground">
                  {plan.plan_philosophy}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline">
                {plan.start_date} to {plan.end_date}
              </Badge>
              <Badge variant="secondary">
                {completedCount}/{totalActionable} sessions
              </Badge>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Calendar */}
      <PlanCalendar
        sessions={sessions}
        currentWeek={plan.current_week}
        totalWeeks={plan.total_weeks}
      />
    </div>
  );
}
