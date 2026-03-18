"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import type { ActivityType } from "@/types/database";

interface ManualEntryFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

const ACTIVITY_TYPES: { value: ActivityType; label: string }[] = [
  { value: "run", label: "Run" },
  { value: "ride", label: "Ride" },
  { value: "hike", label: "Hike" },
  { value: "swim", label: "Swim" },
  { value: "weight_training", label: "Weight Training" },
  { value: "football", label: "Football" },
  { value: "yoga", label: "Yoga" },
  { value: "other", label: "Other" },
];

const DISTANCE_TYPES: ActivityType[] = ["run", "ride", "hike", "swim", "walk"];

function isDistanceBased(type: ActivityType): boolean {
  return DISTANCE_TYPES.includes(type);
}

export function ManualEntryForm({ onSuccess, onCancel }: ManualEntryFormProps) {
  const [activityType, setActivityType] = useState<ActivityType>("run");
  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState(
    new Date().toISOString().slice(0, 16)
  );
  const [distanceKm, setDistanceKm] = useState("");
  const [durationMinutes, setDurationMinutes] = useState("");
  const [avgHr, setAvgHr] = useState("");
  const [sportDetail, setSportDetail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const duration = parseInt(durationMinutes, 10);
    if (!durationMinutes || isNaN(duration) || duration <= 0) {
      setError("Duration is required");
      return;
    }

    setIsLoading(true);

    const payload: Record<string, unknown> = {
      name: name.trim() || `${ACTIVITY_TYPES.find((t) => t.value === activityType)?.label ?? activityType} - ${new Date(startDate).toLocaleDateString()}`,
      activity_type: activityType,
      start_date: new Date(startDate).toISOString(),
      moving_time_seconds: duration * 60,
    };

    if (isDistanceBased(activityType) && distanceKm) {
      const km = parseFloat(distanceKm);
      if (!isNaN(km) && km > 0) {
        payload.distance_meters = Math.round(km * 1000);
      }
    }

    if (avgHr) {
      const hr = parseInt(avgHr, 10);
      if (!isNaN(hr) && hr >= 30 && hr <= 250) {
        payload.average_heartrate = hr;
      }
    }

    if (!isDistanceBased(activityType) && sportDetail.trim()) {
      payload.sport_detail = sportDetail.trim();
    }

    try {
      const res = await fetch("/api/activities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create activity");
      }

      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Activity Type */}
      <div className="space-y-2">
        <Label>Activity Type</Label>
        <div className="grid grid-cols-4 gap-1">
          {ACTIVITY_TYPES.map((type) => (
            <button
              key={type.value}
              type="button"
              onClick={() => setActivityType(type.value)}
              className={cn(
                "flex h-8 items-center justify-center rounded-md border text-xs font-medium transition-all",
                activityType === type.value
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border hover:bg-muted"
              )}
            >
              {type.label}
            </button>
          ))}
        </div>
      </div>

      {/* Name */}
      <div className="space-y-2">
        <Label htmlFor="activity-name">Name (optional)</Label>
        <Input
          id="activity-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Morning Run"
        />
      </div>

      {/* Start Date */}
      <div className="space-y-2">
        <Label htmlFor="start-date">Date & Time</Label>
        <Input
          id="start-date"
          type="datetime-local"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
        />
      </div>

      {/* Distance (for distance-based activities) */}
      {isDistanceBased(activityType) && (
        <div className="space-y-2">
          <Label htmlFor="distance">Distance (km)</Label>
          <Input
            id="distance"
            type="number"
            min="0"
            step="0.01"
            value={distanceKm}
            onChange={(e) => setDistanceKm(e.target.value)}
            placeholder="e.g. 5.0"
          />
        </div>
      )}

      {/* Duration */}
      <div className="space-y-2">
        <Label htmlFor="duration">Duration (minutes)</Label>
        <Input
          id="duration"
          type="number"
          min="1"
          value={durationMinutes}
          onChange={(e) => setDurationMinutes(e.target.value)}
          placeholder="e.g. 30"
        />
      </div>

      {/* Average HR (for distance-based) */}
      {isDistanceBased(activityType) && (
        <div className="space-y-2">
          <Label htmlFor="avg-hr">Avg Heart Rate (optional)</Label>
          <Input
            id="avg-hr"
            type="number"
            min="30"
            max="250"
            value={avgHr}
            onChange={(e) => setAvgHr(e.target.value)}
            placeholder="e.g. 145"
            className="w-32"
          />
        </div>
      )}

      {/* Sport Detail (for non-distance) */}
      {!isDistanceBased(activityType) && (
        <div className="space-y-2">
          <Label htmlFor="sport-detail">Details (optional)</Label>
          <Textarea
            id="sport-detail"
            value={sportDetail}
            onChange={(e) => setSportDetail(e.target.value)}
            placeholder="Describe the session..."
            rows={3}
          />
        </div>
      )}

      {/* Error */}
      {error && <p className="text-sm text-destructive">{error}</p>}

      {/* Actions */}
      <div className="flex gap-2 pt-2">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={isLoading}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Add Activity
        </Button>
      </div>
    </form>
  );
}
