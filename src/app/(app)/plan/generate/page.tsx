export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { Goal, UserProfile } from "@/types/database";
import { PlanGenerator } from "@/components/plan/plan-generator";

export default async function GeneratePlanPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Fetch active goals
  const { data: goals } = await supabase
    .from("goals")
    .select("*")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .order("priority", { ascending: true });

  // Fetch user profile
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  // If no goals, redirect to goals page
  if (!goals?.length) {
    redirect("/goals");
  }

  // Check if there's already an active plan
  const { data: existingPlan } = await supabase
    .from("training_plans")
    .select("id, plan_name")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .single();

  return (
    <PlanGenerator
      goals={(goals as Goal[]) ?? []}
      profile={profile as UserProfile}
      hasExistingPlan={!!existingPlan}
      existingPlanName={existingPlan?.plan_name ?? null}
    />
  );
}
