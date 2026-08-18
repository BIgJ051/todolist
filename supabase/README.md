# Supabase setup

1. Create or select a Supabase project, then open **SQL Editor** and run
   `migrations/20260818_create_tasks.sql`.
2. In **Authentication > Providers**, enable **Anonymous sign-ins**.
3. Copy `../supabase-config.example.js` to `../supabase-config.js`, then set
   the project URL and the publishable (or legacy anon) key from
   **Project Settings > API**.

`supabase-config.js` is deployed with this static GitHub Pages app because the
publishable key is designed for browser use with RLS. Never put the
`service_role` or a secret key in that file. When configured, existing local tasks are uploaded once and later
changes are synchronized to the authenticated anonymous user's rows.
