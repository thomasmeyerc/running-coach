"use client";

import { Button } from "@/components/ui/button";
import { Activity } from "lucide-react";

export function StravaConnect() {
  function handleConnect() {
    window.location.href = "/api/strava/auth";
  }

  return (
    <Button variant="outline" className="gap-2" onClick={handleConnect}>
      <Activity className="h-4 w-4 text-orange-500" />
      Connect Strava
    </Button>
  );
}
