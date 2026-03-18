"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

export function SyncButton() {
  const [syncing, setSyncing] = useState(false);
  const [result, setResult] = useState<{ synced: number; matched: number } | null>(null);

  async function handleSync() {
    setSyncing(true);
    setResult(null);

    const response = await fetch("/api/strava/sync", { method: "POST" });
    const data = await response.json();

    setResult(data);
    setSyncing(false);
  }

  return (
    <div className="flex items-center gap-3">
      <Button variant="outline" size="sm" onClick={handleSync} disabled={syncing} className="gap-2">
        <RefreshCw className={`h-3.5 w-3.5 ${syncing ? "animate-spin" : ""}`} />
        {syncing ? "Syncing..." : "Sync now"}
      </Button>
      {result && (
        <span className="text-xs text-muted-foreground">
          {result.synced} synced, {result.matched} matched
        </span>
      )}
    </div>
  );
}
