"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import type { PlannedSession } from "@/types/database";
import {
  CheckCircle2,
  Dumbbell,
  Footprints,
  Timer,
  Gauge,
} from "lucide-react";

interface SessionCardProps {
  session: PlannedSession;
}

const SESSION_TYPE_COLORS: Record<string, string> = {
  easy: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  recovery: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  tempo: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
  interval: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  hill_repeats: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  long_run: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  fartlek: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  race_pace: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  rest: "bg-gray-100 text-gray-600 dark:bg-gray-800/30 dark:text-gray-400",
  cross_train: "bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-400",
};

const SESSION_BORDER_COLORS: Record<string, string> = {
  easy: "border-green-300 dark:border-green-700",
  recovery: "border-green-300 dark:border-green-700",
  tempo: "border-orange-300 dark:border-orange-700",
  interval: "border-red-300 dark:border-red-700",
  hill_repeats: "border-red-300 dark:border-red-700",
  long_run: "border-blue-300 dark:border-blue-700",
  fartlek: "border-amber-300 dark:border-amber-700",
  race_pace: "border-purple-300 dark:border-purple-700",
  rest: "border-gray-200 dark:border-gray-700",
  cross_train: "border-violet-300 dark:border-violet-700",
};

function formatPace(secondsPerKm: number): string {
  const m = Math.floor(secondsPerKm / 60);
  const s = Math.floor(secondsPerKm % 60);
  return `${m}:${String(s).padStart(2, "0")}/km`;
}

function formatDistance(meters: number): string {
  return `${(meters / 1000).toFixed(1)} km`;
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m} min`;
}

function ActivityIcon({ type }: { type: string }) {
  switch (type) {
    case "run":
      return <Footprints className="h-3.5 w-3.5" />;
    case "weight_training":
    case "cross_train":
      return <Dumbbell className="h-3.5 w-3.5" />;
    default:
      return <Timer className="h-3.5 w-3.5" />;
  }
}

export function SessionCard({ session }: SessionCardProps) {
  const [open, setOpen] = useState(false);
  const borderColor = SESSION_BORDER_COLORS[session.session_type] ?? "";
  const typeColor =
    SESSION_TYPE_COLORS[session.session_type] ?? SESSION_TYPE_COLORS.rest;

  const isRest = session.session_type === "rest";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        className={cn(
          "relative w-full cursor-pointer rounded-lg border p-2.5 text-left transition-all hover:shadow-sm",
          borderColor,
          session.is_completed && "border-green-500 dark:border-green-600"
        )}
      >
        {session.is_completed && (
          <CheckCircle2 className="absolute right-1.5 top-1.5 h-4 w-4 text-green-600 dark:text-green-400" />
        )}

        <div className="space-y-1.5">
          <div className="flex items-start gap-1.5">
            <ActivityIcon type={session.activity_type} />
            <p
              className={cn(
                "text-xs font-medium leading-tight",
                isRest && "text-muted-foreground"
              )}
            >
              {session.title}
            </p>
          </div>

          <div className="flex flex-wrap gap-1">
            <Badge
              variant="secondary"
              className={cn("text-[10px] px-1.5 py-0", typeColor)}
            >
              {session.session_type.replace("_", " ")}
            </Badge>
          </div>

          {!isRest && (
            <div className="flex gap-2 text-[10px] text-muted-foreground">
              {session.target_distance_meters && (
                <span>{formatDistance(session.target_distance_meters)}</span>
              )}
              {session.target_pace_seconds_per_km && (
                <span>{formatPace(session.target_pace_seconds_per_km)}</span>
              )}
            </div>
          )}
        </div>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{session.title}</DialogTitle>
          <DialogDescription>
            {new Date(session.scheduled_date).toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Type and Status */}
          <div className="flex items-center gap-2">
            <Badge
              variant="secondary"
              className={cn("text-xs", typeColor)}
            >
              {session.session_type.replace("_", " ")}
            </Badge>
            {session.is_completed && (
              <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                Completed
              </Badge>
            )}
          </div>

          {/* Targets */}
          {!isRest && (
            <div className="grid grid-cols-2 gap-3">
              {session.target_distance_meters && (
                <div className="space-y-0.5">
                  <p className="text-xs text-muted-foreground">Distance</p>
                  <p className="text-sm font-medium">
                    {formatDistance(session.target_distance_meters)}
                  </p>
                </div>
              )}
              {session.target_duration_seconds && (
                <div className="space-y-0.5">
                  <p className="text-xs text-muted-foreground">Duration</p>
                  <p className="text-sm font-medium">
                    {formatDuration(session.target_duration_seconds)}
                  </p>
                </div>
              )}
              {session.target_pace_seconds_per_km && (
                <div className="space-y-0.5">
                  <p className="text-xs text-muted-foreground">Target Pace</p>
                  <div className="flex items-center gap-1">
                    <Gauge className="h-3.5 w-3.5 text-muted-foreground" />
                    <p className="text-sm font-medium">
                      {formatPace(session.target_pace_seconds_per_km)}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Description */}
          {session.description && (
            <>
              <Separator />
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">
                  Description
                </p>
                <p className="text-sm">{session.description}</p>
              </div>
            </>
          )}

          {/* Warmup / Cooldown */}
          {(session.warmup_description || session.cooldown_description) && (
            <>
              <Separator />
              <div className="grid grid-cols-1 gap-3">
                {session.warmup_description && (
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">
                      Warmup
                    </p>
                    <p className="text-sm">{session.warmup_description}</p>
                  </div>
                )}
                {session.cooldown_description && (
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">
                      Cooldown
                    </p>
                    <p className="text-sm">{session.cooldown_description}</p>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Intervals */}
          {session.intervals && session.intervals.length > 0 && (
            <>
              <Separator />
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">
                  Intervals
                </p>
                <div className="space-y-1.5">
                  {session.intervals.map((interval, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between rounded-md bg-muted/50 px-3 py-1.5 text-sm"
                    >
                      <span>
                        {interval.reps} x {interval.distance_meters}m
                      </span>
                      <span className="text-muted-foreground">
                        {formatPace(interval.pace_seconds_per_km)} |{" "}
                        {interval.rest_seconds}s rest
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Cross Training Details */}
          {session.cross_training_details && (
            <>
              <Separator />
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">
                  Cross Training Details
                </p>
                {session.cross_training_details.intensity_level && (
                  <p className="text-sm">
                    Intensity: {session.cross_training_details.intensity_level}
                  </p>
                )}
                {session.cross_training_details.muscle_groups &&
                  session.cross_training_details.muscle_groups.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {session.cross_training_details.muscle_groups.map(
                        (group) => (
                          <Badge key={group} variant="outline" className="text-xs">
                            {group}
                          </Badge>
                        )
                      )}
                    </div>
                  )}
                {session.cross_training_details.exercises &&
                  session.cross_training_details.exercises.length > 0 && (
                    <div className="space-y-1">
                      {session.cross_training_details.exercises.map(
                        (exercise, idx) => (
                          <p key={idx} className="text-sm">
                            {exercise.name}: {exercise.sets}x{exercise.reps}
                            {exercise.weight_kg
                              ? ` @ ${exercise.weight_kg}kg`
                              : ""}
                          </p>
                        )
                      )}
                    </div>
                  )}
                {session.cross_training_details.notes && (
                  <p className="text-sm text-muted-foreground">
                    {session.cross_training_details.notes}
                  </p>
                )}
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
