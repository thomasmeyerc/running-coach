# Running Coach — Service Setup Guide

Follow these steps to set up all required services before running the app.

## 1. Supabase (Database + Auth)

1. Go to [supabase.com](https://supabase.com) and sign up or log in
2. Click **"New Project"**
3. Fill in:
   - **Project name**: `running-coach`
   - **Database password**: choose a strong password (save it somewhere)
   - **Region**: pick one close to you
4. Wait for the project to finish setting up (~2 minutes)
5. Go to **Settings → API** (in the left sidebar)
6. Copy these values into your `.env.local` file:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role** key → `SUPABASE_SERVICE_ROLE_KEY`

> **Important**: The service_role key has full access to your database. Never expose it in client-side code.

## 2. Strava API Application

1. Log in to Strava and go to [strava.com/settings/api](https://www.strava.com/settings/api)
2. Create an API application:
   - **Application Name**: `Running Coach`
   - **Category**: `Training`
   - **Club**: leave empty
   - **Website**: `http://localhost:3000` (update to your Vercel domain later)
   - **Authorization Callback Domain**: `localhost` (update later for production)
   - **Description**: `AI-powered running coach`
3. After creating, copy these values into `.env.local`:
   - **Client ID** → `STRAVA_CLIENT_ID`
   - **Client Secret** → `STRAVA_CLIENT_SECRET`
4. Generate a random string for webhook verification:
   ```bash
   openssl rand -hex 32
   ```
   Copy it → `STRAVA_WEBHOOK_VERIFY_TOKEN`

### Updating for Production
When you deploy to Vercel:
1. Go back to [strava.com/settings/api](https://www.strava.com/settings/api)
2. Update **Website** to your Vercel URL (e.g. `https://running-coach.vercel.app`)
3. Update **Authorization Callback Domain** to your Vercel domain (e.g. `running-coach.vercel.app`)
4. Update `NEXT_PUBLIC_STRAVA_REDIRECT_URI` in Vercel env vars

## 3. Anthropic API Key (Claude)

1. Go to [console.anthropic.com](https://console.anthropic.com) and log in
2. Navigate to **API Keys** in the sidebar
3. Click **"Create Key"**, give it a name like `running-coach`
4. Copy the key → `ANTHROPIC_API_KEY`

> **Pricing**: Claude Opus charges per token. For a personal coaching app, expect ~$5-15/month depending on usage.

## 4. Create Your .env.local File

```bash
cp .env.example .env.local
```

Then fill in all the values you collected above.

## 5. Run Database Migrations

After setting up Supabase and adding your keys to `.env.local`:

1. Go to your Supabase project dashboard
2. Click **SQL Editor** in the left sidebar
3. Copy and run each migration file from `supabase/migrations/` in order (001, 002, etc.)

Or if you have the Supabase CLI installed:
```bash
npx supabase db push
```

## 6. Vercel Deployment

1. Go to [vercel.com](https://vercel.com) and sign up with your GitHub account
2. Click **"Import Project"** and select your `running-coach` repository
3. In the environment variables section, add all the values from your `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `STRAVA_CLIENT_ID`
   - `STRAVA_CLIENT_SECRET`
   - `STRAVA_WEBHOOK_VERIFY_TOKEN`
   - `NEXT_PUBLIC_STRAVA_REDIRECT_URI` (update to `https://your-domain.vercel.app/api/strava/callback`)
   - `ANTHROPIC_API_KEY`
   - `NEXT_PUBLIC_APP_URL` (update to `https://your-domain.vercel.app`)
4. Click **Deploy**
5. Your app will auto-deploy on every push to `main`

## 7. Verify Everything Works

1. Run locally: `npm run dev`
2. Open `http://localhost:3000`
3. Sign up with email
4. Complete onboarding
5. Connect Strava (if configured)
6. Create a goal and generate a training plan
