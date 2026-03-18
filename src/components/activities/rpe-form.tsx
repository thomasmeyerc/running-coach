"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { RpeFeedback, Mood } from "@/types/database";
import { Loader2, Star, AlertTriangle } from "lucide-react";

interface RpeFormProps {
  activityId: string;
  existingRpe?: RpeFeedback;
  onSubmit?: () => void;
}

const RPE_LABELS: Record<number, string> = {
  1: "Rest",
  2: "Very Easy",
  3: "Easy",
  4: "Moderate",
  5: "Somewhat Hard",
  6: "Hard",
  7: "Very Hard",
  8: "Extremely Hard",
  9: "Near Max",
  10: "Max Effort",
};

function getRpeColor(score: number): string {
  if (score <= 3) return "bg-green-500";
  if (score <= 5) return "bg-yellow-500";
  if (score <= 7) return "bg-orange-500";
  return "bg-red-500";
}

const MOOD_OPTIONS: { value: Mood; label: string; emoji: string }[] = [
  { value: "great", label: "Great", emoji: "+" },
  { value: "good", label: "Good", emoji: "~" },
  { value: "neutral", label: "Neutral", emoji: "-" },
  { value: "tired", label: "Tired", emoji: "z" },
  { value: "terrible", label: "Terrible", emoji: "x" },
];

export function RpeForm({ activityId, existingRpe, onSubmit }: RpeFormProps) {
  const [rpeScore, setRpeScore] = useState(existingRpe?.rpe_score ?? 0);
  const [energyLevel, setEnergyLevel] = useState(existingRpe?.energy_level ?? 0);
  const [muscleSoreness, setMuscleSoreness] = useState(
    existingRpe?.muscle_soreness ?? 0
  );
  const [mood, setMood] = useState<Mood | null>(existingRpe?.mood ?? null);
  const [comment, setComment] = useState(existingRpe?.comment ?? "");
  const [sleepHours, setSleepHours] = useState<string>(
    existingRpe?.sleep_hours_prior?.toString() ?? ""
  );
  const [injuryFlag, setInjuryFlag] = useState(existingRpe?.injury_flag ?? false);
  const [injuryNotes, setInjuryNotes] = useState(
    existingRpe?.injury_notes ?? ""
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (rpeScore === 0) {
      setError("Please select an RPE score");
      return;
    }

    setIsLoading(true);
    setError(null);

    const method = existingRpe ? "PUT" : "POST";
    const payload: Record<string, unknown> = {
      rpe_score: rpeScore,
      injury_flag: injuryFlag,
    };

    if (energyLevel > 0) payload.energy_level = energyLevel;
    if (muscleSoreness > 0) payload.muscle_soreness = muscleSoreness;
    if (mood) payload.mood = mood;
    if (comment.trim()) payload.comment = comment.trim();
    if (sleepHours) payload.sleep_hours_prior = parseFloat(sleepHours);
    if (injuryFlag && injuryNotes.trim()) {
      payload.injury_notes = injuryNotes.trim();
    }

    try {
      const res = await fetch(`/api/runs/${activityId}/rpe`, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save RPE feedback");
      }

      onSubmit?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* RPE Score */}
      <div className="space-y-2">
        <Label>Rate of Perceived Exertion (RPE)</Label>
        <div className="grid grid-cols-10 gap-1">
          {Array.from({ length: 10 }, (_, i) => i + 1).map((score) => (
            <button
              key={score}
              type="button"
              onClick={() => setRpeScore(score)}
              className={cn(
                "flex h-10 items-center justify-center rounded-md border text-sm font-medium transition-all",
                rpeScore === score
                  ? cn(getRpeColor(score), "border-transparent text-white")
                  : "border-border hover:bg-muted"
              )}
            >
              {score}
            </button>
          ))}
        </div>
        {rpeScore > 0 && (
          <p className="text-xs text-muted-foreground">
            {rpeScore}/10 - {RPE_LABELS[rpeScore]}
          </p>
        )}
      </div>

      {/* Energy Level */}
      <div className="space-y-2">
        <Label>Energy Level</Label>
        <div className="flex gap-1">
          {Array.from({ length: 5 }, (_, i) => i + 1).map((level) => (
            <button
              key={level}
              type="button"
              onClick={() => setEnergyLevel(level)}
              className="p-1 transition-colors"
            >
              <Star
                className={cn(
                  "h-6 w-6",
                  level <= energyLevel
                    ? "fill-yellow-400 text-yellow-400"
                    : "text-muted-foreground/40"
                )}
              />
            </button>
          ))}
          {energyLevel > 0 && (
            <span className="ml-2 self-center text-xs text-muted-foreground">
              {energyLevel}/5
            </span>
          )}
        </div>
      </div>

      {/* Muscle Soreness */}
      <div className="space-y-2">
        <Label>Muscle Soreness</Label>
        <div className="flex gap-1">
          {Array.from({ length: 5 }, (_, i) => i + 1).map((level) => (
            <button
              key={level}
              type="button"
              onClick={() => setMuscleSoreness(level)}
              className={cn(
                "flex h-8 w-12 items-center justify-center rounded-md border text-sm font-medium transition-all",
                muscleSoreness === level
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border hover:bg-muted"
              )}
            >
              {level}
            </button>
          ))}
          {muscleSoreness > 0 && (
            <span className="ml-2 self-center text-xs text-muted-foreground">
              {muscleSoreness === 1
                ? "None"
                : muscleSoreness === 2
                  ? "Mild"
                  : muscleSoreness === 3
                    ? "Moderate"
                    : muscleSoreness === 4
                      ? "Significant"
                      : "Severe"}
            </span>
          )}
        </div>
      </div>

      {/* Mood */}
      <div className="space-y-2">
        <Label>Mood</Label>
        <div className="flex gap-1">
          {MOOD_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setMood(option.value)}
              className={cn(
                "flex h-8 flex-1 items-center justify-center rounded-md border text-xs font-medium transition-all",
                mood === option.value
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border hover:bg-muted"
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Comment */}
      <div className="space-y-2">
        <Label htmlFor="rpe-comment">Notes (optional)</Label>
        <Textarea
          id="rpe-comment"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="How did the session feel? Any observations..."
          rows={3}
        />
      </div>

      {/* Sleep Hours */}
      <div className="space-y-2">
        <Label htmlFor="sleep-hours">Sleep Hours (prior night)</Label>
        <Input
          id="sleep-hours"
          type="number"
          min="0"
          max="24"
          step="0.5"
          value={sleepHours}
          onChange={(e) => setSleepHours(e.target.value)}
          placeholder="e.g. 7.5"
          className="w-32"
        />
      </div>

      {/* Injury Flag */}
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setInjuryFlag(!injuryFlag)}
            className={cn(
              "flex h-8 items-center gap-2 rounded-md border px-3 text-sm font-medium transition-all",
              injuryFlag
                ? "border-destructive bg-destructive/10 text-destructive"
                : "border-border hover:bg-muted"
            )}
          >
            <AlertTriangle className="h-4 w-4" />
            {injuryFlag ? "Injury / Discomfort" : "Flag Injury?"}
          </button>
        </div>
        {injuryFlag && (
          <Textarea
            value={injuryNotes}
            onChange={(e) => setInjuryNotes(e.target.value)}
            placeholder="Describe the injury or discomfort..."
            rows={2}
          />
        )}
      </div>

      {/* Error */}
      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      {/* Submit */}
      <Button type="submit" disabled={isLoading || rpeScore === 0}>
        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {existingRpe ? "Update Feedback" : "Submit Feedback"}
      </Button>
    </form>
  );
}
