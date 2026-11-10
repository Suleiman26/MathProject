# Duel questions: how a question is written (2026-11-10)

Abed played the duels on his phone: "some questions are hard to understand, and some answers we
can't type… represent the questions in a good way for the students." This guide is the bar for
every duel question generator (`supabase/functions/_shared/duel/topics/*.js`).

**Who reads it:** a 12–15-year-old Israeli student, on a phone, racing a friend against a clock.
A question must be understood in about three seconds.

## What was wrong (seen on a 390 px phone, 2026-11-10)
- `— $x = ?$` after an equation shows as "x = ? —". The dash looks like a minus.
- `ו-$y = 3x − 5$` shows as "y = 3x − 5-ו". The hyphen next to the 5 looks like a minus. This
  happens with any Hebrew prefix glued to a `$…$` formula: ו-, ב-, ש-, ל-, מ-, ה-.
- Chapter titles used as the opening words, which aren't instructions: "ביטוי מעורב:", "כפל פשוט:",
  "הבנת חזקות:", "ריבוע — שטח:", "תרגול מקיף — סדר פעולות חשבון:".
- Symbols that are never named: `$l = 6$, $w = 3$, $h = 2$`, `b₁`, "אפותם $m$", `S`, `P`.
- Long sentences that wrap into a jumble (the box scale-factor question).
- Unrealistic word problems: 30 eggs per cake, 50 litres per bottle, 10 grams per cup of water,
  50 minutes per km, 250 or 500 students in a class.
- Geometry that needs a drawing to make sense (kite TRBL, "AM הוא הגובה", "זווית B סמוכה ל-A").
- Answers without their unit (60 instead of 60°, 40 instead of 40%), and "S = ?π" next to choices.

## The rules

### 1. Never change the math
- Keep the same numbers (ranges), the same answer, and the same difficulty for each variant.
  Try to keep the same random calls (`r()` / `randInt`) in the same order, so a seed still gives
  the same numbers. If a rewrite really needs a different order, that is allowed.
- Never edit `src/topics/*/Topic.jsx` (Sulaiman's site). Only the duel ports.
- `node --test` for your files must pass, and so must the anti-guessing guard (every guesser ≤ 40%).

### 2. Shape of a prompt
- **Line 1: Hebrew words that say what to find.** Start with the task or a natural question:
  "פתרו את המשוואה:", "מה השטח של ריבוע שצלעו $17$?", "השלימו את המעריך:", "חשבו:".
  Use the plural imperative throughout (חשבו, מצאו, פתרו, השלימו, המירו).
- **Formulas on their own lines.** A prompt may have lines separated by `"\n"`. A line made only of
  `$…$` is shown as a centred formula row, a little bigger. Use this for:
  - every equation or expression to solve or simplify: `"פתרו את המשוואה:\n$2x − 3 = x − 10$"`;
  - two formulas that would otherwise be joined by "ו-": `"…של הישרים:\n$y = x + 1$\n$y = 3x − 5$"`;
  - the asked quantity, when it helps: a last line `"$x = ?$"`, `"$m = ?$"`, `"$S = ?π$"`.
  Two or three lines in total is the norm; four at most.
- **Never** `— $…$`, and never a Hebrew prefix glued to a `$…$` island (`ו-$`, `ב-$`, `ש-$`, `ל-$`,
  `מ-$`, `ה-$`). Rephrase instead, or put the formula on its own line. A hyphen before plain digits
  that are not inside `$…$` ("ב-40%", "מ-100₪") is fine.
- **Name things in words.** "ריבוע שצלעו $17$", "תיבה באורך $6$, ברוחב $3$ ובגובה $2$",
  "גליל עם רדיוס $7$ וגובה $4$". You may then use the school symbol: "רדיוס $r = 8$". Never a bare
  `$l = 6$` with no word. Avoid subscripts like b₁/b₂ when words work ("בסיסים באורך 13 ו-18").
- **Plain positive whole numbers in a sentence may be plain digits** (no `$`), with normal Hebrew
  ("שני בסיסים באורך 13 ו-18", "ב-40%"). Use `$…$` for anything with a minus sign, letters,
  operators, a decimal point, coordinates, fractions, roots, powers, π or °. Those are the islands
  that must never get a glued Hebrew prefix.
- **Short.** Line 1 should be at most ~70 characters when possible. No hints in parentheses unless a
  student truly needs them. Drop "(בנקודת החיתוך ערכי $y$ שווים)"-style explanations.
- **No drawing exists.** Geometry is text only. Describe relationships in words ("שתי זוויות
  סמוכות במקבילית", "זווית הראש במשולש שווה שוקיים"). Use point labels (A, B, AM) only when the
  sentence fully defines them; usually drop them.
- **Realistic stories.** Prices, sizes and counts that a student would believe: a class has ≤ 40
  students, a cake needs 2–4 eggs, a bottle holds 1–2 litres, a shirt costs 30–120 ₪. If the
  generator's numbers can't fit a realistic story, use a neutral one ("בשקית יש…") or plain numbers.
  The numbers themselves must not change (rule 1), so pick the story to fit the numbers.
- Hebrew: modern, correct grammar and gender, no English words, "₪" after the number.

### 3. Answers
- **Choices stay pure numbers or math** (the guard and the checks read them). To show a unit, set
  `display: { unit: '°' }` on the question (both kinds). The phone adds the unit to every choice, to
  the typing box and to the results. Units: `'°'`, `'%'`, `'₪'`, `'π'`, `'√3'`.
  - With `unit: 'π'`, the choice "12" shows as "12π". So a choice question asks "$S = ?$", never
    "$S = ?π$". A typed question may keep "$S = ?π$" with the unit too: the box then shows "? π",
    which tells the student to type only the number before π.
  - Don't set a unit when the choices already contain it (for example `\frac{2π}{3}`).
- **Typed answers** use a keypad with digits, −, ⌫ and, only for some generators, "/" and "."
  (`KEYS` in `registry.js`, checked by `duel-keys.test.mjs`). Don't change `KEYS`. If an answer of
  yours needs a key the generator doesn't have, report it instead.
- A typed prompt must make clear which single number to type.

### 4. Checks
- The independent checks (`expect-*.mjs`) recompute the answer from the numbers printed in the
  prompt. If you change how a prompt prints its numbers, update the readers for your generators in
  your own `expect-<group>.mjs`, or in `duel.test.mjs` for group A. Never compute the expected value
  from `q.answer`. `expect-helpers.mjs` and `testkit.mjs` are shared: read them, don't edit them.
  Put any new reader in your own file.

## Before → after (examples of the bar)
| Before | After |
|---|---|
| `פתרו את המשוואה: $2x − 3 = x − 10$ — $x = ?$` | `פתרו את המשוואה:\n$2x − 3 = x − 10$` |
| `מצאו את נקודת החיתוך של הישרים $y = x + 1$ ו-$y = 3x − 5$ (בנקודת החיתוך ערכי $y$ שווים). מה ערך ה-$x$ שלה?` | `מה ערך ה-$x$ בנקודת החיתוך של הישרים?\n$y = x + 1$\n$y = 3x − 5$` |
| `ריבוע — שטח: צלע $a = 17$. $S = ?$` | `מה השטח של ריבוע שצלעו $17$?` |
| `$l = 6$, $w = 3$, $h = 2$. חשבו את נפח התיבה: $V = ?$` | `מה הנפח של תיבה באורך $6$, ברוחב $3$ ובגובה $2$?` |
| `מעוין — זווית: זווית $A = 120°$. זווית $B$ (סמוכה ל-$A$) $= ?$` (choices 60, 75…) | `במעוין יש זווית של $120°$. מה גודל הזווית הסמוכה לה?` + `display.unit '°'` |
| `אם 6 עוגות דורשות 180 ביצים…` | a story where 30 per unit is believable, or a neutral one |
