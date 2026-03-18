import { createAdminClient } from "@/lib/supabase/admin";

export async function getValidStravaToken(userId: string): Promise<string | null> {
  const supabase = createAdminClient();

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("strava_access_token, strava_refresh_token, strava_token_expires_at")
    .eq("id", userId)
    .single();

  if (!profile?.strava_access_token || !profile?.strava_refresh_token) {
    return null;
  }

  const expiresAt = new Date(profile.strava_token_expires_at);
  const now = new Date();
  const fiveMinBuffer = 5 * 60 * 1000;

  // Token still valid
  if (expiresAt.getTime() > now.getTime() + fiveMinBuffer) {
    return profile.strava_access_token;
  }

  // Token expired — refresh it
  const response = await fetch("https://www.strava.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      refresh_token: profile.strava_refresh_token,
      grant_type: "refresh_token",
    }),
  });

  if (!response.ok) {
    return null;
  }

  const data = await response.json();

  // Update stored tokens
  await supabase.from("user_profiles").update({
    strava_access_token: data.access_token,
    strava_refresh_token: data.refresh_token,
    strava_token_expires_at: new Date(data.expires_at * 1000).toISOString(),
  }).eq("id", userId);

  return data.access_token;
}
