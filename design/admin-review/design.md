# בקרת תוכן: the admin content control panel (design)

Date: 2026-11-21 (reviewed and revised the same day). Status: design + clickable mockup, nothing built yet.
Mockup: `design/admin-review/mockup.html`. Screens after review: `design/admin-review/shots2/`
(the first version's screens stay in `shots/` for comparison).
Inputs: `research-patterns.md`, `codebase-map.md` (same folder).

Verdict: **one screen, three panes, two buttons.** On a desktop: the site's tree on the right, the real
topic page live in the middle, the requests for whatever is selected on the left. On a phone: the list,
then the real page edge to edge with one bottom bar: **דווח · ✓ תקין · בקשות**. Requests land in today's
fixes board in a shape the morning job already reads. One small new table only, for "✓ checked".
The only change to student pages is one tiny guard that stops the panel's answers from counting.

---

## 0. Changes after review (2026-11-21)

A tough review asked: does a teacher understand it in 10 seconds, are the 3 real jobs as short as
possible on his phone, is the stats isolation airtight, and what is the smallest version that already
does the owner's ask. These are the changes it made (all are in the mockup unless marked "build only").

| # | Change | Why |
|---|---|---|
| 1 | **Phone: ✓ תקין and דווח together in ONE bottom bar on the page** (`דווח` coral, right, under the thumb · `✓ תקין` · `בקשות N`). The 3-step bar (רשימה/תצוגה/בקשות) is gone; requests open as a sheet over the page. | Job (a) "walk a chapter and check it" needed a trip to step 3 to find "✓". Now: answer a few questions → ✓ → "הבא ›" in the toast → next chapter. Two screens (list, page) are easier than three tabs. |
| 2 | **Nothing floats over the page.** The floating "דווח / שאלה חדשה / peek" buttons are replaced by the bar; on a phone the iframe gets the height between a slim header and the bar, edge to edge (the student's real width). | The topic's own answer keypad (`Keypad.jsx`, on by default on phones) is fixed at the bottom of the page. Floating buttons would sit on top of it. Edge to edge = the admin sees exactly the student's width. |
| 3 | **Marks: one meaning each.** ○ to do · ✓ checked · coral N open requests · ↻ **only** "a fix waits for your approval". A ✓ that is older than a change simply turns back into ○ (the inspector says "השתנה מאז ש־X בדק"). | ↻ used to mean two things ("fixed, check it" and "changed since checked"). A teacher reads ○→✓ as a to-do list; that's enough. |
| 4 | **The report form asks "על מה?" in plain words, not with breadcrumb chips.** Big choices: "השאלה שעל המסך" · "כל ״3. חזקה של חזקה״" · "כל הפרק ״2. חוקי חזקות״", each with one line of explanation; topic / grade / whole site behind "רמה אחרת". | "Tap a chip to move the request up a level, later chips dim" was the hardest idea on the screen. Radio rows with a sentence each are understood at a glance. |
| 5 | **5 reasons instead of 7, and optional.** "תשובה נכונה נפסלה" + "תשובה שגויה התקבלה" → "בדיקת התשובה לא נכונה" (what was typed and what the site answered are saved automatically, so the direction is known). | Fewer, clearer choices; the sentence carries the rest. Send still needs a reason **or** a sentence. |
| 6 | **"סימון חלק" (pick a part) and the sub-tab rows in the tree move out of phase 1.** The step is taken automatically from the active step card (`שלב 1`). The tree stops at chapters; sub-tabs are the page's own tabs (it is the real page). | Two concepts fewer. Sub-tabs could only appear in the tree after a visit (found live), which looks random to a teacher. Requests on a sub-tab still say so in their "where" chip. |
| 7 | **Inspector = one list.** "בקשות כאן" holds everything at and below the selection (each card says where); approved/postponed fold; the levels above fold into one line "ועוד 1 בקשה פתוחה על כל האתר ›". | Three sections ("כאן / בתוך / חלות גם כאן") was a lesson in hierarchy. One list + one quiet line does the job. |
| 8 | **Isolation made airtight (build only).** The guard is `isAdminFrame()` = framed **and** the top page is a same-origin `/admin` page (read from `window.top.location`, which works same-origin and throws cross-origin → false). It survives in-frame navigation (the old `?mpadmin=1` flag was lost when the page navigated itself). It covers `track()` (anonymous `events` **and** `account_track`), `mp:last`, the duel layer (mounted site-wide in `app/layout.tsx`, it would poll and pop invites inside the preview), and proofs' mastery. Proven by a network test, not by trust. | The anti-goal "admin practice never counts as student stats or touches a signed-in student's progress" must hold even when Sulaiman's phone is also signed in as a student. |
| 9 | **No bridge code in student pages.** The panel reads and drives the frame directly (same origin: `iframe.contentDocument`), and the snapshot serializer lives in the admin bundle. Student pages get only the guard and the `&sub=` deep link. Plus one header: `Content-Security-Policy: frame-ancestors 'self'`. | Every line added to `TopicView.jsx`/`mp-runtime.js` runs for every student. The header keeps the panel working if someone later adds anti-framing, and blocks other sites from framing ours (clickjacking). |
| 10 | **The question is frozen at the tap, and "שאלה 4" leaves the body.** The snapshot is taken when "דווח" is tapped (updated only if he then checks an answer of the same question); the body says "השאלה שעל המסך", not a session number. Smaller fixes: "הבא" goes to fixes waiting for approval first (its label says "לאשר תיקון" when there are any; the first mockup's version skipped them — fixed), a one-line first-time hint, the "איך זה יגיע" box only for עבד, the screen title is "בקרת תוכן" (the mockup's tab title still said "לוח בקרה", the admin home's name). | "שאלה 4" looked like an ID but meant nothing tomorrow. A frozen snapshot can't drift if the page re-renders or he taps "שאלה חדשה" while typing. |

Phase 1 is now the smallest version that does the owner's whole ask (§11).

---

## 1. Intent

Sulaiman (the math author, a teacher, mostly on his phone) and Abed (owner, desktop) need to
**walk through everything a student sees** — grade, topic, chapter, the question on screen — see what is
already reported there, mark what they checked, and report a problem in about 10 seconds, without ever
typing "where".

### The three real jobs (and their shortest path)
| Job | Phone path | Desktop path |
|---|---|---|
| (a) Walk a chapter and check it | tap chapter → answer 2–3 questions (שאלה חדשה at the top) → **✓ תקין** → toast "הבא ›" | tap chapter (or `g`) → answer → **הפרק תקין · נבדק** (`v`) → "הבא ›" |
| (b) "This question is wrong" | **דווח** → (choice already "השאלה שעל המסך") → one sentence → **שליחה**: 2 taps + a sentence | **דווח** (`r`) → type → ⌘ Enter |
| (c) See what's open/fixed, approve or send back | the progress card's button reads **לאשר תיקון** when a fix waits → it opens that page → bar shows **לאשר** → sheet with "תקין, לאשר" / "עדיין לא תקין" | same button (`g`); the card is next to the live page |

### Goals
- See the whole site as one tree with honest coverage: what was checked, what has open
  requests, what was fixed and waits for approval.
- Report at any level (whole site, grade, topic, chapter, sub-tab, this question) with
  2 taps + one sentence. Location and the question itself are captured automatically.
- Every request reaches `fix_items` in a form the morning job (`mathproject-fixes-scan`)
  already understands, with no change to that job.
- Review fixed items in place: approve or send back next to the live page they changed.
- Work equally well on a phone (Sulaiman) and a desktop (Abed).

### Non-goals
- Editing math or Hebrew text from the panel (content stays in Sulaiman's `Topic.jsx`).
- Re-creating topics inside the admin. The preview is the real page in an iframe.
- Replacing the fixes board. It stays as the full list ("כל התיקונים").
- Reproducing an exact random question later for the 17 original topics (impossible
  without touching `Topic.jsx`; we store a frozen text snapshot instead).

### Anti-goals (things this must never do)
- Count admin practice as student stats, or write into a signed-in student's progress.
- Put free-text location in front of the teacher ("which chapter was it?").
- Show a ✓ that survives a later change (a lying "checked").
- Add statuses or jargon the teacher has to learn. He sees: דווח, ✓ תקין, תקין לאשר, עדיין לא תקין.
- Float anything over the student page (it hides the page's own keypad and buttons).
- Grow the admin phone bottom nav past 8 items.

---

## 2. The approaches considered

| | Approach | Good | Bad |
|---|---|---|---|
| A | **Three panes: tree · live iframe · inspector** (Storybook + Vercel comments) | Everything in one place, coverage visible, the real page, works for all levels | Most work; needs the isolation guard |
| B | **Board-first:** add a tree filter and "open page" links to today's fixes board | Cheap (a day) | You still leave the board to look at the page; location still typed; no coverage |
| C | **Overlay on the real site:** an admin toolbar injected into `/topics/*` (Vercel toolbar style) | Report exactly in context | No overview or coverage, risk of admin UI leaking to students, cramped on phones |

**Chosen: A.** C's "point at the part" idea waits for phase 3 (desktop only, if ever missed). B's lesson is
kept: the inspector *is* the board, filtered to the selection, reusing its `Item` card.

---

## 3. Where it lives

- Route `app/admin/review/page.tsx` → `src/admin/pages/Review.jsx` (+ `src/admin/pages/review/*`).
- Shown as the **first tab inside "תיקונים"**: `בקרת תוכן | כל התיקונים (7)` (same pattern
  as the duels tabs). The admin phone bottom nav stays at 8 items. (Open question 1.)
- Styles: `src/admin/review.css`, prefix `cpl-` (verified unused), inside `@layer page`, all
  rules under `.adm-root`. No generic `@property`.
- On this route only, the desktop side nav folds to a 56px icon rail (class on the shell) so the
  three panes fit at 1280+. On phones, the admin's own top bar and bottom nav are hidden on this route
  (the list screen has a "‹ ניהול" link and the "כל התיקונים" tab).

---

## 4. The screen

### Desktop 1440 × 900 (RTL, reading starts on the right)

```
┌────┬──────────────────────────────────────────────────────────────────────────────────┐
│rail│ בקרת תוכן  [בקרת תוכן | כל התיקונים 7]                       [⌨]  [סולימאן ס] │ 56px top
│ 56 ├──────────────────┬───────────────────────────────────────┬───────────────────────┤
│    │ TREE 296         │ PREVIEW (flex, ≈636)                  │ INSPECTOR 384         │
│ ▣  │ (first-time hint)│ כיתה ח׳ › חזקות › 2. חוקי › 3. חזקה…  │ פרק                   │
│ ☰  │ ┌ 31/87 נבדקו ─┐ │                      ● לא נספר לתלמיד │ 2. חוקי חזקות         │
│ ◇  │ │2 לאישור [לאשר]│ │ ראיתם 4 [שאלה חדשה] [טלפון|מחשב] [דווח]│ ○ הפרק עוד לא נבדק    │
│ ▥  │ └──────────────┘ │ ┌────────────────────┐              │ [✓ הפרק תקין][דווח]   │
│ ☺  │ [חיפוש…      /]  │ │  phone 375 frame    │              │ ── בקשות כאן (1)      │
│ ⚙  │ (פתוחות) (לא נבדקו)│ │  real /topics/...  │              │  #85 · 5. חזקה אפס…   │
│    │ כל האתר       ●1 │ │  in an iframe       │              │ ועוד 1 על כל האתר ›   │
│    │ ▾ כיתה ח׳ 13/43  │ └────────────────────┘              │ ללוח המלא             │
│    │   ▾ חזקות    2/5 │                                       │ (report form slides   │
│    │     ✓ 1. הבנת…   │                                       │  over this column)    │
│    │     ① 2. חוקי…  ▌│                                       │                       │
└────┴──────────────────┴───────────────────────────────────────┴───────────────────────┘
```
- Grid: `56px | 296px | minmax(0,1fr) | 384px`, gaps 12–14px, full viewport height, each pane
  scrolls on its own. 1100–1320px: tree 260, inspector 340, subtitle and tabs hidden.
- The tree's top block (hint, progress + "הבא", search, filters) is sticky.
- The report form opens **in the inspector column**, so the page stays visible while you write.

### Phone 393 × 852: two screens + a sheet
| Screen | Shows | Bottom bar (one bar, never over the page) |
|---|---|---|
| רשימה | title + who, first-time hint, progress card with "לאשר תיקון / הבא לבדיקה", search (16px, no zoom), 2 filter chips, the tree (46px rows), legend | chapter selected: **[חזרה ל־<chapter> ›]** + [בקשות N]; grade/topic selected: **[דווח על הכיתה/הנושא]** + [בקשות N] |
| הדף | slim header: ‹ back · topic › current part · [שאלה חדשה]; then the real page **edge to edge** (the iframe's height = screen − header − bar), the "not counted" pill on top | **[דווח]** (coral, right, under the thumb) · **[✓ תקין]** (green; "נבדק" when done, tap to undo; "לאשר" in violet when a fix waits) · **[בקשות N]** |
| sheet | the inspector over the page (86dvh max, drag handle, ✕), the page still visible above | — |
- Tapping a chapter in the list opens the page; tapping a grade or topic only opens it in the list.
- After ✓ the toast offers **"הבא ›"** (the walk-through loop). After sending a report the phone
  stays on the page (he keeps checking); the toast offers "לראות" (opens the sheet).
- The report form is a bottom sheet (92dvh, drag handle, sticky "שליחה" with safe-area padding).
- Bar: 52px buttons, blurred surface, `env(safe-area-inset-bottom)`.

### States
- **Loading:** tree skeleton rows; preview shows the phone frame with a soft shimmer.
- **Empty node:** "אין כאן בקשות פתוחות. אם הכל תקין, ״✓ תקין״".
- **Search with no result:** "לא נמצא כלום. נסו מילה אחרת או הסירו סינון."
- **Preview mode (no DB):** demo stubs in `api.js`, the yellow demo bar as on every admin page.
- **Iframe failed / topic crashed:** the frame shows "הדף לא נטען" + "לפתוח בלשונית" and a
  one-tap "דווח על הנושא" (that is a bug worth reporting).
- **The frame left the topic** (its own back button went home): a bar "יצאתם מהנושא · חזרה ל־<chapter>".
- **Guard not active** (the frame does not report `MP.adminFrame === true`): the green pill turns into a red
  bar "זהירות: התשובות כאן נספרות" — the pill is read from the frame, never assumed.
- **Unauthorized:** the usual auto sign-out (`run`).

---

## 5. The navigator (tree)

Levels: **כל האתר** → **grade** (ז׳ ח׳ ט׳, then "מוסתרים · עוד לא שובצו" for `new` and
`proofs`) → **topic** → **chapter**. (Sub-tabs are not tree rows: they are the page's own tabs.)

- Sources: grades + `grade_ids` from `useData(["catalog"])` (live DB), names/colours from
  `TOPICS` (registry) and `catalog.js`, chapters from `CHAPTERS` (`src/home/chapters.js`).
  `proofs` needs its 4 chapters added to `CHAPTERS` when it ships; a slug missing from the
  registry simply doesn't appear.
- A topic in several grades (powers-roots, solids3d…) appears under each grade but is **one
  node**: same marks, same requests. The inspector says so in one line.
- Row content: caret · mark · name · counts. Grade rows: `13/43` + a thin bar + open count.
  Topic rows: colour dot, `2/5`, open count, a violet ↻ count when fixes wait for approval.
- **Marks** (one per chapter row, in this priority, one meaning each):
  coral `N` open requests (new / working / reopened, on the chapter, its sub-tabs or questions) ·
  violet `↻` a fix waits for your approval (`review`) · green `✓` checked · `○` not checked yet
  (also when an older ✓ was invalidated by a change).
- **Search** (`/`): matches topic, chapter and sub-tab names (a sub-tab match shows its chapter),
  highlights the match, opens the path. `#85` + Enter jumps to that request's place (phase 2).
- **Filters:** "עם בקשות פתוחות" (open or waiting for approval), "לא נבדקו" (○). Both keep ancestors.
- Matching old free-text `section` values to chapters: `chapterTitle()` on both sides;
  anything that doesn't match shows at topic level as "לא משויך לפרק".

### "✓ checked": stored in one small table (decision)
**One new table, not "no DB change".** Reason: the mark must be shared between Sulaiman's
phone and Abed's desktop (so `localStorage` can't hold it), and storing it as a `fix_items`
row would flood the board and its counts with non-requests.

```
content_checks(id bigint identity, topic text not null, section text not null,  -- chapter button text
               author text not null, created_at timestamptz default now())
admin_content_checks(tok)                         -- latest row per (topic, section)
admin_content_check(tok, topic, section, author)  -- insert (append-only = history)
admin_content_uncheck(tok, topic, section)        -- deletes that chapter's rows
```
RLS on + `revoke all` from anon/authenticated, functions guarded by `admin_guard`,
`revoke execute … from public` + `grant … to anon, authenticated`, sequence revoked, demo
stubs in `api.js`, signatures added to the catalog test allow-list (fix its stale entries in
the same batch).

- Checked **per chapter** (a generator is the unit). Topic and grade only show progress.
- The panel counts questions seen per chapter this visit and nudges "כדאי לראות לפחות 3"
  (not enforced).
- **A ✓ turns back into ○ by itself** (computed, nothing stored) when something changed after it:
  a fix item on that chapter (or its sub-tabs/questions) got a `done` comment newer than the check that
  was not approved through the panel. Phase 2 adds "code changed": a build step writes
  `public/content-versions.json` = last commit time per `src/topics/<slug>/`; a check older than that is ○.
- Approving a fix in the inspector ("תקין, לאשר") also writes a fresh check for that chapter (the
  approver just looked at it after the fix). The toast says so.

---

## 6. The live preview

- `<iframe src="/topics/<slug>?ch=<chapter>&sub=<sub>">`, same origin, so the panel reads and drives the
  page itself through `iframe.contentDocument`: the active chapter and the **full** active sub-tab path
  (not only the first `.active`), clicks for "שאלה חדשה" and sub-tabs, and a `MutationObserver` (with short
  retries) to follow the page when the admin taps its chapter or sub-tab buttons. **No postMessage bridge
  and no admin code in student pages.**
- **Phone / מחשב toggle** (`p`, desktop only): phone = a 375px frame at 1:1; desktop = the iframe at
  1180px scaled to the pane width (phase 2; cheap). On a real phone the iframe is edge to edge.
- **"שאלה חדשה"** (`n`): clicks the topic's own new-exercise button inside the frame
  (text matches `/תרגיל חדש|שאלה חדשה|עוד תרגיל/` in the active card); if none, reloads the
  same `?ch=&sub=` (a fresh random question). Counts "ראיתם N" for that chapter (a counter, not an ID).
- **Isolation (phase 0, before anything else):** a pill "תצוגת בקרה · התשובות כאן לא נספרות לאף תלמיד",
  shown only when the frame itself reports the guard is on (`MP.adminFrame === true`).

### The guard (the only change in student pages, besides `&sub=`)
```js
// src/lib/admin-frame.js (and the same 3 lines inline in mp-runtime.js)
export function isAdminFrame() {
  try { return window.top !== window.self && window.top.location.origin === location.origin
               && window.top.location.pathname.startsWith("/admin"); }
  catch { return false; }   // framed by another site: not ours, behave normally
}
```
| Where | What it skips in the admin frame | Still runs |
|---|---|---|
| `mp-runtime.js` `track()` | the queue and `flush()`: no `events` insert, no `account_track` (so a signed-in student on the same phone is untouched), no `mp:device` creation | sounds, feedback watching, the `mp:win` event (so the chapter ✓ on the tab shows as for a student) |
| `mp-runtime.js` `window.MP` | — | exposes `MP.adminFrame = true` (the panel's pill reads it) |
| `TopicView.jsx` | the `mp:last` write (home "continue" button) | `?ch=` and new `&sub=` deep link (same retry loop; `a › b` path for nested tabs) |
| `DuelLayerMount.jsx` (in `app/layout.tsx`, so it is in every page, the frame included) | renders nothing: no second invite poller, no invite popup inside the preview | — |
| `src/topics/proofs/*` (own module, allowed) | mastery / open-proof storage writes | the proof itself |

Not covered, on purpose (device-only, never reaches the server): a few topics keep their own
`localStorage` (equation-solver's done count and last chapter, quadratic-solver's "learned", the
"learn / practice seen" flag in `new` and the word stories). Checking in the panel can change what that
same phone later shows as a student in those topics. Documented, harmless, not worth touching `Topic.jsx`.

Also in phase 0: `Content-Security-Policy: frame-ancestors 'self'` on all routes (`next.config.ts`
`headers()`), so the panel keeps working and other sites can't frame ours.

**Done when (a test, not a promise):** a Playwright run on the local dev site, with a signed-in test
student in `localStorage`, opens the panel, answers 5 questions in 3 topics (one right to the end) →
**zero** requests to `/rest/v1/events` and `/rpc/account_track` from the frame, `mp:last` unchanged, no
duel poll from the frame; the same script on `/topics/<slug>` directly → more than zero (proves the test
can see them).

### The question snapshot (17 topics use unseeded `Math.random`)
**Decision: text always (phase 1), picture automatically later (phase 2).**
- **Text (phase 1):** a serializer in the admin bundle (`src/admin/pages/review/snapshot.js`) walks the
  active card in the frame (the card holding the last-focused input, else the first visible card) plus
  the finished steps above it, and writes **plain text that keeps the math**:
  `<sup>` → Unicode superscripts when the exponent is only digits/minus (`3²`), else `^(…)` (`2^?`,
  `x^(n+1)`); `<sub>` → `_`; `<Root>` → `√(…)`; fraction blocks → `(a)/(b)`; inputs and the keypad
  display → "הוקלד: 8" or "ריק"; feedback (mp-runtime's `SEL.ok/bad` vocabulary) → "האתר ענה: נכון / לא
  נכון / עוד לא נבדק"; inline SVG → `[ציור: <its text labels in order>]`; a three.js canvas →
  `[ציור תלת־ממד]`. Plain `innerText` is **not** enough (it turns `3<sup>?</sup>` into "3?").
  Taken **when "דווח" is tapped** (frozen; refreshed only if he then checks an answer of the same
  question). A test per topic family (`snapshot.test.mjs`, HTML fixtures saved from powers, roots,
  fractions, equations with inputs, a triangle SVG, a line graph, proofs) checks nothing is lost.
- **Picture (phase 2):** the active card rendered to PNG in the panel (`modern-screenshot`, lazy-loaded
  only in the admin) and attached through the existing fix-files upload (`sendPending`). It helps humans
  on the board at once, and the morning job once it may read attachments (open question 2). Until then a
  teacher can attach his own phone screenshot (the existing attach button).

---

## 7. The inspector

For the selected node (a sub-tab open in the page still shows its whole chapter, like the tree), top to bottom:
1. Level label, name, path; for chapters the check line (○ not checked + "ראיתם N" / ✓ who + when /
   ○ "השתנה מאז ש־X בדק" / ↻ "יש כאן תיקון שמחכה לאישור שלך") and two buttons:
   **"הפרק תקין · נבדק"** (green) and **"דווח על הפרק"** (coral). When a fix waits for approval the
   green button becomes "לאשר את התיקון למטה" and scrolls to it.
2. **בקשות כאן** — one list: items at this node and below it (each card's chip says where:
   "כאן", "5. חזקה אפס › שאלה · שלב 1"). Ordered: waiting for approval, sent back, new, in work.
   Approved/postponed fold into "N שאושרו או נדחו ›".
3. One folded line for the levels above: "ועוד N בקשות פתוחות על כל הנושא / כל האתר ›" (tap a row to jump there).
4. Footer: "ללוח המלא".

On a phone it is the sheet over the page (§4).

Each card = today's `Item` (export it from `Fixes.jsx`): status pill, #id, reason, body (3 lines,
tap to expand; the question block folded), thread, and the same actions — **תקין, לאשר** /
**עדיין לא תקין** (text required) for review, **לפתוח מחדש** for done, **תגובה** for all.
Attachments reuse `AttachBar / usePending / sendPending / useDropPaste / Attachments / Viewer`
unchanged. `PEOPLE` / `useName` move to a shared file so both pages use them.

---

## 8. The report flow (all levels)

One form for every level. Opened by "דווח" (page → "השאלה שעל המסך" preselected; inspector or list →
the node's level; `r` key). Steps: **tap דווח → (tap a reason) → type one sentence → שליחה.**

| Field | Captured how |
|---|---|
| על מה? | big radio rows in plain words, nearest first: **השאלה שעל המסך** ("רק השאלה הזאת. נשמרת כמו שהיא, עם מה שהוקלד ומה שהאתר ענה") · **כל ״3. חזקה של חזקה״** (only when a sub-tab is open) · **כל הפרק ״2. חוקי חזקות״**; behind "רמה אחרת: כל הנושא · כיתה ח׳ · כל האתר". Default = where it was opened from. |
| מה הבעיה? (לא חובה) | one chip. Question/chapter: טעות במתמטיקה · בדיקת התשובה לא נכונה · תצוגה / ציור · ניסוח בעברית · אחר / להוסיף. Topic/grade/site: חסר / להוסיף · סדר / מבנה · תצוגה / ציור · ניסוח בעברית · אחר |
| במשפט אחד | textarea, focused on desktop. Send needs a reason **or** text. |
| השאלה | question level only: the frozen snapshot, read-only ("יצורף אוטומטית"), including the step (`שלב 1`) taken from the active step card |
| קובץ | optional screenshot/PDF/link (existing kit; paste works on desktop) |
| כפילות | if an open request exists at the same place: "כבר פתוחה כאן בקשה #85 … [להוסיף לה תגובה במקום]" |
| מי | `S.me` (סולימאן / עבד), switchable |
| איך זה יגיע | only for עבד: collapsible preview of the exact `topic / section / body` |

On send: `admin_fix_add {topic, section, body, author}` (status `new`), then files via
`sendPending`. Toast "נשלח ללוח התיקונים · בקשה #92", the card appears at the top of the
inspector with a short glow, the tree mark turns coral. On a phone he stays on the page.

### Mapping into `fix_items` (no change to the table or to the morning job)
| Level | `topic` | `section` | `body` starts with |
|---|---|---|---|
| Whole site | `general` | empty | `איפה: כל האתר` |
| Grade | `general` | `כיתה ח׳ · כל הכיתה` | `איפה: כיתה ח׳` |
| Topic | slug | empty | `איפה: כיתה ח׳ › חזקות ושורשים` |
| Chapter | slug | exact button text `2. חוקי חזקות` | `איפה: … › 2. חוקי חזקות` |
| Sub-tab | slug | `2. חוקי חזקות › 3. חזקה של חזקה` | `איפה: … › 3. חזקה של חזקה` |
| This question | slug | chapter (› sub-tab) | `איפה: … › השאלה שעל המסך › שלב 1` + the question block + link |

The grade is always written in `איפה:` (a topic can be in two grades). `topic` is always a real
registry slug or `general`, so the board's filter, its edit sheet and the morning job (which opens
`/topics/<topic>`) keep working. The structured part lives in fixed Hebrew labels at the start of
`body`, so a later version can parse it without a schema change.

### Sample body (question level)
```
איפה: כיתה ח׳ › חזקות ושורשים › 2. חוקי חזקות › 3. חזקה של חזקה › השאלה שעל המסך › שלב 1
סוג: בדיקת התשובה לא נכונה
מה לתקן: הקלדתי 8 והאתר אמר שזה לא נכון

השאלה כמו שהופיעה:
חזקה של חזקה
(2²)² = 2^?
שלב 1 — מה המעריך?
הוקלד: 8 · האתר ענה: לא נכון

קישור: https://mathix-sooty.vercel.app/topics/powers-roots?ch=2.%20חוקי%20חזקות&sub=3.%20חזקה%20של%20חזקה
נשלח מבקרת התוכן · טלפון 393×852 · גרסה 730c785
```
with `topic = powers-roots`, `section = 2. חוקי חזקות › 3. חזקה של חזקה`, `status = new`,
`author = סולימאן`. For proofs (phase 3), add a line `מפתח: 3-X-SAS:20261121 · רמה 2 · וריאנט 1`.
The version is the deployed commit (`NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA`, first 7). Nothing
personal goes in the body or the URL.

---

## 9. Keyboard (desktop only, phase 2, listed in a "⌨" sheet; every action also has a button)
| Key | Does |
|---|---|
| ↑ ↓ (j k) | previous / next row in the tree (selects it) |
| ← → | open / close the selected grade or topic (RTL: ← opens) |
| `/` | search |
| `n` | new question |
| `r` | report (the question if a topic is on screen, else the node) |
| `v` | mark the chapter checked / unmark |
| `g` | next (fixes to approve first) |
| `p` | phone / desktop preview |
| `o` | only nodes with open requests |
| ⌘/Ctrl Enter | send |
| Esc | close the form, the sheet or the help |

Shortcuts are ignored while typing and never shown to the teacher unless he opens the sheet.

## 10. "הבא" (the queue)
Over unique chapters of grades ז׳–ט׳ in grade order. The most urgent group first; inside a group, the
one after the current chapter:
1. a fix waits for approval there (`review`) → opens the sub-tab of that item; the button reads
   **"לאשר תיקון"** while any exist;
2. a `reopened` item there;
3. a ✓ that turned back to ○ (changed since checked);
4. never checked (○). Phase 3: sort these by the chapter's wrong-answer rate from the stats
   already collected (highest first), shown as a small number on the row.
The toast says why: "הבא: משולשים › 3. משולשים מיוחדים · תוקן, מחכה לאישור שלך".

---

## 11. Build phases
| Phase | What | Done when |
|---|---|---|
| 0 · Safety (½ day) | `isAdminFrame()` guard in `mp-runtime.js`, `TopicView.jsx`, `DuelLayerMount.jsx`, proofs; `MP.adminFrame`; `&sub=` deep link; `frame-ancestors 'self'` | the network test in §6 passes (0 requests in the frame, >0 outside); `verify-logic.py` untouched; `next build` |
| 1 · The panel (the owner's whole ask) | see the 5 lines below | Sulaiman, on his phone, checks one chapter (✓) and files a question report in < 15 s; the next morning job fixes it; he approves it from the panel |
| 2 · Comfort | auto PNG of the card (+ morning job reads images, if yes), desktop 1180 preview toggle, keyboard + ⌨ sheet, `#85` search jump, "code changed" → ○ via `content-versions.json` | — |
| 3 · Extras, only if missed | "סימון חלק" overlay (desktop), sub-tab rows in the tree, wrong-answer-rate hint, proofs exact rebuild key | — |

**Phase 1 in 5 lines:**
1. Tab "בקרת תוכן" first inside תיקונים; tree site → grade → topic → chapter with ○ ✓ coral-N ↻, progress, search, 2 filters, a one-line first-time hint.
2. The real page in a same-origin iframe (375 phone frame on desktop; edge to edge on a phone, between a slim header and one bottom bar), read and driven from the admin side only.
3. ✓ per chapter in `content_checks` (1 table + 3 PIN-guarded functions + demo stubs + the catalog test fixed); "✓ תקין" on the page bar; "הבא" (fixes to approve first) with the "הבא ›" toast loop.
4. One report form for every level (plain-word scope, 5 optional reasons, one sentence, frozen text snapshot with math markers + typed answer + site verdict, deep link, attach kit, duplicate warning) → `admin_fix_add` with the mapping in §8.
5. "בקשות כאן" = one list of the board's own `Item` cards (approve / עדיין לא תקין / comment; approve writes a ✓); on a phone a sheet over the page.

Check before each batch: `verify-logic.py` ("math and text untouched"), `next build`, desktop +
375px, open every menu, run the report flow end to end on the local DB, and on a **real iPhone**: the
frame scrolls inside, the topic's keypad sits above the bar, the sheet and the form open and close.

## 12. Risks
| Risk | Mitigation |
|---|---|
| Admin practice becomes real student stats / a signed-in student's progress | Phase 0 first; guard by the top page (survives in-frame navigation); network test in and out of the frame; the pill is read from the frame, and turns red if the guard is off |
| A bug in the guard breaks every topic page for students | 3 lines, `try/catch` → `false` = normal student behaviour; everything else (reading the frame, snapshot, clicks) lives in the admin bundle |
| Bars or buttons hide the topic's keypad / its own buttons on a phone | one bottom bar outside the iframe, the iframe sized between header and bar; tested on a real iPhone |
| Duel layer runs twice (panel + frame) and pops invites inside the preview | `DuelLayerMount` renders nothing in the admin frame |
| "This question" can't be rebuilt for 17 topics | frozen snapshot with math markers + optional screenshot; proofs gets an exact key (phase 3) |
| Snapshot loses math (sup, roots, fractions, SVG labels) | dedicated serializer with a fixture test per topic family |
| Old free-text `section` values don't match chapters | `chapterTitle()` match, rest shown as "לא משויך לפרק" at topic level |
| Topics re-render on chapter switch; nested sub-tabs | read with short retries / MutationObserver; full active path, not the first `.active` |
| iframe weight on phones (three.js in solids3d) | one iframe at a time, lazy; "לפתוח בלשונית" fallback |
| Someone later adds anti-framing headers (e.g. after a security check) and the panel goes blank | ship `frame-ancestors 'self'` now; it is the safe setting and keeps the panel working |
| Morning job ignores attachments | everything essential is in `body`; pictures are extra (open question 2) |
| `proofs` exists only on some branches | the tree hides slugs missing from the registry |
| Catalog permission test already stale | fix its allow-list in the same batch as the new functions |

## 13. Open questions for Abed
1. **Build phase 0 + 1 as described, including the one small table `content_checks`** (shared "✓ נבדק"
   between you and Sulaiman, append-only, PIN-guarded), with the screen as the first tab
   "בקרת תוכן" inside "תיקונים"? *Recommend:* yes. Without the table the ✓ lives on one device only.
2. **Let the morning job look at attached images.** It still doesn't read `fix_files` (waiting for your
   yes since 2026-11-14). Display reports ("the drawing is cut on the phone") are much clearer with the
   picture, and phase 2 attaches one automatically. *Recommend:* yes, read-only download of the item's
   images; the text body stays complete either way.
3. **Stop counting stats from any browser that holds an admin session, not only inside the panel.**
   Today, when you or Sulaiman try a topic in a normal tab, it counts as an anonymous student.
   *Recommend:* yes for the anonymous stats only (signed-in test students keep their progress, so student
   features can still be tested).

## 14. The mockup
`design/admin-review/mockup.html` (one page, opens on phone and desktop, light + dark). Real
topic and chapter names, sample requests (#79–#91, made up), a simplified drawing of the topic
page standing in for the iframe. Working: the first-time hint, select in the tree (and by tapping chapters
and sub-tabs inside the page), search, both filters, "לאשר תיקון / הבא לבדיקה", new question + answering it,
the report form at every level (plain-word scope, "רמה אחרת", frozen snapshot, duplicate warning, "איך זה
יגיע" when the sender is עבד), sending (the card appears, marks update), ✓ checked with the "הבא ›" toast,
approve / send back / comment on a card, the phone's list → page → sheet with one bottom bar. Phase-2 items
still visible in it: the phone/desktop toggle and the ⌨ sheet. Checked in headless WebKit at 1440×900,
393×852 and 375×812 (no horizontal scroll, no script errors), light and dark; screens in `shots2/`.
