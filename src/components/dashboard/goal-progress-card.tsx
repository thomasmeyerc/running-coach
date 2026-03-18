"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Target, Calendar, TrendingUp, TrendingDown, Minus } from "lucide-react";

interface GoalProgressCardProps {
  goalName: string;
  raceDate?: string;
  totalWeeks: number;
  currentWeek: number;
  weeklyKmTarget: number;
  weeklyKmActual: number;
}

function computeStatus(
  target: number,
  actual: number
): { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ReactNode } {
  if (target === 0) {
    return {
      label: "No target set",
      variant: "secondary",
      icon: <Minus className="h-3 w-3" />,
    };
  }

  const ratio = actual / target;

  if (ratio >= 0.9 && ratio <= 1.15) {
    return {
      label: "On track",
      variant: "default",
      icon: <TrendingUp className="h-3 w-3" />,
    };
  }
  if (ratio > 1.15) {
    return {
      label: "Ahead",
      variant: "outline",
      icon: <TrendingUp className="h-3 w-3" />,
    };
  }
  return {
    label: "Behind",
    variant: "destructive",
    icon: <TrendingDown className="h-3 w-3" />,
  };
}

export function GoalProgressCard({
  goalName,
  raceDate,
  totalWeeks,
  currentWeek,
  weeklyKmTarget,
  weeklyKmActual,
}: GoalProgressCardProps) {
  const status = computeStatus(weeklyKmTarget, weeklyKmActual);

  // Days remaining
  let daysRemaining: number | null = null;
  if (raceDate) {
    daysRemaining = Math.max(
      0,
      Math.ceil(
        (new Date(raceDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      )
    );
  }

  // Plan progress percentage
  const planProgress =
    totalWeeks > 0
      ? Math.min(100, Math.round((currentWeek / totalWeeks) * 100))
      : 0;

  // Weekly volume percentage
  const volumeProgress =
    weeklyKmTarget > 0
      ? Math.min(100, Math.round((weeklyKmActual / weeklyKmTarget) * 100))
      : 0;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex items-center gap-2">
          <Target className="h-4 w-4 text-muted-foreground" />
          <CardTitle className="text-base">{goalName}</CardTitle>
        </div>
        <Badge variant={status.variant} className="flex items-center gap-1">
          {status.icon}
          {status.label}
        </Badge>
      </CardHeader>
      <CardContent>
        <div className="grid gap-6 sm:grid-cols-3">
          {/* Plan progress */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Plan progress</span>
              <span className="font-medium tabular-nums">
                {totalWeeks > 0
                  ? `Week ${currentWeek} / ${totalWeeks}`
                  : "No plan"}
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all duration-500"
                style={{ width: `${planProgress}%` }}
              />
            </div>
          </div>

          {/* Weekly volume */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Weekly volume</span>
              <span className="font-medium tabular-nums">
                {weeklyKmActual} / {weeklyKmTarget || "--"} km
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-500",
                  volumeProgress > 115
                    ? "bg-yellow-500"
                    : volumeProgress >= 90
                      ? "bg-green-500"
                      : "bg-primary"
                )}
                style={{ width: `${Math.min(volumeProgress, 100)}%` }}
              />
            </div>
          </div>

          {/* Days remaining */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {raceDate ? "Race day" : "Timeline"}
              </span>
              <span className="font-medium">
                {daysRemaining !== null
                  ? `${daysRemaining} days`
                  : "No date set"}
              </span>
            </div>
            {raceDate && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Calendar className="h-3 w-3" />
                {new Date(raceDate).toLocaleDateString("en-US", {
                  weekday: "short",
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
