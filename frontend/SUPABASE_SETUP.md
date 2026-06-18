# Supabase Setup

1. Open Supabase SQL Editor and run `supabase-schema.sql`.
   - Existing projects can run it again safely.
   - It creates `competitors`, `monitor_snapshots`, and `change_events`.
2. In Vercel project settings, add these environment variables:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
3. Redeploy the Vercel project.

The app reads and writes competitors, snapshots, and change events through Vercel API routes, so the browser never receives the Supabase service role key.
