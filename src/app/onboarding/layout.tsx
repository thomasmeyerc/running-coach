import { Activity } from "lucide-react";

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="mx-auto flex h-14 max-w-2xl items-center gap-2 px-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <Activity className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="text-lg font-semibold">RunCoach</span>
          <span className="text-sm text-muted-foreground">Setup</span>
        </div>
      </header>
      <main className="mx-auto max-w-2xl px-4 py-8">
        {children}
      </main>
    </div>
  );
}
