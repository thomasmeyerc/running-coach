import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import crypto from "crypto";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const clientId = process.env.STRAVA_CLIENT_ID;
  const redirectUri = process.env.NEXT_PUBLIC_STRAVA_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    return NextResponse.json({ error: "Strava not configured" }, { status: 500 });
  }

  // Check if caller wants to return to a specific page after auth
  const returnTo = request.nextUrl.searchParams.get("return_to") || "/settings";

  // Encode return_to in state along with CSRF hash
  const csrfHash = crypto
    .createHash("sha256")
    .update(user.id + (process.env.STRAVA_CLIENT_SECRET || ""))
    .digest("hex")
    .slice(0, 16);

  const state = `${csrfHash}:${encodeURIComponent(returnTo)}`;

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "read,activity:read_all",
    state,
  });

  return NextResponse.redirect(
    `https://www.strava.com/oauth/authorize?${params.toString()}`
  );
}
