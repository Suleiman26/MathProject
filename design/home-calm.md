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
