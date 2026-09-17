# Field Ledger

A field-visit tracker for recording device pickup/buyback leads — built for field executives (FEs) to log customer visits, device details, commission, and ID proof on the go.

## Tech stack

- React + Vite
- Supabase (database, storage, auth)
- Deployed on Vercel

## Getting started

```bash
npm install
npm run dev
```

## Environment variables

Create a `.env` file in the project root:

```dotenv
VITE_SUPABASE_URL=your-supabase-project-url
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

Get these from your Supabase project → **Settings → API**.

On Vercel, add the same two variables under **Project → Settings → Environment Variables**, then redeploy.

## Build

```bash
npm run build   # production build → dist/
npm run preview # preview the production build locally
```

## Features

- Mobile-first lead entry wizard (customer lookup → device details → lead ID → commission → ID proof → save)
- Auto-detects existing customers by mobile number
- ID proof upload (multiple types, multiple files per type)
- FE dashboard with visit tally, search, and infinite-scroll history
- SPA routing on Vercel via `vercel.json` rewrites
