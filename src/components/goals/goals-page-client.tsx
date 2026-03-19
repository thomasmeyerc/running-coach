"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import { GoalForm } from "@/components/goals/goal-form";
import { FeasibilityCard } from "@/components/goals/feasibility-card";
import type { Goal, GoalType } from "@/types/database";
import {
  Plus,
  Target,
  Dumbbell,
  Heart,
  Calendar,
  Pencil,
  Trash2,
  Loader2,
  CheckCircle,
  XCircle,
} from "lucide-react";

interface GoalsPageClientProps {
  goals: Goal[];
}

const GOAL_TYPE_LABELS: Record<GoalType, string> = {
  race: "Race",
  cross_training: "Cross Training",
  general_fitness: "General Fitness",
};

const GOAL_TYPE_ICONS: Record<GoalType, React.ReactNode> = {
  race: <Target className="h-4 w-4" />,
  cross_training: <Dumbbell className="h-4 w-4" />,
  general_fitness: <Heart className="h-4 w-4" />,
};

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}`;
  return `${m} min`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function daysUntil(dateStr: string): number {
  return Math.ceil(
    (new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );
}

export function GoalsPageClient({ goals }: GoalsPageClientProps) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleDelete(goalId: string) {
    if (!confirm("Are you sure you want to delete this goal?")) return;

    setDeletingId(goalId);
    try {
      const res = await fetch(`/api/goals?id=${goalId}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Failed to delete goal");
        return;
      }
      router.refresh();
    } catch {
      alert("Failed to delete goal");
    } finally {
      setDeletingId(null);
    }
  }

  const activeGoals = goals.filter((g) => g.is_active);
  const inactiveGoals = goals.filter((g) => !g.is_active);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="page-header">
          <h1 className="text-2xl font-bold tracking-tight">Goals</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Set and manage your training goals.
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger render={<Button />}>
            <Plus className="mr-2 h-4 w-4" />
            Add Goal
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Create New Goal</DialogTitle>
              <DialogDescription>
                Define your training goal and get an AI feasibility assessment.
              </DialogDescription>
            </DialogHeader>
            <GoalForm onSuccess={() => setDialogOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>

      {goals.length === 0 ? (
        <Card>
          <CardContent className="flex h-48 flex-col items-center justify-center gap-3">
            <Target className="h-10 w-10 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">
              No goals set yet. Add your first goal to get started with a
              training plan.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {activeGoals.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">Active Goals</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {activeGoals.map((goal) => (
                  <GoalCard
                    key={goal.id}
                    goal={goal}
                    onDelete={handleDelete}
                    isDeleting={deletingId === goal.id}
                  />
                ))}
              </div>
            </div>
          )}

          {inactiveGoals.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-muted-foreground">
                Inactive Goals
              </h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {inactiveGoals.map((goal) => (
                  <GoalCard
                    key={goal.id}
                    goal={goal}
                    onDelete={handleDelete}
                    isDeleting={deletingId === goal.id}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface GoalCardProps {
  goal: Goal;
  onDelete: (id: string) => void;
  isDeleting: boolean;
}

function GoalCard({ goal, onDelete, isDeleting }: GoalCardProps) {
  const router = useRouter();
  const [reassessing, setReassessing] = useState(false);

  async function handleReassess() {
    setReassessing(true);
    try {
      const res = await fetch("/api/coach/assess-feasibility", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goal_id: goal.id }),
      });
      if (res.ok) {
        router.refresh();
      }
    } catch {
      // silently fail
    } finally {
      setReassessing(false);
    }
  }

  const days = goal.race_date ? daysUntil(goal.race_date) : null;

  return (
    <Card className={!goal.is_active ? "opacity-60" : undefined}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            {GOAL_TYPE_ICONS[goal.goal_type]}
            <CardTitle className="text-base">{goal.goal_name}</CardTitle>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={handleReassess}
              disabled={reassessing}
              title="Re-assess feasibility"
            >
              {reassessing ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Pencil className="h-3.5 w-3.5" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => onDelete(goal.id)}
              disabled={isDeleting}
              title="Delete goal"
            >
              {isDeleting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Trash2 className="h-3.5 w-3.5 text-destructive" />
              )}
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">
            {GOAL_TYPE_LABELS[goal.goal_type]}
          </Badge>
          {goal.race_type && (
            <Badge variant="outline">
              {goal.race_type.replace("_", " ").toUpperCase()}
            </Badge>
          )}
          <Badge
            variant={goal.priority === "primary" ? "default" : "secondary"}
          >
            {goal.priority}
          </Badge>
          {goal.feasibility_assessment && (
            goal.feasibility_assessment.feasible ? (
              <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400">
                <CheckCircle className="mr-1 h-3 w-3" />
                Feasible ({Math.round(goal.feasibility_assessment.confidence * 100)}%)
              </Badge>
            ) : (
              <Badge variant="destructive">
                <XCircle className="mr-1 h-3 w-3" />
                Not Feasible
              </Badge>
            )
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Goal details */}
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
          {goal.race_date && (
            <span className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              {formatDate(goal.race_date)}
              {days != null && days > 0 && (
                <span className="text-xs">({days}d away)</span>
              )}
            </span>
          )}
          {goal.target_finish_time_seconds != null && (
            <span>Target: {formatTime(goal.target_finish_time_seconds)}</span>
          )}
          {goal.activity_type && <span>Activity: {goal.activity_type}</span>}
          {goal.frequency_per_week != null && (
            <span>{goal.frequency_per_week}x/week</span>
          )}
        </div>

        {/* Feasibility assessment */}
        {goal.feasibility_assessment && (
          <FeasibilityCard assessment={goal.feasibility_assessment} />
        )}
      </CardContent>
    </Card>
  );
}
