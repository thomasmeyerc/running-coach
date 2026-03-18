import { Button } from "@/components/ui/button";
import { Activity, BarChart3, Brain, Calendar, MessageSquare, Target } from "lucide-react";
import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
              <Activity className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-semibold">RunCoach</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost" size="sm">Sign in</Button>
            </Link>
            <Link href="/signup">
              <Button size="sm">Get started</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-4 py-24 text-center">
        <h1 className="mx-auto max-w-3xl text-5xl font-bold tracking-tight sm:text-6xl">
          Your AI-powered
          <br />
          <span className="text-primary">running coach</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
          Personalized training plans, intelligent coaching, and progress tracking.
          Connect your Strava, set your goals, and let AI guide your training.
        </p>
        <div className="mt-10 flex justify-center gap-4">
          <Link href="/signup">
            <Button size="lg" className="h-12 px-8 text-base">
              Start training
            </Button>
          </Link>
          <Link href="/login">
            <Button variant="outline" size="lg" className="h-12 px-8 text-base">
              Sign in
            </Button>
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="border-t bg-muted/30 py-24">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="text-center text-3xl font-bold">Everything you need to reach your goals</h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-muted-foreground">
            From 5K to ultramarathon, from beginner to elite.
            Your training adapts to you.
          </p>
          <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            <FeatureCard
              icon={<Target className="h-6 w-6" />}
              title="Smart goal setting"
              description="Set any goal — race, fitness, cross-training. Get instant AI feasibility feedback and realistic target suggestions."
            />
            <FeatureCard
              icon={<Calendar className="h-6 w-6" />}
              title="Adaptive training plans"
              description="AI-generated plans with intervals, tempo runs, long runs, and cross-training. Plans adapt when you over or under achieve."
            />
            <FeatureCard
              icon={<BarChart3 className="h-6 w-6" />}
              title="Progress dashboard"
              description="Track your km, pace, weekly volume, and goal progress with beautiful charts and insights."
            />
            <FeatureCard
              icon={<Activity className="h-6 w-6" />}
              title="Strava integration"
              description="Automatically sync all your activities from Strava. Runs, rides, gym sessions — everything in one place."
            />
            <FeatureCard
              icon={<Brain className="h-6 w-6" />}
              title="AI run analysis"
              description="Get detailed analysis on every run — pace consistency, heart rate drift, RPE correlation, and actionable recommendations."
            />
            <FeatureCard
              icon={<MessageSquare className="h-6 w-6" />}
              title="Coach chat"
              description="Ask your AI coach anything — nutrition, pacing, recovery, training philosophy. It knows your full history and goals."
            />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="mx-auto max-w-6xl px-4 text-center text-sm text-muted-foreground">
          RunCoach — AI-powered running coach
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-xl border bg-card p-6">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
        {icon}
      </div>
      <h3 className="mb-2 text-lg font-semibold">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
