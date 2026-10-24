# Database (Supabase)

The admin (`/admin`) and the answer stats run on Supabase: Sulaiman's
project. Until it is connected, the site works as before and the admin
opens in **preview mode** with sample numbers.

## Connect it (one time, about 5 minutes)

1. Sign in to Supabase with the project's account (Sulaiman's email) and open the MathProject project.
2. **Project Settings → API**: copy the **Project URL** and the **Publishable key**.
   Both are public values made for websites, not passwords.
3. On this computer, in the project folder:
   ```bash
   supabase login                       # email sign-in with the project's account
   supabase link --project-ref <ref>    # <ref> = the part before .supabase.co
   supabase db push                     # creates the tables, rules and admin functions
   ```
4. Put the two values in `src/lib/config.js` (`LIVE.supabaseUrl`, `LIVE.supabaseKey`) and push to `main`.
5. Open `/admin`, sign in with **1111**, then **change the PIN** in Settings.

## What's inside

| File | What it does |
|---|---|
| `migrations/…_admin.sql` | Tables (grades, categories, topics, events, plans, subscriptions), security rules, admin functions |
| `migrations/…_seed_content.sql` | Today's home page as starting content (names, grades, order) |

Security in short: the public (students) can only read visible content and
add anonymous answer events. Every admin action is a database function that
checks a session from `admin_login(pin)`. The PIN is stored hashed, and 5 wrong
tries lock the admin for 15 minutes.

## Local testing

`supabase start` runs a private copy on this computer (needs Docker). On
`localhost` the site connects to it automatically (see `src/lib/config.js`).
Add `?live=0` to the address to see preview mode instead.
