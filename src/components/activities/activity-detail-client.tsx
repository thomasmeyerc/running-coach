"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { RpeForm } from "@/components/activities/rpe-form";
import type { RpeFeedback, Mood } from "@/types/database";
import { Loader2, Brain, Star } from "lucide-react";

interface ActivityDetailClientProps {
  activityId: string;
  existingRpe: RpeFeedback | null;
  hasAnalysis: boolean;
  isRun: boolean;
}

const MOOD_LABELS: Record<Mood, string> = {
  great: "Great",
  good: "Good",
  neutral: "Neutral",
  tired: "Tired",
  terrible: "Terrible",
};

export function ActivityDetailClient({
  activityId,
  existingRpe,
  hasAnalysis,
  isRun,
}: ActivityDetailClientProps) {
  const router = useRouter();
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);

  async function handleAnalyze() {
    setAnalyzing(true);
    setAnalyzeError(null);

    try {
      const res = await fetch("/api/coach/analyze-run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activity_id: activityId }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Analysis failed");
      }

      router.refresh();
    } catch (err) {
      setAnalyzeError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setAnalyzing(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Analyze Button */}
      {isRun && (
        <div className="flex items-center gap-3">
          <Button
            onClick={handleAnalyze}
            disabled={analyzing}
            variant={hasAnalysis ? "outline" : "default"}
          >
            {analyzing ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Brain className="mr-2 h-4 w-4" />
            )}
            {hasAnalysis ? "Re-analyze with AI" : "Analyze with AI"}
          </Button>
          {analyzeError && (
            <p className="text-sm text-destructive">{analyzeError}</p>
          )}
        </div>
      )}

      {/* RPE Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            How Did It Feel?
          </CardTitle>
        </CardHeader>
        <CardContent>
          {existingRpe ? (
            <RpeDisplay rpe={existingRpe} />
          ) : (
            <RpeForm
              activityId={activityId}
              onSubmit={() => router.refresh()}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function RpeDisplay({ rpe }: { rpe: RpeFeedback }) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="space-y-0.5">
          <p className="text-xs text-muted-foreground">RPE Score</p>
          <p className="text-lg font-semibold">{rpe.rpe_score}/10</p>
        </div>
        {rpe.energy_level && (
          <div className="space-y-0.5">
            <p className="text-xs text-muted-foreground">Energy</p>
            <div className="flex">
              {Array.from({ length: 5 }, (_, i) => (
                <Star
                  key={i}
                  className={`h-4 w-4 ${
                    i < rpe.energy_level!
                      ? "fill-yellow-400 text-yellow-400"
                      : "text-muted-foreground/30"
                  }`}
                />
              ))}
            </div>
          </div>
        )}
        {rpe.muscle_soreness && (
          <div className="space-y-0.5">
            <p className="text-xs text-muted-foreground">Soreness</p>
            <p className="text-lg font-semibold">{rpe.muscle_soreness}/5</p>
          </div>
        )}
        {rpe.mood && (
          <div className="space-y-0.5">
            <p className="text-xs text-muted-foreground">Mood</p>
            <Badge variant="secondary">{MOOD_LABELS[rpe.mood]}</Badge>
          </div>
        )}
      </div>

      {rpe.sleep_hours_prior != null && (
        <>
          <Separator />
          <p className="text-sm text-muted-foreground">
            Sleep: {rpe.sleep_hours_prior} hours
          </p>
        </>
      )}

      {rpe.comment && (
        <>
          <Separator />
          <p className="text-sm">{rpe.comment}</p>
        </>
      )}

      {rpe.injury_flag && (
        <>
          <Separator />
          <div className="rounded-md bg-destructive/10 p-3">
            <p className="text-sm font-medium text-destructive">
              Injury / Discomfort Reported
            </p>
            {rpe.injury_notes && (
              <p className="mt-1 text-sm text-destructive/80">
                {rpe.injury_notes}
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
