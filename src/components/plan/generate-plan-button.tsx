"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Loader2, Sparkles } from "lucide-react";

interface GeneratePlanButtonProps {
  goalId: string;
}

export function GeneratePlanButton({ goalId }: GeneratePlanButtonProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerate() {
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/coach/generate-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goal_id: goalId }),
      });

      if (!res.ok) {
        const data = await res.json();
        const msg = data.error || "Failed to generate plan";
        // Make Anthropic API errors user-friendly
        if (msg.includes("credit balance") || msg.includes("billing")) {
          throw new Error("AI service credits need to be topped up. Please check your Anthropic API billing.");
        }
        throw new Error(msg);
      }

      // Refresh the page to show the new plan
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <Button onClick={handleGenerate} disabled={isLoading} size="lg">
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Generating Plan...
          </>
        ) : (
          <>
            <Sparkles className="mr-2 h-4 w-4" />
            Generate Training Plan
          </>
        )}
      </Button>
      {isLoading && (
        <p className="text-xs text-muted-foreground">
          This may take 15-30 seconds as AI designs your plan...
        </p>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
