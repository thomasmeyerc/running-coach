"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { SessionCard } from "@/components/plan/session-card";
import type { PlannedSession } from "@/types/database";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface PlanCalendarProps {
  sessions: PlannedSession[];
  currentWeek: number;
  totalWeeks: number;
}

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function getWeekSessions(
  sessions: PlannedSession[],
  weekNumber: number
): PlannedSession[] {
  return sessions
    .filter((s) => s.week_number === weekNumber)
    .sort((a, b) => a.day_of_week - b.day_of_week);
}

function getWeekProgress(weekSessions: PlannedSession[]): number {
  const actionable = weekSessions.filter((s) => s.session_type !== "rest");
  if (actionable.length === 0) return 0;
  const completed = actionable.filter((s) => s.is_completed).length;
  return Math.round((completed / actionable.length) * 100);
}

function getWeekDistance(weekSessions: PlannedSession[]): number {
  return weekSessions.reduce(
    (sum, s) => sum + (s.target_distance_meters ?? 0),
    0
  );
}

export function PlanCalendar({
  sessions,
  currentWeek,
  totalWeeks,
}: PlanCalendarProps) {
  const [activeWeek, setActiveWeek] = useState(currentWeek);

  // Build week range for navigation
  const weekNumbers = Array.from(
    { length: totalWeeks },
    (_, i) => i + 1
  );

  // Determine visible weeks for the tab strip (show ~5 at a time)
  const VISIBLE_WEEKS = 5;
  const halfVisible = Math.floor(VISIBLE_WEEKS / 2);
  let startVisible = Math.max(1, activeWeek - halfVisible);
  const endVisible = Math.min(totalWeeks, startVisible + VISIBLE_WEEKS - 1);
  startVisible = Math.max(1, endVisible - VISIBLE_WEEKS + 1);

  const visibleWeeks = weekNumbers.filter(
    (w) => w >= startVisible && w <= endVisible
  );

  const weekSessions = getWeekSessions(sessions, activeWeek);
  const progress = getWeekProgress(weekSessions);
  const totalDistanceKm = getWeekDistance(weekSessions) / 1000;

  // Group sessions by day_of_week (0=Mon through 6=Sun)
  const sessionsByDay: Record<number, PlannedSession[]> = {};
  for (const s of weekSessions) {
    if (!sessionsByDay[s.day_of_week]) {
      sessionsByDay[s.day_of_week] = [];
    }
    sessionsByDay[s.day_of_week].push(s);
  }

  return (
    <div className="space-y-4">
      {/* Week Navigation */}
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="icon-sm"
          disabled={activeWeek <= 1}
          onClick={() => setActiveWeek((w) => Math.max(1, w - 1))}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        <Tabs
          value={String(activeWeek)}
          onValueChange={(val) => setActiveWeek(parseInt(val, 10))}
          className="flex-1"
        >
          <TabsList className="w-full">
            {visibleWeeks.map((w) => (
              <TabsTrigger key={w} value={String(w)} className="flex-1">
                <span className="hidden sm:inline">Week </span>
                {w}
                {w === currentWeek && (
                  <span className="ml-1 hidden text-[10px] sm:inline">
                    (current)
                  </span>
                )}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <Button
          variant="outline"
          size="icon-sm"
          disabled={activeWeek >= totalWeeks}
          onClick={() => setActiveWeek((w) => Math.min(totalWeeks, w + 1))}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Week Summary */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">
              Week {activeWeek} of {totalWeeks}
            </CardTitle>
            <div className="flex items-center gap-2">
              {totalDistanceKm > 0 && (
                <Badge variant="outline">
                  {totalDistanceKm.toFixed(1)} km
                </Badge>
              )}
              <Badge
                variant="secondary"
                className={cn(
                  progress === 100 &&
                    "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                )}
              >
                {progress}% done
              </Badge>
            </div>
          </div>
          <Progress value={progress} className="h-1.5" />
        </CardHeader>

        <CardContent>
          {weekSessions.length === 0 ? (
            <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
              No sessions scheduled for this week.
            </div>
          ) : (
            <div className="grid grid-cols-7 gap-2">
              {Array.from({ length: 7 }, (_, dayIndex) => {
                const daySessions = sessionsByDay[dayIndex] ?? [];
                return (
                  <div key={dayIndex} className="space-y-1.5">
                    <p className="text-center text-xs font-medium text-muted-foreground">
                      {DAY_NAMES[dayIndex]}
                    </p>
                    {daySessions.length > 0 ? (
                      daySessions.map((session) => (
                        <SessionCard key={session.id} session={session} />
                      ))
                    ) : (
                      <div className="flex h-16 items-center justify-center rounded-lg border border-dashed text-[10px] text-muted-foreground/50">
                        --
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Phase Indicator */}
      <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
        <span>
          {activeWeek <= Math.floor(totalWeeks * 0.3)
            ? "Base Phase"
            : activeWeek <= Math.floor(totalWeeks * 0.65)
              ? "Build Phase"
              : activeWeek <= Math.floor(totalWeeks * 0.85)
                ? "Peak Phase"
                : "Taper Phase"}
        </span>
        <span>|</span>
        <span>
          {weekSessions.filter((s) => s.session_type !== "rest").length} sessions
        </span>
      </div>
    </div>
  );
}
