"use client";

import { useState, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ExperienceLevel, PreferredUnits, TimePreference, Gender } from "@/types/database";
import { User, Activity, Ruler, Save } from "lucide-react";

interface ProfileData {
  id: string;
  email: string;
  display_name: string | null;
  height_cm: number | null;
  weight_kg: number | null;
  date_of_birth: string | null;
  gender: Gender | null;
  experience_level: ExperienceLevel;
  years_running: number | null;
  preferred_units: PreferredUnits;
  max_days_per_week: number;
  time_preference: TimePreference | null;
}

interface ProfileFormProps {
  profile: ProfileData;
}

const GENDER_OPTIONS = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "non_binary", label: "Non-binary" },
  { value: "prefer_not_to_say", label: "Prefer not to say" },
];

const EXPERIENCE_OPTIONS = ["beginner", "intermediate", "advanced", "elite"] as const;

const TIME_OPTIONS = [
  { value: "morning" as const, label: "Morning" },
  { value: "afternoon" as const, label: "Afternoon" },
  { value: "evening" as const, label: "Evening" },
  { value: "no_preference" as const, label: "No preference" },
];

export function ProfileForm({ profile }: ProfileFormProps) {
  const supabase = useMemo(() => createClient(), []);

  const [displayName, setDisplayName] = useState(profile.display_name ?? "");
  const [dateOfBirth, setDateOfBirth] = useState(profile.date_of_birth ?? "");
  const [gender, setGender] = useState(profile.gender ?? "");
  const [heightCm, setHeightCm] = useState(profile.height_cm?.toString() ?? "");
  const [weightKg, setWeightKg] = useState(profile.weight_kg?.toString() ?? "");
  const [experienceLevel, setExperienceLevel] = useState(profile.experience_level);
  const [yearsRunning, setYearsRunning] = useState(profile.years_running?.toString() ?? "");
  const [preferredUnits, setPreferredUnits] = useState(profile.preferred_units);
  const [maxDaysPerWeek, setMaxDaysPerWeek] = useState(profile.max_days_per_week.toString());
  const [timePreference, setTimePreference] = useState(profile.time_preference ?? "no_preference");

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  async function handleSave() {
    setSaving(true);
    setMessage(null);

    const { error } = await supabase
      .from("user_profiles")
      .update({
        display_name: displayName || null,
        date_of_birth: dateOfBirth || null,
        gender: gender || null,
        height_cm: heightCm ? Number(heightCm) : null,
        weight_kg: weightKg ? Number(weightKg) : null,
        experience_level: experienceLevel,
        years_running: yearsRunning ? Number(yearsRunning) : null,
        preferred_units: preferredUnits,
        max_days_per_week: Number(maxDaysPerWeek) || 4,
        time_preference: timePreference,
      })
      .eq("id", profile.id);

    setSaving(false);

    if (error) {
      setMessage({ type: "error", text: "Failed to save profile. Please try again." });
    } else {
      setMessage({ type: "success", text: "Profile updated successfully." });
      setTimeout(() => setMessage(null), 3000);
    }
  }

  return (
    <div className="space-y-6">
      {/* Personal Info */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">Personal Info</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="displayName">Display name</Label>
            <Input
              id="displayName"
              placeholder="Your name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="dob">Date of birth</Label>
              <Input
                id="dob"
                type="date"
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="gender">Gender</Label>
              <select
                id="gender"
                className="flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm"
                value={gender}
                onChange={(e) => setGender(e.target.value)}
              >
                <option value="">Select...</option>
                {GENDER_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="height">Height (cm)</Label>
              <Input
                id="height"
                type="number"
                placeholder="175"
                value={heightCm}
                onChange={(e) => setHeightCm(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="weight">Weight (kg)</Label>
              <Input
                id="weight"
                type="number"
                placeholder="70"
                value={weightKg}
                onChange={(e) => setWeightKg(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Running Background */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">Running Background</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Experience level</Label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {EXPERIENCE_OPTIONS.map((level) => (
                <button
                  key={level}
                  type="button"
                  onClick={() => setExperienceLevel(level)}
                  className={`rounded-lg border p-3 text-sm capitalize transition-colors ${
                    experienceLevel === level
                      ? "border-primary bg-primary/5 text-primary"
                      : "hover:bg-muted"
                  }`}
                >
                  {level}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="yearsRunning">Years running</Label>
            <Input
              id="yearsRunning"
              type="number"
              placeholder="2"
              value={yearsRunning}
              onChange={(e) => setYearsRunning(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Preferences */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Ruler className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">Training Preferences</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Preferred units</Label>
            <div className="grid grid-cols-2 gap-2">
              {(["km", "mi"] as const).map((unit) => (
                <button
                  key={unit}
                  type="button"
                  onClick={() => setPreferredUnits(unit)}
                  className={`rounded-lg border p-3 text-sm transition-colors ${
                    preferredUnits === unit
                      ? "border-primary bg-primary/5 text-primary"
                      : "hover:bg-muted"
                  }`}
                >
                  {unit === "km" ? "Kilometers" : "Miles"}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="daysPerWeek">Training days per week</Label>
            <Input
              id="daysPerWeek"
              type="number"
              min="1"
              max="7"
              value={maxDaysPerWeek}
              onChange={(e) => setMaxDaysPerWeek(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Preferred training time</Label>
            <div className="grid grid-cols-2 gap-2">
              {TIME_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setTimePreference(opt.value)}
                  className={`rounded-lg border p-3 text-sm transition-colors ${
                    timePreference === opt.value
                      ? "border-primary bg-primary/5 text-primary"
                      : "hover:bg-muted"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save */}
      <div className="flex items-center gap-4">
        <Button onClick={handleSave} disabled={saving} className="gap-2">
          <Save className="h-4 w-4" />
          {saving ? "Saving..." : "Save changes"}
        </Button>
        {message && (
          <p
            className={`text-sm ${
              message.type === "success" ? "text-green-600 dark:text-green-400" : "text-destructive"
            }`}
          >
            {message.text}
          </p>
        )}
      </div>
    </div>
  );
}
