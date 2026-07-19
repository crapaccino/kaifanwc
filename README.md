# World Cup Predictor - Netlify + Supabase

This version saves predictions centrally in Supabase, so data is not lost when you redeploy Netlify.

## What you get
- Public page: `/index.html`
- Admin page: `/admin.html`
- Netlify Functions for database writes
- Supabase SQL schema + seed matches from Group Stage Round 2 and Round 3
- Leaderboard scoring:
  - Correct winner/draw: 3 points
  - Exact score bonus: +2 points

## Setup

### 1) Create Supabase project
Go to Supabase and create a new project.

### 2) Run the SQL
Open Supabase SQL Editor and run:

`supabase/schema.sql`

This creates `players`, `matches`, and `predictions`, then inserts the Round 2 and Round 3 matches.

### 3) Deploy to Netlify
Upload this folder to Netlify, or connect it to GitHub.

### 4) Add environment variables in Netlify
In Netlify: Site configuration → Environment variables → add:

- `SUPABASE_URL` = your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` = your Supabase service role key
- `ADMIN_PASSWORD` = any password you choose for the admin page

Important: use the service role key only as a Netlify environment variable. Do not put it in public JavaScript.

### 5) Use the site
- Send friends the Netlify site URL.
- They enter a nickname and save predictions.
- You open `/admin.html` to enter results or add new games.

## How to update after Round 2
You have two options:

### Option A: Use the admin page
Open `/admin.html`, enter the admin password, and add Round 3 / knockout matches.

Tournament bonus results are applied automatically to leaderboard totals when the deployment
environment variables `BONUS_WINNER`, `BONUS_POTM`, `BONUS_GOLDEN_BOOT`, and
`BONUS_GOLDEN_GLOVE` are set to the official result names. Unlisted winners correctly score
the corresponding “Any Other” pick.
Existing predictions remain saved.

### Option B: Update Supabase directly
Insert new rows into the `matches` table in Supabase.
Existing predictions remain saved.

## Notes
- Each round locks at its first kickoff.
- Redeploying Netlify does not delete Supabase data.
- If you rename teams or change match IDs after people predicted, avoid changing the match ID. The predictions are linked to `match_id`.
