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
| `assets/mp.css` | The design system: colors, type, buttons, inputs, cards, feedback, motion |
| `assets/mp.js` | The app shell: top bar (back + sound switch), sounds, feedback animations, confetti |
| `assets/icon.svg` | Site icon |
| `templates/module-template.html` | Starting point for a new topic |
| `tools/upgrade-page.py` | Plugs an old-style page into the design system |
| `tools/verify-logic.py` | Proves the math and text were not changed |

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
| White card | `.card`, title `.card-t` |
| One step of an exercise | `.step-card` (`.done` when solved), label `.step-label` |
| Explanation panel | `.info-box` or `.info` |
| Formula / equation display | `.formula-box` or `.eq-box` |
| "Given" data chip | `.given-box` |
| Small grey hint | `.hint` |
| Answer row (inputs) | `.ans-row` |
| Main button | `.btn.bp` |
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

1. Copy `templates/module-template.html` to `my-topic.html`.
2. Pick a `data-topic` color.
3. Write the exercise inside the `text/babel` block, using the class vocabulary above.
4. Add a card for it in `index.html`: copy one `<a class="topic">` and change the link, name, grade, `data-g` (grades) and icon.

Got an older page that doesn't use the system yet?

```bash
python3 tools/upgrade-page.py my-topic.html teal
```

## Before every push

```bash
python3 tools/verify-logic.py
```

It must end with `math and text untouched`, unless you meant to change the math.

## Library versions (pinned)

React `18.3.1`, Babel standalone `8.0.7`. They are pinned on purpose: an
unpinned link changes by itself when a new version comes out, and a new major
version can break every page overnight. Upgrade on purpose, then test every page.
