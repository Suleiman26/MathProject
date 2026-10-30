# MathProject: rules for Claude

Hebrew (RTL) math practice site for middle school, grades 7–9. Next.js 16 app
(React 19). Live at https://mathproject-gamma.vercel.app. Vercel deploys every
push to `main` (Sulaiman's Vercel team), so students see it at once.

Partners: Sulaiman (math content) and Abed (design system, admin, infrastructure).
Vercel and GitHub are on Sulaiman's accounts (Vercel team `math-project`).
Supabase is the project's own account, managed by Abed (project "mathix",
ref uucqyjskkyrfhvbsmorx, since 2026-10-30). Don't create other services
for this project on Abed's personal accounts.

## Never without an explicit request
- Don't change the math, the exercises or any Hebrew text a student sees.
  They live in `src/topics/<topic>/Topic.jsx` between `BEGIN ORIGINAL` and `END ORIGINAL`.
- Don't push to `main`: it goes live for students immediately.

## Where things are
| What | Where |
|---|---|
| A topic (Sulaiman's code) | `src/topics/<topic>/Topic.jsx` + its own CSS `styles.js`; list in `src/topics/registry.js` |
| Topic page frame (top bar, sounds, stats) | `src/components/TopicView.jsx`, `TopBar.jsx`, `src/lib/mp-runtime.js` |
| Design system | `src/styles/mp.css` (layers: mp-base < legacy < mp < page). Guide: `DESIGN.md` |
| Drawing/display fixes per topic | `src/styles/topic-fixes.css` (scoped with `html[data-page="<topic>"]`) |
| Home page | `app/page.tsx`, `src/home/` |
| Admin (PIN 1111) | `app/admin/*`, `src/admin/*` |
| Database (Supabase) | `supabase/migrations`; how to connect: `supabase/README.md`; settings: `src/lib/config.js` |
| Old plain-HTML site | `public/classic/` (served at `/classic`), git tag `html-v1` |

URLs: `/topics/<topic>`. Old `/<topic>.html` links redirect (next.config.ts).

## Admin and database
- Connected (2026-10-30): `src/lib/config.js` holds the public URL + publishable
  key. Admin, answer stats, keypad switch and the fixes board (admin → תיקונים)
  use the real database. Apply new migrations with `supabase db push` (this
  folder is linked; login via `supabase login`, no keys needed).
- New Supabase projects don't grant table access to the public roles by
  default: every table the site reads needs an explicit `grant` in its migration.
- Database changes go in a new file in `supabase/migrations/`. Every admin action
  is a database function that checks the PIN session. Never put a secret key in the site.
- `src/lib/mp-runtime.js` sends anonymous answer stats when connected. It only
  watches the page; it never changes the exercise.
- Local test copy: `supabase start` (Docker), ports 564xx. On localhost the app
  uses it automatically. `?live=0` makes localhost use the REAL database (so
  test answers become real stats); `?live=1` switches back.

## Display fixes vs logic
Prefer CSS in `src/styles/topic-fixes.css` for anything visual. Only touch
`Topic.jsx` for display if CSS truly can't do it, and say so:
`tools/verify-logic.py` will then flag that topic as changed.

## Check before finishing
- `python3 tools/verify-logic.py` must say "math and text untouched".
- `npx next build` must pass.
- Look at changed pages on desktop and at phone width (375px).

## Going back to the HTML version
Deploy tag `html-v1` (or branch `classic-html`) to `main`. The HTML site is
also always viewable at `/classic`.
