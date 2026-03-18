import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");
  const state = searchParams.get("state") || "";

  // Extract return_to from state (format: "csrfHash:encodedReturnTo")
  const colonIdx = state.indexOf(":");
  const returnTo = colonIdx >= 0
    ? decodeURIComponent(state.slice(colonIdx + 1))
    : "/settings";

  if (error || !code) {
    return NextResponse.redirect(
      new URL(`${returnTo}?strava=error`, request.url)
    );
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Exchange code for tokens
  const tokenResponse = await fetch("https://www.strava.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      code,
      grant_type: "authorization_code",
    }),
  });

  if (!tokenResponse.ok) {
    return NextResponse.redirect(
      new URL(`${returnTo}?strava=error`, request.url)
    );
  }

  const tokenData = await tokenResponse.json();

  // Store tokens in user profile
  await supabase.from("user_profiles").update({
    strava_athlete_id: tokenData.athlete.id,
    strava_access_token: tokenData.access_token,
    strava_refresh_token: tokenData.refresh_token,
    strava_token_expires_at: new Date(tokenData.expires_at * 1000).toISOString(),
    strava_scope: "read,activity:read_all",
  }).eq("id", user.id);

  return NextResponse.redirect(
    new URL(`${returnTo}?strava=connected`, request.url)
  );
}
