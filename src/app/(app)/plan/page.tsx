export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { PlanCalendar } from "@/components/plan/plan-calendar";
import type { TrainingPlan, PlannedSession, Goal } from "@/types/database";
import { GeneratePlanButton } from "@/components/plan/generate-plan-button";
import { PlanCoach, RegeneratePlanButton } from "@/components/plan/plan-coach";
import { Calendar, Target, Sparkles } from "lucide-react";

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

  // If no plan, check if user has goals
  let goals: Goal[] = [];
  if (!typedPlan) {
    const { data: goalsData } = await supabase
      .from("goals")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .order("priority", { ascending: true });
    goals = (goalsData as Goal[]) ?? [];
  }

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
        goals.length > 0 ? (
          <GeneratePlanState goals={goals} />
        ) : (
          <EmptyPlanState />
        )
      ) : (
        <PlanView plan={typedPlan} goalId={typedPlan.goal_id} />
      )}
    </div>
  );
}

function GeneratePlanState({ goals }: { goals: Goal[] }) {
  const primaryGoal = goals.find((g) => g.priority === "primary") ?? goals[0];
  const goalLabel =
    primaryGoal.race_type
      ? `${primaryGoal.race_type}${primaryGoal.race_date ? ` on ${new Date(primaryGoal.race_date).toLocaleDateString()}` : ""}`
      : primaryGoal.goal_name;

  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-16 text-center">
        <Sparkles className="mb-4 h-12 w-12 text-primary/60" />
        <h2 className="text-lg font-semibold">Ready to Generate Your Plan</h2>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          You have a goal set: <span className="font-medium text-foreground">{goalLabel}</span>.
          Generate a personalized training plan powered by AI.
        </p>
        <div className="mt-6">
          <GeneratePlanButton goalId={primaryGoal.id} />
        </div>
      </CardContent>
    </Card>
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

function PlanView({ plan, goalId }: { plan: PlanWithSessions; goalId: string }) {
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
          <div className="flex items-center gap-2 pt-2">
            <RegeneratePlanButton goalId={goalId} />
          </div>
        </CardHeader>
      </Card>

      {/* Calendar */}
      <PlanCalendar
        sessions={sessions}
        currentWeek={plan.current_week}
        totalWeeks={plan.total_weeks}
      />

      {/* Plan Coach */}
      <PlanCoach />
    </div>
  );
}
