export const dynamic = "force-dynamic";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Manage your account and integrations.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Strava Integration</CardTitle>
          <CardDescription>Connect your Strava account to sync activities automatically.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline">Connect Strava</Button>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Account</CardTitle>
          <CardDescription>Manage your account settings.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Account management options coming soon.</p>
        </CardContent>
      </Card>
    </div>
  );
}
