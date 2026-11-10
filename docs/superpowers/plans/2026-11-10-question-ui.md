# Question UI: implementation plan (2026-11-10)

Spec (read it first, every token and rule lives there):
`docs/superpowers/specs/2026-11-10-question-ui-design.md`. Repo rules: `CLAUDE.md`, `DESIGN.md`.

Four workstreams. **W1, W2, W3 run in parallel** on disjoint files. **W4 starts after W2 is merged**
(it overrides W2's base in the `page` layer and must see the result). Nobody touches a file outside
their list; if you need something from another list, write it down in your report instead.

Hard rules for every workstream:
- Never edit `src/topics/*/Topic.jsx`, `src/topics/*/styles.js` (W4 overrides in `topic-fixes.css`
  instead), the duel generators' numbers/answers, or any Hebrew a student reads on a topic page.
- `python3 tools/verify-logic.py` → "math and text untouched". `npx next build` passes.
- transform/opacity motion only; `prefers-reduced-motion` honoured; no emoji; no letter-spacing on Hebrew.
- Dev server: `http://localhost:5180` is running (don't start another). Playwright:
  `createRequire("/Users/abedshalgam/.npm/_npx/e41f203b7505f1fb/node_modules/")` → `require("playwright")`
  (`chromium` and `webkit`). Audit scripts to copy from:
  `/private/tmp/claude-501/-Users-abedshalgam-MathProject/55d7e78f-fe67-49b4-8344-c1ef758d2577/scratchpad/plan/duel-audit.mjs`
  and `…/plan/topic-audit.mjs`. Put your own shots in `…/scratchpad/plan/<W>/`.
- Viewports to check (`isMobile: true, hasTouch: true, deviceScaleFactor: 2`): 360×780, 375×667,
  390×844, 393×852, 402×874, 430×932, 440×956; plus 768×1024 and 1280×800 without touch.
  Chromium **and** WebKit for 375×667 and 390×844 at least.
- Commit nothing; report what you changed, what you checked (with screenshot paths), what you didn't.

---

## W1 — Duel arena (Opus)

**Owns:** `src/duel/Arena.jsx`, `src/duel/Keypad.jsx`, `src/duel/MathText.jsx`, `src/duel/math-core.js`,
`src/duel/math-core.test.mjs`, `src/duel/arena-core.js` (only `FEEDBACK_MS`), `src/duel/arena-core.test.mjs`,
`src/duel/Play.jsx`, `src/duel/fx.js`, `src/styles/duel-arena.css`,
`supabase/functions/_shared/duel/topics/quadratic-solver.js`, and — only if its reader breaks —
`supabase/functions/_shared/duel/expect-fnalg.mjs`. Nothing else (not `Hud.jsx`, not `duel.css`, not
`Result.jsx`: the review list is styled through `duel-arena.css` only).

Preview: `http://localhost:5180/dev/duel?s=arena&gen=<id>&q=<n>&seed=3` (even q = choices, odd q = typed);
states `s=lastq|locked|hot|waiting|finishing`. Generator ids in the spec's brief; stress prompts:
`qs.coef` (bidi), `dn.combo` (long expression), `lf.twopts` (3 lines, typed), `rp.pct` (typed with / and .),
`so.cyl` (unit π), `tr.angles` (unit °), `pr.powers` (fraction choices), `ci.arc`.

### Tasks
1. **Card and layout** (spec 4.1). `.dar-card` → white card, `flex: 1; display: grid; place-content: center`;
   `.dar-meta` holds count · streak · "ויתור" (move the button from `.dar-foot`, delete the footer);
   `.dar-q` paddings per spec; `.dar-bottom` stays bottom-anchored.
   *Accept:* 390×844 choice: card top ≤ 170 px, prompt vertically centred in the card (card centre
   within ±12 px of the prompt block centre); 430×932: no band of empty paper taller than 24 px between
   the meta row and the card; 375×667 `lf.twopts&q=1`: `document.documentElement.scrollHeight ===
   innerHeight` (no scroll), "ויתור" visible; "ויתור" hit area ≥ 44×44.
2. **Prompt roles** (spec 4.2). In `math-core.js`: `lineRole()` (ask | eq | target) + `tidyLines()`
   (drop a trailing `:` after an island when more lines follow); keep `proseToText` unchanged for aria.
   `MathText` renders `.dmx-line.ask/.eq/.target`, `?` chip on `.target`. `promptSize()` steps now size
   only the ask line; `useFitPrompt` fits only `.eq` rows (floor 1.35 rem, then wrap before operators).
   Tests: add cases to `math-core.test.mjs` for `lineRole` ("$b = ?$", "$S = ?π$", "$x = ?$ " with unit,
   a math-only middle line is `eq`, a single prose line is `ask`), `tidyLines`, and that `dn.combo`'s
   expression never gets a smaller computed step than the ask line (`promptSize` returns the ask step
   only). `node --test src/duel/*.test.mjs` passes.
   *Accept:* `dn.combo&q=0` at 360×780: computed font-size of `.dmx-line.eq .dmx` ≥ 21.6 px and > the
   ask line's font-size; `ix.lines&q=0`: two formula rows, both --q-math, the ask line ≤ 1.25 rem;
   `lf.twopts&q=0`: last line "m = ?" rendered as `.target` in `--me-7` with the `?` chip.
3. **Bidi** (spec 4.3). `quadratic-solver.js`: line 1 → `סדרו את המשוואה לצורה הכללית $x^{2} + bx + c = 0$`
   (same random calls, same numbers, same answer, same choices). Run
   `node --test supabase/functions/_shared/duel/*.test.mjs` (anti-guessing guard + expect readers) —
   fix `expect-fnalg.mjs`'s `qs.coef` reader only if it parsed the old line.
   *Accept:* `qs.coef&q=0` at 360×780 and 390×844: the first line reads "סדרו את המשוואה לצורה הכללית"
   followed by the island on the same visual line or wrapped as a whole; no line starts with ":".
   `node tools/duel-shapes.mjs 'qs\.coef'` shows the new line for all 457 shapes.
4. **Choices states** (spec 4.4): soften the ledge, add `.sent` (set in `Arena.jsx` from a local
   `picked` state on pointerup/click, before `onAnswer` resolves; cleared when `fb` arrives or on error),
   dim the others, `.good/.bad/.show` per spec, pop/shake keyframes.
   *Accept:* Playwright: tap a choice, screenshot at 60 ms → the tapped button has `.sent` (accent-50
   bg + inset ring) and the other three have opacity .55; at `FEEDBACK_MS − 50` the right one is green
   (#16a34a) — use `GENERATORS[...].make(mulberry32(3*1000+i), kind)` to know the answer, as
   `duel-audit.mjs` does.
5. **Keypad grid + send** (spec 4.4): fixed 4 rows + full-width send; `0` spans 2; empty cells; keys
   48/44 px; send 56/50 px; `sending` = dot pulse on the label.
   *Accept:* `rp.pct&q=1` (keys `/` and `.`) and `eq.linear&q=1` (no extras) have the **same** `.dkp-grid`
   height; `.dkp-go` width === `.dkp-grid` width on every phone viewport; at 375×667 total layout fits
   (`scrollHeight === innerHeight`); every key ≥ 44 px tall.
6. **Answer slot in the card** (spec 4.4): move the `Typed` display out of `.dkp` into `.dar-slot`
   inside `.dar-qb` (render it from `Arena.jsx`; `Keypad` becomes keys-only and reports `value` up via
   a callback or lifts state to `Arena`); caret instead of "?"; unit; focus/typing/sending/correct/
   wrong states; remove `.dar-sub` "הקלידו את התשובה" and the `.dar-typed` line; add `.dar-status`
   ("נכון! +N" / "התשובה: …") inside the card. Hardware-keyboard handling in `Keypad.jsx` stays.
   *Accept:* typed question idle: `.dar-slot` is inside `.dar-card`, height 60 px (54 ≤ 700 tall), caret
   visible (and not blinking under `prefers-reduced-motion`); after typing "12" the slot shows "12";
   after sending the right answer the slot bg is #f0fdf4 and `.dar-status` text starts with "נכון!";
   after a wrong send the slot is red and `.dar-status` shows "התשובה:" with the unit when the question
   has one (`so.cyl&q=1` → "π", `tr.angles&q=1` → "°").
7. **Lock veil on the answer area only** (spec 4.5): `.dar-lock` is positioned over `.dar-bottom`
   (make `.dar-bottom { position: relative }`), countdown + label; the card stays crisp and shows the
   right answer (choices: `.show`; typed: `.dar-status`).
   *Accept:* `s=locked` at 390×844: the prompt text is fully readable (no blur over `.dar-card`:
   `getComputedStyle(lock).top` ≥ card bottom); countdown 2 → 1 visible; after the lock the next
   question rises in.
8. **Timing** (spec 4.5): `FEEDBACK_MS = 650` in `arena-core.js` (update `arena-core.test.mjs`
   expectations); card leave (140 ms) + rise (220 ms) when `q.idx` changes (key on the card is already
   per question; add the leave animation via a short-lived `.leaving` clone or `View Transitions`-free
   CSS: simplest is keep the key swap and only animate the rise — leave is optional, document the choice).
   *Accept:* `node --test src/duel/*.test.mjs` green; a correct answer shows green for ≥ 600 ms before
   the next prompt text changes (Playwright: poll `.dar-prompt` text every 50 ms).
9. **Last question / waiting / desktop / review list** (spec 4.6–4.8): badge instead of `.dar-sub`,
   `dar-beat` ×2; waiting panel inside the card; ≥ 600 px sizes; `.drs-li-q` role styles.
   *Accept:* `s=lastq`: a pill with "שאלה אחרונה" above the ask line, no infinite animation on the card
   after 3 s (`getAnimations()` on `.dar-card` is empty); `s=waiting` and `s=finishing` render inside the
   white card; 1280×800 typed: keys ≤ 60 px, choices 72 px; `s=win` result review list shows ask/eq/target
   roles.
10. **Reduced motion + WebKit pass**: emulate `reducedMotion: "reduce"` → no shake/pop/caret blink/
    beat; run every accept check above in WebKit at 375×667 and 390×844.

### Commands
```
node --test src/duel/*.test.mjs
node --test supabase/functions/_shared/duel/*.test.mjs
node tools/duel-shapes.mjs 'qs\.coef' | head
npx next build
```

---

## W2 — Practice design system + feedback runtime (Opus)

**Owns:** `src/styles/mp.css`, `src/lib/mp-runtime.js`, `DESIGN.md` (document the new classes/roles).
Nothing else (no `topic-fixes.css` — that is W4; no `Keypad.jsx`/`keypad.css` — that is W3).

Contract with W3 (write it exactly like this, W3 codes against it in parallel):
- Runtime dispatches `window.dispatchEvent(new CustomEvent("mp:fb", { detail: { kind, el } }))`,
  `kind ∈ "ok" | "bad" | "win"`, `el` = the feedback element, **after** it has added
  `.mp-right` / `.mp-wrong` to the inputs. Keep dispatching the existing `mp:win`.
- Runtime reads W3's `html.kp-open` and `--kp-h` (on `<html>`) to keep feedback above the keypad.
- CSS for `.mp-right`, `.mp-wrong`, `.mp-more`, `.mp-open` lives in `mp.css`. `mp.css` never styles `.kp*`.

Preview: `http://localhost:5180/topics/<slug>` for all 17 slugs (`src/topics/registry.js`); chapters by
tapping `.ch-btn/.nav-btn`. Right-answer flows you can drive: circle ch2 (type 2×r / r÷2 from the
`.hint` text), powers-roots ch1 (base and count from "8 × 8 × 8"), quadrilaterals ch2 (S = a²).

### Tasks
1. **Question-line promotion** (spec 5.2 §1) + real-hint rule.
   *Accept:* circle ch2 at 390×844: the `.hint` before `.ans-row` is ≥ 16.8 px, weight 600, colour
   `rgb(28, 27, 25)`; intersection/inequalities/similar-triangles ch1–2 likewise for the line right
   before the controls; a `.hint` **not** followed by controls (e.g. quadratic-solver "לחיצה קצרה…")
   stays ink-3 but ≥ 14.4 px.
2. **Formula hero, step card, step label chip, card title, given chips, lesson panels** (spec 5.2 §2–7).
   *Accept:* powers-roots ch1 `.eq-box` computed font ≥ 23 px weight 700 Rubik; ratio-percent ch2
   `.eq-box` font-family is Rubik (not Courier); `.step-card` background `#fff` with an accent spine
   on the inline-start side; `.step-label` is a pill (border-radius ≥ 100 px); `.card-t` ≥ 18.4 px.
3. **Lesson-panel fold** in the runtime (spec 5.2 §4): after the topic renders (and on chapter change),
   each panel in the list taller than 220 px with no `button/input/select` inside gets `.mp-fold` +
   an appended `<button class="mp-more">עוד</button>`; tap → `.mp-open` (and the button says "פחות").
   Phones only (`matchMedia("(max-width: 640px)")`). Desktop: never folded.
   *Accept:* linear-function ch1 at 390×844: the first `.def-box`/intro panel is folded with a fade and
   an "עוד" button; tapping it reveals the full text; `tools/verify-logic.py` still passes (runtime
   only appends nodes, never changes text nodes); no fold when `.info-box` contains a button
   (circle ch1 "הבנתי ✓").
4. **Answer controls** (spec 5.3): input sizes/typography via `min-width`/`min-height` (never `width`),
   `.mp-right/.mp-wrong` looks, check button sizing + full-row rule, "primary → outline" rules, choice
   chips + grid on phones.
   *Accept:* circle ch2 input ≥ 96×56, font ≥ 22 px; its `.bp` ≥ 56 px tall; `.center .bp` "תרגיל חדש"
   has a white background and accent border (outline); circle ch1 `.choice-btn` ≥ 48 px tall, 1 rem,
   laid out in a grid (no chip narrower than 96 px); 1280×800: inputs 52 px, button auto width;
   no horizontal overflow on any topic/chapter at 360 and 390 (reuse `topic-audit.mjs`).
5. **Feedback** (spec 5.4): runtime marks inputs, dispatches `mp:fb`, scrolls the feedback above the
   keypad when `html.kp-open`; CSS pill rows with SVG icons for `.fb.ok/.err` (+ `.feedback.ok/.err`,
   `.feedback-ok/.feedback-err`, `.msg-success/.msg-error`).
   *Accept:* circle ch2, 390×844, keypad open (W3 may not be merged yet — emulate by setting
   `html.kp-open` and `--kp-h: 270px` in the test): type 999, press the check button → within 300 ms the
   input has `.mp-wrong` (border #ef4444) and the `.fb.err` bottom edge is ≤ `innerHeight − 270 − 12`;
   `window` received `mp:fb` with `kind: "bad"`; typing a digit removes `.mp-wrong`; a right answer adds
   `.mp-right` and dispatches `kind: "ok"`; the `.fb.err` row shows an SVG icon (`::before` with
   `background-image`), no emoji.
6. **DESIGN.md**: add a "Question anatomy" section (roles, the promotion rule, `.mp-right/.mp-wrong`,
   `mp:fb`, the fold) and update the class table.
7. **Full pass**: screenshots of every topic's every chapter at 390×844 (full page) and 375×667
   (viewport) in Chromium, plus 5 topics in WebKit; compare with
   `…/scratchpad/plan/topics/*-full.png` and list what changed per topic in the report.

### Commands
```
python3 tools/verify-logic.py
npx next build
```

---

## W3 — Practice keypad (Opus)

**Owns:** `src/components/Keypad.jsx`, `src/styles/keypad.css`. Nothing else. (The `mp-topbar` hide is
done from `keypad.css` with `html.kp-open .mp-topbar`.)

Contract with W2 (see W2 header): listen to `window` `mp:fb` (`detail.kind`, `detail.el`). Until W2
lands, test with a manual `window.dispatchEvent(new CustomEvent("mp:fb", {detail:{kind:"ok", el}}))`.

### Tasks
1. **Behaviour after an answer** (spec 5.5 table): on `bad` keep open + focus + select the box's
   content; on `ok`/`win` close after 180 ms, re-open within 600 ms if a new empty visible answer box
   appears inside the same card (use `cardOf`); close when `.banner` appears (observe `#root` childList
   for `.banner, .success-banner, .summary-box`); keep the existing "box disappeared" poll.
   *Accept:* circle ch2 at 390×844: wrong answer → keypad still open, the input's selection covers the
   whole value (`selectionStart === 0 && selectionEnd === value.length`); right answer → `.kp` is gone
   and `html.kp-open` removed within 400 ms, body padding-bottom back to 0; powers-roots ch1 (two
   boxes): "הבא" moves to the second box, wrong keeps the keypad, right closes it.
2. **Keep the row visible** (spec 5.5/5.6): opaque top bar; on `≤ 700px tall` hide `.mp-topbar` while
   open (translateY, transition 180 ms); the scroll-into-view keeps the box **and** its check button
   ≥ 12 px above the keypad (today's logic, tightened: also when the button is on the next wrapped row).
   *Accept:* 375×667 circle ch2 and ratio-percent ch1: after tapping the box, both the input's and the
   check button's bottom edge < keypad top − 12 px; WebKit 375×667: no page content visible through the
   bar (screenshot pixel check on the bar area is uniform surface colour ±2).
3. **Look** (spec 5.5): sizes 48/44, radii, colours, ✓ key icon, extras chips, caret colour on the
   target box; height 270 / 254 px; body padding `--kp-h + 24px`; landscape (height ≤ 480) 40 px keys.
   *Accept:* `.kp` offsetHeight ≤ 272 at 390×844 and ≤ 256 at 375×667; every key ≥ 44 px tall at
   ≤ 700 tall and ≥ 48 px otherwise; digits ≥ 23 px font; the ✓ key spans two rows and has an SVG;
   no `letter-spacing` anywhere in `keypad.css`.
4. **Regression on all 17 topics**: open the keypad on the first visible input of every chapter that has
   one (reuse `topic-audit.mjs`'s loop), 390×844 Chromium + 375×667 WebKit; type 999 + ✓; then on
   circle/powers/quadrilaterals a right answer.
   *Accept:* the keypad opens on every box it opened on before (list them from
   `…/scratchpad/plan/topics/log.txt` "keypad open"); never opens on desktop (`pointer: fine`); "מקלדת
   רגילה" still switches to the phone keyboard; hardware Enter/digits unaffected.

### Commands
```
npx next build
```

---

## W4 — Per-topic polish in `topic-fixes.css` (Opus) — **after W2 is merged**

**Owns:** `src/styles/topic-fixes.css` only. Every rule scoped `html[data-page="<slug>"]`, layer `page`.
Goal: apply the spec's roles where W2's generic selectors can't reach, and fix what each topic's own
`styles.js` still breaks. Never edit `styles.js` or `Topic.jsx`.

Per-topic checklist (from the audit's class inventory, `…/scratchpad/plan/topics/log.txt`):

| Topic | Do |
|---|---|
| angles-parallel | `.formula-box` hero size; `.choice-row` grid; `.def-box` quiet; drawing stage ok |
| circle | question `.hint`/`.area-hint` lines in every chapter (ch2 radius↔diameter, ch3 circumference `r = 8. חשב…`, ch5 area) → ask; `.pi-box`, `.rad-facts` quiet; `.ex-card .ex-text` ask / `.ex-math` hero; `.mp-frac` sizes; ch1 7 chips grid |
| directed-numbers | `.eq-box` (20 px/400) → hero 700; `.expr-row`; `.nl-wrap` number line hint vs question; `.rules-grid` quiet |
| equation-solver | the grey `.hint` above the op-box is the instruction → ask (ink, ≥ 1.05 rem); `.action-row`: "אישור" filled, "פשט" outline; "משוואה חדשה" outline; history `.h-row` quiet |
| equations-advanced | `.math-input` (60 px) → min-width 96/56 px; `.input-row` wraps on phones; `.feedback-err` pill; `.btn-new` outline; `.sm-ex-q` ask; `.formulas-ref` quiet |
| inequalities | "שלב 1/2" `.hint` lines → ask; `.iq-*` solver rows ≥ 44 px; `.formula-box` 22 px ok → hero size; `.c1/.c2` |
| intersection | `.step-label` + the question; the "בנקודת החיתוך ערכי y שווים" `.hint` stays a hint (.9 rem) but readable; two inputs side by side ≥ 96 px each |
| linear-function | `.task-title` 1.15/700, `.task-desc` ask; `.math-input` 60 px → 96/56; `.btn-primary`/`.btn-outline` roles (check filled, "נקודות חדשות" outline); `.point-chip` ≥ 44 px; `.feedback` pill |
| parabola-practice | `.task-box` = the question → ask style (not warn-50 unless it is a warning); `.formula` hero; `.input-row`; `.btn.orange` "פרבולה חדשה" → outline; `.msg-info` quiet |
| powers-roots | `.eq-box` 18 px/400 → hero; `.be-template` inputs (base + exponent `sup input`) ≥ 48 px, exponent box 40 px; `.law-card` quiet; `.proof` untouched |
| pythagoras | `.py-ex-t` ask; `.py-ans` input 96/56; `.py-big` hero; `.steps` chips; `.tri-box` max-height stays |
| quadratic-solver | `.card-title` 1.15/700; `.hint` real hint ≥ .9 rem; `.btn-new` outline; `.act-btn` ≥ 44 px; `.eq-row .tc/.tp` equation hero on phones (zoom rules from mp.css §7c still apply) |
| quadrilaterals | `.formula-box` 16 px → hero; `.given-box` chips; `.q-grid` 3 inputs ≥ 96 px (wrap to 2 columns ≤ 400 px); `.prop-btn` ≥ 44 px; `.ex-card` roles |
| ratio-percent | `.q-text` → ask; `.eq-box`/`.frac` Rubik + hero; `.frac-num/.frac-den` 1.25 rem; `.example-box` quiet (no dashed border) |
| similar-triangles | the instruction `.hint` ("לחץ על כל זוג זוויות שוות") → ask; `.given-box` chips; `.tri-row` stacks on phones |
| solids3d | `.s3d-hint` ask when it asks, hint otherwise; `.s3d-tags`/`.part-btn` ≥ 44 px; 3D view untouched |
| triangles | `.formula-box` 18 px → hero; `.info-steps` quiet; `.theorem-card` ≥ 44 px rows; `.choice-row` grid |

*Accept (per topic):* at 390×844 and 375×667 every chapter: the question line ≥ 16.8 px ink/600, the
formula ≥ 23 px/700 Rubik, inputs ≥ 96×52, check button ≥ 52 px, no horizontal overflow, nothing
interactive < 44 px tall; `python3 tools/verify-logic.py` untouched; `npx next build` passes. Report a
before/after pair per topic (`…/scratchpad/plan/topics/<slug>-ch<n>-full.png` vs yours).

---

## Cross-cutting QA (lead, after all four are merged)

1. `python3 tools/verify-logic.py` → "math and text untouched".
2. `node --test src/duel/*.test.mjs` and `node --test supabase/functions/_shared/duel/*.test.mjs` green.
3. `npx next build` passes.
4. Duel arena, Chromium + WebKit, every viewport in the list: choice idle / sent / right / wrong+lock /
   typed idle / typing / right / wrong+lock / `lastq` / `hot` / `waiting` / `finishing`; `qs.coef`,
   `dn.combo`, `lf.twopts`, `rp.pct`, `so.cyl`, `tr.angles`, `pr.powers`, `ci.arc`. Must be true:
   no scroll on 375×667; card in the upper half; math bigger than words; ink on white; HUD contrast
   unchanged; `.sent` within 60 ms; green ≥ 600 ms; lock veil never covers the card; no horizontal
   overflow; reduced-motion = still.
5. Practice, all 17 topics × all chapters at 360×780, 375×667, 390×844, 430×932 (Chromium) and
   375×667 + 390×844 (WebKit): question line is ink and ≥ 16.8 px; formula is the biggest text in the
   card; keypad opens/closes per the table (wrong = stays + selected; right = closes; banner = closes);
   `.fb` visible above the keypad; check button visible above the keypad; no horizontal overflow;
   "תרגיל חדש"-type buttons are outline; folded panels open on tap; nothing interactive < 44 px.
6. Desktop 1280×800 and tablet 768×1024: both surfaces look intentional (column widths, no giant keys,
   no keypad on desktop).
7. Dark HUD contrast and the account menu / sheets in the arena still open above everything.
8. Record an iPhone-size scroll video of two topic pages and one duel; review frame by frame
   (Abed's rule: judge motion with a video, not stills).

## Risks to watch
- `:has()` chains in `mp.css` are heavy on long pages — keep them to the listed selectors; measure
  style recalc on linear-function (10 chapters) if scrolling stutters.
- The runtime fold appends a button inside Sulaiman's panel: verify no topic uses `:last-child` logic
  on those panels (grep `last-child` in each `styles.js`; if hit, scope the fold out for that topic).
- Moving the typed display into the card changes the hardware-keyboard focus logic in
  `src/duel/Keypad.jsx` (`keypadKeyTarget`): keep the keys-only root as the `ref` and re-run
  `arena-core.test.mjs`.
- `FEEDBACK_MS` change: any test asserting 450 must be updated on purpose, not silenced.
