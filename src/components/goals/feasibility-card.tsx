"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import type { FeasibilityResult } from "@/types/database";
import {
  CheckCircle,
  XCircle,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Lightbulb,
  Clock,
} from "lucide-react";

interface FeasibilityCardProps {
  assessment: FeasibilityResult;
}

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}`;
  }
  return `${m} min`;
}

export function FeasibilityCard({ assessment }: FeasibilityCardProps) {
  const [expanded, setExpanded] = useState(false);
  const confidencePercent = Math.round(assessment.confidence * 100);

  return (
    <div className="rounded-lg border bg-card p-3 text-card-foreground">
      {/* Summary row - always visible */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between gap-2 text-left"
      >
        <div className="flex items-center gap-2">
          {assessment.feasible ? (
            <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400">
              <CheckCircle className="mr-1 h-3 w-3" />
              Feasible
            </Badge>
          ) : (
            <Badge variant="destructive">
              <XCircle className="mr-1 h-3 w-3" />
              Not Feasible
            </Badge>
          )}
          <span className="text-xs text-muted-foreground">
            {confidencePercent}% confidence
          </span>
        </div>
        {expanded ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </button>

      {/* Expanded details */}
      {expanded && (
        <div className="mt-3 space-y-3">
          <Separator />

          {/* Reasoning */}
          <div>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {assessment.reasoning}
            </p>
          </div>

          {/* Suggested target time */}
          {assessment.suggested_target_time_seconds != null && (
            <>
              <Separator />
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-blue-500" />
                <span className="font-medium">Suggested target:</span>
                <span>{formatTime(assessment.suggested_target_time_seconds)}</span>
              </div>
            </>
          )}

          {/* Risks */}
          {assessment.risks.length > 0 && (
            <>
              <Separator />
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-sm font-medium">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  Risks
                </div>
                <ul className="space-y-1 pl-6">
                  {assessment.risks.map((risk, i) => (
                    <li
                      key={i}
                      className="list-disc text-sm text-muted-foreground"
                    >
                      {risk}
                    </li>
                  ))}
                </ul>
              </div>
            </>
          )}

          {/* Recommendations */}
          {assessment.recommendations.length > 0 && (
            <>
              <Separator />
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-sm font-medium">
                  <Lightbulb className="h-4 w-4 text-blue-500" />
                  Recommendations
                </div>
                <ul className="space-y-1 pl-6">
                  {assessment.recommendations.map((rec, i) => (
                    <li
                      key={i}
                      className="list-disc text-sm text-muted-foreground"
                    >
                      {rec}
                    </li>
                  ))}
                </ul>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
