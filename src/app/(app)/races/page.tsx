export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { RACES } from "@/data/races";
import type { UserRace } from "@/types/races";
import { RacesPageClient } from "@/components/races/races-page-client";

export default async function RacesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: userRaces } = await supabase
    .from("user_races")
    .select("*")
    .eq("user_id", user.id);

  return (
    <RacesPageClient
      races={RACES}
      userRaces={(userRaces as UserRace[]) ?? []}
    />
  );
}
