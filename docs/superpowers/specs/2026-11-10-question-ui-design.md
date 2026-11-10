# Question UI: design spec (2026-11-10)

How a QUESTION looks and behaves, on both surfaces: the duel arena and the practice topic pages.
Abed (2026-11-10): "why is the question at the bottom? … overall it's not looking good and it's hard to
understand. Why all in gray? … improve the UI/UX over ALL of the questions — even normal questions, not
just duel … without changing the question itself or the concept … check every corner: the keypad, what
happens after sending, do you still show the calculator if the answer was right?"

Scope: presentation, hierarchy, layout, feedback, keypad behaviour, flow timing (duel) and pure
display/bidi fixes to duel prompts. NOT in scope: the math, the numbers, the exercises, any Hebrew a
student reads on a topic page (`src/topics/*/Topic.jsx` stays byte-identical; `tools/verify-logic.py`
must still say "math and text untouched").

Implementation plan: `docs/superpowers/plans/2026-11-10-question-ui.md`.

---

## 1. Audit — what a student feels today

Screenshots: `/private/tmp/claude-501/-Users-abedshalgam-MathProject/55d7e78f-fe67-49b4-8344-c1ef758d2577/scratchpad/plan/`
(`duel/` = arena, `topics/` = practice; `audit/` = Abed's own strip). Measurements: `duel/metrics.json`,
`topics/log.txt`. Engines: Chromium + WebKit (iPhone Safari engine), touch emulation.

### 1.1 Duel arena (`src/duel/Arena.jsx`, `duel-arena.css`)

| # | Problem | Evidence | Why it hurts |
|---|---|---|---|
| D1 | **The question sits at the bottom.** `.dar-card` is `justify-content: flex-end`, so on a 390×844 phone the question block starts at y=506 (meta row ends at 158): a **350 px empty band** under the HUD; 460 px on 430×932. | `duel/cr-390x844-01-choice-idle.png`, `cr-430x932-01-choice-idle.png`, metrics `qbT` | Eyes land on nothing; the screen looks broken / unfinished. |
| D2 | **No container, no hierarchy.** Instruction line ("פתרו את המשוואה:") and the equation are the same colour and nearly the same weight; `$b = ?$` looks like a third formula. Long formulas (dn.combo) shrink to 22 px while the words stay 26 px — the math becomes the smallest thing on screen. | `cr-360x780-12-dn-combo.png`, `cr-390x844-11-qs-coef.png` | "Hard to understand": the student can't tell *what to do*, *with what*, *what to answer*. |
| D3 | **Looks grey.** Prompt is #0f172a/700 directly on the #f1f5f9 paper, no white surface, `dar-rise` fades it in from 0 opacity; the meta line, sub-line ("הקלידו את התשובה"), placeholder "?" (#cbd5e1) and the dotted "ויתור" are all grey. The only saturated things are the HUD and the send button. | `audit/duel-strip.png` (Abed's), `cr-375x667-03-typed-idle.png` | The question has no "ink" moment; the whole middle reads as secondary. |
| D4 | **Bidi: `qs.coef`.** "סדרו את המשוואה לצורה $x² + bx + c = 0$:" — the colon after an LTR island lands visually *left of the formula*, so the line reads ":x²+bx+c=0 לצורה" on two lines. | `cr-360x780-11-qs-coef.png` | Looks like a bug, and "לצורה" is orphaned. |
| D5 | **Dead tap.** Tapping a choice shows nothing until the server answers (lab: >140 ms; real network 200–800 ms). At 120–140 ms the button is visually untouched. Typed: the send button only turns into "…". | `cr-390x844-02-choice-right.png` (taken 140 ms after the tap: identical to idle), `duel/zoom-feedback.png` | Students double-tap or think it froze. |
| D6 | **Typed answer feedback is tiny and under the keypad.** After send, the keypad stays fully visible and "נכון!" appears in 1.05 rem under it. The typed value never turns green/red. | `cr-390x844-06-typed-right.png` | The reward moment is invisible; wrong vs right is a colour of 6 letters. |
| D7 | **Lock overlay hides the question.** A wrong answer blurs the *whole* question area for 2 s; the right answer is shown as 1 rem `small` text inside the veil. | `cr-390x844-08-choice-wrong-lock.png`, `10-typed-wrong-lock.png` | 2 seconds in which the student could learn, wasted staring at a "2". |
| D8 | **Small phones (375×667, 360×780).** With fraction/decimal keys the keypad gets a 4th row and the send button is 166 px wide (2 columns); with a 3-line prompt (`lf.twopts`) the layout is 707 px tall on a 667 px screen → the arena scrolls and "ויתור" falls off. | `cr-375x667-14-rp-pct-typed-keys.png`, `cr-375x667-17-lf-twopts-typed.png` (footB=707) | Cramped; the main action is a narrow pill off-centre. |
| D9 | **Typed answer field is weak**: an underline + a pale "?" (#cbd5e1 on #f1f5f9 ≈ 1.5:1). | `cr-390x844-03-typed-idle.png` | Students don't see where the number goes. |
| D10 | **Last question** = a small orange sentence + an infinite heartbeat on the card. | `cr-390x844-19-lastq.png` | Noise with no shape; the heartbeat never stops. |
| D11 | Choice buttons: a hard `0 4px 0 #cbd5e1` ledge, 1.65 rem text; fine, but "game-y" against the calm system and identical for 1-char and 8-char answers. | `cr-390x844-16-pr-powers-frac-choices.png` | Minor; keep the pressable feel, soften it. |

### 1.2 Practice topic pages (`/topics/<slug>`, 17 topics)

| # | Problem | Evidence | Why it hurts |
|---|---|---|---|
| P1 | **The question is styled as a hint.** In circle, intersection, inequalities, similar-triangles, quadratic-solver the sentence that *asks* ("הרדיוס הוא 11 ס״מ. מה הקוטר?", "שלב 1: פתרו את האי-שוויון") is `.hint`: 13–14.7 px, colour #8a877f (ink-3). | `topics/circle-ch2-full.png`, `inequalities-ch2-full.png`, `log.txt` ("hint" rows) | **This is the "why all in gray".** The one line a student must read is the faintest line on the page. |
| P2 | **Everything is the same weight.** Explanation panels (`.info-box`, `.info`, `.def-box`), the formula, the given data, the step card and the answer row all sit at 14–18 px; `.card-t` 17.9 px, `.step-label` 14 px, `.formula-box` 16–20 px (powers: 18 px/400). Nothing is the hero. | `topics/strip-pages-a.png`, `strip-pages-b.png` | The exercise doesn't stand out from the lesson text above it. |
| P3 | **Answer boxes are tiny**: 55–84 px wide, 40 px tall, 16 px text; check buttons 42 px tall, 12–15 px text ("הבנתי ✓" is 12 px). | `log.txt` inputs/checkBtns | On a phone the main control is the smallest control. |
| P4 | **Wrong-answer feedback hides behind the keypad.** `.fb.err` appears under the answer row at y≈575–577 on 390×844; the keypad top is at 583 → the red line is covered or 1 line peeks. Same in equations-advanced, intersection, powers-roots, ratio-percent, triangles. | `topics/circle-after-wrong.png`, `log.txt` "after wrong → fb @y577" | Student presses check, nothing visible happens. |
| P5 | **Keypad behaviour after an answer is inconsistent.** It stays open after a wrong answer (good) *and* after a right one (bad: the next action is "תרגיל חדש", hidden behind it). In inequalities it closes on wrong (the input re-renders). The input never turns red/green. | `log.txt` "keypad STILL open" ×11, inequalities "closed" | Abed's exact complaint: "you still show the calculator if the answer was right?" |
| P6 | **Small phones**: on 375×667 the keypad (261 px) covers 39 % of the screen; the check button of the current step sits right under the keypad's top bar; WebKit shows page content through the translucent bar. | `topics/cr-375x667-circle-kp.png`, `wk-375x667-ratio-percent-kp.png` | The student can't see the row they are typing into. |
| P7 | **Primary colour everywhere**: "תרגיל חדש", "משוואה חדשה", "בדוק", "הבנתי" are all filled accent; "משוואה חדשה 🎲" (equation-solver) and "פרבולה חדשה" (parabola) are the loudest things on the page while the task is quiet. | `topics/quadratic-solver-ch1-full.png`, `equation-solver-ch1-full.png` | No visual order of actions. |
| P8 | **Choice chips** (`.choice-btn`) are 38–48 px wide, 12 px text, wrapping pills ("מרכז", "רדיוס", "קוטר", "מיתר", "משיק", "קשת", "גזרה"). | `topics/circle-ch1-full.png` | Hard to tap, hard to read. |
| P9 | Formula boxes with Courier (ratio-percent `.eq-box`, `.frac`), 400-weight math (powers, directed numbers). | `topics/ratio-percent-ch2-full.png`, `directed-numbers-ch2-full.png` | Looks like 2010. |
| P10 | No horizontal overflow found on 390 px in any chapter (good). WebKit renders match Chromium (good). | `log.txt` overflow=0 | — |

---

## 2. What "spectacular but calm" means here

1. **One hero per screen: the math.** The formula/equation/number to work with is the biggest, darkest,
   boldest thing in the viewport. Everything else steps back one level each: ask-words → formula →
   asked quantity → answer slot → keys. If two things compete, the math wins.
2. **Ink, not grey.** Question text is `#0f172a` (duel) / `--ink #1c1b19` (practice). Grey (`ink-3`) is
   allowed only for meta ("שאלה 4 מתוך 15", units' labels, real hints that are *not* the question).
3. **White surface for the question.** The question lives on a white card with a soft shadow; the page
   behind it is paper. The card is where the eye lands — in the upper half of the screen.
4. **Accent used in exactly three places** on a question screen: the asked quantity / answer slot
   (border + caret), the primary button (check / send), the focus ring. Nothing else is accent-filled.
5. **Green and red only mean right and wrong**, and they appear on the thing the student touched (the
   button, the slot, the input) — big enough to be seen from arm's length (≥ 1.1 rem, filled, not a
   coloured sentence).
6. **Motion with meaning, one per moment:** new question rises in (220 ms); tap = press; send = a
   thin accent progress line; right = fill green + 1.04 pop; wrong = 300 ms shake + red fill; next =
   old card slides up 12 px and fades (140 ms). transform/opacity only. Nothing loops except the HUD
   timer in the last 30 s. `prefers-reduced-motion` = no motion, same colours.
7. **The thumb owns the bottom 45 %.** Answer buttons / keypad / check button live there; the send or
   check button is full-width and the last thing before the safe area.
8. **No emoji, no glyph decorations, no gradients** (HUD excepted). Icons = line icons (Phosphor-style
   SVG) at 20 px, only on the keypad (⌫, ✓) and the close/next chips.

---

## 3. Shared tokens (both surfaces)

```
/* type (Rubik everywhere; never letter-spacing on Hebrew) */
--q-ask:      clamp(1.05rem, 4.4vw, 1.25rem) / 1.45 / 600   ask-words line
--q-math:     clamp(1.9rem, 8.4vw, 2.5rem)  / 1.2  / 800   formula row (duel)
--q-math-p:   clamp(1.45rem, 6vw, 1.9rem)   / 1.25 / 700   formula box (practice)
--q-target:   clamp(1.35rem, 5.6vw, 1.6rem) / 1.2  / 700   asked quantity "b = ?"
--q-slot:     clamp(1.7rem, 7.5vw, 2.1rem)  / 1    / 800   typed answer slot, tabular-nums
--q-choice:   clamp(1.35rem, 5.4vw, 1.6rem) / 1.1  / 800   choice buttons (duel)
--q-meta:     .82rem / 600                               "שאלה 4 מתוך 15", units' labels
--q-hint:     .9rem / 500 / ink-3                        real hints only

/* colour roles */
ink-q:        #0f172a (duel) · var(--ink) #1c1b19 (practice)
ask:          #334155 (duel) · var(--ink-2) #4f4d48 (practice)
meta:         #64748b (duel) · var(--ink-3) (practice)
accent:       --me-5/6/7 (duel, the student's colour) · --a-500/600/700 (practice, topic colour)
ok:           fill #16a34a, text on fill #fff, soft #f0fdf4 / border #22c55e / text #166534
bad:          fill #dc2626, text on fill #fff, soft #fef2f2 / border #ef4444 / text #991b1b
card:         #fff, radius 24 (duel 28), shadow 0 1px 2px rgb(15 23 42/.04), 0 16px 40px -24px rgb(15 23 42/.28)
slot idle:    bg #f8fafc, border 2px color-mix(accent-300 70%, #e2e8f0), radius 16
slot focus:   border 2px accent-500, ring 0 0 0 4px color-mix(accent-500 18%, transparent)

/* shape & space */
radius:       card 24/28 · slot 16 · key 14 · choice 20 · button 14 · chip pill
gutter:       16px phone, 20px ≥ 600
stack gap:    ask → math 10px · math → target 14px · target → slot 12px · card → answers 14px

/* motion */
--ease-out:   cubic-bezier(.23, 1, .32, 1)
--pop:        cubic-bezier(.2, 1.4, .4, 1)
rise-in:      220ms ease-out, from translateY(10px) + opacity 0
press:        100ms, translateY(2px) (duel ledge) · scale(.96) (practice)
right:        fill 160ms + scale 1 → 1.04 → 1 over 320ms --pop
wrong:        shake 300ms (±4px, 4 cycles, cubic-bezier(.36,.07,.19,.97)) + fill 120ms
leave:        140ms, translateY(-12px) + opacity 0
reduced-motion: durations 1ms, no shake/pop; colours unchanged
```

Breakpoints used everywhere: `≤ 700px tall` = short phone (SE 375×667, 360×640); `360–440 wide` =
phones; `≥ 600 wide` = tablet/desktop column. Use `100dvh` with a `100vh` fallback; respect
`env(safe-area-inset-bottom)` on everything docked.

---

## 4. Duel arena — target design

### 4.1 Anatomy (phone, top → bottom)

```
┌ HUD (dark, unchanged) ───────────────────────────────┐
├ meta row: "שאלה 4 מתוך 15"   [streak pill]  [ויתור] ┤  28px, directly under the HUD (14px gap)
├ QUESTION CARD (white, flex: 1, content centred) ─────┤
│   ask-words        "פתרו את המשוואה"      (--q-ask, #334155)
│   formula row      4x − 4 = 2x + 4        (--q-math, #0f172a, 800)
│   target line      b = ?                  (--q-target, accent-700)        ← choice questions
│   answer slot      b = [ 12 |  ]  °       (slot, typed questions only, replaces the target line)
│   status line      "נכון! +142" / "התשובה: 4"   (appears only in right/wrong states)
├ ANSWER AREA .dar-bottom ─────────────────────────────┤  flex: none, bottom-anchored
│   choices 2×2   OR   keypad 4×4 + full-width send
└ safe-area ───────────────────────────────────────────┘
```

Rules:
- `.dar-card` becomes a **real card** (white, radius 28, card shadow, padding 20px 18px) with
  `flex: 1; display: grid; place-content: center; min-height: 0`. The empty space of tall phones is
  now *inside* the card, around centred content — never a void above the question. On 430×932 the card
  is ~330 px tall with the content centred; on 375×667 it shrinks to its content.
- The **meta row** (question count + streak) sits in the 14 px band between the HUD and the card;
  the **"ויתור"** link moves into the meta row (left end, `.dar-giveup` same look, 44 px hit area).
  The footer `.dar-foot` is removed → +44 px for the card on every phone (fixes D8's overflow).
- `.dar-q` padding: `12px 16px calc(10px + env(safe-area-inset-bottom))`; gap card → answers 14 px.

### 4.2 Three roles inside the prompt (MathText)

`promptLines()` already splits lines. New classification in `math-core.js` (`lineRole(line, i, lines)`):

| Role | Rule | Class | Style |
|---|---|---|---|
| **ask** | a prose line (has Hebrew) | `.dmx-line.ask` | --q-ask, colour #334155, `text-wrap: balance`, max-width 28ch; inline islands 700/1.06em in #0f172a |
| **math** | a math-only line that is not the last-line target | `.dmx-line.eq` | --q-math, #0f172a, 800, centred, `margin-top: .35em` |
| **target** | the LAST line, math-only, matching `/^[A-Za-zα-ω][₀-₉]?\s*=\s*\?(\s*[°%₪π]|\s*\\sqrt\{3\})?$/` or `/^\?\s*[°%π]?$/` or `/= \?$/` with ≤ 8 visible chars | `.dmx-line.target` | --q-target, accent-700 (`--me-7`), 700; the `?` gets a 1.6em×1.6em rounded chip (accent-100 bg, accent-700 text) |
| **single-line math-only** (e.g. `$2^{2} = ?$` alone) | | `.dmx-p.only` | `clamp(2.4rem, 11vw, 3rem)`, 800 |

Typed questions: the target line is **replaced by the answer slot** (`Keypad`'s `Typed` display moves
into the card as `.dar-slot`): `[letter =] [ slot ] [unit]`. When the prompt has no target line
(e.g. "כמה תלמידים…?"), the slot stands alone, centred. The "הקלידו את התשובה" sub-line is removed
(the slot says it). "שאלה אחרונה — שווה כפול!" becomes a pill badge above the ask line (see 4.6).

Sizing: the `promptSize()` steps now apply to the **ask line only** (`sz-s/m/l` → 1.25 / 1.12 / 1.02
rem at 390 px). Formula rows get the fixed --q-math and `useFitPrompt` shrinks **only the formula
rows** (floor 1.35 rem, then wrap before an operator). Result for `dn.combo`: words 1.12 rem, the
expression ≥ 1.35 rem → the math is always bigger than the words (fixes D2).

### 4.3 Bidi (fixes D4)
- Generator text change (display only, same numbers/answer/choices, same random calls):
  `quadratic-solver.js` line 1 → `סדרו את המשוואה לצורה הכללית $x^{2} + bx + c = 0$` (colon dropped;
  the next line is a formula row, which needs no colon). Update any `expect-*.mjs` reader that parses
  this line; `node --test supabase/functions/_shared/duel/*.test.mjs` must pass.
- Safety net in `math-core.js`: `tidyLines()` — when a prose line ends with a math island followed
  only by `:` **and** another line follows, drop that trailing colon from the displayed line
  (`proseToText` keeps it for aria). Unit-tested.
- `MathText` wraps each prose fragment in `<span dir="rtl">` and each island stays `dir="ltr"
  unicode-bidi: isolate` (already); islands get `margin-inline: .12em` so Hebrew never touches a
  Latin letter.

### 4.4 Answer area

**Choices** (`.dar-ans`): 2×2 grid, gap 10 px; `.long` → 1 column. Button: white, radius 20,
min-height 64 px (72 px when viewport ≥ 820 tall; 56 px when ≤ 700 tall), font --q-choice, 800,
tabular; shadow `0 3px 0 #e2e8f0, 0 10px 24px -18px rgb(15 23 42/.35)`.

| State | Look |
|---|---|
| idle | as above |
| pressed (`:active`) | translateY(3px), shadow `0 0 0 #e2e8f0` |
| **sent** (new: from pointerup until the server answers) | bg `--me-50`, `box-shadow: inset 0 0 0 2px var(--me-5), 0 3px 0 #e2e8f0`; a 2 px accent line grows along the bottom edge (`::after`, scaleX 0→1 over 600 ms linear). Other buttons `opacity .55`. |
| correct | bg #16a34a, colour #fff, shadow `0 3px 0 #15803d`; scale pop (320 ms --pop) |
| wrong | bg #dc2626, colour #fff, shadow `0 3px 0 #b91c1c`; shake 300 ms |
| show-right (the correct one after a wrong pick) | white, `inset 0 0 0 3px #22c55e`, text #15803d |
| disabled others | opacity .55, no transform |

**Keypad** (`.dkp`): fixed **4 rows + a send row**, 4 columns, gap 8 px (6 px ≤ 700 tall):
```
1  2  3  ⌫
4  5  6  −
7  8  9  [extra1: / or .]   (empty cell when none)
[extra2]  0 (span 2)  [empty]
[   שליחה — full width, 56px (50px ≤ 700 tall)   ]
```
The grid never changes shape between questions (no layout jump); an empty cell is just empty. Keys
48 px (44 px ≤ 700 tall), radius 14, white, 1.35 rem/700, shadow `0 2px 0 #e2e8f0`; function keys
(⌫ − / .) bg #eef2f7, colour #334155; `0` spans two columns. Send: accent gradient
`linear-gradient(180deg, var(--me-5), var(--me-6))`, white 1.1 rem/800, radius 16, shadow
`0 4px 0 var(--me-7)`; `.dkp-off` (nothing typed) = `opacity .4`; sending = the label fades to a 3-dot
pulse AND the slot border animates (never only "…").

Height budget (typed question, 375×667): HUD 116 + meta 28 + card ≥ 150 + 14 + keypad
(4×44 + 3×6 + 8 + 50 = 252) + safe 10 = **570 px** ✓. With extras the same (fixed 4 rows). With a
3-line prompt the card grows to ~200 → 620 ✓ (no scroll, "ויתור" always visible).

**Answer slot** (`.dar-slot`, lives in the card): inline-flex, min-width 128 px, height 60 px
(54 ≤ 700 tall), padding 0 18px, slot tokens; value --q-slot, tabular; a **caret** `|` (2 px, accent-500,
blink 1.1 s, no blink under reduced-motion) replaces the pale "?" placeholder; unit (°, %, ₪, π) in
#64748b 1.1rem after the value; fraction stacked as today. States: focus/typing (slot focus ring),
sending (border → accent, the bottom edge line as on choices), correct (bg #f0fdf4, border #22c55e,
value #166534; pop), wrong (bg #fef2f2, border #ef4444, value #991b1b; shake), locked (unchanged red +
the right answer under it).

**Status line** (`.dar-status`, in the card, below the slot / target line): appears only in states
right/wrong. Right: "נכון! +142" 1.15 rem/800 #15803d (the "+142" also floats from the slot as today).
Wrong: "התשובה: 4" 1.15 rem/800 #15803d (the number as MathSpan, with unit). Replaces the tiny
`.dar-typed` under the keypad (D6).

### 4.5 Feedback flow and timing (Play.jsx / arena-core)

| Moment | What happens | Duration |
|---|---|---|
| tap choice / press send | immediately: `.sent` on that button (or slot), other buttons dim, keypad keys dim to .6, `busy` | until the reply |
| reply: correct | button/slot → correct; status line "נכון! +N"; sfx ok; +N floats; **keypad keys stay dim** | `FEEDBACK_MS` **650 ms** (was 450: too short to even see) |
| reply: wrong | button/slot → wrong + shake; the right choice gets show-right; status "התשובה: …"; sfx bad; **lock veil** on the answer area only | `lock_until` (2 s) |
| next question | old card: leave 140 ms (translateY −12, fade); new card: rise 220 ms; slot cleared; keypad shape unchanged | — |

**Lock veil** (fixes D7): `.dar-lock` moves from covering `.dar-q` to covering **`.dar-bottom` only**
(position absolute over the answers/keypad, radius 24, bg rgb(15 23 42/.72), blur 6 px). Content: the
countdown `2 → 1` at 2.6 rem/900 white + "נעילה קצרה" .95 rem/600. The question card above stays crisp
with the wrong pick in red and the right answer in green — the student uses the 2 seconds to learn.

### 4.6 Last question, streak, waiting
- Last question: a pill badge above the ask line: "שאלה אחרונה · ×2", bg #fff7ed, text #c2410c,
  .8rem/700, 999 radius; the card ring pulses **twice** (`dar-beat` ×2, not infinite) when the card
  enters. The orange `.dar-sub` sentence is removed.
- Streak: unchanged (meta row).
- Waiting / finishing panels: unchanged content; they now render *inside* the white card
  (same surface), avatar 72, text ink.

### 4.7 Desktop / tablet (≥ 600 px)
Column 520 px as today, radius 32. Card padding 28 px 24 px; choices min-height 72; keys max 60 px;
send 56. Mouse hover on choices: `box-shadow: 0 3px 0 #e2e8f0, 0 0 0 2px var(--me-3)`.

### 4.8 Result screen review list
`.drs-li-q` reuses the roles: ask line 1 rem/600 #334155, formula rows 1.3 rem/800 ink, target line
1.1 rem/700 accent. No other change.

### 4.9 Before → after (duel)
| Before | After |
|---|---|
| Question at y=506 on 844 px (D1) | White card starts at y≈158, content centred inside it |
| Words and formula same size (D2) | Words 1.12–1.25 rem/600 #334155 · formula 1.9–2.5 rem/800 #0f172a · target in accent |
| Grey feel (D3) | Ink on white card; grey only for the meta row |
| ":x²+bx+c=0 לצורה" (D4) | "סדרו את המשוואה לצורה הכללית x²+bx+c=0" one line, formula below |
| Nothing for 140–800 ms after a tap (D5) | `.sent` state at once (accent-50 + inset ring + 600 ms edge line) |
| "נכון!" 1.05 rem under the keypad (D6) | Slot fills green, "נכון! +142" 1.15 rem/800 inside the card, keys dim |
| Full-screen blur lock (D7) | Veil on the answer area only; the card shows the right answer |
| 166 px send button, 707 px layout on SE (D8) | Fixed 4-row grid + full-width send; 570–620 px total on 667 |
| Underline + pale "?" (D9) | 60 px slot with border, caret, unit |
| Orange sentence + endless heartbeat (D10) | Pill badge + 2 beats |

---

## 5. Practice topic pages — target design

All of it through `src/styles/mp.css` (layer `mp`), `src/styles/topic-fixes.css` (layer `page`,
per topic), `src/lib/mp-runtime.js` (adds classes/elements only), `src/components/Keypad.jsx` +
`src/styles/keypad.css`. `Topic.jsx` and the Hebrew stay untouched.

### 5.1 Anatomy of a practice question (phone)

```
page header (grade chip, title, chapter rail)            unchanged
[lesson panels: .info-box .info .def-box .example-box]   quiet: a-50 wash, .95rem, folded when long
┌ EXERCISE CARD (.card that contains an .ans-row / .choice-row / .step-card / inputs) ┐
│  .card-t                       "רדיוס וקוטר"            1.15rem/700 ink
│  drawing (.svg-wrap …)                                 as today (dotted stage)
│  given data (.given-box)       chips, 1rem/600          grey-50 pill chips, tabular
│  FORMULA (.formula-box/.eq-box) C = 2πr                 --q-math-p, 700 ink, white, no border, inset hairline
│  ┌ STEP (.step-card) ───────────────────────────────┐
│  │ .step-label chip  "שלב 1 — כתוב משוואה"           pill, a-50 bg, a-800 text, .8rem/700
│  │ QUESTION LINE     "הרדיוס הוא 11 ס״מ. מה הקוטר?"   --q-ask, ink, 600  ← promoted from .hint
│  │ .ans-row          d = [  22  ] ס״מ   [ בדוק ✓ ]    input 56px/1.4rem · button 56px full-width on phones
│  │ .fb.ok/.err       "✗ לא נכון, נסה שוב"            pill row, 1rem/700, icon, inside the step
│  └──────────────────────────────────────────────────┘
│  .center > .btn  "תרגיל חדש"                           ghost/outline (secondary) until solved
└──────────────────────────────────────────────────────┘
.banner (solved)                                          green card, its button filled green
keypad (docked)                                            see 5.5
```

### 5.2 Hierarchy rules (mp.css)

1. **Question line promotion** (fixes P1). A `.hint` is the question when it is the element right
   before the answer controls. CSS (layer `mp`, phones and desktop):
   ```css
   #root :is(.step-card, .card) > .hint:has(+ :is(.ans-row, .choice-row, .input-row, .op-box, .nl-wrap, .iq-op-row)),
   #root .hint:has(+ .ans-row), #root .q-text, #root .area-q, #root .task-desc, #root .ex-text, #root .py-ex-t,
   #root .sm-ex-q { color: var(--ink); font-size: var(--q-ask); font-weight: 600; line-height: 1.45; text-wrap: balance; }
   ```
   plus a per-topic list in `topic-fixes.css` (W4) for the ones `:has()` can't reach. A `.hint` that
   is *not* followed by controls stays a hint (.9rem, ink-3).
2. **Formula = hero**: `.formula-box, .eq-box, .big-formula, .p2-eq, .be-eq, .ex-math` → --q-math-p,
   700, `font-family: var(--font)` (kills Courier), `font-variant-numeric: tabular-nums`, white, radius 16,
   no border, `box-shadow: inset 0 0 0 1px var(--line)`, padding 16px, centred, ltr.
   `.formula-box small / .hint inside` stays .9rem ink-3.
3. **Step card = the stage**: `.step-card` → white (not surface-2), radius 20, border 0,
   `box-shadow: var(--sh-2)`, padding 18px, **`border-inline-start: 3px solid var(--a-500)`** (an
   accent spine, RTL-aware: on the right); `.step-card.done` → ok-50 bg, spine ok-500.
   `.step-label` → inline pill chip (a-50 bg, a-800 text, .8rem/700, padding 4px 10px, radius 999).
4. **Lesson panels step back**: `.info-box, .info, .def-box, .example-box, .explanation, .pw-info,
   .py-intro, .rules-grid` → font-size .95rem, line-height 1.7, colour ink-2, bg a-50 at 60 %
   (`color-mix(in srgb, var(--a-50) 60%, #fff)`), border 0, radius 16. On phones a panel taller than
   220 px **with no button/input inside** gets folded by the runtime: `max-height: 180px` + a bottom
   fade + a ghost "עוד" button (`.mp-more`, added by mp-runtime, display-only); tap = unfold (class
   `.mp-open`). The text itself is never changed or removed.
5. **Card title** `.card-t` → 1.15rem/700 ink, no border-bottom, margin-bottom 12px.
6. **Given data** `.given-box` → inline pill chips: surface-3 bg, 1rem/600, tabular, radius 999,
   padding 6px 12px.
7. **Type scale on phones**: body 16px; nothing a student must read under .9rem; nothing
   interactive under 44 px tall (choice chips included).

### 5.3 Answer controls (fixes P3, P7, P8)

- **Inputs inside `.ans-row`, `.input-row`, `.step-card`, `.py-ans`** (not the op-boxes): height 56 px
  (52 ≤ 700 tall), min-width 96 px, `width: auto` where the page set 55–84 px (override with
  `min-width`, never `width` so the page's flex still works), font 1.4rem/700 tabular ltr centred,
  radius 14, border 2px line-strong, bg white; focus: border a-500 + ring; placeholder "?" ink-3/400.
  **Right/wrong on the box** (runtime adds the classes, see 5.4): `.mp-right` → border #22c55e, bg
  ok-50, colour ok-800; `.mp-wrong` → border #ef4444, bg bad-50, colour bad-800 + shake.
- **Check button** = the `.btn.bp` / `.btn-primary` / `.btn-ok` inside the same `.ans-row`/`.step-card`
  (or right after it): height 56 px (52 ≤ 700), min-width 120 px, radius 14, 1.05rem/700, filled
  accent, `--sh-accent`. On phones ≤ 480 px, when the `.ans-row` wraps, the button takes the full row
  (`flex-basis: 100%` for `.ans-row > .btn:last-child` when the row has ≥ 3 children).
- **Other primary buttons become secondary**: `.center > .bp:only-child`, `.card > .center .bp`,
  `.bp[class*="new"]`, buttons whose row holds no input/choice (`.center:not(:has(input, .choice-btn)) .bp`)
  → outline style: white bg, border 1.5px a-300, colour a-700, no accent shadow. Filled accent is
  reserved for the control that checks an answer. Inside `.banner`, buttons are filled ok-600.
- **Choice chips** `.choice-btn, .eq-choice`: min-height 48 px, padding 10px 16px, font 1rem/600,
  radius 14; on ≤ 640 px `.choice-row` becomes `display: grid; grid-template-columns: repeat(auto-fit,
  minmax(104px, 1fr)); gap: 8px` (rows of 3 for 7 short words). States: active = filled accent;
  correct = ok-50/ok-500/ok-800 + pop; wrong = bad-50/bad-500/bad-800 + shake.

### 5.4 Feedback (runtime + CSS) (fixes P4, P5)

mp-runtime already detects ok / bad / win from the class vocabulary. It additionally:
1. **Marks the input(s)**: on `bad` → every visible non-empty input inside the feedback's step/card
   gets `.mp-wrong` (removed on the next `input` event); on `ok`/`win` → `.mp-right` (stays).
2. **Dispatches `window.dispatchEvent(new CustomEvent("mp:fb", { detail: { kind, el } }))`**
   (`kind` ∈ ok | bad | win; `el` = the feedback element). This is the contract the keypad uses.
3. **Keeps the feedback visible**: on `bad`/`ok`, if `html.kp-open`, scrolls so the feedback element's
   bottom is ≥ 12 px above `--kp-h` (instant scroll, like the keypad does — iPhone Safari sends taps to
   the old place after an animated scroll).
4. Wrong on an empty box keeps today's amber nudge (`.mp-need`).

CSS: `.fb.err:not(:empty), .feedback.err …` → a pill row: padding 12px 14px, radius 14, 1rem/700,
bad-50 bg, border 1px bad-200, colour bad-800, `display: flex; gap: 8px; align-items: center`, a 20 px
line icon (✗ in a circle) via `::before` background SVG (not an emoji); `.fb.ok` the same in green
with a ✓. Both `animation: mp-rise 200ms`.

### 5.5 The practice keypad (`Keypad.jsx`, `keypad.css`) (fixes P5, P6)

Behaviour:
| Event | Keypad |
|---|---|
| tap an answer box | opens (as today), the box + its check button scrolled above the keypad; top bar hidden on ≤ 700 px tall phones (`html.kp-open .mp-topbar { transform: translateY(-100%) }` — not removed) |
| ✓ key | clicks the nearest check button (as today) |
| `mp:fb` **bad** | stays open; the target box is focused and its content **selected** (`setSelectionRange(0, len)`), so the next digit replaces the wrong answer |
| `mp:fb` **ok** / **win** | **closes** (blur, remove `kp-open`) after 180 ms — the student sees the green box, then the page is free for "תרגיל חדש" / the next step; if a *new* empty answer box of the same card appears within 600 ms (multi-step exercises), it re-opens on that box |
| the box disappears / becomes disabled | closes (today's 400 ms poll stays) |
| `.banner` appears | closes |

Look (calm, matches the page): dock bg `color-mix(in srgb, var(--surface) 94%, transparent)` with blur
18 px and a **1 px line** top; keys 48 px (44 ≤ 700 tall), radius 12, white, 1.45rem/600 ink digits,
function keys surface-3 ink-2; ✓ key filled a-600 spanning 2 rows, radius 14, 26 px check icon; mode
key "x =" a-700/700; top bar 36 px: close chevron (40 px round), "מקלדת רגילה" chip, extras (π : / < >)
as a-50/a-800 chips 44 px, "הבא" chip. The bar is **opaque** (surface) so page content never shows
through it (WebKit, P6). Keypad height target: 36 + 8 + 4×48 + 3×6 + 16 + safe = **270 px** on 844,
**254 px** on ≤ 700 tall. Body bottom padding = `--kp-h + 24px`.

The focused box: ring `0 0 0 3px color-mix(a-500 28%)` + border a-500 (already), plus the caret colour
`caret-color: var(--a-600)`.

### 5.6 Per-breakpoint rules (practice)
- **≤ 480 px**: `.ans-row` gap 10px; inputs min-width 96; check button full row when wrapped;
  `.choice-row` grid as 5.3; `#root .card` padding 18px; formula --q-math-p.
- **≤ 700 px tall**: inputs 52, buttons 52, keys 44, top bar hides while the keypad is open.
- **481–640**: same as phones but `.choice-row` `minmax(120px, 1fr)`.
- **≥ 641**: chapter rail as today; inputs 52 px; check button auto width; keypad never shows
  (`pointer: coarse` only — unchanged rule).
- Landscape phone (height ≤ 480): the keypad shows only 3 rows tall keys 40 px; body padding adapts.

### 5.7 Before → after (practice)
| Before | After |
|---|---|
| Question line 13 px grey `.hint` (P1) | 1.05–1.25 rem/600 ink, promoted by `:has(+ .ans-row)` + per-topic list |
| Formula 16–20 px, Courier, 400 (P2, P9) | 1.45–1.9 rem/700 Rubik, white hero box |
| Inputs 55–84×40, 16 px; check 42 px (P3) | 96+×56, 1.4 rem; check 56 px, full row on phones |
| `.fb.err` hidden under the keypad (P4) | Scrolled above the keypad; pill row with icon |
| Keypad stays after right; input never coloured (P5) | Closes on ok/win; `.mp-right`/`.mp-wrong` on the box; wrong = selected for retry |
| Keypad bar translucent, covers the check button (P6) | Opaque bar, top bar hides on short phones, box + button kept above |
| Every button filled accent (P7) | Filled = check only; "new exercise" = outline until solved |
| 38 px chips, 12 px text (P8) | 48 px, 1 rem, grid rows |

---

## 6. Accessibility and engines
- Contrast: ask text #334155 on white 10.4:1; meta #64748b 4.9:1 (AA); target accent-700 on white
  ≥ 4.5:1 for every topic colour (checked: teal #0f766e 5.9, sky #0369a1 6.2, pink #be185d 5.7,
  orange #c2410c 5.0, cyan #0e7490 5.3).
- `aria-live="polite"` on the duel status line; the slot keeps its `aria-label`.
- WebKit: `-webkit-backdrop-filter` wherever `backdrop-filter`; `100dvh` + fallback; no `:has()` inside
  `@layer` on anything older than Safari 15.4 matters — the site already relies on `:has()`.
- Reduced motion: every keyframe 1 ms, no shake/pop/caret blink; colours identical.
