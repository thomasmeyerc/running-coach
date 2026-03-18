# Running Coach — Claude Code Instructions

## What This Is
AI-powered running coach web app. Users set custom goals (any race, any date),
get personalized training plans, AI coaching via Claude Opus, and track progress.
Integrates Strava for activity history, supports cross-training (gym, football, etc.).

## Tech Stack
- Next.js 16 (App Router) + TypeScript (strict mode)
- Supabase (PostgreSQL + Auth + RLS)
- Tailwind CSS + shadcn/ui
- Recharts for dashboard charts
- Claude Opus API (@anthropic-ai/sdk) for AI coaching
- Strava API (strava-v3) for activity sync
- Zod for input validation

## Build & Test
```bash
npm run dev          # Local development (localhost:3000)
npm run build        # Production build
npm test             # Run all tests
npm run lint         # ESLint check
```

## File Organization
- `/src/app/` — Next.js pages + API routes (App Router)
- `/src/components/` — React components (ui/, layout/, dashboard/, etc.)
- `/src/lib/` — Shared logic (supabase/, strava/, claude/)
- `/src/types/` — TypeScript type definitions
- `/supabase/migrations/` — SQL migration files
- `/docs/` — Documentation
- `/scripts/` — Utility scripts
- NEVER save files to root — use directories above
- NEVER save tests to root — use /src or a /tests directory

## Code Conventions
- Functional components + hooks only (no class components)
- Server Components by default, `"use client"` only when needed (charts, forms, interactivity)
- All public functions need TypeScript types — no `any`
- Files max 500 lines — split if larger
- camelCase for functions/variables, PascalCase for components/types
- Zod validation on all API route inputs
- RLS policies on every Supabase table

## Architecture Patterns
- Server Components fetch data, pass to Client Components as props
- API routes in `/src/app/api/` protect secrets (Claude key, Strava tokens)
- Supabase: server client in Server Components, browser client in Client Components
- Claude prompts assembled in `/src/lib/claude/prompts.ts` with dynamic context
- Strava token refresh handled in `/src/lib/strava/tokens.ts`
- Middleware at `/middleware.ts` handles auth + onboarding redirect

## Security Rules
- NEVER hardcode API keys — environment variables only
- NEVER commit .env or .env.local files
- Validate all user input at API boundaries with Zod
- Strava tokens stored server-side only, never exposed to client
- All tables have RLS — users can only access their own data

## Testing
- Run `npm run build` after code changes to catch type errors
- Test API routes with mock Supabase client
- Verify RLS policies prevent cross-user data access

## Current Phase
Phase: 1 - Foundation
Status: In progress
Next: Auth, layout, landing page, Supabase setup

## Development Feedback
### What Works Well
(populated as we develop)

### What To Avoid
(populated when something goes wrong)

### Decisions Made
- Next.js 16 App Router for SSR + API routes in single repo
- Supabase for auth + DB + RLS (all-in-one, free tier)
- Claude Opus for all AI coaching calls (highest quality)
- Recharts for charts (simple, composable)
- shadcn/ui for component library (customizable, not opinionated)
- Multi-activity support (not just running — gym, football, etc.)
- Onboarding-first UX (7-step wizard before dashboard)
