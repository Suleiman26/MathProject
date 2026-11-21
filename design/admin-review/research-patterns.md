# Admin "content control panel": research of patterns

Date: 2026-11-21. Scope: one admin screen to browse grade → topic → chapter → live
question, check it, comment, and file a repair request at any level into the existing
fixes board (`fix_items` / `fix_comments`, statuses new → working → review → done /
reopened / later), read every morning by an automated fixer.

Verdict: build it like **Storybook + Vercel comments + GitHub "Viewed"**: a tree on the
right (RTL), the real topic page live in the middle, an inspector on the left with the
open requests for whatever is selected. One "report" button that snapshots everything
automatically, so the teacher only types one sentence.

---

## (A) The 10 strongest patterns

| # | Pattern | Seen in | Why it fits us |
|---|---|---|---|
| 1 | Tree navigator + live canvas + panel under/next to it | Storybook | Our content is a tree (grade/topic/chapter). Showing the REAL page, not a copy, means admins check what students see. |
| 2 | Report from the spot: click "comment", then click the page to pin it | Vercel toolbar, BugHerd | Location comes from where you clicked, not from typing. The teacher never has to describe "where". |
| 3 | Auto-attached context on every report (screenshot, URL, screen size, console errors) | Marker.io, Usersnap, BugHerd | The morning fixer needs exact, machine-readable location. Humans forget; the widget never does. |
| 4 | Pin to the element, not to x/y | BugHerd | Our pages re-layout (phone/desktop, keypad open). A stored element path + text survives that; pixel coordinates do not. |
| 5 | "Report a problem" lives ON the question and sends which question + what steps | Khan Academy | Closest real-world twin: their content team gets the exact item and the learner's steps. We copy this for admins. |
| 6 | Pick a reason from a short list first, text second | Duolingo reports, Crowdin issue types | A fixed reason list ("wrong answer accepted", "math error", "display", "Hebrew text") makes the morning job's routing reliable and saves typing. |
| 7 | Reproducible generated items via a seed; click a seed to see that exact variant | STACK (Moodle) deployed variants, LON-CAPA seeds | Our questions are generated live. Without a seed (or a full snapshot of the numbers) "this question" can't be rebuilt tomorrow. |
| 8 | "Viewed" mark per item that resets when the item changes, plus a progress bar | GitHub PR "Viewed", Bitbucket, Figma "Changed" status | Gives coverage (what was already checked) and auto-invalidates it after a fix or a code change. |
| 9 | Inbox of threads filtered by "this page / all" and "open / resolved", up/down to step through | Vercel comments inbox, Articulate Review 360 (comments follow the slide, resolved ones fade) | Lets each admin see only what is still open for the place they're looking at, without leaving the preview. |
| 10 | Triage actions as one key each, shortcuts hidden from beginners | Linear triage (1 accept, 2 decline, 3 duplicate, H snooze), NN/g accelerators | Owner can fly with keys; the math teacher sees big buttons and never needs to learn them. |

Also worth borrowing: Sanity Presentation's **edit toggle** (overlays on/off, hold Alt
to use the page normally), and Crowdin In-Context's "click the text on the live page
to open the editor" — same idea as #2 for text problems.

Sources:
- Storybook layout (sidebar, canvas, addons panel): https://storybook.js.org/docs/get-started/browse-stories
- Vercel comments (press `c`, drag-to-screenshot, inbox filters page/status, copy link): https://vercel.com/docs/comments/using-comments
- BugHerd (pins to element, auto screenshot + selector + browser, kanban): https://bugherd.com/design-feedback-tool , https://wordpress.org/plugins/bugherd/
- Marker.io (screenshot, URL, environment, console logs, session replay): https://wordpress.org/plugins/marker-io/ , https://marker.io/lp-software-development-teams
- Usersnap (annotate screenshot, auto env data, JS errors; no screenshot mode on phones): https://help.usersnap.com/docs/feedback-with-a-screenshot
- Khan Academy "Report a problem" on the question: https://support.khanacademy.org/hc/bg/articles/226373748-How-do-I-report-different-kinds-of-bugs-and-issues
- Duolingo report reasons + report-volume per course/skill/exercise: https://blog.duolingo.com/how-user-reports-improve-course-content
- Crowdin issues on a string (issue type + comment) and In-Context: https://support.crowdin.com/issues/ , https://support.crowdin.com/in-context-localization
- STACK seeds / deployed variants / question tests: https://docs.stack-assessment.org/en/STACK_question_admin/Deploying/ , https://docs.stack-assessment.org/en/STACK_question_admin/Testing/
- GitHub "Mark files as viewed" (resets when file changes, progress in header): https://github.blog/news-insights/product-news/mark-files-as-viewed/
- Figma Dev Mode statuses ("Changed" after Ready/Completed): https://help.figma.com/hc/en-us/articles/26781702258583-Dev-Mode-statuses-and-notifications
- Articulate Review 360 (comments per slide, resolved ones faded): https://community.articulate.com/articles/review-360-use-comments-to-give-feedback
- Linear triage keys: https://linear.app/docs/triage
- Sanity Presentation overlays + edit toggle: https://www.sanity.io/docs/visual-editing/introduction-to-visual-editing
- NN/g accelerators (don't show shortcuts to novices too early): https://www.nngroup.com/articles/ui-accelerators/

---

## (B) Recommended layout

### Desktop 1440px (RTL: reading starts on the right)

```
┌───────────────────────────────────────────────────────────────────────────────┐
│ Top bar: "בקרת תוכן"  [חיפוש נושא/פרק]  [פתוחות בלבד ▢]  [כיתה ז|ח|ט]  12/86 נבדקו ▓▓░ │
├──────────────────┬────────────────────────────────────────┬───────────────────┤
│ INSPECTOR (360)  │ LIVE PREVIEW (≈760, phone/desktop flip) │ NAVIGATOR (300)   │
│ (left = last)    │                                        │ (right = first)   │
│ Where: כיתה ח ›  │  The real /topics/<slug>?ch=… page,    │ ▾ כיתה ח   3 ● 40% │
│ חזקות › פרק 2 ›  │  in an iframe, with an "admin" frame:  │   ▾ חזקות  1 ●  ✓✓░ │
│ שאלה #7          │   - question counter "שאלה 7"          │     • פרק 1   ✓    │
│                  │   - [שאלה הבאה] [אותה שאלה שוב]         │     • פרק 2   ●1   │
│ [✓ נבדק] [דווח]  │   - report mode: hover outlines,       │     • פרק 3   ○    │
│                  │     click = pin                         │   ▸ שורשים         │
│ Open requests    │  Toggle: 📱 375 / 🖥 desktop            │ ▸ כיתה ט           │
│ here (2):        │                                        │                    │
│  #91 working …   │  Existing pins shown as small numbered │ Legend:            │
│  #88 review  …   │  dots on the page (only open ones)     │ ○ not checked      │
│ [+ also above:   │                                        │ ✓ checked, clean   │
│  topic has 1]    │                                        │ ● open request(s)  │
│                  │                                        │ ↻ changed since ✓  │
│ Thread of the    │                                        │                    │
│ selected item:   │                                        │                    │
│ comments, files, │                                        │                    │
│ status buttons   │                                        │                    │
└──────────────────┴────────────────────────────────────────┴───────────────────┘
```

Rules:
- **Selection drives everything.** Clicking a tree row (grade, topic or chapter) selects that
  level; the inspector shows requests for that level AND a one-line "also N open above/below".
  Clicking a question in the preview selects the question level.
- **The preview is the real site**, not a re-implementation (Storybook's isolated canvas
  idea, but our page). The admin frame around it adds only: question number, next / same
  again, report mode, phone/desktop flip.
- **Inspector = the existing fixes board, scoped.** Same statuses, comments, attachments; just
  filtered to the selection. One "open the full board" link for everything.
- **One URL per place**: `/admin/review?g=8&t=powers&ch=2&q=<seed>&r=91` so a request link
  opens the panel at exactly that question with that thread (Vercel "copy comment link").
- Keyboard (shown only in a small "?" sheet, NN/g): `j/k` next/previous chapter, `n` next
  question, `r` report, `v` mark checked, `1/2/3` status, `/` search, `Esc` leave report mode.

### Phone (375px)
- Three panes become **three steps**, one at a time: list (tree) → preview (full screen) →
  sheet (inspector) sliding up from the bottom.
- Tree stays as a plain list with the same ○ ✓ ● ↻ marks and counts.
- In the preview: one floating "דווח" button low on the screen (under the thumb), plus
  "שאלה הבאה". The inspector is a bottom sheet with two heights (peek: count of open
  requests; full: thread).
- No hover outlines on phone: report mode = tap the thing once (it gets outlined), tap
  "דווח כאן" to confirm. Usersnap also drops its annotate mode on phones; keep drawing
  optional and off by default.

---

## (C) "Report this question" capture flow (fewest taps)

Target: **2 taps + one sentence** for the common case.

1. Tap **דווח** (or `r`). Report mode turns on: the question block outlines on hover.
   *Default target = the whole current question*, so the teacher can skip step 2.
2. (Optional) tap the exact part (an answer, a step, a drawing, a word). It is outlined.
3. A small card opens next to it, already filled:
   - **Where** (read-only chips): כיתה ח › חזקות › פרק 2 › שאלה 7 › "שלב 2" — tap a chip to
     report one level up instead (chapter / topic / grade). This is how one flow covers all
     four levels.
   - **What kind** (one tap, 5 chips): טעות במתמטיקה · תשובה נכונה נפסלה · תצוגה/ציור ·
     ניסוח בעברית · אחר.
   - **Text** box with focus already in it. One sentence is enough.
   - Optional: 📎 file, ✏️ mark on screenshot.
4. Tap **שלח**. Toast: "נשלח ללוח התיקונים #92" with a link. The pin stays on the page as a
   numbered dot; the tree row gets ●.

Captured automatically (never typed), stored as one structured `where` + `context` object
alongside today's free-text `topic`/`section`:

| Field | Example | Why the morning job needs it |
|---|---|---|
| level | `question` / `chapter` / `topic` / `grade` | what scope to fix |
| grade, topic slug, chapter name | `8`, `powers`, `"2. חזקה של חזקה"` | match `registry.js`, `chapters.js` |
| question id | seed if the generator supports it; else question index + full rendered text and numbers | rebuild the exact same question |
| step / element | step number, element path, element text | pin the exact part (BugHerd style) |
| student state | what was typed, which check was pressed, right/wrong shown | reproduce "my correct answer was rejected" |
| url + query | `/topics/powers?ch=…` | open it directly |
| viewport + device | `375×812 iPhone` / `1440×900` | phone-only bugs |
| build | deployed commit SHA + time | know if it's already fixed |
| screenshot | auto, of the question block | human check + Claude vision |
| console errors | last few errors | crashes |
| reason chip + text + author | `math`, "...", `סולימאן` | routing and who to ask |

---

## (D) Review progress / coverage ideas

- **Four marks per row, everywhere** (tree, chapter list): ○ not checked · ✓ checked and clean ·
  ● open request(s) with a count · ↻ changed since it was checked. Simple rule: anything not ✓
  still needs eyes.
- **"Checked" = an explicit tap** ("✓ נבדק"), stored per chapter with who and when and the build
  SHA. A chapter is "checked" after the admin saw at least N generated questions (e.g. 5) —
  the panel counts them, because one question of a generator proves little.
- **Auto-reset like GitHub "Viewed" / Figma "Changed":** when the topic's code changes in a
  deploy (or a fix on it is marked done), its ✓ turns ↻. Done fixes go to **review**, and the
  ↻ chapter is the queue for checking them.
- **Progress per level:** thin bar on each grade and topic ("12/86 chapters checked"), top bar
  total. Per admin too: "Sulaiman checked 40, Abed 12" (two reviewers can split the work).
- **Smart queue button "הבא לבדיקה"**: jumps to the next ↻ (re-check after fix), then ● in
  review, then ○ never checked. Removes the "where do I start" question.
- **Signal from students** (Duolingo shows report volume per skill/exercise): show next to each
  chapter its wrong-answer rate from the answer stats already collected; a chapter with an odd
  rate is worth checking first. Show it as a small number, not a chart.
- **Filters**: "פתוחות בלבד", by status, by author, by reason chip, "changed since checked".

---

## (E) Pitfalls

1. **Generated questions can't be found again.** If generators use plain `Math.random`, "question 7"
   means nothing tomorrow. Either add a seed the panel can set (without touching the math inside
   `BEGIN/END ORIGINAL`, e.g. seed the random source around it), or always store the full rendered
   question text + numbers + screenshot. Decide this first; everything else depends on it.
2. **Free-text location.** Today `section` is free text. Typos break the morning job. Location must
   come from the click, as structured fields; the human text is only the "what".
3. **Pins by coordinates.** Layout differs by phone/desktop and when the keypad opens. Pin by element
   path + text + step number (BugHerd), and keep the screenshot as backup.
4. **A second, different preview.** Rebuilding topics inside the admin drifts from the real site.
   Load the real page (iframe) and only add a thin admin layer.
5. **Admin answers polluting stats.** Practising in the panel must not send answer stats (or must tag
   them as admin). Use the local/admin flag, never count them as students.
6. **Too many statuses for the teacher.** Keep the board's 6 statuses, but the teacher only sees three
   buttons in the card: "שלח", and later on a thread "תוקן ✓" / "עדיין לא". Other states are the owner's.
7. **Shortcut-first UI.** j/k is for the owner. Every action must also be a big labeled button;
   shortcuts live in a "?" sheet (NN/g).
8. **Duplicate requests.** Before sending, show "already open here: #88 …" in the card with a
   "add to it" button (Linear "mark as duplicate"), so the fixer doesn't fix the same thing twice.
9. **Checked marks that lie.** A ✓ that survives a code change gives false confidence. Always tie ✓ to
   the build SHA and auto-reset (pattern 8).
10. **Heavy capture.** Screenshots of the whole page on every report are slow and big. Capture only the
    question block, compress, upload to the private `fix-files` bucket as today.
11. **Privacy.** Never capture a real student's name/session in the context object; the panel runs as
    the admin. No personal data in the URL (only grade/topic/chapter/seed/request id).
12. **Report mode trapping clicks.** In report mode clicks don't reach the page; make it obvious
    (outline + "מצב דיווח — Esc ליציאה"), and let Alt/long-press use the page normally (Sanity).
