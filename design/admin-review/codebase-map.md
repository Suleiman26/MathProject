# Admin control panel — codebase map (read-only study, 2026-11-21)

Scope: one new admin screen where staff browse grades → topics → chapters → the live
questions, check them, comment, and send repair requests (grade / topic / chapter /
one question) into the existing fixes board. Nothing was edited; only read-only
`supabase db query --linked` selects were run. Code read in the `proofs` worktree
(branch `proofs`, HEAD 730c785); `main` is c2db802. Differences are noted where they matter.

---

## 1. The admin app today

### Routes and shell
| What | Where |
|---|---|
| Layout (loads `admin.css`, wraps in `AdminShell`, `robots: noindex`) | `app/admin/layout.tsx:1-9` |
| Route files are 5-line wrappers: `app/admin/<x>/page.tsx` → `src/admin/pages/<X>.jsx` | `app/admin/{page,fixes,content,analytics,students,duels,duels/questions,sales,settings}` |
| `/admin/*` also gets `X-Robots-Tag: noindex, nofollow` | `next.config.ts` `headers()` |
| Nav list (label, short label, icon, page subtitle) | `src/admin/AdminShell.jsx:10-19` (`NAV`, 8 entries) |
| Active tab = `path.startsWith(href)`, so `/admin/fixes/<sub>` highlights "תיקונים" | `AdminShell.jsx:91` |
| Desktop side nav / phone top bar / phone bottom nav | `AdminShell.jsx:97-123`; bottom nav is a fixed **8-column grid** `admin.css:457-458` (a 9th NAV item breaks it) |
| Page title row | `PageHead({tools})` `AdminShell.jsx:131-134` (title/sub come from the active NAV entry) |
| Context: `{tok, preview, days, cache, load, refresh, run, signOut, page}` | `AdminShell.jsx:92`; `useAdmin()` :25; `useData(keys)` :28-40 (cached keys: `catalog`, `stats`, `students`, `sales` → fn map :72) |
| `run(fn, args)` = `call(fn, args, tok)`; unauthorized → auto sign-out | `AdminShell.jsx:86` |

### PIN session
- PIN screen `Pin()` `AdminShell.jsx:136-202`: 4 digits, auto-submit, keyboard support, lock countdown.
- Session kept in `localStorage["mp:admin"] = {tok, exp, preview}` (`AdminShell.jsx:56-57, 158-159`); checked on load, dropped when expired or when preview/live mode differs.
- DB side (`supabase/migrations/20261024120000_admin.sql`): `admin_login(pin)` :126-149 (bcrypt hash in `admin_settings`, 5 wrong in 15 min = locked, token valid **12 h** :93), `admin_guard(tok)` :151-157 raises `unauthorized` (errcode 28000), `admin_logout` :159-162, `admin_change_pin` :164-176 (4–8 digits, signs out other devices). Default PIN 1111 :101. `admin_guard` itself is not executable by the public roles (:436, :450).

### Data client
- `src/admin/api.js`: `isPreview()` = `!mpData.ready` (:9). `login(pin)` :237, `call(fn, args, tok)` :240-248 → `mpData.rpc(fn, {...args, tok})` (PostgREST **named** args, so JS keys must equal SQL parameter names).
- **Preview mode** (no DB): every function name must exist in the `demo` object (:75-234) or `call` throws (`demo[fn]` undefined). Fixes demo: `admin_fixes/add/comment/edit/delete` :195-233, seeded from `src/admin/fixes-seed.json`, stored in `localStorage["mp:demo-fixes"]`. A new page needs demo stubs for any new function.
- Site settings read: `getSetting(k)` :251-257.
- Shared UI: `src/admin/ui.jsx` — `Card, Badge, Empty, Seg, Switch, Sheet (title/onSave/onDelete), Sortable, ToastHost/useToast, ago, GRADE {7,8,9}` (exports :8-226).

### Fixes board (`src/admin/pages/Fixes.jsx`)
- Statuses `STATUS` :13-20: `new` חדש · `working` בעבודה · `review` תוקן · לבדיקה · `reopened` צריך עוד תיקון · `done` אושר · `later` לאחר כך (CSS tones `st-*`).
- Filters `FILTERS` :21-27: review / open (new+working+reopened) / later / done / all. Default = review if any, else open (:81). Plus a topic `<select>` (:177-182) that only lists slugs in `TOPIC_OPTIONS` (:30 = `"general"` + registry slugs) that have items.
- Who wrote it: `PEOPLE = ["סולימאן","עבד"]` :28; name kept in `localStorage["mp:fix-name"]` via `useName()` :32-37 (local function, **not exported**).
- `topicName(slug)` :29: `general` → "כללי · כל האתר", else registry title before " — ", else the raw slug.
- Load: `reload()` :63-71 → `admin_fixes`; then `loadUrls()` :55-62 (1-hour signed view links, refreshed after 50 min and on tab return :73-77).
- Grouping by topic, sorted by Hebrew name :84-88; header links to `/topics/<slug>` :193.
- Create/edit: `saveItem()` :112-131 → `admin_fix_add {topic, section, body, author}` or `admin_fix_edit {item_id, topic, section, body}`; then attachments with `sendPending(...)`. Sheet UI :200-219 (topic select, free-text "תת־פרק", body textarea, attach bar).
- Comment / status change: `act()` :92-110 → `admin_fix_comment {item_id, author, body, new_status, has_files}` (returns the new comment id for attachments).
- Item card `Item` :226-301: approve (review→done), reopen (needs text), "later"↔"new", comment; thread shows last 2 comments (Claude comments styled `.bot`).
- Delete: `removeItem()` :132-139 (stored files first via `deleteItemFiles`, then `admin_fix_delete`).

### Attachments
- UI `src/admin/pages/FixAttach.jsx`: `Linked` (tappable links in text) :16, `usePending()` :22, `sendPending()` :49-61, `useDropPaste()` (paste screenshots / drop) :63-85, `AttachBar` :87, `Attachments` :144, `Viewer` :177, `ATTACH_NOTE` :214. Styles prefix `fa-`.
- Client `src/admin/files.js`: `prepare()` :73-96 (images > 1.5 MB re-encoded to JPEG ≤ 2400 px, max 20 MB, types png/jpg/webp/gif/pdf), `uploadFile()` :141-146 (edge "upload" → PUT to one-time URL → `admin_fix_file_ready`), `addLink()` :147-149 (`admin_fix_link_add`), `viewUrls()` :151-159, `deleteFile()` :160-162, `deleteItemFiles()` :163.
- Edge function `supabase/functions/fix-files/index.ts` (actions upload / urls / delete / delete_item :94-130; every action first calls a PIN-guarded DB function with the public key, then touches the private bucket with the service role). Request validation + `safePath` `core.mjs`; CORS allow-list = `https://mathix-sooty.vercel.app`, `http://localhost:5180`, `https://mathix-*.vercel.app` (`core.mjs:4-5`). Deployed `--no-verify-jwt` (`supabase/config.toml:414-415`).

### DB functions the board calls
`supabase/migrations/20261030120000_fixes.sql` + `20261114120000_fix_files.sql` (no later migration changes them).
| Function (live signature) | Does | File:line |
|---|---|---|
| `admin_fixes(tok)` | all items + `comments[]` + ready `files[]`, newest `updated_at` first | fix_files.sql:48-63 |
| `admin_fix_add(tok, topic, section, body, author)` | insert, status `new`; trims; author ≤ 40 chars, default 'צוות' | fixes.sql:46-56 |
| `admin_fix_comment(tok, item_id, author, body, new_status, has_files)` | comment and/or status; bumps `updated_at`; returns `{ok, id}` | fix_files.sql:67-86 |
| `admin_fix_edit(tok, item_id, topic, section, body)` | edit | fixes.sql:74-81 |
| `admin_fix_delete(tok, item_id)` | delete (cascade) | fixes.sql:83-89 |
| `admin_fix_file_begin / _ready / _paths / _delete`, `admin_fix_item_paths`, `admin_fix_link_add` | attachments (max 40 per item; link regex `^https?://[^\s/]+\.[^\s]+$`) | fix_files.sql:89-186 |
Grants: revoke from public, grant to anon+authenticated (fixes.sql:91-96, fix_files.sql:188-197). Tables: RLS on, `revoke all` from anon/authenticated (fixes.sql:27-29, fix_files.sql:37-38).

### What each field holds today (live DB, read-only, 2026-11-21)
Columns: `fix_items(id bigint, topic text NN, section text NULL, body text NN, status text NN, author text NN, created_at, updated_at)`; `fix_comments(id, item_id, author, body NN default '', status NULL, created_at)`; `fix_files(id, item_id, comment_id NULL, kind file|link, name, path, url, mime, size, ready, author, created_at)`.

- 87 items (max id 91), 219 comments (Claude 133, Sulaiman 86), 3 files (all `file`, on #84), 0 links, 0 unfinished uploads.
- Status now: done 75 · later 4 · **new 7 · reopened 1** (items #85–#91 were added 2026-11-21; #84 is reopened — the memory note "0 open" is already out of date).
- `topic` = always a registry slug or `general` (15 distinct values; `general` 4).
- `section` = free text, 33 of 87 are NULL. Values are chapter names **without the number** and sometimes with a sub-part: e.g. "הבנת חזקות", "חוקי חזקות", "שווה שוקיים / גובה לבסיס", "משולש שווה שוקיים - גובה/תיכון/חוצה זווית", "פרק 1", "מבנה וסדר". They do not match `CHAPTERS` names exactly (those have "1. " prefixes).
- `body` = plain Hebrew text, up to 593 chars; links inside are made tappable by `Linked`.
- `author` = items always "סולימאן" so far; comments "Claude" / "סולימאן".
- Example shape (#84): `{id:84, topic:"general", section:null, status:"reopened", author:"סולימאן", body:<348 chars>, comments:[3], files:[3 PDFs]}`. Example (#88): `{id:88, topic:"ratio-percent", section:null, status:"new", body:<179 chars>, comments:[], files:[]}`.

---

## 2. Content structure — how to enumerate everything

### Grades
- **Live source of truth = DB** `grades` + `topics.grade_ids uuid[]` + `topics.page 'slug.html'` (admin.sql:16-45). Already available to the admin as `useData(["catalog"])` → `admin_catalog(tok)` (admin.sql:179-189) returning `{grades, categories, topics, plans}`; the Content page uses it (`src/admin/pages/Content.jsx:18`). The public home reads the same tables (`src/home/Home.jsx:130-139`).
- Live mapping today: ז׳ = directed-numbers, angles-parallel, equation-solver, ratio-percent, triangles, solids3d · ח׳ = equation-solver, linear-function, triangles, equations-advanced, powers-roots, quadrilaterals, inequalities, pythagoras, solids3d · ט׳ = linear-function, equations-advanced, parabola-practice, powers-roots, intersection, inequalities, quadratic-solver, similar-triangles, circle, solids3d. A topic can be in several grades.
- Fallback (no DB): `src/home/catalog.js:9-42` (`GRADES` ids "7/8/9", `TOPICS[].g`, `cat`). It differs slightly from the DB (e.g. linear-function g8+9 in both, fine). `verify-logic.py` checks this file's texts — never edit its strings.
- Hidden modules `new` and `proofs` are **not** in the DB `topics` table nor `catalog.js`, so they have no grade. Show them in a separate "hidden / not yet placed" group.

### Topics
- `src/topics/registry.js`: `TOPICS[slug] = {title, topic(colour), file, hidden?}`, `LOADERS`, `STYLES`. 19 slugs on branch `proofs` (17 originals + `new` + `proofs` with `hidden:true`); on `main` 18 (no `proofs`). Generated by `tools/convert-topics.py`; `new`/`proofs` are hand-added (header comment :1-2).
- Topic route `app/topics/[slug]/page.tsx` (static params from registry, hidden → noindex).

### Chapters
- `src/home/chapters.js:6-26` `CHAPTERS[slug]` = the exact chapter-button texts (e.g. `"triangles": ["1. זוויות","2. סוגי משולשים","3. משולשים מיוחדים","4. חפיפה"]`). Includes `new` (22 chapters). **`proofs` is missing** (its buttons are `type.button` = "1. קוראים את הנתון", "2. מחפיפה לשוויונות", "3. הוכחת חפיפה", "4. חפיפה ואז מסקנה" from `src/topics/proofs/texts.js:11-14` + `types/*.js`).
- `RENAMED` :30-36 (old → new chapter names), `chapterTitle(c)` :39 strips the number ("3. מתחלפות" → "מתחלפות") — use it to match free-text `fix_items.section` to a chapter.
- `chapterStats(slug, rows)` :47 groups tracker rows by the part before " › ".
- Descriptions: `src/home/chapterInfo.js` — `TOPIC_INFO[slug]` :5-24, `CHAPTER_INFO[slug][chapterName]` :26-172, helpers `topicInfo()` :174, `chapterInfo()` :175.
- `new` module chapters also defined in `src/topics/new/chapters/index.js` (`ORDER` :8; `new.test.mjs` checks `chapters.js` matches).

### Sub-tabs inside chapters (not listed anywhere central)
Only discoverable from the DOM of each topic. Classes used: `.sub-tab` / `.sub-tabs` (angles-parallel, circle, directed-numbers, equations-advanced, inequalities, quadratic-solver, quadrilaterals, ratio-percent, similar-triangles, solids3d, triangles, proofs levels), `.sub-tab-btn` (triangles — nested: chapter → sub-tab → part), `.sub-btn` / `.sub-btns` (powers-roots, e.g. `Topic.jsx:114-115, 304-305, 409-410`), `.tab`. Proofs level tabs (חימום / רמה 1-3) can be `disabled` (locked) — `ProofChapter.jsx:180-184`.

### Deep links
- `/topics/<slug>?ch=<chapter button text>` — `TopicView.jsx:57-80`: clicks the matching `#root :is(.ch-btn, .nav-btn, .ph)` until it stays active 3 checks in a row (≤ 4 s), then removes `ch` from the address.
- **No sub-tab deep link** and **no question/seed deep link** exist. A `&sub=<text>` (or `a › b` path for nested tabs) can be added in the same loop in `TopicView.jsx` without touching `Topic.jsx`.
- Chapter-button classes: `.ch-btn` (most), `.nav-btn` (equations-advanced, parabola-practice), `.ph` (pythagoras/quadratic-solver variants). Active = `.active`.

---

## 3. "Specific question" capture

### DOM of a live exercise
- Everything renders inside `<div id="root">` (`TopicView.jsx:109`), `html[data-page=<slug>]` + `data-topic=<colour>` set on `<html>` (:24-26).
- Common building blocks (no MathJax/KaTeX in the project): `.card` with `.card-t` title (13 topics), `.step-card` (+ `.done`) (10), `.step-label` (8), given boxes with class containing `given` (10), `.q-box` (directed-numbers, ratio-percent, powers-roots), `.question` (6), `.eq-card`/`.section-title`/`.phase-title` (equations-advanced), `.task-title` (linear-function), `.tri-box` (pythagoras), `.ex-box` (parabola-practice); module `new`: `.card.nw-card` > `.card-t.nw-tag`, `.nw-ask`, `.nw-rows`, `.choice-btn.nw-choice` (`src/topics/new/Engine.jsx:112-165`). Square roots via `<Root>` (`src/components/Root.jsx`), drawings are inline `<svg>` (14 topics), solids3d may use three.js canvas.
- The runtime already knows the "where": `chapterOf()` = active chapter text + first active sub-tab joined with " › " (`src/lib/mp-runtime.js:199-203`); `stepOf(el)` = nearest `.step-card, .card, .eq-card, .step-item, .section, .tri-box` title (`.step-label, .card-t, .phase-title, .section-title, .task-title, .card-title`) (:204-208). Feedback vocabulary `SEL.win/bad/ok/chip` (:29-39).
- `mp-runtime` records only `{device, page:'<slug>.html', chapter, step, kind: view|ok|bad|win, mobile}` per event (:234) — **never the question text or numbers**. Exposes `window.MP = {sound, last, log, view, isSoundOn, setSound}` (:661-666) and fires `mp:win` with the chapter (:236).

### Same-origin iframe
- `/admin/*` and `/topics/*` are the same origin and nothing blocks framing (no `X-Frame-Options`/CSP in `next.config.ts`, no middleware/proxy, no vercel.json). So the admin page can `iframe.contentDocument.querySelector('#root …')` and read the active chapter, the visible card's `innerText`, and the SVG markup.
- Screenshots: no html2canvas-style dependency (`package.json`). Options: (a) copy the card's text + the page link into the request (recommended), (b) let the admin paste a screenshot — the board already supports paste/drop (`useDropPaste`), (c) later: serialize inline SVG → canvas → PNG (CSS from stylesheets won't follow).

### Are questions reproducible?
| Module | Random source | Reproducible later? |
|---|---|---|
| 17 original topics | `Math.random()` inside BEGIN/END ORIGINAL (e.g. `powers-roots/Topic.jsx:13`, `triangles/Topic.jsx:15-16`, `equation-solver/Topic.jsx:98-112`); no seed anywhere | **No.** Only the captured text/drawing describes it. (A seeded `Math.random` swap in the iframe before the topic loads is possible in theory but the sequence depends on every click — not reliable.) |
| `new` | `deck(ch, rand = Math.random)` (`src/topics/new/core.js:229-233`); a `seeded()` PRNG exists (:43-46) but Engine uses the default (`Engine.jsx:64`); each question carries `gen` (generator id) and `key` | Not exactly; capture `q.gen` from the card if exposed — today it is not in the DOM. |
| `proofs` (branch `proofs`) | fully seeded: problem = `type.remake({template, seed, level, variant, meta})`; ids look like `"3-X-SAS:20261121"` (`types/*.js`, `session.js:280-283`, `Topic.jsx:18-22`) | **Yes** — capturing `template + seed + level + variant` recreates the exact proof. Not in the DOM today; a `data-` attribute on the proof screen would be needed (own module, allowed). |
| Duels | seeded (`/admin/duels/questions?set=`, `DuelQuestions.jsx:1-30`) | Yes (already an admin pattern to copy). |

### Side effects of loading a topic inside the admin
- `mp-runtime` sends a `view` after 1.8 s (`TopicView.jsx:30`) and on each chapter click (`mp-runtime.js:430`), plus ok/bad/win events — **admin checks would become real student stats**, and if the browser is also signed in as a student (`localStorage["mp:account"]`), they go into that student's progress via `account_track` (:225-229).
- Proofs mastery / open proof live in this origin's localStorage/sessionStorage (`ProofChapter.jsx:19-24`) — shared with the iframe.
- `localStorage["mp:last"]` is overwritten (`TopicView.jsx:32`) → the home "continue" button points at whatever the admin last opened.
- Fix: in `mp-runtime.js` (not Topic.jsx) skip `track` when framed by the admin (e.g. `window.top !== window` or `?mpadmin=1`), and skip the `mp:last` write in `TopicView.jsx`.

---

## 4. The scheduled morning fix job (`mathproject-fixes-scan`)
Prompt: `~/.claude/scheduled-tasks/mathproject-fixes-scan/SKILL.md`.
- Reads (step 1, :11): `select i.id, i.topic, i.section, i.status, i.body, comments(a=author, s=status, t=created_at, b=body) from fix_items i where i.status in ('new','reopened')`. **It does not read `fix_files`** (memory: the update to read attachments was blocked 2026-11-14 and still waits for Abed's yes). The retired hourly copy `mathproject-fixes-scan-2h` (:14) did read files.
- Picks "reopened" first (latest comment = what's wrong), then "new"; skips review/done/later/working; ≤ 6 items per run grouped by topic (:14).
- Writes the same way the board does: comment row + `fix_items.status` (`working`, then `review` with a Hebrew note) (:17, :36).
- Uses `topic` as the slug to open `/topics/<slug>` and `src/topics/<slug>/Topic.jsx` (:19-26). `topic='general'` is understood as whole-site.
- **So for new requests to stay readable:** status must be `new` (what `admin_fix_add` sets); `topic` must be a real registry slug or `general`; everything needed must be in `body`/`section` text (not only in an attachment, not in a new column the query doesn't select); the "where" should read as plain Hebrew, e.g. section = exact chapter button text, body starting with a short location line + the question text + a full `https://mathix-sooty.vercel.app/topics/<slug>?ch=…` link.

---

## 5. Constraints to respect
- **PIN / sessions:** every admin action = a `security definer` DB function that starts with `perform admin_guard(tok)`; the client only ever holds the session token (`mp:admin`). Never a secret key in the site (project CLAUDE.md).
- **Grants for anything new:** tables → `enable row level security` + `revoke all … from anon, authenticated`; functions → `revoke execute … from public` then `grant execute … to anon, authenticated`; new identity sequences → `revoke all on sequence … from anon, authenticated` (pattern: `20261109120000_duels_final.sql:407`; live check: `fix_files_id_seq` has no anon usage — OK).
- **Catalog permission test** `supabase/tests/duels_catalog.test.sql`: allow-list :13-83; it asserts anon/authenticated can run only listed functions, every listed one exists, all are security definer, all tables have RLS, no table rights except SELECT on content tables. **It is already stale:** it still lists the old 5-arg `admin_fix_comment` (:42) and none of the 6 attachment functions, while the live DB has `admin_fix_comment(… new_status text, has_files boolean)`, `admin_fix_file_begin/_ready/_paths/_delete`, `admin_fix_item_paths`, `admin_fix_link_add` — so `supabase test db` should fail today. Fix the list in the same batch as any new function.
- **CSS:** admin styles live in `src/admin/admin.css` inside `@layer page`, every rule scoped `.adm-root …` (:4, :13-25). Existing admin prefixes: `fa- fx- st- du- dq- a- pin- hero- tl- item- quick- heat- kpi- donut- greet- gauge- fun- bl- tbl- sheet- msg- side- page- icon-` and plain names (`abtn ibtn badge card field row`). `account.css` owns `pf-` (247 uses). `cp-` is already used (11 hits). **Fresh, verified unused prefix: `cpl-`** (0 hits in src/, app/, public/; `qc-`, `insp-`, `rvw-` also free). Never register a generic `@property` (memory: `@property --p` broke duel pills 2026-11-11); the only one in the repo is prefixed `--jr-p` (`journey.css:39`). Use `--cpl-*` if needed.
- **verify-logic.py:** compares `Topic.jsx` BEGIN/END ORIGINAL with `html-v1` byte for byte, plus `public/classic` and the home texts in `app/layout.tsx, app/page.tsx, src/home/catalog.js, src/home/Home.jsx` (`tools/verify-logic.py:1-40`). The panel must not touch any of those; `TopicView.jsx`, `mp-runtime.js`, `src/topics/new/*`, `src/topics/proofs/*` are outside its check.
- Preview mode: add demo stubs in `api.js` for any new function. Localhost uses the local Supabase (`src/lib/config.js:14-27`); `?live=0` = real DB (don't use it for test answers). Dev server port 5180 (`package.json`), the only localhost origin in fix-files CORS.
- `next build` must pass; check desktop + 375 px; open every menu after header changes.

---

## 6. Recommendation

**Where:** a new route `app/admin/review/page.tsx` → `src/admin/pages/Review.jsx` (+ small parts in `src/admin/pages/review/`), styles appended to `admin.css` (or a new `src/admin/review.css` imported by the page) with prefix `cpl-`. Navigation: either a tab row inside "תיקונים" (like `DuelTabs` on the duels pages) so the phone bottom nav stays at 8, or a NAV entry plus changing `admin.css:458` to `repeat(9, 1fr)` (tight at 375 px — the tab row is safer).

**Layout idea:** left = tree (grade → topic → chapter → sub-tabs found live), right = same-origin iframe of `/topics/<slug>?ch=<chapter>`; a sticky "בקשת תיקון" bar with a level switch (כיתה / נושא / פרק / שאלה זו). Each tree node shows its open/review/done counts from `admin_fixes` (match `topic` by slug and `section` via `chapterTitle()` normalization — sections are free text, so treat matches as fuzzy and show "unplaced" items at topic level).

**Reuse:** `useAdmin().run`, `useData(["catalog"])` (grades + grade_ids), `TOPICS` (registry), `CHAPTERS`, `chapterTitle`, `TOPIC_INFO/CHAPTER_INFO`, `STATUS` (export from Fixes.jsx), `useName`/`PEOPLE` (export or move to a shared file), `Sheet`, `Empty`, `useToast`, `ago`, the whole attach kit (`AttachBar`, `usePending`, `sendPending`, `useDropPaste`, `Attachments`, `Viewer`, `Linked`), the `Item` card (export it to show a node's existing items with approve/reopen/comment in place).

**Mapping requests onto today's fields (no DB change):**
| Level | `topic` | `section` | `body` |
|---|---|---|---|
| Grade | `general` | `כיתה ח׳ · כל הכיתה` | the request |
| Topic | slug | empty | the request |
| Chapter | slug | exact button text, e.g. `2. סוגי משולשים` (+ ` › <sub-tab>`) | the request |
| Question | slug | chapter (› sub-tab) | request + a short "השאלה:" block with the captured text (and proof `template/seed/level/variant` when on proofs) + full `https://mathix-sooty.vercel.app/topics/<slug>?ch=…` link; optional screenshot via the existing attach flow, and the link also as a `kind:'link'` attachment via `admin_fix_link_add` |
Don't invent topic values like `grade-8`: the board's filter and edit sheet only know registry slugs + `general` (`Fixes.jsx:29-30, 180, 203`) and the morning job opens `/topics/<topic>`.

**DB change:** none needed for browse + comment + request. Only if Abed wants a persistent "checked ✓ by X on date" mark per chapter/question (without opening a board item), add one minimal migration: `content_checks(id identity, topic text, section text, author text, note text, created_at)` with RLS + revoke, `admin_content_checks(tok)` and `admin_content_check(tok, topic, section, author, note)` (guarded, revoke/grant, sequence revoke), demo stubs in `api.js`, and the two signatures added to the catalog test allow-list.

**Small code changes outside the page (all allowed, none in Topic.jsx):**
1. `mp-runtime.js` + `TopicView.jsx`: don't track and don't write `mp:last` when framed by the admin.
2. `TopicView.jsx`: optional `&sub=` deep link for sub-tabs.
3. `proofs` (branch only): expose `data-` template/seed/level/variant on the open proof; add `proofs` to `CHAPTERS`/`chapterInfo` when it ships.
4. Fix the stale allow-list in `supabase/tests/duels_catalog.test.sql`.

**Risks:**
- Admin checks polluting real stats / a signed-in student's progress (see §3) — must be fixed before going live.
- Original topics can't reproduce a question; the captured text (and an optional screenshot) is the only record.
- Free-text `section` values won't map 1:1 to chapters; counts per chapter are approximate.
- The daily job ignores attachments — put the essential info in `body` (or get Abed's yes for the job update).
- iframe topics re-render on chapter switch (`TopicView.jsx:63-64` note); reading the DOM needs short retries / a MutationObserver, and nested sub-tabs need the full active path, not only the first `.active` (runtime's `chapterOf` only takes the first sub-tab).
- Phone width: tree + iframe side by side won't fit at 375 px — stack them, iframe full width, request bar under the thumb.
- Branch split: `proofs` exists only on branch `proofs`; build the panel so a missing slug simply doesn't appear.
