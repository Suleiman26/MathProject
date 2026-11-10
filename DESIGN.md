# MathProject design system

One look, one feel, across every topic. This file explains how it works and
how to build new topics so they match.

## The golden rule

**Design and logic live apart.**

- The math, the exercises and every Hebrew sentence a student reads live in
  the page's `<script type="text/babel">` block. That block is the content.
- Colors, fonts, spacing, sounds and motion live in `assets/`. That is the design.

A design change never touches the logic block. `tools/verify-logic.py`
proves it, byte for byte.

## Files

| File | What it is |
|---|---|
| `src/styles/mp.css` | The design system: colors, type, buttons, inputs, cards, feedback, motion |
| `src/styles/topic-fixes.css` | Per-topic display fixes (drawing sizes, label outlines) |
| `src/lib/mp-runtime.js` | Sounds, feedback animations, confetti, anonymous answer stats |
| `src/components/TopicView.jsx`, `TopBar.jsx` | The frame around every topic |
| `src/topics/<topic>/` | Each topic: `Topic.jsx` (Sulaiman's code) + `styles.js` (its own CSS) |
| `src/admin/` | The admin: screens, charts, building blocks |
| `tools/verify-logic.py` | Proves the math and text were not changed |
| `tools/convert-topics.py` | The one-time move from the HTML version (safe to re-run) |
| `public/classic/` | The old plain-HTML site, kept as it was |

## How the styling layers work

Every page has three CSS layers, in this order (later wins):

1. **`legacy`**: the page's own original CSS, wrapped as-is. It still handles layout.
2. **`mp`**: `assets/mp.css`. It sets the look and always beats `legacy`.
3. **`page`**: small fixes for one page only (`<style id="mp-page">`).

Inline styles written in the React code still win over all three. So colors
the math code sets on purpose (graph lines, highlighted angles) stay exactly
as they were.

Rule of thumb for `mp.css`: set the **look** (color, border, radius, shadow,
type, motion). Leave the **layout** (direction, display, widths, gaps) to the page.

## Topic colors

Each page sets `data-topic` on `<html>`. Options: `teal`, `sky`, `blue`,
`indigo`, `violet`, `pink`, `cyan`, `orange`. Every accent comes as a scale,
`--a-50` (lightest) through `--a-900` (darkest).

Simple rule: use `--a-600` for the main action, `--a-50` for soft panels and
`--a-800` for text on a soft panel.

Green and red are reserved for correct and wrong. Don't use them as a topic color.

## The class vocabulary

Use these class names and the page looks right with no extra CSS.

| Need | Class |
|---|---|
| Page header + title | `.hdr` with `<h1>` (or `.hdr-title`) |
| Chapter tabs in the header | `.ch-nav` or `.ch-btns` holding `.ch-btn` (`.active` = current) |
| Sub-tabs inside a chapter | `.sub-tabs` holding `.sub-tab` |
| White card | `.card`, title `.card-t` (1.15rem/700 ink) |
| One step of an exercise | `.step-card` (white, accent spine on the right; `.done` = green), label `.step-label` (pill chip) |
| Explanation panel | `.info-box`, `.info`, `.def-box`, `.example-box`, `.explanation` (quiet wash; folds on phones when long) |
| Formula / equation display | `.formula-box` or `.eq-box` (the hero: big, bold, Rubik) |
| "Given" data chip | `.given-box` |
| The question line | `.hint` or `.step-label` placed **right before** the answer row (see "Question anatomy"), or `.q-text` |
| Small grey hint | `.hint` anywhere else |
| Answer row (inputs) | `.ans-row` |
| Check button | any button saying בדוק / אישור / ✓ next to the answer (gets `.mp-check` automatically) |
| Main button | `.btn.bp` (outline when it is not the check: "תרגיל חדש") |
| Next / continue | `.btn.bg` |
| Secondary button | `.btn` |
| Multiple-choice answers | `.choice-row` holding `.choice-btn` (`.active`, `.correct`, `.wrong`) |
| Feedback line | `.fb.ok` (correct) or `.fb.err` (wrong) |
| Exercise solved | `.banner` |

## Sounds and motion (automatic)

`mp.js` watches the page. You never call it from the exercise code:

| When this appears | Sound | Motion |
|---|---|---|
| `.fb.ok`, `.step-card.done`, `.choice-btn.correct`… | soft rising two notes | small pop |
| `.fb.err`, `.choice-btn.wrong`… | soft low two notes | gentle shake |
| `.banner` (exercise solved) | short four-note chime | rise + confetti |
| Any button press | very quiet tick | press-down scale |

- Sounds only answer the student's own clicks, never page loads.
- The speaker button in the top bar turns sound on or off. The choice is remembered on that device.
- With "reduce motion" turned on in the device settings, shakes and confetti are skipped.

To play a sound by hand: `MP.sound("ok")` (`tap`, `select`, `ok`, `bad`, `win`).

## Building a new topic

1. Create `src/topics/<topic>/Topic.jsx`: a React component named `App`,
   exported as default. Use the class vocabulary above.
2. Create `src/topics/<topic>/styles.js` exporting the topic's own CSS as a
   string, inside `@layer legacy { ... }` (layout only).
3. Add it to `src/topics/registry.js` (title, color, loader, styles).
4. Add it in the admin (Content → new topic) or in `src/home/catalog.js`.

The page frame (top bar, sounds, stats, design) comes for free.

## Before every push

```bash
python3 tools/verify-logic.py
```

It must end with `math and text untouched`, unless you meant to change the math.
Also run `npx next build`.

## Versions

Next.js 16.3.8, React 19.2.8 (exact versions in package.json). Upgrade on
purpose, then test every topic.

## Page frame (v2, 2026-10-31)

`mp.css` section 11 gives every topic the same frame: page width `--page-w`
(800px; Pythagoras 960px for its side-by-side layout), the grade as a chip
above the title, chapters in one rail (a swipe row on phones), one style for
second-level tabs (`.tab`, `.sub-tab`, `.sub-btn`, `.diff-btn`, `.part-btn`),
40px minimum for anything pressed, and a faint dotted stage behind drawings
(`.svg-wrap`, `.graph-wrap`, `.quad-wrap`, `.tri-wrap`; coordinate graphs skip it).

Labels in drawings never sit on a line: angle values are placed by measuring
the text (inside the angle, clear of sides, arcs and diagonals; beside the
corner letter when the corner is too sharp). New drawings should do the same.

## 3D shapes (2026-10-31)

The solids topic shows each shape in real 3D: `src/components/solid3d/`
(three.js via @react-three/fiber, loaded only on that page). Each flat drawing
in `src/topics/solids3d/Topic.jsx` hands over in one line (`if(has3D())…`);
no WebGL, or `?flat=1`, keeps the flat drawing. Sideways drag turns the shape
(a finger's up/down swipe still scrolls the page); labels are page elements
pinned to the middle of the line they measure (that line drawn in their colour); overlapping numbers slide along their own line.

## Question anatomy (2026-11-10)

Spec: `docs/superpowers/specs/2026-11-10-question-ui-design.md` §5. CSS: `src/styles/mp.css`
§12 (and §4, §8). Runtime: `src/lib/mp-runtime.js`. Per-topic exceptions: `topic-fixes.css`.

**One hero per screen: the math.** Each level steps back one notch:

| Role | Element | Look |
|---|---|---|
| card title | `.card-t` | 1.15rem / 700, ink |
| lesson | `.info-box .info .def-box .example-box .explanation .pw-info .py-intro .rules-grid` | .95rem, ink-2, soft accent wash, no border |
| given data | `.given-box` | grey chip, 1rem / 600, tabular |
| **formula** | `.formula-box .eq-box .big-formula .p2-eq .be-eq .ex-math` | `--q-math-p` (1.45–1.9rem) / 700, white, hairline, Rubik |
| step | `.step-card` + `.step-label` chip | white card, 3px accent spine on the inline start |
| **question line** | see the rule below | `--q-ask` (1.05–1.25rem) / 600, **ink** |
| answer box | inputs in `.card .step-card .ans-row .input-row .py-ans` | 56px tall (52 on short phones and desktop), min 96px wide, 1.4rem / 700, centred |
| check button | `.mp-check` | 56px, filled accent; full row on phones when the answer row wraps |
| other actions | `.center > .bp`, `.btn-new`, `.bp[class*=new]`, `.mp-new` | outline (white, accent border) |
| feedback | `.fb.ok/.err`, `.feedback.ok/.err`, `.feedback-ok/-err`, `.msg-success/-error` | pill row, 1rem / 700, SVG icon at the start |
| real hint | any other `.hint` | .9rem, ink-3 |

Tokens (`:root` in mp.css): `--q-ask`, `--q-math-p`, `--q-meta`, `--q-hint`, `--ctl-h`, `--pop`, `--shake-ease`.

**The question-line rule.** A `.hint` that sits directly before the answer controls is the
question, not a hint: inside `.card`/`.step-card`, followed by `.ans-row`, `.choice-row`,
`.input-row`, `.op-box`, `.nl-wrap`, `.iq-op-row`, `.eq-row`, `.solve-grid`, `.ieq-solver`,
`.iq-pair`, `.step-card`, `.formula-box`, or a plain `div` holding an input. A `.step-label`
followed directly by `.ans-row`/`.choice-row`/`.input-row`/`.eq-row` is the question too (it is
shown as a line, not a chip). `.q-text .area-q .task-desc .ex-text .py-ex-t .sm-ex-q` always are.
Anything this rule can't reach goes in `topic-fixes.css` for that topic.

**Colour rules.** Accent fills only the check button (plus the focus ring and the box being
typed in). Green and red appear only on what the student touched: the box, the chosen chip,
the feedback pill. No emoji: a feedback line whose own text starts with ✓ / ✗ / ✅ gets
`data-mp-lead` and that glyph is hidden (CSS `::first-letter`), the SVG icon takes its place.
The text itself is never changed.

**What the runtime adds** (display only, never the exercise's text or state):

| Class / event | When | Notes |
|---|---|---|
| `.mp-check` | on a button saying בדוק / בדיקה / אישור / ✓ whose card holds an answer box or choices (not "הבנתי", not in a lesson panel or banner) | re-checked every frame the page changes |
| `.mp-new` | on a filled button (`.bp`, `.btn-primary`, `.btn-new`, orange) whose text says חדש / חדשה ("תרגיל חדש", "משוואה חדשה"), outside the solved banner | shown as an outline button |
| `.mp-wrong` | the page showed a wrong-answer line: every filled box of that step | removed as soon as the student types; shake 300ms |
| `.mp-right` | right answer / step done / solved: every filled box of that step | removed when the value changes (new exercise); pop 320ms |
| `mp:fb` event | `window`, after the boxes are coloured: `detail: { kind: "ok" \| "bad" \| "win", el }` | the keypad listens (`src/components/Keypad.jsx`); `mp:win` still fires too |
| scroll | on ok / bad while `html.kp-open`: the feedback line is scrolled to ≥ 12px above the keypad (`--kp-h` on `<html>`) | instant scroll (iPhone sends taps to the old place after a smooth one) |
| `.mp-fold` + `button.mp-more` ("עוד" / "פחות") | phones (≤ 640px): a lesson panel taller than 220px with no button / input inside | folded to 180px with a fade; tap = `.mp-open`. Desktop never folds. If the panel paints its own background, set `--mp-fold-bg` on it in topic-fixes.css |
| `.mp-need` | "check" with an empty box | amber glow, not counted as wrong (unchanged) |

Motion: new feedback rises in (200ms); right = pop to 1.04 (320ms, `--pop`); wrong = shake ±4px
(300ms). transform / opacity only; reduced motion = no motion, same colours.

