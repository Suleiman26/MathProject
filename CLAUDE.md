# MathProject: rules for Claude

Hebrew (RTL) math practice site for middle school, grades 7–9. Next.js 16 app
(React 19). **The site is https://mathix-sooty.vercel.app** (Vercel project "mathix"
on Abed's account, team `abed-shalgams-projects`). Since 2026-11-11 (Abed: "we only
work on mathix now, forget gamma") the old https://mathproject-gamma.vercel.app is
retired: never link it, test on it or check its deploys. Pushing `main` to GitHub
still triggers a gamma build; ignore it.
Deploy mathix (not automatic): `git archive HEAD | tar -x -C <empty scratch dir>`, then
in that dir `npx vercel link --yes --project mathix --scope abed-shalgams-projects`
and `npx vercel deploy --prod --yes`. Commit first; uncommitted files are not deployed.

Partners: Sulaiman (math content) and Abed (design system, admin, infrastructure).
GitHub is on Sulaiman's account (github.com/Suleiman26/MathProject). The site's
Vercel project is mathix on Abed's account (Sulaiman's `math-project` team = old gamma, retired).
Supabase is the project's own account, managed by Abed (project "mathix",
ref uucqyjskkyrfhvbsmorx, since 2026-10-30). Don't create other services
for this project on Abed's personal accounts.

## Never without an explicit request
- Don't change the math, the exercises or any Hebrew text a student sees.
  They live in `src/topics/<topic>/Topic.jsx` between `BEGIN ORIGINAL` and `END ORIGINAL`.
- While the site is being built, Abed allows pushing `main` and deploying mathix
  for each finished, checked batch (verify-logic + build first).

## Where things are
| What | Where |
|---|---|
| A topic (Sulaiman's code) | `src/topics/<topic>/Topic.jsx` + its own CSS `styles.js`; list in `src/topics/registry.js` |
| Topic page frame (top bar, sounds, stats) | `src/components/TopicView.jsx`, `TopBar.jsx`, `src/lib/mp-runtime.js` |
| Design system | `src/styles/mp.css` (layers: mp-base < legacy < mp < page). Guide: `DESIGN.md` |
| Drawing/display fixes per topic | `src/styles/topic-fixes.css` (scoped with `html[data-page="<topic>"]`) |
| Home page | `app/page.tsx`, `src/home/` |
| Logo + app icons ("Loop") | sources `design/logo-gpt/` (`loop-master-1024.png`, `loop-maskable-1024.png`); served `app/icon.png`, `app/apple-icon.png`, `public/icon-192/512.png`, `public/icon-maskable-512.png`, `public/brand/logo-loop.png` (in-page logo), `public/og.png`. Phones cache icons hard: a new logo needs a new file name |
| Admin (PIN 1111) | `app/admin/*`, `src/admin/*`. Entry: quiet "כניסת צוות" link at the bottom of every page (`LegalFooter`). Project status page (`/classic/project-hub.html`) is linked only from the admin |
| Database (Supabase) | `supabase/migrations`; how to connect: `supabase/README.md`; settings: `src/lib/config.js` |
| Old plain-HTML site | `public/classic/` (served at `/classic`), git tag `html-v1` |
| 3D shapes view (solids topic) | `src/components/solid3d/` (three.js, lazy); `?flat=1` shows the old drawings |
| Shared page frame, chapter ✓, empty-check nudge | `src/styles/mp.css` §11, `src/components/TopicView.jsx`, `src/lib/mp-runtime.js` |

URLs: `/topics/<topic>` (`?ch=<chapter button text>` opens that chapter). Old `/<topic>.html` links redirect (next.config.ts).

## Admin and database
- Connected (2026-10-30): `src/lib/config.js` holds the public URL + publishable
  key. Admin, answer stats, keypad switch and the fixes board (admin → תיקונים)
  use the real database. Apply new migrations with `supabase db push` (this
  folder is linked; login via `supabase login`, no keys needed).
- New Supabase projects don't grant table access to the public roles by
  default: every table the site reads needs an explicit `grant` in its migration.
- Database changes go in a new file in `supabase/migrations/`. Every admin action
  is a database function that checks the PIN session. Never put a secret key in the site.
- Admin → Students (2026-11-02): signed-in students show by username, all their
  devices together; guests stay "אורח #1234" per device. Tap a row for one
  student's details (topics, chapters, days, latest answers). Database:
  `admin_students` / `admin_student` (`20261102100000_admin_students_accounts.sql`).
- `src/lib/mp-runtime.js` sends anonymous answer stats when connected. It only
  watches the page; it never changes the exercise.
- Local test copy: `supabase start` (Docker), ports 564xx. On localhost the app
  uses it automatically. `?live=0` makes localhost use the REAL database (so
  test answers become real stats); `?live=1` switches back.

## Student accounts (since 2026-10-31)
- Username + password, no email/phone. Our own auth in the database (not
  Supabase Auth): `supabase/migrations/20261031100000_accounts.sql`. bcrypt
  passwords, random session tokens stored as SHA-256, 5 wrong tries = 15 min lock.
- Site: `src/lib/account.js` (session + calls), pages in `src/account/`
  (Signup, Login, Profile) and `src/legal/` (terms, privacy, accessibility,
  contact). Styles: `src/styles/account.css`. Routes: /signup /login /profile
  /terms /privacy /accessibility /contact.
- Practising stays open without an account. Signed-in answers go through
  `account_track`; sign-up moves the device's earlier practice into the account.
- Changing the terms or privacy policy: bump `account_terms_version()` (new
  migration) AND `TERMS_VERSION` in `src/lib/account.js`; everyone re-accepts.
- Forgotten password: student writes via /contact; admin → Settings resets it.
- Legal operator name: `OPERATOR` in `src/legal/Legal.jsx`.
- Signed-in home (`src/home/Journey.jsx`, `src/styles/journey.css`): only the
  student's grade, as a railway of topics with levels, plus strengths and
  chapters worth strengthening (from `account_progress` → `chapters`).
- Progress v2 (2026-10-31): chapter stops on the railway come from
  `src/home/chapters.js` (names must match each topic's chapter buttons; update
  it when Sulaiman adds/renames a chapter). Station sheet, color zones, next step,
  level-up confetti are in `Journey.jsx`. Profile extras (points/level, weekly goal,
  7-day chart, badges, records) in `src/account/ProgressV2.jsx`; one topic at
  `/profile/<topic>` (`src/account/TopicDetail.jsx`).
- Railway v4 (2026-11-01, `src/home/Journey.jsx`): one "next step" ticket on top
  (`planNext`: weak chapter < 65% → continue current topic → next station →
  any unsolved chapter → level up), then ONE straight railway line: each topic a
  station; tap it to open its chapters as numbered stops; tap a chapter to see
  what it is about + progress + a button into it. Topic/chapter "what is it
  about" lines: `src/home/chapterInfo.js` (keys = chapter names in chapters.js;
  add a line when a chapter is added). Strengths cards sit below it.
  Three levels must look different (v5, 2026-11-02): area = wide coloured band
  (`Zone`), topic = big circle on the main line, chapters = small stops on a side
  track that branches off and rejoins (`Switch`, `.jr-br`).
  Strengths / worth strengthening (`Insights` in Journey.jsx): strong = 5+ solved
  with 75%+ right, or 8+ answers with 80%+ (solved exercises count: many topics
  finish without step checks); weak = same chapter rule as the railway (`isWeak`).
  No "other grades" list on the signed-in home (grade is changed in the profile).
  Signed-in top (2026-11-07): one hero `src/home/HomeHero.jsx` + `src/styles/hero.css`
  instead of a top bar + greeting card: brand + menu button (`AccountMenu trigger="icon"`:
  profile, settings, sign out), avatar, greeting + name, a LEVEL CARD in the student's colour
  (level, points, bar to the next level, a 3D star standing out of it) and four white number tiles
  with small 3D icons (`public/home/hero/*.webp`, sources `design/hero3d/`). When it scrolls away
  a slim glass bar takes its place (with a fade under it). The glass row `.hh-row` needs `position:relative; z-index:30`
  (its backdrop-filter traps the account menu; without it the menu opens UNDER the header). After any
  header change, open every menu in the test. HomeHero also paints the phone status bar
  (`theme-color` + html/body background) in the header colour. The hero can also show the student's 3D character
  (`figure` prop, `src/avatars/`), not switched on yet.
  **Calm system (2026-11-07, Abed: "too noisy"): `design/home-calm.md`.** White cards, no glyphs,
  no emoji, no rainbow badges. (Its first "one colour for everything" version was replaced the same
  day by "Worlds", below; the student's colour comes from `data-topic={account.avatar}` on `.home.in`.)
  **v2 "Worlds" (same day, Abed: "can't tell the levels apart"):** each area is a world with its own
  fixed colour (`src/home/worlds.js`: num sky, alg violet, fn emerald, geo coral) and 3D art
  (`public/home/worlds/<key>.webp`, sources in `design/worlds/`): banner → tinted tray of white topic
  cards (segmented bar per chapter) → chapter checklist inside the open card. The student colour
  is only for "me" (header, the white next-step ticket). Spec + lessons: `design/home-calm.md`.
  Guests keep the floating glass top bar; topic pages keep their own top bar.
  Guests see `GuestLine` (Journey.jsx): the same area bands + topic circles,
  no progress, ending with an invitation to open an account.
  Moving/renaming a topic's chapters: update `chapters.js` and add the
  old → new names to `RENAMED` there, so earlier practice still counts.
  Local preview with sample students (no database needed): `npm run dev` →
  `/dev/railway?s=new|mid|pro|gold&g=7|8|9&c=<student colour, e.g. pink|teal>` (shows "not found" on the live site, works on preview links). Shared rules (levels, points,
  badge names) in `src/lib/progress.js`; database: `account_achievements`,
  `account_topic`, `account_set_goal` (`20261031120000_progress_v2.sql`).

## Duels ("דו-קרב", live since 2026-11-09, switch OFF until Abed turns it on)
- Live 1v1 friend duels: 15 questions / 5 min. Design: `docs/superpowers/specs/2026-11-07-duels-design.md`,
  plan + topic audit in `docs/superpowers/`, mockup `design/duel/mockup.html`.
- Release switch: admin → Settings → דו-קרבים: off / test (only `duel_tester` accounts) / on.
  Enforced in every DB function (`duel_guard`). Admin also: testers + duel ban (Students), reports,
  question samples (`/admin/duels/questions`, for Sulaiman to check the math).
- DB: `supabase/migrations/2026110[89]*_duels_*.sql`; tests `supabase/tests/duels_*.test.sql`
  (`supabase test db`, incl. a catalog permission test — add new anon functions to its allow-list).
- Questions: ports of Sulaiman's generators in `supabase/functions/_shared/duel/` (never edit Topic.jsx).
  Every generator must pass the anti-guessing guard: `node --test supabase/functions/_shared/duel/*.test.mjs`.
  The site imports that folder: `.vercelignore` must keep uploading it (skipping it broke the build 2026-11-09).
- Server functions (Supabase, Abed's mathix project): `duel-start` (builds the 15 questions; secret
  DUEL_SECRET = Vault `duel_secret`), `duel-push` (Web Push; PUSH_SECRET = Vault `push_secret`, VAPID keys;
  private VAPID key only in Supabase secrets + local `supabase/.env.local`). Deploy: `supabase functions deploy <name>`.
  CORS allow-list in `supabase/functions/duel-start/core.mjs`.
- Client: `src/duel/*` (hub, sheet, arena, result), styles `src/styles/duel.css` + `duel-arena.css`
  (private class prefixes `dl-`, `dar-`, `dkp-`, `dmx-`… — this CSS can load site-wide), mounted lazily by
  `src/duel/DuelLayerMount.jsx` (loads nothing heavy while duels are off). Dev preview: `/dev/duel?s=…`.
- Site: https://mathix-sooty.vercel.app (the only site; deploy steps at the top of this file).

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
