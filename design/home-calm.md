# Signed-in home: the "calm" system (2026-11-07)

Abed: "still too noisy". Reference he liked: a habit-tracker app (soft lavender page, white cards,
ONE accent colour, small calm icons, plain list rows with check circles).

## What made it noisy (before)
- ~9 colours at once: student pink + gold level + orange/green/blue/yellow icon badges + teal ticket
  (topic colour) + red button + yellow "next" pill + lavender/sky/mint area bands.
- Floating math symbols behind the header; big faint glyphs (±, x, △) in the area bands.
- A ladder rail (two lines + rungs), a black "יציאה" pill, gold rings, emoji (💪 🎯 ⭐ 🏆 🎉).
- 5 separate boxes in the header (points card + 4 stat cards).

## The system
- **One accent = the student's own colour** (`--a-*`, from `data-topic={account.avatar}` on `.home.in`).
  Nothing on this page sets its own topic colour any more (stations, ticket, strengths rows all use the
  student's colour). Topic identity = its icon, not a colour.
- **Neutrals:** ink `--ink`, `--ink-2`, `--ink-3`; track `#ececf1`; hairline `rgb(20 20 40 / .06)`.
- **Status colours, tiny only:** solved = a small `--ok-500` check; "worth strengthening" = `--warn-600`
  text/number and a `--warn-500` thin bar. Never red buttons, never gold.
- **Canvas:** page = soft cool neutral with a hint of the accent; header = one soft wash of the accent
  fading into it. No glyphs, no second colour in the wash.
- **Cards:** white, radius 24px (rows inside 16px), no borders, shadow
  `0 1px 2px rgb(20 20 40 / .04), 0 12px 32px -20px rgb(20 20 40 / .22)`.
- **Spacing:** page side gutter 16px (phone); card padding 18px; 14px between cards; rows 12px apart.
- **Type (Rubik):** student name 1.7rem/700; card title 1.12rem/700; row title .98rem/600;
  meta .8rem `--ink-3`; numbers tabular. No letter-spacing on Hebrew.
- **Icons:** Phosphor (`@phosphor-icons/react`) or the topic's own icon; accent-600 on an accent-50/100
  rounded chip. No emoji on this page.
- **Primary action:** one solid accent surface per screen (the "next step" ticket), white pill button.
  Everything else is a quiet text/ghost button in the accent.
- **Motion:** soft rise on load (`mp-rise`), 180ms, smooth open/close (grid rows); nothing loops.

## v2 "Worlds" (2026-11-07, same day) — Abed: "I can't tell the difference, it all feels together. It doesn't have to be only 2 colours. Make it spectacular."
Lesson: calm ≠ flat. v1 removed the noise AND the hierarchy, so area / topic / chapter all became the same
grey text row on a line. Every level needs its own SHAPE, SIZE and SURFACE; colour may return when it MEANS something.

### Colour roles (each colour has one job)
| Colour | Job |
|---|---|
| Student colour (`--a-*`) | everything about "me": header, level, the next-step ticket |
| World colour (one per area, fixed) | the area and everything inside it |
| ok green / warn amber | tiny status only (solved check, weak %) |

World palette (by zone key, not the DB colour — the DB colours were 3 shades of blue):
num = sky `#38bdf8 / #0ea5e9 / #0284c7 / #075985`, alg = violet `#a78bfa / #8b5cf6 / #7c3aed / #4c1d95`,
fn = emerald `#34d399 / #10b981 / #059669 / #064e3b`, geo = coral `#fdba74 / #fb923c / #ea580c / #7c2d12`
(+ a very light tint for chips: sky `#f0f9ff`, violet `#f5f3ff`, emerald `#ecfdf5`, coral `#fff7ed`).

### Three levels, three shapes
1. **World (תחום)** = a bold banner card in its world gradient, white type (overline "תחום 1 מתוך 3",
   title 1.45rem/800, meta, a white progress bar) and its own 3D illustration (`public/home/worlds/<key>.webp`)
   standing out of the banner's top edge. Unmistakably a chapter-of-the-journey header.
2. **Topic (נושא)** = a white card under its world: icon chip in the world tint, name 1.06rem/700, a SEGMENTED
   bar (one segment per chapter: solved = world colour, tried = light world colour). A thin path in the world
   colour links the topic cards of a world. Current topic: chip filled with the world colour + "את/ה כאן".
3. **Chapter (פרק)** = a checklist row INSIDE the opened topic card (circle with number / white check on world
   colour), like the reference's habit list. Tap = opens in place: about, chips, a button in the world colour.

### Motion
Worlds rise in as they enter the screen; the illustration floats in (scale .9→1, y 16→0); segments fill one by one.
transform/opacity only; reduced-motion = no motion.
