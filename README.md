# Nuroni

> Track less. Show real progress.

## Setup.

### 1. Environment Variables
In Vercel, add these environment variables:
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 2. Supabase Database
Run `supabase-schema.sql` in your Supabase SQL Editor.

### 3. Supabase Auth Settings
- In Supabase → Authentication → URL Configuration
- Set Site URL to: `https://nuroni.app`
- Add Redirect URLs: `https://nuroni.app/onboarding`

### 4. Deploy
Push to GitHub → Vercel auto-deploys.

## Stack
- Next.js 14 (App Router)
- Supabase (Auth + Database)
- Tailwind CSS
- Recharts
- PWA ready
.
trigger deploy
