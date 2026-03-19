export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ProfileForm } from "@/components/profile/profile-form";

export default async function ProfilePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("user_profiles")
    .select(
      "id, email, display_name, height_cm, weight_kg, date_of_birth, gender, experience_level, years_running, preferred_units, max_days_per_week, time_preference, injuries_history, preferred_run_days, strava_athlete_id, onboarding_completed, onboarding_step, created_at, updated_at"
    )
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/onboarding");

  return (
    <div className="space-y-6">
      <div className="page-header">
        <h1 className="text-2xl font-bold tracking-tight">Profile</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Your personal information and running background.
        </p>
      </div>
      <ProfileForm profile={profile} />
    </div>
  );
}
