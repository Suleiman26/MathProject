# בקרת תוכן: end-to-end test kit

One script, `run.mjs`, that drives the real panel in WebKit and Chromium at 1440×900 and 393×852 against a
local dev server, with the database faked at the network level (nothing real is written; any call to the live
Supabase is aborted and fails the run).

## Run
```
npx next dev -p 5198            # in the worktree (or any port; pass it as BASE)
node design/admin-review/e2e/run.mjs http://localhost:5198
```
Options (env): `ENGINES=webkit,chromium` · `VIEWPORTS=desktop,phone` · `ONLY=<part of a check name>` ·
`HEADED=1` · `PLAYWRIGHT_CORE=<folder>` (default: the npx cache on Abed's Mac).
Output: a PASS / FAIL / WARN line per check, `results.json`, screens and the captured request payloads in `shots/`.
Exit code 1 when anything fails. Stop the dev server afterwards (`lsof -i :5198` must be empty).

## What it checks
| Check | Pass when |
|---|---|
| `frame-ancestors 'self'` on `/`, `/topics/<slug>`, `/admin`, `/admin/review`, `/classic/index.html` | the header is there; `/admin*` still has `X-Robots-Tag: noindex` |
| login with PIN 1111 | the PIN pad's buttons → `admin_login {pin:"1111"}` → `mp:admin` saved |
| panel opens at `/admin/review` | the tree (`role=tree`, name "תוכן האתר") is visible |
| walk the tree | grade → topic → chapter rows open; the chapter row is `aria-selected=true` (desktop) |
| preview loads the chapter | an iframe shows `/topics/powers-roots` with chapter button "2. חוקי חזקות" active |
| guard on | `MP.adminFrame === true` inside the frame and the pill does not say "נספר" |
| preview toggle טלפון / מחשב (desktop only) | "מחשב" shows the same frame (no reload) at `innerWidth` 1280, scaled to fit its box; a real mouse click at the scaled spot of a button in the page reaches it; `mp:cpl-dev = "desk"` is saved; "טלפון" brings it back to 375 |
| report form · scope question / sub / chapter / topic / grade / site | form opens from "דווח", scope chosen (behind "רמה אחרת" when needed), reason chip, sentence, "שליחה" → the `admin_fix_add` request body matches design §8 (topic, section, the `איפה:` line, `סוג:`, `מה לתקן:`, the question block with exponents + `הוקלד:` + `האתר ענה:`, the `קישור:` with `ch`/`sub` pointing at the live site, the last line `נשלח מבקרת התוכן · <device> · גרסה <sha>`, the PIN token, an author from PEOPLE, nothing of the signed-in student). A missing version alone is a WARN. |
| phone: requests sheet | "בקשות N" opens a sheet, "סגירה" closes it |
| ✓ the chapter | `admin_content_check {topic:"powers-roots", section:"2. חוקי חזקות", author}` |
| "הבא" | the toast's "הבא ›" (or the progress card's "לאשר תיקון") opens the fake board's `review` item first: `/topics/triangles` › "3. משולשים מיוחדים" |
| zero stats from the frame | no `events`, `account_track`, `presence_ping` from the frame (a signed-in student sits in `localStorage` the whole time), none from the admin tab at all, `mp:last` unchanged |
| student tab | a plain tab without an admin session sends `events` (proves the test sees stats), and `&sub=` opened the sub-tab |
| console | no `console.error` / page errors, except Supabase connection refusals |
| 393 layout | no horizontal scroll and every visible control ≥ 44×44 px (`TAP_MIN`) on: the list, the page screen, the report form, the requests sheet |
| live DB | zero requests to `uucqyjskkyrfhvbsmorx.supabase.co` |

## The fake database (in `run.mjs`, `fakeDb`)
`admin_login` (only `1111`), `admin_catalog` (3 grades, 7 topics; powers-roots in ח׳+ט׳, triangles in ז׳+ח׳),
`admin_fixes` (#85 new on powers-roots › 5. חזקה אפס, **#86 `review` on triangles › 3. משולשים מיוחדים**, #87 new on the whole site),
`admin_content_checks` / `admin_content_check` / `admin_content_uncheck` (kept in memory), `admin_fix_add`
(captured; new ids from #92), `admin_fix_comment`, `account_me` (the test student), `account_topic`,
`presence_ping {open:false}`, `events` (201), table reads → `[]`.

## Hooks the script looks for (UI agent: keep these, or add the data attributes)
The script tries the **data attribute first**, then the role / Hebrew text in the second column. Everything in
the second column already exists in `src/admin/pages/review/*` (2026-11-21); the data attributes are optional
but make the test immune to copy changes.

| What | Optional data hook | Fallback the script uses today |
|---|---|---|
| the tree | `[data-cpl=tree]` | `role=tree` name "תוכן האתר" |
| tree rows | `[role=treeitem][data-k="…"]` with `site`, `g\|<gradeId>`, `t\|<gradeId>\|<slug>`, `c\|<gradeId>\|<slug>\|<chapter>` (exists) | `role=treeitem` whose text starts with the name |
| selected row | `aria-selected="true"` (exists) | — |
| preview iframe | `iframe[data-cpl=frame]` | `iframe[title^="תצוגה חיה"]`, `iframe[src*="/topics/"]` |
| guard pill | `[data-cpl=pill]` | `.cpl-iso:not(.wait)`, text "לא נספר" |
| report button (page / bar) | `[data-cpl=report]` | button named exactly "דווח", else starting with "דווח" |
| report form | `[data-cpl=form]` | `.cpl-rep.on`, `role=dialog` containing "על מה?" |
| scope rows | `[data-cpl-scope=question\|sub\|chapter\|topic\|grade\|site]` | `role=radio` named "השאלה שעל המסך" · "כל ״<sub>״" · "כל הפרק ״<chapter>״" · "כל הנושא…" · "כל כיתה ח׳" · "כל האתר"; `aria-checked` must turn true |
| "רמה אחרת" | `[data-cpl=more-levels]` | `.cpl-more`, button starting with "רמה אחרת" |
| reason chips | `[data-cpl-reason="<text>"]` | button with the exact reason text |
| sentence | `[data-cpl=text]` | the form's `textarea` |
| frozen question | `[data-cpl=snapshot]` | `.cpl-snap` (must not say "לא הצלחנו לקרוא") |
| send | `[data-cpl=send]` | button ending with "שליחה" |
| who sends (first time) | — | button "סולימאן" |
| ✓ | `[data-cpl=check]` | button "✓ תקין" / "תקין" / "הפרק תקין · נבדק" |
| toast "הבא ›" | `[data-cpl=toast-next]` | a "הבא" button inside `role=status` or a toast, else a button "הבא ›" |
| progress card "לאשר תיקון / הבא לבדיקה" | `[data-cpl=next]` | button with that text |
| phone "בקשות N" | `[data-cpl=requests]` | button starting with "בקשות" |
| preview size toggle | `[data-cpl=dev-desk]`, `[data-cpl=dev-phone]` (exist) | buttons "מחשב" / "טלפון" |
| close a sheet | `[data-cpl=close]` | button "סגירה" (aria-label) |

The walk target and the "next" target are constants at the top of `run.mjs` (`T`): change them there if a
chapter is renamed in `src/home/chapters.js`.
