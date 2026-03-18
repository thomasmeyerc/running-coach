"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { GoalType, RaceType, GoalPriority } from "@/types/database";
import { Loader2 } from "lucide-react";

interface GoalFormProps {
  onSuccess?: () => void;
}

const RACE_TYPES: { value: RaceType; label: string }[] = [
  { value: "5k", label: "5K" },
  { value: "10k", label: "10K" },
  { value: "half_marathon", label: "Half Marathon" },
  { value: "marathon", label: "Marathon" },
  { value: "ultra", label: "Ultra" },
  { value: "custom", label: "Custom Distance" },
];

export function GoalForm({ onSuccess }: GoalFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [goalName, setGoalName] = useState("");
  const [goalType, setGoalType] = useState<GoalType>("race");
  const [raceType, setRaceType] = useState<RaceType>("half_marathon");
  const [raceDate, setRaceDate] = useState("");
  const [targetHours, setTargetHours] = useState("");
  const [targetMinutes, setTargetMinutes] = useState("");
  const [activityType, setActivityType] = useState("");
  const [frequencyPerWeek, setFrequencyPerWeek] = useState("");
  const [priority, setPriority] = useState<GoalPriority>("primary");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const payload: Record<string, unknown> = {
        goal_name: goalName.trim(),
        goal_type: goalType,
        priority,
      };

      if (goalType === "race") {
        payload.race_type = raceType;
        if (raceDate) payload.race_date = raceDate;
        const hours = parseInt(targetHours || "0", 10);
        const minutes = parseInt(targetMinutes || "0", 10);
        if (hours > 0 || minutes > 0) {
          payload.target_finish_time_seconds = hours * 3600 + minutes * 60;
        }
      }

      if (goalType === "cross_training") {
        if (activityType.trim()) payload.activity_type = activityType.trim();
        const freq = parseInt(frequencyPerWeek, 10);
        if (!isNaN(freq) && freq > 0) payload.frequency_per_week = freq;
      }

      const res = await fetch("/api/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create goal");
      }

      router.refresh();
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="goal_name">Goal Name</Label>
        <Input
          id="goal_name"
          value={goalName}
          onChange={(e) => setGoalName(e.target.value)}
          placeholder="e.g., Spring Half Marathon"
          required
          disabled={isSubmitting}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="goal_type">Goal Type</Label>
        <select
          id="goal_type"
          value={goalType}
          onChange={(e) => setGoalType(e.target.value as GoalType)}
          disabled={isSubmitting}
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          <option value="race">Race</option>
          <option value="cross_training">Cross Training</option>
          <option value="general_fitness">General Fitness</option>
        </select>
      </div>

      {goalType === "race" && (
        <>
          <div className="space-y-2">
            <Label htmlFor="race_type">Race Distance</Label>
            <select
              id="race_type"
              value={raceType}
              onChange={(e) => setRaceType(e.target.value as RaceType)}
              disabled={isSubmitting}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              {RACE_TYPES.map((rt) => (
                <option key={rt.value} value={rt.value}>
                  {rt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="race_date">Race Date</Label>
            <Input
              id="race_date"
              type="date"
              value={raceDate}
              onChange={(e) => setRaceDate(e.target.value)}
              disabled={isSubmitting}
            />
          </div>

          <div className="space-y-2">
            <Label>Target Finish Time</Label>
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <Input
                  type="number"
                  min="0"
                  max="24"
                  placeholder="Hours"
                  value={targetHours}
                  onChange={(e) => setTargetHours(e.target.value)}
                  disabled={isSubmitting}
                />
              </div>
              <span className="text-sm text-muted-foreground">h</span>
              <div className="flex-1">
                <Input
                  type="number"
                  min="0"
                  max="59"
                  placeholder="Minutes"
                  value={targetMinutes}
                  onChange={(e) => setTargetMinutes(e.target.value)}
                  disabled={isSubmitting}
                />
              </div>
              <span className="text-sm text-muted-foreground">min</span>
            </div>
          </div>
        </>
      )}

      {goalType === "cross_training" && (
        <>
          <div className="space-y-2">
            <Label htmlFor="activity_type">Activity Type</Label>
            <Input
              id="activity_type"
              value={activityType}
              onChange={(e) => setActivityType(e.target.value)}
              placeholder="e.g., Swimming, Yoga, Weight Training"
              disabled={isSubmitting}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="frequency_per_week">Sessions Per Week</Label>
            <Input
              id="frequency_per_week"
              type="number"
              min="1"
              max="14"
              value={frequencyPerWeek}
              onChange={(e) => setFrequencyPerWeek(e.target.value)}
              placeholder="e.g., 3"
              disabled={isSubmitting}
            />
          </div>
        </>
      )}

      <div className="space-y-2">
        <Label htmlFor="priority">Priority</Label>
        <select
          id="priority"
          value={priority}
          onChange={(e) => setPriority(e.target.value as GoalPriority)}
          disabled={isSubmitting}
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          <option value="primary">Primary</option>
          <option value="secondary">Secondary</option>
        </select>
      </div>

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Creating Goal...
          </>
        ) : (
          "Create Goal"
        )}
      </Button>
    </form>
  );
}
