export const dynamic = "force-dynamic";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function ProfilePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Profile</h1>
        <p className="text-muted-foreground">Your personal information and running background.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Personal Info</CardTitle>
          <CardDescription>Update your profile details.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Profile editing will be available here.</p>
        </CardContent>
      </Card>
    </div>
  );
}
