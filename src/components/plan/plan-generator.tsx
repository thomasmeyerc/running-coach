"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import type { Goal, UserProfile } from "@/types/database";
import {
  ArrowLeft,
  ArrowRight,
  Calendar,
  Check,
  Dumbbell,
  Flame,
  Mountain,
  Sparkles,
  Sun,
  Target,
  Timer,
  Trophy,
  Zap,
} from "lucide-react";

interface PlanGeneratorProps {
  goals: Goal[];
  profile: UserProfile;
  hasExistingPlan: boolean;
  existingPlanName: string | null;
}

const TOTAL_STEPS = 4;

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// Thinking messages — mix of serious coaching + fun/motivational
const THINKING_MESSAGES = [
  { text: "Analyzing your running history", icon: "chart" },
  { text: "Calculating your training zones", icon: "heart" },
  { text: "Designing your base phase", icon: "layers" },
  { text: "Creating interval sessions", icon: "zap" },
  { text: "Planning your long runs", icon: "road" },
  { text: "Scheduling recovery days", icon: "sleep" },
  { text: "Envisioning your new PR", icon: "trophy" },
  { text: "Balancing intensity and volume", icon: "scale" },
  { text: "Sprinkling in some hill repeats", icon: "mountain" },
  { text: "Making sure you'll still enjoy Sundays", icon: "sun" },
  { text: "Optimizing your taper week", icon: "target" },
  { text: "Adding tempo magic", icon: "sparkle" },
  { text: "Factoring in your experience", icon: "brain" },
  { text: "Designing progression runs", icon: "trending" },
  { text: "Accounting for rest and adaptation", icon: "moon" },
  { text: "Checking the sports science", icon: "book" },
  { text: "Setting your easy run paces", icon: "snail" },
  { text: "Calculating race pace targets", icon: "timer" },
  { text: "Mapping out your build phase", icon: "rocket" },
  { text: "Imagining you crossing the finish line", icon: "flag" },
  { text: "Adding fartlek because it's fun to say", icon: "zap" },
  { text: "Protecting your knees", icon: "shield" },
  { text: "Including dynamic warmups", icon: "flame" },
  { text: "Planning your cooldown stretches", icon: "wind" },
  { text: "Reviewing periodization principles", icon: "cycle" },
  { text: "Ensuring progressive overload", icon: "trending" },
  { text: "Picking the perfect peak week", icon: "peak" },
  { text: "Almost there... final touches", icon: "paintbrush" },
];

export function PlanGenerator({
  goals,
  profile,
  hasExistingPlan,
  existingPlanName,
}: PlanGeneratorProps) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Step 1: Goal selection
  const [selectedGoalId, setSelectedGoalId] = useState(
    goals.find((g) => g.priority === "primary")?.id ?? goals[0]?.id ?? ""
  );

  // Step 2: Training preferences
  const [longRunDay, setLongRunDay] = useState(5); // Saturday
  const [intensityPref, setIntensityPref] = useState<"conservative" | "moderate" | "aggressive">("moderate");
  const [crossTraining, setCrossTraining] = useState(true);
  const [crossTypes, setCrossTypes] = useState<string[]>(["weight_training"]);

  // Step 3: Schedule
  const [trainingDays, setTrainingDays] = useState<number[]>(
    profile.preferred_run_days?.length
      ? profile.preferred_run_days
      : [0, 1, 3, 5] // Mon, Tue, Thu, Sat
  );
  const [maxSessionMinutes, setMaxSessionMinutes] = useState(90);

  // Step 4: Generation
  const [isGenerating, setIsGenerating] = useState(false);
  const [thinkingIndex, setThinkingIndex] = useState(0);
  const [generationComplete, setGenerationComplete] = useState(false);
  const [generatedPlanName, setGeneratedPlanName] = useState("");
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Cycle through thinking messages
  useEffect(() => {
    if (isGenerating) {
      intervalRef.current = setInterval(() => {
        setThinkingIndex((prev) => (prev + 1) % THINKING_MESSAGES.length);
      }, 2200);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isGenerating]);

  const selectedGoal = goals.find((g) => g.id === selectedGoalId);

  function toggleDay(day: number) {
    setTrainingDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort()
    );
  }

  function toggleCrossType(type: string) {
    setCrossTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  }

  const canProceed = (() => {
    switch (step) {
      case 0: return !!selectedGoalId;
      case 1: return true;
      case 2: return trainingDays.length >= 2;
      case 3: return generationComplete;
      default: return false;
    }
  })();

  function handleNext() {
    if (step < TOTAL_STEPS - 1) {
      if (step === 2) {
        // Moving to generation step — start generating
        setStep(3);
        startGeneration();
      } else {
        setStep(step + 1);
      }
    }
  }

  function handleBack() {
    if (step > 0 && !isGenerating) setStep(step - 1);
  }

  async function startGeneration() {
    setIsGenerating(true);
    setError(null);
    setThinkingIndex(0);

    try {
      const res = await fetch("/api/coach/generate-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          goal_id: selectedGoalId,
          preferences: {
            preferred_long_run_day: longRunDay,
            intensity_preference: intensityPref,
            include_cross_training: crossTraining,
            cross_training_types: crossTraining ? crossTypes : [],
            training_days: trainingDays,
            max_session_duration_minutes: maxSessionMinutes,
          },
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        const msg = data.error || "Failed to generate plan";
        if (msg.includes("credit balance") || msg.includes("billing")) {
          throw new Error("AI service credits need to be topped up. Please check your Anthropic API billing.");
        }
        throw new Error(msg);
      }

      const data = await res.json();
      setGeneratedPlanName(data.plan?.plan_name ?? "Your Training Plan");
      setGenerationComplete(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsGenerating(false);
    }
  }

  const progressPercent = generationComplete
    ? 100
    : ((step + 1) / TOTAL_STEPS) * 100;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          {step === 3 && isGenerating
            ? "Building Your Plan"
            : step === 3 && generationComplete
              ? "Plan Ready!"
              : "Create Training Plan"}
        </h1>
        <p className="text-muted-foreground">
          {step === 3
            ? isGenerating
              ? "Your AI coach is designing a personalized plan..."
              : generationComplete
                ? "Your training plan has been created."
                : ""
            : `Step ${step + 1} of ${TOTAL_STEPS - 1}`}
        </p>
      </div>

      {/* Progress */}
      <Progress value={progressPercent} className="h-2" />

      {/* Step Content */}
      <Card>
        <CardContent className="pt-6">
          {step === 0 && (
            <StepGoalSelection
              goals={goals}
              selectedGoalId={selectedGoalId}
              onSelect={setSelectedGoalId}
              hasExistingPlan={hasExistingPlan}
              existingPlanName={existingPlanName}
            />
          )}

          {step === 1 && (
            <StepTrainingPreferences
              longRunDay={longRunDay}
              onLongRunDayChange={setLongRunDay}
              intensityPref={intensityPref}
              onIntensityChange={setIntensityPref}
              crossTraining={crossTraining}
              onCrossTrainingChange={setCrossTraining}
              crossTypes={crossTypes}
              onToggleCrossType={toggleCrossType}
            />
          )}

          {step === 2 && (
            <StepSchedule
              trainingDays={trainingDays}
              onToggleDay={toggleDay}
              maxSessionMinutes={maxSessionMinutes}
              onMaxSessionChange={setMaxSessionMinutes}
              selectedGoal={selectedGoal}
            />
          )}

          {step === 3 && (
            <StepGeneration
              isGenerating={isGenerating}
              complete={generationComplete}
              thinkingIndex={thinkingIndex}
              planName={generatedPlanName}
              error={error}
              onRetry={() => startGeneration()}
            />
          )}
        </CardContent>
      </Card>

      {/* Navigation Buttons */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={step === 0 ? () => router.push("/plan") : handleBack}
          disabled={isGenerating}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          {step === 0 ? "Back to Plan" : "Back"}
        </Button>

        {step < 3 ? (
          <Button onClick={handleNext} disabled={!canProceed}>
            {step === 2 ? (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Generate Plan
              </>
            ) : (
              <>
                Next
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        ) : generationComplete ? (
          <Button onClick={() => router.push("/plan")}>
            <Check className="mr-2 h-4 w-4" />
            View My Plan
          </Button>
        ) : null}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Step 1: Goal Selection
// ────────────────────────────────────────────────────────────
function StepGoalSelection({
  goals,
  selectedGoalId,
  onSelect,
  hasExistingPlan,
  existingPlanName,
}: {
  goals: Goal[];
  selectedGoalId: string;
  onSelect: (id: string) => void;
  hasExistingPlan: boolean;
  existingPlanName: string | null;
}) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Which goal is this plan for?</h2>
        <p className="text-sm text-muted-foreground">
          Select the primary goal your training plan will be built around.
        </p>
      </div>

      {hasExistingPlan && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-sm">
          <p className="font-medium text-amber-700 dark:text-amber-400">
            You already have an active plan{existingPlanName ? `: "${existingPlanName}"` : ""}
          </p>
          <p className="mt-0.5 text-muted-foreground">
            Generating a new plan will replace it.
          </p>
        </div>
      )}

      <div className="space-y-2">
        {goals.map((goal) => {
          const isSelected = goal.id === selectedGoalId;
          const daysAway = goal.race_date
            ? Math.ceil((new Date(goal.race_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
            : null;

          return (
            <button
              key={goal.id}
              onClick={() => onSelect(goal.id)}
              className={`w-full rounded-lg border-2 p-4 text-left transition-all ${
                isSelected
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/40"
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Target className="h-4 w-4 text-primary" />
                    <span className="font-medium">{goal.goal_name}</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {goal.race_type && (
                      <Badge variant="outline" className="text-xs">
                        {goal.race_type.replace("_", " ").toUpperCase()}
                      </Badge>
                    )}
                    {goal.race_date && (
                      <Badge variant="secondary" className="text-xs">
                        <Calendar className="mr-1 h-3 w-3" />
                        {new Date(goal.race_date).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                        {daysAway != null && daysAway > 0 && ` (${daysAway}d)`}
                      </Badge>
                    )}
                    {goal.target_finish_time_seconds && (
                      <Badge variant="secondary" className="text-xs">
                        <Timer className="mr-1 h-3 w-3" />
                        {formatTime(goal.target_finish_time_seconds)}
                      </Badge>
                    )}
                  </div>
                </div>
                <div
                  className={`h-5 w-5 rounded-full border-2 transition-colors ${
                    isSelected
                      ? "border-primary bg-primary"
                      : "border-muted-foreground/30"
                  }`}
                >
                  {isSelected && <Check className="h-full w-full p-0.5 text-primary-foreground" />}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Step 2: Training Preferences
// ────────────────────────────────────────────────────────────
function StepTrainingPreferences({
  longRunDay,
  onLongRunDayChange,
  intensityPref,
  onIntensityChange,
  crossTraining,
  onCrossTrainingChange,
  crossTypes,
  onToggleCrossType,
}: {
  longRunDay: number;
  onLongRunDayChange: (d: number) => void;
  intensityPref: "conservative" | "moderate" | "aggressive";
  onIntensityChange: (v: "conservative" | "moderate" | "aggressive") => void;
  crossTraining: boolean;
  onCrossTrainingChange: (v: boolean) => void;
  crossTypes: string[];
  onToggleCrossType: (t: string) => void;
}) {
  const INTENSITY_OPTIONS = [
    {
      value: "conservative" as const,
      label: "Conservative",
      desc: "Slower progression, more recovery. Great for injury-prone runners.",
      icon: <Sun className="h-5 w-5" />,
    },
    {
      value: "moderate" as const,
      label: "Moderate",
      desc: "Balanced approach with steady progression. Recommended for most.",
      icon: <Flame className="h-5 w-5" />,
    },
    {
      value: "aggressive" as const,
      label: "Aggressive",
      desc: "Faster progression, higher intensity. For experienced runners.",
      icon: <Zap className="h-5 w-5" />,
    },
  ];

  const CROSS_TYPES = [
    { value: "weight_training", label: "Strength Training", icon: <Dumbbell className="h-4 w-4" /> },
    { value: "yoga", label: "Yoga / Mobility", icon: <Sun className="h-4 w-4" /> },
    { value: "cycling", label: "Cycling", icon: <Zap className="h-4 w-4" /> },
    { value: "swimming", label: "Swimming", icon: <Mountain className="h-4 w-4" /> },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Training Preferences</h2>
        <p className="text-sm text-muted-foreground">
          Help us tailor your plan to how you like to train.
        </p>
      </div>

      {/* Long Run Day */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Preferred long run day</label>
        <div className="flex gap-1.5">
          {DAY_NAMES.map((name, i) => (
            <button
              key={i}
              onClick={() => onLongRunDayChange(i)}
              className={`flex-1 rounded-md border py-2 text-xs font-medium transition-colors ${
                longRunDay === i
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border hover:border-primary/50"
              }`}
            >
              {name}
            </button>
          ))}
        </div>
      </div>

      {/* Intensity */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Training intensity approach</label>
        <div className="space-y-2">
          {INTENSITY_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => onIntensityChange(opt.value)}
              className={`flex w-full items-center gap-3 rounded-lg border-2 p-3 text-left transition-all ${
                intensityPref === opt.value
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/40"
              }`}
            >
              <div className={intensityPref === opt.value ? "text-primary" : "text-muted-foreground"}>
                {opt.icon}
              </div>
              <div>
                <div className="text-sm font-medium">{opt.label}</div>
                <div className="text-xs text-muted-foreground">{opt.desc}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Cross Training */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium">Include cross-training?</label>
          <button
            onClick={() => onCrossTrainingChange(!crossTraining)}
            className={`relative h-6 w-11 rounded-full transition-colors ${
              crossTraining ? "bg-primary" : "bg-muted"
            }`}
          >
            <span
              className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                crossTraining ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>

        {crossTraining && (
          <div className="flex flex-wrap gap-2">
            {CROSS_TYPES.map((ct) => (
              <button
                key={ct.value}
                onClick={() => onToggleCrossType(ct.value)}
                className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                  crossTypes.includes(ct.value)
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:border-primary/50"
                }`}
              >
                {ct.icon}
                {ct.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Step 3: Schedule
// ────────────────────────────────────────────────────────────
function StepSchedule({
  trainingDays,
  onToggleDay,
  maxSessionMinutes,
  onMaxSessionChange,
  selectedGoal,
}: {
  trainingDays: number[];
  onToggleDay: (d: number) => void;
  maxSessionMinutes: number;
  onMaxSessionChange: (v: number) => void;
  selectedGoal: Goal | undefined;
}) {
  const weeksAvailable = selectedGoal?.race_date
    ? Math.max(
        4,
        Math.floor(
          (new Date(selectedGoal.race_date).getTime() - Date.now()) /
            (1000 * 60 * 60 * 24 * 7)
        )
      )
    : 12;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Your Schedule</h2>
        <p className="text-sm text-muted-foreground">
          Pick the days you can train and your time constraints.
        </p>
      </div>

      {/* Training Days */}
      <div className="space-y-2">
        <label className="text-sm font-medium">
          Which days can you train? <span className="text-muted-foreground">(select at least 2)</span>
        </label>
        <div className="grid grid-cols-7 gap-2">
          {DAY_NAMES.map((name, i) => (
            <button
              key={i}
              onClick={() => onToggleDay(i)}
              className={`flex flex-col items-center gap-1 rounded-lg border-2 py-3 text-xs font-medium transition-all ${
                trainingDays.includes(i)
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:border-primary/40"
              }`}
            >
              {name}
              {trainingDays.includes(i) && <Check className="h-3 w-3" />}
            </button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          {trainingDays.length} days selected — rest days will be automatically scheduled.
        </p>
      </div>

      {/* Max Session Length */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Max session duration (weekday)</label>
        <div className="flex gap-2">
          {[45, 60, 75, 90, 120].map((mins) => (
            <button
              key={mins}
              onClick={() => onMaxSessionChange(mins)}
              className={`flex-1 rounded-md border py-2 text-xs font-medium transition-colors ${
                maxSessionMinutes === mins
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border hover:border-primary/50"
              }`}
            >
              {mins}m
            </button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          Weekend long runs may exceed this. This is for weekday sessions.
        </p>
      </div>

      {/* Plan Summary */}
      <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
        <h3 className="text-sm font-semibold">Plan Summary</h3>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <span className="text-muted-foreground">Duration:</span>{" "}
            <span className="font-medium">{weeksAvailable} weeks</span>
          </div>
          <div>
            <span className="text-muted-foreground">Training days:</span>{" "}
            <span className="font-medium">{trainingDays.length}/week</span>
          </div>
          {selectedGoal?.race_date && (
            <div>
              <span className="text-muted-foreground">Race day:</span>{" "}
              <span className="font-medium">
                {new Date(selectedGoal.race_date).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })}
              </span>
            </div>
          )}
          <div>
            <span className="text-muted-foreground">Max session:</span>{" "}
            <span className="font-medium">{maxSessionMinutes} min</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Step 4: Generation (animated thinking)
// ────────────────────────────────────────────────────────────
function StepGeneration({
  isGenerating,
  complete,
  thinkingIndex,
  planName,
  error,
  onRetry,
}: {
  isGenerating: boolean;
  complete: boolean;
  thinkingIndex: number;
  planName: string;
  error: string | null;
  onRetry: () => void;
}) {
  const [dots, setDots] = useState("");

  useEffect(() => {
    if (!isGenerating) return;
    const interval = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? "" : prev + "."));
    }, 500);
    return () => clearInterval(interval);
  }, [isGenerating]);

  // Progress bar simulation (not real progress, just visual)
  const [fakeProgress, setFakeProgress] = useState(0);
  useEffect(() => {
    if (!isGenerating) {
      if (complete) setFakeProgress(100);
      return;
    }
    setFakeProgress(0);
    const interval = setInterval(() => {
      setFakeProgress((prev) => {
        if (prev >= 92) return prev; // Hold at ~92% until actually done
        return prev + Math.random() * 3;
      });
    }, 800);
    return () => clearInterval(interval);
  }, [isGenerating, complete]);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="mb-4 rounded-full bg-destructive/10 p-4">
          <Zap className="h-8 w-8 text-destructive" />
        </div>
        <h2 className="text-lg font-semibold">Generation Failed</h2>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">{error}</p>
        <Button onClick={onRetry} className="mt-4">
          Try Again
        </Button>
      </div>
    );
  }

  if (complete) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="relative mb-6">
          <div className="rounded-full bg-emerald-500/10 p-6">
            <Trophy className="h-12 w-12 text-emerald-500" />
          </div>
          <div className="absolute -right-1 -top-1 rounded-full bg-emerald-500 p-1.5">
            <Check className="h-4 w-4 text-white" />
          </div>
        </div>
        <h2 className="text-xl font-bold">Plan Created!</h2>
        <p className="mt-1 text-lg font-medium text-primary">{planName}</p>
        <p className="mt-2 max-w-sm text-sm text-muted-foreground">
          Your personalized training plan is ready. View it to see your weekly
          schedule, sessions, and pacing targets.
        </p>
        <Progress value={100} className="mx-auto mt-6 h-2 max-w-xs" />
      </div>
    );
  }

  // Generating state
  const currentMessage = THINKING_MESSAGES[thinkingIndex];

  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      {/* Animated runner pulse */}
      <div className="relative mb-8">
        <div className="animate-pulse rounded-full bg-primary/10 p-6">
          <Sparkles className="h-12 w-12 text-primary" />
        </div>
        {/* Orbiting dots */}
        <div className="absolute inset-0 animate-spin" style={{ animationDuration: "3s" }}>
          <div className="absolute left-1/2 top-0 h-2 w-2 -translate-x-1/2 rounded-full bg-primary/60" />
        </div>
        <div className="absolute inset-0 animate-spin" style={{ animationDuration: "3s", animationDelay: "1s" }}>
          <div className="absolute bottom-0 left-1/2 h-2 w-2 -translate-x-1/2 rounded-full bg-primary/40" />
        </div>
        <div className="absolute inset-0 animate-spin" style={{ animationDuration: "3s", animationDelay: "2s" }}>
          <div className="absolute left-0 top-1/2 h-2 w-2 -translate-y-1/2 rounded-full bg-primary/20" />
        </div>
      </div>

      {/* Thinking message */}
      <div className="h-14">
        <p className="text-lg font-semibold text-foreground transition-opacity duration-500">
          {currentMessage.text}{dots}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          This usually takes 15-30 seconds
        </p>
      </div>

      {/* Progress bar */}
      <div className="mt-6 w-full max-w-xs">
        <Progress value={fakeProgress} className="h-2" />
        <div className="mt-2 flex justify-between text-xs text-muted-foreground">
          <span>Crafting your plan</span>
          <span>{Math.round(fakeProgress)}%</span>
        </div>
      </div>

      {/* Recently completed steps */}
      <div className="mt-8 space-y-1.5 text-left">
        {THINKING_MESSAGES.slice(
          Math.max(0, thinkingIndex - 3),
          thinkingIndex
        ).map((msg, i) => (
          <div
            key={i}
            className="flex items-center gap-2 text-xs text-muted-foreground"
            style={{ opacity: 0.4 + (i * 0.2) }}
          >
            <Check className="h-3 w-3 text-emerald-500" />
            {msg.text}
          </div>
        ))}
        <div className="flex items-center gap-2 text-xs font-medium text-foreground">
          <div className="h-3 w-3 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          {currentMessage.text}
        </div>
      </div>
    </div>
  );
}

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}`;
  return `${m} min`;
}
