# Progress v2 — profile + railway (plan, agreed direction 2026-10-31)

Abed: "invest much more, be my partner, more details, higher-quality effects, colors."
Current state: railway v1 (src/home/Journey.jsx) and profile v1 (src/account/Profile.jsx) are live.
Fixed already: "you are here" only counts topics with answers (commit 4c7f0bc).

## 1. Railway v2 (signed-in home)
- **Chapters on the track.** Between stations, small stops for every chapter of the
  topic, lit when the chapter has a solved exercise. Needs a static list of chapters per
  topic (`src/home/chapters.js`, taken from each Topic.jsx chapter buttons).
- **Color zones.** The route passes through regions by category (תחום מספרי, אלגברה,
  פונקציות, גיאומטריה), each with its own colored landscape background and a zone banner.
  Track color blends from topic to topic (gradient per segment).
- **Station sheet.** Tapping a station opens a sheet (bottom sheet on phones, popover on desktop):
  chapters with progress bars, accuracy, last practised, the weakest chapter, a big "continue" button.
- **Effects (tasteful, fast, reduced-motion safe):**
  - the avatar rides along the track to the current station when the page opens;
  - the lit track draws itself;
  - gold stations shimmer;
  - level-up celebration (confetti) the first time a new level is seen;
  - floating faint math symbols in the background (parallax on scroll).
- **Milestones on the route:** "חצי מסלול", "שליטה ראשונה", finish line with trophy.
- **Next-step hint:** a dashed "הצעד הבא" arrow from the current station to the suggested
  next one (weakest started topic, else next unstarted).

## 2. Profile v2
- **Achievements (badges)**, computed in the database (`account_achievements`): first exercise,
  3/7/30-day streak, 10/50/100/500 solved, first topic in שליטה, first מומחיות, perfect chapter
  (10 right in a row), all topics of the grade started, early bird / night owl. Locked badges
  shown greyed with how to earn them.
- **Points (XP)** per solved exercise and level; feeds the future avatar shop (ROADMAP item 4).
- **Weekly goal ring** (default 4 practice days/week, editable) + "this week vs last week".
- **Last 7 days chart:** answers per day, correct vs wrong (dataviz skill palette rules).
- **Topic drill-down page** `/profile/<topic>`: chapters with accuracy, the steps with most
  mistakes ("איפה טועים הכי הרבה"), history line.
- **Personal records:** best day, longest streak, most solved in one session.

## 3. How we check before delivering
- Test students: new, 1 week in, advanced (with gold topics), no grade; Hebrew + Latin names.
- Phone 375/393/430, tablet 768, desktop 1280/1440; real iPhone Safari screenshots
  (simulator, signed-out flows; signed-in via browser at phone width).
- Delete all `zz*` test accounts and `seed-*` events after.
