export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StravaConnect } from "@/components/strava/connect-button";
import { SyncButton } from "@/components/strava/sync-button";

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("strava_athlete_id, preferred_units, display_name, email")
    .eq("id", user.id)
    .single();

  const isStravaConnected = !!profile?.strava_athlete_id;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Manage your account and integrations.</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Strava Integration</CardTitle>
              <CardDescription>
                Connect your Strava account to sync activities automatically.
              </CardDescription>
            </div>
            {isStravaConnected && (
              <Badge variant="secondary" className="bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300">
                Connected
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {isStravaConnected ? (
            <div className="flex items-center gap-3">
              <p className="text-sm text-muted-foreground">
                Athlete ID: {profile.strava_athlete_id}
              </p>
              <SyncButton />
            </div>
          ) : (
            <StravaConnect />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Account</CardTitle>
          <CardDescription>Your account details.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Email</span>
            <span>{profile?.email}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Name</span>
            <span>{profile?.display_name || "Not set"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Units</span>
            <span>{profile?.preferred_units || "km"}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
