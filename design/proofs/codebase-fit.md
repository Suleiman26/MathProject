# Proofs section (הוכחות בגאומטריה): how it fits the codebase

Read-only review, 2026-11-21. Paths are relative to `/Users/abedshalgam/MathProject`.
Nothing was run (no dev server, no tests, no build). Line numbers are from the files as read today.

## Verdict (short)

- **Own topic folder `src/topics/proofs/`**, built in the same *style* as the "חדש" module (pure-JS core + data files + node tests), re-using its `rich.jsx` math text and `geo.js` vector helpers. Do not squeeze proofs into the `new` engine.
- **Progress needs no new table to start.** The site already records every right/wrong step by *chapter button text › sub-tab text*. If proof type = chapter button and level = sub-tab, per-type-per-level numbers arrive in `account_progress().chapters` for free. Guests: a small localStorage store. Later (optional): one read-only DB function for a "last 10 answers" window.
- **Build first:** `ProofFigure` (data-driven SVG with tappable parts), `ProofTable` (statement–reason rows), reasons bank, `mastery.js` (levels), all with node tests.

---

## 1. The data-driven engine in `src/topics/new/`

### How it works
| Piece | File | Notes |
|---|---|---|
| Contract (chapter + question shapes) | `src/topics/new/core.js:4-40` | Chapter = `{id, name, grade, about, place, lesson[], gens[]}`; each generator = `{id, make(R) → question, verify(q)}` |
| Question shape | `core.js:18-36` | `tag, text, fig?, rows[] OR choices, swap?, hint?, steps[], data` |
| Answer kinds | `core.js:32-36`, `checkBox` `core.js:121-136` | Only **number box** (`{ans}` with optional `tol`), **fraction box** (`{frac}`), or **one multiple choice** (`choices:{options, correct}`) |
| Checking | `checkAll` `core.js:144-162` | All boxes at once; `swap` groups allow any order |
| Validation | `validate` `core.js:173-206`, `validateChapter` `core.js:207-226` | Enforces "exactly one of rows / choices" (`core.js:179`), ≥2 generators per chapter (`core.js:223`) |
| Random + deck | `seeded`/`makeR` `core.js:43-59`, `deck` `core.js:229-233` | Seeded RNG so tests are repeatable; deck shuffles generators in rounds |
| Screen | `src/topics/new/Engine.jsx` | Lesson tab + Practice tab (`Engine.jsx:196-217`); one card per question (`Engine.jsx:112-181`); "show solution" after 3 wrong tries does **not** count as solved (`Engine.jsx:73, 176, 190`) |
| Chapter row | `src/topics/new/Topic.jsx:19-32` | `.hdr` + `.ch-btns` of `.ch-btn` reading `"<n>. <name>"` |
| Math text | `src/topics/new/rich.jsx` | `<M s="…">` always `dir="ltr"` (`rich.jsx:65-67`); `<Rich text="עברית [[math]]">` (`rich.jsx:70-73`); uses shared `<Root>` (`rich.jsx:6, 56`) |
| Drawings | `figs.jsx:95-102` (lookup by `fig.type`), `figs-geo.jsx`, `figs-data.jsx`, `figs-kit.js` | All SVG, see §2 |
| CSS | `src/topics/new/styles.js` | Layout in `@layer legacy` (`styles.js:3-17`), everything else prefixed `nw-` under `#root` |
| Tests | `src/topics/new/new.test.mjs` | Run: `node --test src/topics/new/new.test.mjs`. Per generator: 3000 seeded questions (`new.test.mjs:10, 36-57`), each must pass `validate`, its own independent `verify`, "right answer accepted", "wrong answer rejected", and variety (≥12 different). Plus: home lists match the chapter buttons (`new.test.mjs:65-71`) |

### Can a proof chapter type be added there?
Technically yes, but it is the wrong home.

| | Add to `new` engine | Own folder `src/topics/proofs/` |
|---|---|---|
| Answer model | Engine knows only number / fraction / one choice (`core.js:32-36, 179`). A proof needs ordered rows, each with a **statement** pick and a **reason** pick, tappable figure parts, and fading help. That is a second engine inside the first. | Clean model made for proofs |
| Figures | `figs-geo.jsx` draws but nothing is tappable; layouts carry no ids | New figure with ids per segment/angle |
| Levels | None. One deck per chapter (`core.js:229`) | Level is a first-class input of the generator |
| Visibility | `new` is a hidden staging module ("until Sulaiman places each chapter", CLAUDE.md) with a "note for the team" strip (`Engine.jsx:206-209`) | Its own URL `/topics/proofs`, own colour, own railway station |
| Risk to existing 22 chapters | Any core change re-runs against all of them | None |
| Re-use | — | Still imports `rich.jsx`, `figs-kit.js`, `chapters/geometry/geo.js`, `seeded/makeR` from `new/core.js` |
| Cost | Less scaffolding | A few more files (Topic.jsx, styles.js, registry lines) |

**Simple rule:** copy the *pattern* (pure core + data + 3000-run tests), not the engine.

Note: `triangles` already has a chapter "4. חפיפה" (`src/topics/triangles/Topic.jsx:1816-2027`, `2282`) that teaches identifying the congruence theorem (צ.צ.צ, צ.ז.צ, ז.צ.ז…). Proofs are the natural next step after it; it is Sulaiman's code inside BEGIN/END ORIGINAL (`Topic.jsx:10, 2296`) and must not be edited.

---

## 2. Geometry drawings today

Everything is inline SVG, always with `direction:'ltr'` on the `<svg>` (e.g. `triangles/Topic.jsx:276-278`, `figs-geo.jsx:30`).

### A. Sulaiman's topics (inside ORIGINAL blocks: read for ideas, cannot import or edit)
| Helper | Where | What |
|---|---|---|
| `tickMarks(a,b,count)` | `src/topics/triangles/Topic.jsx:215-229` | 1–3 equal-length ticks at a side's middle |
| `rightAngleMark` | `triangles/Topic.jsx:231-243` | right-angle square |
| `angleArcAtVertex`, `fitAngleLabel` | `triangles/Topic.jsx:144, 174` | arcs + measured label placement |
| `sideLabel` | `triangles/Topic.jsx:200-213` | label pushed outward from the edge |
| `TriSVG` | `triangles/Topic.jsx:245-…` | props `equalSides`, `equalAngles`, `rightAt`, `highlight`, `heightLine`, **`onClick('s0')`** on side labels (`:289-291`) |
| `DualTriSVG` | `triangles/Topic.jsx:1872-1925` | two triangles side by side, `marks.sides` (tick counts, red) + `marks.angles` (1–3 arcs, violet): exactly the congruence notation |
| `QuadBase`, `RightSquareMark`, `SegTick` | `src/topics/quadrilaterals/Topic.jsx:88, 162, 181` | quadrilateral with `ticks`, `parallelArrows`, `diagonals`, `onPart` (tappable parts) |
| `TwoLinesSVG`, `ParallelLinesSVG` | `src/topics/angles-parallel/Topic.jsx:91, 128` | tappable angles (`onClick`, `selected`) |
| `RightMark` | `src/topics/similar-triangles/Topic.jsx:78` | |

These are local functions inside each Topic.jsx, not exported. They cannot be shared without touching the ORIGINAL block.

### B. The "חדש" geo pack (ours: importable, tested style)
| Piece | Where | What |
|---|---|---|
| Vector maths | `src/topics/new/chapters/geometry/geo.js:10-42` | `add sub mul dot lerp dist unit centroid area angle anglesOf triFromAngles triFromSides distPointSeg` |
| Text boxes | `geo.js:45-48` | `textW`, `reach`: label size estimates so labels are placed by measuring |
| Triangle layout | `triLayout` `geo.js:61-128` | spec: `angles|sides, names, sideLabels, angleLabels, right, ticks, ext, median`. Returns plain data `{fills, segs[{a,b,kind}], arcs, labels[{x,y,w,h,text,kind}], bbox}` |
| Rules built in | `geo.js:79-89, 98, 110-111` | angle value on the bisector clear of rays; too-sharp angle → value goes beside the letter; no length under a median-cut side |
| Frame / two triangles | `frame` `geo.js:144-147`, `figSim` `geo.js:154-169` | centres in a 340-wide viewBox; two triangles on one baseline |
| Renderer | `src/topics/new/figs-geo.jsx:26-37` | one `<Draw>` paints fills, segs, arcs, labels; labels have a white outline (`figs-geo.jsx:20`, `paintOrder="stroke"`) |
| Palette | `src/topics/new/figs-kit.js:2-5` | `INK, MUTED, LINE`, `col('a'|'blue'|'orange'|…)`; `a` = `var(--a-600)` (topic accent) |

**What is missing for proofs:** ticks are single only (`geo.js:106-107`: one tick, no count), no equal-angle arcs with counts, no parallel arrows, no ids on parts, no tap targets, no shared-side / overlapping-triangle figures, no quadrilaterals with diagonals. `triLayout` is triangle-only.

**Design rule to keep** (DESIGN.md:133-135, ui-decisions memory): labels never sit on a line; place them by measuring. Drawings get the faint dotted stage when wrapped in `.svg-wrap` / `.tri-wrap` (`src/styles/mp.css:851-858`).

---

## 3. Progress: how it is recorded and shown

### The pipeline today
1. **The runtime watches the page; exercises never call it.** `src/lib/mp-runtime.js:28-41` lists the classes: `ok` = `.fb.ok, .step-card.done, .choice-btn.correct…`, `bad` = `.fb.err, .choice-btn.wrong…`, `win` = `.banner…`. A MutationObserver (`mp-runtime.js:268-306`) reacts only within 1.6 s of the student's own action (`:270`), ignores added nodes with more than 40 descendants (`:261`), and takes the strongest of ok/bad/win per batch (`:250-257`).
2. **One row per event:** `{device, page, chapter, step, kind, mobile}` (`mp-runtime.js:234`).
   - `page` = `<slug>.html` from the URL (`:218`).
   - `chapter` = text of `.ch-btn.active` + `" › "` + text of the active `#root .sub-tab / .tab` (`:199-203`), max 150 chars.
   - `step` = text of `.step-label` / `.card-t` in the closest `.step-card` / `.card` (`:204-208`), max 190 chars.
3. **Sent** in batches (`:221-230`): signed in → `account_track(tok, rows)`; guest → plain insert into `events`.
4. **Database:** table `events` (`supabase/migrations/20261024120000_admin.sql:48-58`; `kind in ('view','ok','bad','win')`), column-level insert grant for anon (`20261030130000_public_grants.sql:7`), `account_track` (`20261031100000_accounts.sql:235-244`). Sign-up moves the device's earlier anonymous rows into the account (`20261031100000_accounts.sql:147-149`).
5. **Read back (signed-in only):** `account_progress(tok).chapters` = per `(page, chapter)`: `ok, bad, win, last` (`20261031110000_progress_chapters.sql:46-51`); `account_topic(tok, page)` = chapters + most-missed steps (`20261031120000_progress_v2.sql:134-158`). Client calls: `src/lib/account.js:97-99`.
6. **Shown:** `chapterStats(slug, rows)` groups by the part **before** `" › "` (`src/home/chapters.js:47-64`; accuracy only when n ≥ 4, `:63`); weak chapter = n ≥ 6 and < 65% (`src/home/Journey.jsx:30`); topic levels by solved count `LEVELS = [0,1,5,15,30]` and XP 10 per win + 1 per ok (`src/lib/progress.js:4, 24-28`); ✓ on solved chapter tabs (`src/components/TopicView.jsx:36-55`); `?ch=<button text>` opens a chapter (`TopicView.jsx:57-80`).
7. **Guests** have no read path: anon can only insert. Device-only memory today is small localStorage keys (`mp:device`, `mp:last` `TopicView.jsx:32`, `mp-new-seen-<id>` `Engine.jsx:197`, `mp:next:<uid>` `src/lib/next-step.js:6`).

### Is there anything per-"skill" today?
No. The finest grain is `(page, chapter-with-sub-tab, step label)`, all lifetime counts. No per-skill table, no mastery level, no rolling window. Topic "levels" (`progress.js:4`) count solved exercises, not % correct.

### Least invasive way to get per-proof-type attempts, % correct and level 1/2/3

**Phase 1: zero database changes (recommended start).**
- Make each **proof type a chapter button** (`.ch-btn`, text `"<n>. <name>"`) and each **level a sub-tab** (`.sub-tab`, text e.g. `רמה 2`). Then every step check is stored as `chapter = "2. חפיפה צ.ז.צ › רמה 2"` with no new code, for guests and signed-in students alike, and shows up in admin stats too.
- Render feedback with the existing vocabulary so the runtime counts it: correct step → `.step-card.done` or `.fb.ok`; wrong → `.fb.err`; proof finished → `.banner`. Put a stable short label in `.step-label` (e.g. `טענה 2 · נימוק`) so admin "most-missed steps" is meaningful.
- A step completed with "show me" must **not** get an ok class (same rule as `Engine.jsx:73`), otherwise help counts as correct.
- Signed-in read: `accountApi.progress()` → rows where `page === "proofs.html"`; split `chapter` on `" › "` into type + level. `chapterStats` keeps working for the railway because it already ignores the sub-tab part.
- Guests + instant UI: `src/topics/proofs/mastery.js` keeps `localStorage["mp:proofs:v1"] = { [typeId]: { level, recent: [1,0,1,…] (last 10–12 step results at the current level), n, ok } }`. Updated by listening to the runtime's own `window` event `mp:fb` (`mp-runtime.js:367-369`, `detail.kind` ok/bad/win), so the count is exactly what the server got.
- Level rule (pure function, tested): at level L, unlock L+1 when `recent` has ≥ 8 results and ≥ 80% right (numbers to be agreed with Sulaiman); drop back a level under ~50%. On a new device a signed-in student is seeded from the server rows (lifetime ok/bad of the `› רמה L` rows: because levels are separate rows, level 2 accuracy is not dragged down by level 1).
- Honest limits: server numbers are lifetime, not "recent"; a guest's level lives on one device until sign-up; the stored `chapter` uses the Hebrew button text, so renaming a proof type needs a `RENAMED` entry (`src/home/chapters.js:30-36`).

**Phase 2 (only if a true cross-device "recent %" is wanted): one read-only function, still no new table.**
- New migration `supabase/migrations/<date>_proofs_levels.sql`: `account_proof_levels(tok text) returns json`, `security definer set search_path = public`, uses `account_from(tok)` like the others, selects the last N `ok/bad` events per `chapter` for `page = 'proofs.html'` with `row_number() over (partition by chapter order by at desc)`. End with `grant execute … to anon, authenticated` (pattern: `20261031120000_progress_v2.sql:169`). No table → no table grants needed. Apply with `supabase db push`.
- Add the function to the allow-list in `supabase/tests/duels_catalog.test.sql` (`:94-100`: anon may run only allow-listed functions).
- If the admin should see per-type mastery: a new `admin_*` function that starts with `admin_guard(tok)` (`20261024120000_admin.sql:151`). Existing admin stats already list proofs per chapter/step with no change.

**Not recommended now:** a `proof_skill` table written by the client (new table + grants + write function + trust in a client-reported level) for something the events table already holds.

### Home / railway hooks (needed whichever phase)
- `src/home/chapters.js:6-26`: add `"proofs": ["1. …", …]` exactly as the buttons read.
- `src/home/chapterInfo.js`: one "what is it about" line per chapter.
- Copy the parity test from `new.test.mjs:65-71` so the lists can't drift.
- Catalog: `src/home/catalog.js:35-41` (geo topics) or admin → Content. Until ready, leave it out of the catalog like `new` (URL only).

---

## 4. Design system: what a proof screen should re-use

### Foundations
- Layers: `@layer mp-base, legacy, mp, page` (`src/styles/mp.css:17`). `mp` sets the look, topic CSS in `legacy` sets layout only (DESIGN.md:31-44). Topic CSS ships as a string from `styles.js`, injected by `TopicView.jsx:107`.
- Font: **Rubik** for Hebrew and Latin, weights 400–900 (`app/layout.tsx:2, 10`; `--font` `mp.css:52`; forced on everything `mp.css:127`). Never letter-spacing on Hebrew (`mp.css:91`).
- Tokens (`mp.css:49-99`): `--bg --surface --line --ink --ink-2 --ink-3`, `--ok-* --bad-* --warn-*`, radii `--r…--r-pill`, shadows `--sh-1..3`, `--ring`, motion `--ease-out --t --pop --shake-ease`, question scale `--q-ask --q-math-p --q-meta --q-hint`, control height `--ctl-h: 56px`.
- Topic accent: `data-topic` on `<html>` gives `--a-50…--a-900` (`mp.css:102-110`; set from the registry in `TopicView.jsx:25`). Green/red are reserved for right/wrong (DESIGN.md:55); accent fills only the check button (DESIGN.md:177-181). No emoji in feedback.

### Ready-made parts (class vocabulary, DESIGN.md:59-80, 146-197)
| Proof need | Re-use |
|---|---|
| Page header + proof-type row | `.hdr` + `.ch-btns` / `.ch-btn` (one swipe row on phones, mp.css §11 `:758`; scroll-into-view trick `src/topics/new/Topic.jsx:13-18`) |
| Level 1/2/3 switch | `.sub-tabs` / `.sub-tab` (also what the tracker reads) |
| "נתון" / "צריך להוכיח" | `.given-box` (grey chip) and `.q-text` (question line) |
| The figure | wrap in `.svg-wrap` or `.tri-wrap` (dotted stage, `mp.css:851-858`) |
| One proof row | `.step-card` + `.step-label` (white card, accent spine at the start; `.done` = green) |
| Statement / reason options | `.choice-row` + `.choice-btn` (`.active .correct .wrong`; finger-sized grid on phones, mp.css §12e `:979`) |
| Feedback | `.fb.ok` / `.fb.err` (pill with SVG icon), `.feedback-warn` for "fill this first" (`mp.css:643`) |
| Check / next | a button saying `בדיקה` (runtime adds `.mp-check`, DESIGN.md:187), `.btn.bp`, `.btn.bg` |
| Proof finished | `.banner` (chime + confetti + `win` event, automatic) |
| Hints / theory | `.info-box` / `.def-box` (auto-folds on phones when > 220px, DESIGN.md:193) |
| Math in text | `<M>` / `<Rich>` from `src/topics/new/rich.jsx`; roots via `src/components/Root.jsx` |
| Sounds + motion | automatic from the classes (DESIGN.md:82-97); by hand: `MP.sound('ok')` |

### Phone patterns
- Topic pages keep their own top bar (`src/components/TopBar.jsx`); the phone **bottom nav is never on topic pages** (CLAUDE.md, `BottomNav.jsx`). So the proof screen owns the bottom of the screen: a sticky "reasons" tray or the check button can live there.
- Bottom sheet: `Sheet` in `src/duel/Sheet.jsx:29` with CSS `.dl-sheet*` in `src/styles/duel.css:293-318` (bottom sheet on phones, centred card from 640px, drag to close). It is duel-private (prefix `dl-`, duel.css is not loaded on topic pages). For a reasons bank: build a small `pf-sheet` on the same pattern rather than importing duel CSS.
- Keypad (`src/components/Keypad.jsx`) mounts on every topic (`TopicView.jsx:110`) and only opens for text inputs. A tap-only proof screen never triggers it. If a number box is ever needed, give it `inputMode="numeric"` (`Keypad.jsx:47`).
- Side calculator: off unless the topic is listed in `src/lib/calc-topics.js`. Leave proofs out.
- Everything pressed ≥ 40px (DESIGN.md:129-130).

### "Worlds" colour
Geometry is world **`geo`** (`zoneKey` `src/home/worlds.js:9-15`; catalog area `geo` `src/home/catalog.js:21`), colour scale **coral/orange** `--w-0…--w-9` (`src/styles/journey.css:19`). On the home, the proofs card takes that colour automatically from its area. On the topic page the accent is the registry `topic` value: taken in geo today are sky (triangles, circle), cyan (quadrilaterals), indigo (pythagoras), orange (similar-triangles), teal (angles, solids). `violet` is free among geometry topics and reads well next to green/red feedback; `orange` would match the world but is close to the amber "warn" colour.

---

## 5. Constraints and gotchas

1. **ORIGINAL blocks.** Never edit between `// ===== BEGIN ORIGINAL =====` and `END ORIGINAL` in any `Topic.jsx`. `tools/verify-logic.py` compares each topic with its HTML at git tag `html-v1`; it loops only over the `.html` files in that tag (`verify-logic.py:64-70`), so a brand-new `src/topics/proofs/` is not checked and cannot fail it. It must still end with "math and text untouched".
2. **Registry is generated.** `src/topics/registry.js:1-2`: made by `tools/convert-topics.py`; `new` was hand-added and a re-run would drop it. `proofs` needs the same three hand-added lines (TOPICS, LOADERS, STYLES) and the same warning comment. `app/topics/[slug]/page.tsx` builds only registry slugs (`dynamicParams = false`).
3. **RTL with LTR math.** The page is RTL. Every math run must be an LTR island:
   - `<M>` renders `<span dir="ltr" class="nw-m">` (`rich.jsx:65-67`); rows wrap math + boxes in `dir="ltr"` groups while the line stays Hebrew order (`Engine.jsx:125-131`).
   - Sulaiman's own pattern for geometry statements: `<span dir="ltr" style={{unicodeBidi:'isolate',whiteSpace:'nowrap'}}>AM ⊥ BC</span>` (`triangles/Topic.jsx:1465`), `<span dir="ltr">⇐ △ABC ≅ △DEF</span>` (`:1941`).
   - Per-topic CSS helpers all use `direction:ltr; unicode-bidi:isolate; white-space:nowrap` (`src/styles/topic-fixes.css:53, 128, 160, 209`; duel `.dmx` `src/styles/duel-arena.css:651`).
   - Proof statements (`AB = CD`, `∢ABC = ∢DEF`, `△ABC ≅ △DEF`, `AB ∥ CD`) need one `pf-m` island class with those three properties. Caveat: `rich.jsx:42` turns every lowercase latin letter into an italic variable; proofs use capitals, so fine, but symbols ∢ △ ≅ ∥ ⊥ pass through as plain text (untested in this review: check glyph coverage in Rubik on iPhone; fall back to SVG marks if a glyph is missing).
   - Never glue a Hebrew prefix to a math island (ו-, ב-, ש-…): `docs/superpowers/specs/2026-11-10-duel-questions-style.md:13, 42-51`.
   - Arrows flip meaning in RTL: Sulaiman writes `⇐` for "therefore" inside an LTR span (`triangles/Topic.jsx:1941`). Decide one convention and keep it inside islands.
   - SVG: always `direction: ltr` on the `<svg>`.
4. **CSS names.** Private prefix for everything (`pf-`), scoped under `#root`. Never register a generic custom property: `@property --p` once broke other pages; the only registered one is prefixed (`src/styles/journey.css:38-39`). Same for keyframe names.
5. **Runtime quirks that affect tracking.** Feedback must appear within 1.6 s of the tap (`mp-runtime.js:270`); a newly added node with > 40 descendants is ignored (`:261`), so add a small feedback element, not a whole re-rendered card; only one event per mutation batch (strongest wins), so don't show ok and win in the same render if both should count; a button whose text matches `בדוק|בדיקה|אישור|✓` is treated as the check button (`:248`); pressing check with empty boxes gives an amber nudge instead of a wrong (`:397-405`).
6. **Chapter names are data.** Button text is the key in `events.chapter`, `chapters.js`, `chapterInfo.js`, `?ch=`. Renames need `RENAMED`. Limit 150 chars including `" › רמה N"`.
7. **Database rules.** New tables need explicit grants; public functions are `security definer` + `grant execute`; admin functions check the PIN session; no secret keys in the site; anon functions must be added to the catalog test allow-list. Migrations via `supabase db push`.
8. **Deploy.** `.vercelignore` skips `*.md`, `tools/`, `design/`, most of `supabase/`: keep all proof code under `src/`. Deploy is manual to mathix (CLAUDE.md top). New site sections stay `noindex` per the global rule.
9. **Checks before finishing** (CLAUDE.md): `python3 tools/verify-logic.py`, `npx next build`, node tests, and a look at 375px. Dev preview pages follow `app/dev/roots/page.tsx` (`notFound()` in production).
10. **Content ownership.** Sulaiman owns the math. Proof texts, the reasons list wording and the level thresholds should be reviewed by him (the `new` module solved this with a visible "note for the team" strip and by staying out of the catalog).

---

## 6. Recommendation

### Where the code lives
```
src/topics/proofs/
  Topic.jsx          App: .hdr + .ch-btns (one button per proof type) → <ProofChapter>
  styles.js          layout in @layer legacy + pf-* rules under #root
  core.js            pure JS: proof model, checkStep(), validateProof(), level fading
  mastery.js         pure JS + thin localStorage wrapper: record(), levelOf(), seedFromServer()
  reasons.js         the reasons bank: { id, short, full, family } (Hebrew text, Sulaiman reviews)
  figure-core.js     pure JS: build a figure from points + parts with ids; label placement
  ProofFigure.jsx    SVG renderer: tappable segments / angles, tick + arc counts, highlights
  ProofTable.jsx     statement–reason rows (.step-card), fed by core.js
  ReasonSheet.jsx    phone bottom sheet / desktop side list for picking a reason
  ProofChapter.jsx   one proof type: level sub-tabs, given / to-prove, figure, table, banner
  types/<id>.js      one file per proof type: { id, name, grade, about, lesson, gens:[{id, make(R, level), verify}] }
  types/index.js     order of the types
  proofs.test.mjs    node --test: contract, 3000 runs per generator per level, mastery rules, home-list parity
app/dev/proofs/page.tsx + src/dev/ProofsLab.jsx   local preview of every figure / state (not found in production)
```
Hand edits elsewhere: `src/topics/registry.js` (3 lines), `src/home/chapters.js`, `src/home/chapterInfo.js`, later `src/home/catalog.js`. Imports from existing code: `src/topics/new/rich.jsx` (`M`, `Rich`), `src/topics/new/figs-kit.js`, `src/topics/new/chapters/geometry/geo.js` (vector maths, `textW`), `seeded`/`makeR` from `src/topics/new/core.js`, `useAccount`/`accountApi` from `src/lib/account.js`.

### Proof model (sketch)
```
proof = {
  type, level,
  given:   [ {s:'AB = DE'}, … ],          // LTR islands
  toProve: {s:'△ABC ≅ △DEF'},
  figure:  { points:{A:[x,y],…}, segs:[{id:'AB',…}], angles:[{id:'ABC',…}], marks:{…} },
  rows: [ { statement:{s, parts:['AB','DE']}, reason:'given' | 'common-side' | 'sas' | …,
            ask:'statement' | 'reason' | 'both' | 'none' } ],   // what the student fills at this level
  distractors: { statements:[…], reasons:[…] },
}
```
Fading by level is one pure function: level 1 = most rows pre-filled, student picks reasons from 3 options with the figure highlighting the parts; level 2 = student picks statements and reasons from the bank; level 3 = empty table, order matters only where logic needs it. `verify(q)` re-derives each statement from the figure's coordinates (lengths / angles equal within tolerance), the same "independent check" idea as `new.test.mjs:44-45`.

### How level / mastery data flows
```
tap → core.checkStep → ProofTable renders .step-card.done / .fb.err / .banner
   → mp-runtime sees the class → event {page:'proofs.html', chapter:'<type> › רמה N', step, kind}
        → guest: insert events        → signed in: account_track
   → window 'mp:fb' → mastery.record(type, level, ok|bad) → localStorage 'mp:proofs:v1'
        → mastery.levelOf(type) → which sub-tab is open / unlocked, level-up moment
on load (signed in): accountApi.progress().chapters → rows of proofs.html → mastery.seedFromServer()
home railway: chapters.js + chapterStats → per-type bars, ✓, "worth strengthening" (existing rules)
```
Phase 2 swaps the seed call for `account_proof_levels` (one read-only function) when a true cross-device recent-% is wanted.

### Build order
1. **`figure-core.js` + `ProofFigure.jsx`**: points → segments/angles with ids; tick counts 1–3, equal-angle arcs 1–3, right-angle, parallel arrows; tap targets ≥ 40px (invisible wide stroke over thin lines); states idle / picked / proven; labels placed by measuring. Node test: no label on a line, all inside the viewBox (the check `geo.js:1-3` describes).
2. **`reasons.js`**: ids + wording, grouped (given, common side, vertical angles, parallel-line angles, congruence theorems, "corresponding parts of congruent triangles", isosceles…). Sulaiman signs off the wording.
3. **`core.js` + `ProofTable.jsx`**: the row model, fading, checking, step labels for tracking.
4. **`mastery.js`** with tests for the level rules and the server seed.
5. **`ReasonSheet.jsx`** (phone-first), then `ProofChapter.jsx`, then the first 2–3 proof types end to end, then the dev preview page and the 375px review.

### Open questions for Abed / Sulaiman
- Which proof types and for which grades (congruence only, or also isosceles, parallel lines, quadrilateral properties)?
- Thresholds for moving up (suggested: 8+ answers at ≥ 80% at the current level) and whether a student can drop back.
- "% correct" per step check (what the site measures everywhere today) or per whole proof solved without a mistake?
- Topic accent on the page: violet (free among geometry topics) or orange (matches the geometry world).
- Visible in the catalog from day one, or URL-only until checked (like `new`)?
