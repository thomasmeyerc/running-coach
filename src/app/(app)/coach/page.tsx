export const dynamic = "force-dynamic";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function CoachPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">AI Coach</h1>
        <p className="text-muted-foreground">
          Chat with your personal running coach. Ask about training, nutrition, recovery, and more.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Coach Chat</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex h-96 items-center justify-center text-sm text-muted-foreground">
            AI Coach chat will be available here. Set up your goals and log some activities first for the best coaching experience.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
