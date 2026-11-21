# בקרת תוכן: early review (third agent)

Date: 2026-11-21. Reviewer: the test-kit agent (no product code edited).
Commits reviewed: `50851d1` (phase 0), `04bc0c5` (snapshot + frame check), `694cfef` (content_checks),
`f7407a6` (Item export, tabs, rail, review.css), `dcdd156` (data adapter, tree model), `c74c1ec` (the screen).
End-to-end run: `design/admin-review/e2e/run.mjs` (WebKit + Chromium × 1440×900 + 393×852), results at the bottom.

Verdict: **no critical or high issue.** Phase 0 does what design §6 asks (proven in the browser: 0 stats from
the frame with a signed-in student in the same browser, mp:last kept, and a plain tab still sends stats); the
migration is safe; the serializer keeps the math; the panel's request bodies match design §8 at all 6 levels in
both engines and both sizes. Open: small tap targets on the phone (M3) and the latent choice-label bug (M1).

| Severity | Count |
|---|---|
| Critical | 0 |
| High | 0 |
| Medium | 2 open (M1, M3) + 1 fixed (M2) |
| Low | 9 |
| Info | 5 |

What I checked: read every changed line of the three commits; `python3 tools/verify-logic.py` →
"math and text untouched" (no `Topic.jsx` ORIGINAL block touched; `git diff main -- 'src/topics/*/Topic.jsx'` is empty);
`node --test src/admin/review/snapshot.test.mjs` → 33/33; extra serializer probes (below); grep for every
other stats / storage / network path a topic page can take; catalog test allow-list vs. the real signatures.
Not checked yet: `supabase test db` (no local Supabase running, and I don't start Docker), the header on a
real Vercel preview (checked on the local dev server only, see the e2e run).

---

## Medium

### M1. Answer choices whose label looks like an action word vanish from the snapshot
- Where: `src/admin/review/snapshot.js:43` (`ACTION`) used in `leaf()` (`snapshot.js` ~line 190, `if (!label || … || ACTION.test(label)) return ""`).
- Scenario: a multiple-choice answer button (`.choice-btn`) labelled e.g. `עוד 2`, `פחות מ־5`, `המשך הסדרה`,
  `אישור`, or any label **containing** `חדש` (that alternative has no word boundary, so `חדשה`, `חדשים` match)
  is dropped. Probe: `<button class="choice-btn">חדשים</button><button class="choice-btn">x = 3</button><button class="choice-btn">עוד 2</button>`
  → `"[x = 3]"` (two of three options gone, and if the dropped one was the picked one, "נבחר:" is wrong too).
  Today no literal option array in `Topic.jsx` contains these words (grepped), so this is latent, but the
  frozen question is exactly what Sulaiman relies on.
- Fix: never run `ACTION` on answer choices: `if (has(n, "choice-btn") || attr(n, "aria-pressed") != null) → treat as a choice`;
  and give `חדש` the same whole-word guard as the others (or narrow it to `תרגיל חדש|שאלה חדשה`). Add the probe as a test.

### M2. FIXED in `dcdd156` — `data.js` `siteVersion()` lost the version on the real deploy
- Where: `src/admin/review/data.js` last line: `siteVersion = () => String(process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA || "").slice(0, 7)`.
- Scenario: mathix is deployed with `git archive | vercel deploy` (CLAUDE.md), not from git, so
  `NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA` is empty → every request body ends without `גרסה …` (design §8 sample has it).
  `src/admin/review/version.js` already solves this (export-subst) but `data.js` doesn't use it.
- Fix: `export { siteVersion } from "./version";` in `data.js` (and delete the local one). **Done** (`data.js:14`); the e2e body ends with `גרסה dev` locally as designed.

### M3. Tap targets under 40px on the phone (393×852)
- Where: `src/admin/review.css` (`.cpl-b.sm`, `.cpl-tabs a`, `.cpl-chip`/filter chips, `.cpl-who`, `.cpl-by button`, `.cpl-more`, the toast button) and the board's `Item` actions inside `.cpl-items`.
- Measured by the e2e kit (both engines): list — "מי בודק?" 107×36, tabs "בקרת תוכן" 91×34 / "כל התיקונים" 126×34, hint "הבנתי" 41×35, progress "לאשר תיקון" 108×34, filters 164×38 / 82×38; report form — "רמה אחרת…" 241×34, attach "תמונה או PDF" 130×36 / "קישור" 83×36, **"שולח: בחרו" 27×37**; requests sheet — "לדחות לאחר כך" 179×36, "תגובה" 150×36, an item's link 193×26, toast "לראות" 59×32. (Tree rows, the bottom bar, scope rows, reason chips and שליחה are all fine.)
- Scenario: Sulaiman on his phone mis-taps the small ones; "בחרו" (switch sender) is the worst.
- Fix: `min-height: 44px` (at least 40) for those classes under the phone media query; give "שולח: בחרו" padding so its box is ≥ 40×40; the inline link can stay text but with `padding-block` so its box reaches 40.

---

## Low

### L1. A signed-in student's `last_seen` is still touched from the frame
- Where: `src/lib/account.js:48` (`account_me` on start) and `src/components/TopicView.jsx:46` (`accountApi.topic`) →
  `account_from()` updates `accounts.last_seen` (`supabase/migrations/20261031100000_accounts.sql:77`).
- Scenario: Sulaiman's phone is also signed in as a test student; in the panel's frame the topic page reads
  `account_me` / `account_topic`, so admin → Students shows that student "seen now". No answers, no progress,
  no points are written (verified: `track()` is fully off in the frame). The admin page itself (layout → `DuelLayerMount` → `useAccount`) already does the same.
- Fix (optional): accept and note it in design §6 "Not covered"; or skip `account_topic` when `isAdminFrame()` (the ✓ marks on tabs would then be missing in the preview, which is arguably right for an admin).

### L2. `readPlace()` takes every `.active` button of the sub-tab classes, difficulty rows included
- Where: `src/admin/review/snapshot.js` `readPlace()`; e.g. `src/topics/powers-roots/Topic.jsx:707` draws the difficulty row with the same `.sub-btn` class as the laws row (`:305`).
- Scenario: the section becomes `chapter › <law> › <difficulty>` (or the other order, by DOM order). The `&sub=` loop then clicks both in DOM order, which works when both rows exist at once; a row that only appears after the other is clicked still works because each step waits. So it is only noisier `section` text, not a broken link.
- Fix (optional): keep it (it is "where he was") or skip buttons whose row has no number prefix.

### L3. Un-✓ deletes the chapter's history
- Where: `supabase/migrations/20261121100000_content_checks.sql` `admin_content_uncheck` (delete).
- Scenario: matches design §5 ("deletes that chapter's rows"), but the header calls the table "the history of who checked what"; an accidental un-✓ erases it with no trace.
- Fix (optional): insert a tombstone row (`author`, `kind='uncheck'`) and let `admin_content_checks` ignore chapters whose latest row is a tombstone. Not needed for phase 1.

### L4. `&sub=` gives up silently
- Where: `src/components/TopicView.jsx` deep-link loop (`if (tries > 40) done()`).
- Scenario: a renamed sub-tab → the page stays on the chapter's first sub-tab; the panel (or the morning job) believes it opened the right place. Fine for students; for the panel, compare `readPlace()` after load with the wanted path and show "הלשונית לא נמצאה" instead of silently reporting from the wrong sub-tab.
- Fix: panel side only (UI agent).

### L5. The frame-check tool and my e2e both rely on the LOCAL Supabase URL being faked
- Where: `tools/review-frame-check.mjs` routes only `127.0.0.1:56421`.
- Scenario: if a run starts with `?live=0` in the session (sessionStorage `mp:live0`), localhost talks to the LIVE database and the fake misses it. Not a product bug.
- Fix: also route (and abort) `https://uucqyjskkyrfhvbsmorx.supabase.co/**` in any test script. My `design/admin-review/e2e/run.mjs` does, and fails the run if anything tries.

### L6. Proofs' in-frame storage is per module load
- Where: `src/topics/proofs/ProofChapter.jsx` (`framed` cached at module level).
- Scenario: correct (the module is loaded per window, and a frame's top never changes). Only noting that the shadow copy also hides the device's later writes from another tab during the frame's life. Harmless.

### L7. First report without a name needs a second tap on "שליחה"
- Where: `src/admin/pages/review/ReportForm.jsx` `send()` → `needName` → the "מי שולח?" buttons only `setName`.
- Scenario: the first time on a device (no `mp:fix-name`), tapping שליחה swaps the button for "מי שולח? סולימאן / עבד"; after picking, the form shows שליחה again and he must tap it again (seen in every e2e run). Design §8 promises 2 taps + a sentence.
- Fix: after the pick, send at once (`setName(p); onSend(...)` with that name).

### L8. The guard pill can turn red for good on a slow first load
- Where: `src/admin/pages/review/frame.js:66-73` (`poll` gives up after 24 × 250 ms and sets `guard:false`).
- Scenario: a cold phone load where the topic page hydrates more than ~6 s after the iframe `load` event → the pill says "נספר!" / "זהירות: התשובות כאן נספרות" and never re-checks, though the guard is on. False alarm only (the guard itself is in the page).
- Fix: keep checking (e.g. in `read()`, which runs on every DOM change) and set `guard:true` as soon as `MP.adminFrame` appears; show red only while `MP` exists and says false.

### L9. `missingFn` treats any message containing "404" as "the ✓ functions are missing"
- Where: `src/admin/review/data.js` `missingFn` regex `/…|404/`.
- Scenario: an unrelated error text with 404 makes ✓ fall back to this device only. The screen does say so (`localChecks`), so it is visible, not silent.
- Fix: match PostgREST's `PGRST202` / "Could not find the function" only (drop the bare `404`).

---

## Info (checked, fine)

- **I1. Guard logic** (`src/lib/admin-frame.js`): same-origin + `/admin` path read from `window.top`; cross-origin throws → `false` (student behaviour). In the frame `track()` is replaced at creation by a win-only function (no queue, no `mp:device`, no `events`, no `account_track`), `mp:win` still fires; `flush()` re-checks. `mp:last` skipped; `DuelLayerMount` renders nothing and no `gatePing` (the `light` effect depends on `!skip`); `useDuelOpen` only reads local state. Hydration safe (first render is `null` either way). `MP.adminFrame` is a live getter.
- **I2. Admin-session browsers** (design open question 3, approved): `anonStatsOff()` = frame or a live non-preview `mp:admin` session; signed-in `account_track` untouched; the `account_track → events` fallback also respects it. Same key/shape as `AdminShell.jsx:56`.
- **I3. Migration** `20261121100000_content_checks.sql`: RLS on, table + sequence revoked from anon/authenticated, all three functions `security definer set search_path = public` and start with `admin_guard(tok)`, parameters qualified where they collide with columns, length limits, `revoke … from public` + `grant … to anon, authenticated` like the other admin functions. `fix_files_id_seq` exists (identity column), so the extra revoke can't fail. Catalog test: the three new signatures match; the stale `admin_fix_comment` entry now has `has_files boolean`, and the six fix-file functions are listed with their real signatures (compared with `20261114120000_fix_files.sql`). Demo stubs in `api.js` answer like the DB.
- **I4. `frame-ancestors 'self'`** (`next.config.ts`): no `vercel.json` headers, no middleware, nothing in the repo frames the site (grepped `iframe` in `src app public`), the X-Robots-Tag rule still applies to `/admin` (different key, both rules match). It restricts who frames **us**, not what we frame (Supabase PDF views in the fix-files viewer are unaffected). Vercel previews: same host for admin and topics → same origin → allowed. Runtime check of the header on `/`, `/topics/*`, `/admin/*`: see the e2e results.

- **I5. UI commits** (`f7407a6`, `dcdd156`, `c74c1ec`): nothing in student pages; `Item` export keeps the board's behaviour (no edit button without `onEdit`), bodies render per line with their own direction (maths lines LTR) through `Linked` (React text, no HTML injection); `PEOPLE`/`useName` shared; the panel drives the frame only from the admin side (`frame.js`, same-origin `contentDocument`); the snapshot is frozen at "דווח"; approving in the panel writes a fresh ✓. `verify-logic.py` still "math and text untouched" at `c74c1ec`. Not run by me: `next build`, `supabase test db`, a real iPhone.

## Serializer probes (all kept the math)
`x^(n+1) · a_1` · `(2²)² = 2^?` · `2⁻³ and 5⁻² and 9^(1/2)` · `(x+1)/2 = 3` · `1/(1/2)` · `-√49 · √(x+1)` ·
`3 < x ≤ 5 · 0.5 · ½ · 30%` · `a²b³ · 10¹²`. Deep link escapes `( ) & space` and keeps Hebrew readable:
`…?ch=2.%20חוקי%20חזקות&sub=3.%20חזקה%20%28של%29%20חזקה%20›%20a%26b`.

## E2E results (2026-11-21, `c74c1ec` + nothing uncommitted, dev server on :5198, fake DB)
`node design/admin-review/e2e/run.mjs http://localhost:5198` → **87 checks · 85 pass · 2 fail** (both = M3).

| Check | WebKit 1440 | WebKit 393 | Chromium 1440 | Chromium 393 |
|---|---|---|---|---|
| login PIN 1111 | pass | pass | pass | pass |
| panel opens /admin/review | pass | pass | pass | pass |
| walk tree ח׳ › חזקות ושורשים › 2. חוקי חזקות | pass | pass | pass | pass |
| preview loads chapter (+ sub "1. כפל חזקות") | pass | pass | pass | pass |
| guard on (MP.adminFrame) + pill | pass | pass | pass | pass |
| report · question / sub / chapter / topic / grade / site (body = design §8) | 6 pass | 6 pass | 6 pass | 6 pass |
| phone requests sheet | — | pass | — | pass |
| ✓ chapter → admin_content_check | pass | pass | pass | pass |
| "הבא" → the fix waiting for approval (triangles › 3) | pass | pass | pass | pass |
| 0 events / account_track / presence from the frame, mp:last kept | pass | pass | pass | pass |
| no horizontal scroll at 393 | — | pass | — | pass |
| tap targets ≥ 40px at 393 | — | **fail (M3)** | — | **fail (M3)** |
| no console errors | pass | pass | pass | pass |
| live DB never called | pass | pass | pass | pass |

Also: `frame-ancestors 'self'` on `/`, `/topics/powers-roots`, `/admin`, `/admin/review`, `/classic/index.html` (pass;
`/admin*` keep `X-Robots-Tag: noindex, nofollow`); a plain student tab (no admin session) sends events (pass, both
engines) and `&sub=` opened "1. כפל חזקות". Captured bodies: `e2e/shots/*-payloads.json`.
