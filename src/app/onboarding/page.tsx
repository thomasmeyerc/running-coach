"use client";

import { Suspense, useState, useMemo, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  Check,
  Dumbbell,
  Heart,
  Ruler,
  Target,
  User,
} from "lucide-react";
import { LogoIcon } from "@/components/ui/logo-icon";

const TOTAL_STEPS = 7;

const STEP_TITLES = [
  "Welcome",
  "Your Profile",
  "Running Background",
  "Connect Strava",
  "Preferences",
  "Set Your Goal",
  "Review & Start",
];

export default function OnboardingPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center py-20 text-muted-foreground">Loading...</div>}>
      <OnboardingWizard />
    </Suspense>
  );
}

function OnboardingWizard() {
  const searchParams = useSearchParams();
  const stravaResult = searchParams.get("strava");
  const initialStep = stravaResult === "connected" ? 4 : 0;

  const [step, setStep] = useState(initialStep);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  // Restore saved state from localStorage (survives Strava redirect)
  const saved = useMemo(() => {
    if (typeof window === "undefined") return null;
    try {
      const raw = localStorage.getItem("onboarding_state");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }, []);

  // Profile data
  const [displayName, setDisplayName] = useState(saved?.displayName ?? "");
  const [heightCm, setHeightCm] = useState(saved?.heightCm ?? "");
  const [weightKg, setWeightKg] = useState(saved?.weightKg ?? "");
  const [dateOfBirth, setDateOfBirth] = useState(saved?.dateOfBirth ?? "");
  const [gender, setGender] = useState(saved?.gender ?? "");

  // Running background
  const [experienceLevel, setExperienceLevel] = useState(saved?.experienceLevel ?? "beginner");
  const [yearsRunning, setYearsRunning] = useState(saved?.yearsRunning ?? "");
  const [weeklyKm, setWeeklyKm] = useState(saved?.weeklyKm ?? "");

  // Preferences
  const [preferredUnits, setPreferredUnits] = useState(saved?.preferredUnits ?? "km");
  const [maxDaysPerWeek, setMaxDaysPerWeek] = useState(saved?.maxDaysPerWeek ?? "4");
  const [timePreference, setTimePreference] = useState(saved?.timePreference ?? "no_preference");

  // Goal
  const [goalType, setGoalType] = useState(saved?.goalType ?? "race");
  const [goalName, setGoalName] = useState(saved?.goalName ?? "");
  const [raceType, setRaceType] = useState(saved?.raceType ?? "10k");
  const [raceDate, setRaceDate] = useState(saved?.raceDate ?? "");

  const [loadingMessage, setLoadingMessage] = useState("");

  // Persist form state to localStorage on every change
  const saveState = useCallback(() => {
    try {
      localStorage.setItem("onboarding_state", JSON.stringify({
        displayName, heightCm, weightKg, dateOfBirth, gender,
        experienceLevel, yearsRunning, weeklyKm,
        preferredUnits, maxDaysPerWeek, timePreference,
        goalType, goalName, raceType, raceDate,
      }));
    } catch { /* quota exceeded — non-critical */ }
  }, [
    displayName, heightCm, weightKg, dateOfBirth, gender,
    experienceLevel, yearsRunning, weeklyKm,
    preferredUnits, maxDaysPerWeek, timePreference,
    goalType, goalName, raceType, raceDate,
  ]);

  useEffect(() => { saveState(); }, [saveState]);

  async function handleComplete() {
    setLoading(true);
    setLoadingMessage("Saving your profile...");
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Update profile
    await supabase.from("user_profiles").update({
      display_name: displayName || null,
      height_cm: heightCm ? Number(heightCm) : null,
      weight_kg: weightKg ? Number(weightKg) : null,
      date_of_birth: dateOfBirth || null,
      gender: gender || null,
      experience_level: experienceLevel,
      years_running: yearsRunning ? Number(yearsRunning) : null,
      preferred_units: preferredUnits,
      max_days_per_week: Number(maxDaysPerWeek),
      time_preference: timePreference,
      onboarding_completed: true,
      onboarding_step: TOTAL_STEPS,
    }).eq("id", user.id);

    // Create first goal
    let goalId: string | null = null;
    if (goalName) {
      setLoadingMessage("Creating your goal...");
      const { data: goalData } = await supabase.from("goals").insert({
        user_id: user.id,
        goal_name: goalName,
        goal_type: goalType,
        race_type: goalType === "race" ? raceType : null,
        race_date: goalType === "race" && raceDate ? raceDate : null,
        fitness_level: experienceLevel,
        weekly_km_current: weeklyKm ? Number(weeklyKm) : null,
        days_available_per_week: Number(maxDaysPerWeek),
        priority: "primary",
      }).select("id").single();
      goalId = goalData?.id ?? null;
    }

    // Generate training plan from goal
    if (goalId) {
      setLoadingMessage("AI is generating your training plan...");
      try {
        const res = await fetch("/api/coach/generate-plan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ goal_id: goalId }),
        });
        if (!res.ok) {
          // Plan generation failed — non-critical, user can retry from Plan page
          console.warn("Plan generation failed during onboarding");
        }
      } catch {
        // Non-critical — continue to dashboard
        console.warn("Plan generation error during onboarding");
      }
    }

    localStorage.removeItem("onboarding_state");
    router.push("/dashboard");
    router.refresh();
  }

  function nextStep() {
    if (step < TOTAL_STEPS - 1) setStep(step + 1);
  }
  function prevStep() {
    if (step > 0) setStep(step - 1);
  }

  const progress = ((step + 1) / TOTAL_STEPS) * 100;

  return (
    <div className="space-y-6">
      {/* Progress */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Step {step + 1} of {TOTAL_STEPS}</span>
          <span className="font-medium">{STEP_TITLES[step]}</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {/* Step content */}
      <Card>
        <CardContent className="pt-6">
          {step === 0 && (
            <div className="space-y-6 text-center py-8">
              <LogoIcon size="lg" className="mx-auto h-16 w-16 rounded-2xl" />
              <div>
                <h2 className="text-2xl font-bold">Welcome to RunCoach</h2>
                <p className="mt-2 text-muted-foreground">
                  Let&apos;s set up your personalized training experience. This takes about 2 minutes.
                </p>
              </div>
              <div className="mx-auto grid max-w-sm gap-3 text-left text-sm">
                <div className="flex items-center gap-3">
                  <Target className="h-5 w-5 text-primary" />
                  <span>AI-generated training plans tailored to your goals</span>
                </div>
                <div className="flex items-center gap-3">
                  <Heart className="h-5 w-5 text-primary" />
                  <span>Plans adapt based on how you feel and perform</span>
                </div>
                <div className="flex items-center gap-3">
                  <Dumbbell className="h-5 w-5 text-primary" />
                  <span>Support for running, gym, and cross-training</span>
                </div>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 mb-4">
                <User className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-semibold">Your Profile</h2>
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Display name</Label>
                <Input id="name" placeholder="Your name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="dob">Date of birth</Label>
                  <Input id="dob" type="date" value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gender">Gender</Label>
                  <select id="gender" className="flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm" value={gender} onChange={(e) => setGender(e.target.value)}>
                    <option value="">Select...</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="non_binary">Non-binary</option>
                    <option value="prefer_not_to_say">Prefer not to say</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="height">Height (cm)</Label>
                  <Input id="height" type="number" placeholder="175" value={heightCm} onChange={(e) => setHeightCm(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="weight">Weight (kg)</Label>
                  <Input id="weight" type="number" placeholder="70" value={weightKg} onChange={(e) => setWeightKg(e.target.value)} />
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 mb-4">
                <Activity className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-semibold">Running Background</h2>
              </div>
              <div className="space-y-2">
                <Label>Experience level</Label>
                <div className="grid grid-cols-2 gap-2">
                  {(["beginner", "intermediate", "advanced", "elite"] as const).map((level) => (
                    <button key={level} onClick={() => setExperienceLevel(level)} className={`rounded-lg border p-3 text-sm capitalize transition-colors ${experienceLevel === level ? "border-primary bg-primary/5 text-primary" : "hover:bg-muted"}`}>
                      {level}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="years">Years running</Label>
                  <Input id="years" type="number" placeholder="2" value={yearsRunning} onChange={(e) => setYearsRunning(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="weeklyKm">Current weekly km</Label>
                  <Input id="weeklyKm" type="number" placeholder="20" value={weeklyKm} onChange={(e) => setWeeklyKm(e.target.value)} />
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4 py-4 text-center">
              <Activity className="mx-auto h-12 w-12 text-orange-500" />
              <h2 className="text-lg font-semibold">Connect Strava</h2>
              {stravaResult === "connected" ? (
                <>
                  <div className="inline-flex items-center gap-2 rounded-lg bg-green-50 px-4 py-2 text-sm text-green-700 dark:bg-green-900/30 dark:text-green-400">
                    <Check className="h-4 w-4" />
                    Strava connected successfully!
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Your activities will sync automatically. Click Next to continue.
                  </p>
                </>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground">
                    Connect your Strava account to automatically sync your training history and new activities.
                  </p>
                  <Button
                    variant="outline"
                    className="gap-2"
                    onClick={() => {
                      window.location.href = "/api/strava/auth?return_to=/onboarding";
                    }}
                  >
                    <Activity className="h-4 w-4 text-orange-500" />
                    Connect Strava
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    You can skip this step and connect Strava later from Settings.
                  </p>
                </>
              )}
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 mb-4">
                <Ruler className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-semibold">Training Preferences</h2>
              </div>
              <div className="space-y-2">
                <Label>Preferred units</Label>
                <div className="grid grid-cols-2 gap-2">
                  {(["km", "mi"] as const).map((unit) => (
                    <button key={unit} onClick={() => setPreferredUnits(unit)} className={`rounded-lg border p-3 text-sm transition-colors ${preferredUnits === unit ? "border-primary bg-primary/5 text-primary" : "hover:bg-muted"}`}>
                      {unit === "km" ? "Kilometers" : "Miles"}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="daysPerWeek">Training days per week</Label>
                <Input id="daysPerWeek" type="number" min="1" max="7" value={maxDaysPerWeek} onChange={(e) => setMaxDaysPerWeek(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Preferred training time</Label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { value: "morning", label: "Morning" },
                    { value: "afternoon", label: "Afternoon" },
                    { value: "evening", label: "Evening" },
                    { value: "no_preference", label: "No preference" },
                  ].map((opt) => (
                    <button key={opt.value} onClick={() => setTimePreference(opt.value)} className={`rounded-lg border p-3 text-sm transition-colors ${timePreference === opt.value ? "border-primary bg-primary/5 text-primary" : "hover:bg-muted"}`}>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 mb-4">
                <Target className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-semibold">Set Your First Goal</h2>
              </div>
              <div className="space-y-2">
                <Label>Goal type</Label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: "race", label: "Race" },
                    { value: "general_fitness", label: "General fitness" },
                    { value: "cross_training", label: "Cross-training" },
                  ].map((opt) => (
                    <button key={opt.value} onClick={() => setGoalType(opt.value)} className={`rounded-lg border p-3 text-sm transition-colors ${goalType === opt.value ? "border-primary bg-primary/5 text-primary" : "hover:bg-muted"}`}>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="goalName">Goal name</Label>
                <Input id="goalName" placeholder={goalType === "race" ? "Spring Marathon 2026" : "Get fitter"} value={goalName} onChange={(e) => setGoalName(e.target.value)} />
              </div>
              {goalType === "race" && (
                <>
                  <div className="space-y-2">
                    <Label>Race type</Label>
                    <div className="grid grid-cols-3 gap-2">
                      {(["5k", "10k", "half_marathon", "marathon", "ultra", "custom"] as const).map((type) => (
                        <button key={type} onClick={() => setRaceType(type)} className={`rounded-lg border p-2 text-xs transition-colors ${raceType === type ? "border-primary bg-primary/5 text-primary" : "hover:bg-muted"}`}>
                          {type.replace("_", " ")}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="raceDate">Race date</Label>
                    <Input id="raceDate" type="date" value={raceDate} onChange={(e) => setRaceDate(e.target.value)} />
                  </div>
                </>
              )}
            </div>
          )}

          {step === 6 && (
            <div className="space-y-6 py-4">
              <div className="flex items-center gap-3 mb-4">
                <Check className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-semibold">Review & Start</h2>
              </div>
              <div className="space-y-3">
                <ReviewItem label="Name" value={displayName || "Not set"} />
                <ReviewItem label="Experience" value={experienceLevel} />
                <ReviewItem label="Weekly km" value={weeklyKm ? `${weeklyKm} km` : "Not set"} />
                <ReviewItem label="Units" value={preferredUnits} />
                <ReviewItem label="Training days" value={`${maxDaysPerWeek} days/week`} />
                <ReviewItem label="Goal" value={goalName || "No goal set"} />
                {goalType === "race" && (
                  <>
                    <ReviewItem label="Race type" value={raceType.replace("_", " ")} />
                    <ReviewItem label="Race date" value={raceDate || "Not set"} />
                  </>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                You can always update these details later in your profile and goals pages.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={prevStep} disabled={step === 0} className="gap-2">
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
        {step < TOTAL_STEPS - 1 ? (
          <Button onClick={nextStep} className="gap-2">
            Next <ArrowRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button onClick={handleComplete} disabled={loading} className="gap-2">
            {loading ? loadingMessage || "Setting up..." : "Start training"} <Check className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

function ReviewItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-lg border px-4 py-2">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium capitalize">{value}</span>
    </div>
  );
}
