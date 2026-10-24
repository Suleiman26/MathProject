# MathProject: rules for Claude

Hebrew (RTL) math practice site for middle school, grades 7–9. One HTML file per
topic, React + Babel from a CDN, no build step. Live at
https://mathproject-gamma.vercel.app (Vercel deploys every push to `main`, so
students see it at once).

Partners: Sulaiman (math content) and Abed (design system and infrastructure).

## Never without an explicit request
- Don't change the math, the exercises or any Hebrew text. All of it lives in each
  page's `<script type="text/babel">` block. Design work never edits that block.
- Don't push to `main`: it goes live for students immediately.

## Design
- Read `DESIGN.md` first. Shared look: `assets/mp.css`. Shared behavior: `assets/mp.js`.
- Page CSS sits in `@layer legacy`, the design system in `@layer mp`, one-page fixes in `@layer page`.
- New topic: start from `templates/module-template.html` and use the class vocabulary.
- Older page: `python3 tools/upgrade-page.py <file> <topic-color>`.

## Check before finishing
- `python3 tools/verify-logic.py` must say "math and text untouched".
- Look at changed pages on desktop and at phone width (375px).
