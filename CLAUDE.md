# MathProject: rules for Claude

Hebrew (RTL) math practice site for middle school, grades 7–9. One HTML file per
topic, React + Babel from a CDN, no build step. Live at
https://mathproject-gamma.vercel.app (Vercel deploys every push to `main`, so
students see it at once).

Partners: Sulaiman (math content) and Abed (design system and infrastructure).

## Never without an explicit request
- Don't change the math, the exercises or any Hebrew text. All of it lives in each
  page's `<script type="text/babel">` block. Design work never edits that block.
- Don't push to `main`: it goes live for students immediately.

## Design
- Read `DESIGN.md` first. Shared look: `assets/mp.css`. Shared behavior: `assets/mp.js`.
- Page CSS sits in `@layer legacy`, the design system in `@layer mp`, one-page fixes in `@layer page`.
- New topic: start from `templates/module-template.html` and use the class vocabulary.
- Older page: `python3 tools/upgrade-page.py <file> <topic-color>`.

## Admin and database
- `admin.html`: management area (PIN, dashboard, content order, analytics, students, sales, settings). Code in `assets/admin.js` and `assets/admin.css`.
- Data lives in Sulaiman's Supabase project. It is **not connected yet**: `assets/config.js` is empty, so the admin shows labelled sample data and no stats are sent. How to connect: `supabase/README.md`.
- Database changes go in a new file in `supabase/migrations/`. Every admin action is a database function that checks the PIN session. Never put a secret key in the site.
- `assets/mp.js` sends anonymous answer stats (page, chapter, step, correct/wrong/solved) when connected. It only watches the page; it never changes the exercise.
- Local test copy: `supabase start` (Docker), ports 564xx. On localhost the site uses it automatically.
- Accounts: everything for this project is on Sulaiman's accounts (Vercel team `math-project`, Supabase). Never create services on Abed's own accounts for it.

## Check before finishing
- `python3 tools/verify-logic.py` must say "math and text untouched".
- Look at changed pages on desktop and at phone width (375px).
