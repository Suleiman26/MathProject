# Proofs section — the challenge (2026-11-21)

Reviewer hat: learning scientist + Israeli middle-school geometry teacher + product designer.
Input: `plan.html` (text, demo script, 6 phone screenshots), the three research files, CLAUDE.md, DESIGN.md.

## Verdict

The plan's backbone is right and I do not reopen it: one screen, three levels that fade
(complete → order → build), mastery per proof type, the drawing that fills up, no typing.
But as written it would **not** yet deliver "every student, even a very weak one, finds the path":

1. the mastery rule can be passed with the free second hint, and can never be passed by a student who needs help;
2. the engine as sketched marks correct thinking wrong in several cases (other valid orders, other valid reasons, true statements the list has no reason for, a finger that misses);
3. the phone screen does not have room for drawing + rows + tray on a small iPhone;
4. the content side (how many different problems, which figures, which reasons) is not specified at all, and one demo problem hides the biggest risk: "X-shape means צ.ז.צ" memorising;
5. two of the four approved types (3 and 4) are not multi-row proofs, and the plan never says what "level 1/2/3" means for them.

The final spec (`docs/superpowers/specs/2026-11-21-proofs-design.md`) fixes all "must" and "should" items below.

## What was checked and what was not

| Checked | Not checked |
|---|---|
| Plan text and the full demo script (logic of levels, hints, feedback) | I did not run the mockup in a browser; I read its code and the screenshots |
| Screenshots l1-wrong, l2-x1, l3-sel, l3-match, l0-t2 (780 px wide = 390 pt phone) | No real iPhone, no screen reader run |
| `mp-runtime.js` tracking rules (1.6 s window, one event per batch, `mp:fb`) read in the code | Nothing was built or measured |
| 4 web searches (interleaving, Parsons distractors/adaptivity, hint abuse, WCAG target size) — search summaries only, papers not opened | Israeli standard IS 5568 = WCAG 2.0 AA is from memory, the search did not confirm it |

Evidence tags: **[plan]** seen in plan/demo code, **[shot]** seen in a screenshot, **[code]** read in the repo,
**[research]** from the three research files, **[web]** search summary this session, **[teacher]** my own classroom judgement.

---

## A. Learning model and levels

### A1. Level 1 → Level 2 is a cliff — **must**
- **Weak:** L1 = pick a reason from 3–4 chips for 1–3 rows. L2 = choose every statement from 7 tiles (2 wrong), put them in order, AND pick every reason from 8. Three new demands at once.
- **Why:** it breaks the plan's own rule ("a student never meets two new things at once"). Fading works when it is gradual and adaptive [research: Renkl; Salden]. Adaptive Parsons problems make a problem easier when the learner struggles, and that is where their efficiency comes from [web: Ericson et al. 2018].
- **Upgrade:** every level has two variants. **A = entry/support** (first proof at the level, and the "extra help" proof), **B = standard**. L2-A: given rows already placed, no wrong tiles, 6 reasons. L2-B: everything, 2 wrong tiles, 8 reasons. Same idea for L1 and L3. Three visible levels stay; the step inside is invisible.

### A2. Types 3 and 4 are not proofs — the levels are undefined for them — **must**
- **Weak:** "קוראים את הנתון" (3) and "מחפיפה לשוויונות" (4) are 1–3 independent lines. The plan gives every type "L1 fill reasons / L2 order tiles / L3 build", but in type 3 the reason is trivial (the sentence says "חוצה") and the real decision is the statement; in type 4 the real decision is the matching part.
- **Upgrade:** per-type "what is the gap" setting. Type 3 and 4: L1 gap = the statement (or its second half), reason shown; L2 = pick the right statement tiles among wrong pairings + reason; L3 = tap the drawing. Written out in the spec.

### A3. Skill 5 is skipped, but type 6 needs it — **must**
- **Weak:** phase 1 = skills 3, 4, 6, 8. Skill 6 lists skill 5 as prerequisite (which theorem; "the angle must be between the sides"; "not enough information"; vertex order). The existing chapter "4. חפיפה" trains only identification and carries the ז.ז.צ flag.
- **Upgrade (no reopening of the phase-1 decision):** the warm-up of type 6 carries skill 5's core: "which theorem / אי אפשר לקבוע" with the two classic traps (angle not between the sides; three angles). Skill 7 (hidden datum) stays in phase 2, so type 8 in phase 1 is Ministry step 4 only (direct congruence, then conclusion).

### A4. Warm-up gate "3 correct in a row" — **must**
- **Weak:** a reset-to-zero streak is exactly pitfall 6 in the research file; and a forced warm-up bores strong students. A very weak student can be stuck before the first proof — the opposite of the goal.
- **Upgrade:** warm-up = 4 quick tasks. All 4 right → straight on. A miss → 2 more tasks of that one sub-skill with an explanation. Hard cap of 8 tasks, then the student enters L1 anyway (L1-A is a walk-through that cannot be failed). Nobody is ever blocked before a proof.

### A5. Choosing chips can be done without looking at the drawing — **should**
- **Why:** small menus are finished by elimination without reading [research: IXL finding]. Successful provers mark the diagram and use the given [research: Cirillo & Hummer].
- **Upgrade:** L1-A includes one "show it in the drawing" tap per proof (tap the two parts the row talks about) and one "which rows feed the congruence?" tap. Not scored; they tie text to figure.

### A6. No planning step for "congruence, then conclusion" — **should**
- **Why:** the strategic step in type 8 is "which two triangles hold AC and BD?". Successful students state a plan 64% vs 15% [research]. Backward thinking is fine as one planning question, not as row order [research: Matsuda].
- **Upgrade:** type 8, L1 and L2: one unscored planning tap — "באילו שני משולשים נמצאים AC ו-BD?" (tap the two triangles). L3: none.

### A7. Transfer to paper is missing — **should**
- **Weak:** the test is on paper, in the form נתון / צ"ל / הוכחה / מ.ש.ל with a טענה–נימוק table [research §3]. A tap-only app can train recognising, not writing.
- **Upgrade:** every finished proof ends with "כך כותבים את זה במחברת": the same proof as a clean two-column page with the full reason wording. Cheap (the data is there), and it is the format teachers mark. The bubble view stays in the roadmap.

### A8. Per-row checking at Level 3 forever — **later**
- A student who gets instant feedback on every row never checks a whole proof. Add "check at the end" as the last variant once real data exists.

---

## B. Mastery rule

### B1. The second hint gives the answer and costs nothing — **must**
- **Weak:** in the demo, hint 2 says "הנימוק שלו: **נתון**" / "זה המשפט **צ.ז.צ**" and greys out the other chips; the proof still counts as "clean". Press hint twice on every step = level up without thinking.
- **Why:** racing through hints to the bottom is the best-known misuse of tutors [web: Baker 2004; Aleven & Koedinger 2000]; the plan itself quotes 36% [research].
- **Upgrade:** hint 1 (where to look) stays free. Hint 2 no longer names the chip; it names the idea and dims to 3. A decision made after hint 2 is **"with help"**: not a mistake, but not counted as the student's own. The fast track needs zero hints of rung 2+.

### B2. "Clean = at most 1 wrong step" means nothing at Level 1 — **must**
- **Weak:** an L1 proof has 1–3 decisions. One wrong out of one = 0% and still "clean". The second condition (80% of steps over four proofs) then silently does the real work; two rules that disagree are hard to explain to a student.
- **Upgrade:** one definition: **clean = nothing filled by the app AND at least 80% of the proof's decisions done alone on the first try.** For 3–4 decisions that means all of them; for 5–9 one slip; for 10+ two. Level up = 3 clean of the last 4. The student sees only the four dots. "% correct" (the owner's request) is inside the definition.

### B3. Fast track on almost no evidence — **must**
- **Weak:** "first two proofs perfect" at L1 can be 1 + 2 = 3 decisions from 3–4 options: about a 2–4% chance by pure guessing, and no proof of anything.
- **Upgrade:** the first L1 proof of a type is the walk-through (A, not counted). Fast track = the first two **counted** proofs perfect, no hint 2+, with at least 6 decisions in total.

### B4. A student who needs help can never show progress — **must**
- **Weak:** any proof with "הראה לי" is "not clean"; the only progress shown is the clean-dots. A weak student finishes proof after proof and the screen says nothing moved. That student leaves.
- **Why:** [teacher] the weak student must see a win that is true. Progress compared with oneself, not with the bar.
- **Upgrade:** two honest meters per type: (1) the four dots (clean proofs → level); (2) a quiet count "הוכחות שהשלמת: 7" plus a self-comparison line when it is true: "הפעם נעזרת פחות מבפעם הקודמת". Every completed proof ends with מ.ש.ל and the snap — also with help.

### B5. Rescue comes after 6 failed proofs — far too late — **must**
- **Weak:** 6 proofs at L2 ≈ 15–20 minutes of failing before anything changes.
- **Upgrade:** every wrong answer already has an error kind (goal used as known, "looks equal", too early, wrong theorem, wrong matching, wrong source). Rescue ladder: **2 proofs in a row not clean** → next proof is variant A, opened by 2 warm-up tasks on the most frequent error kind. **Again 2 not clean** → a fully worked example to step through, then A. **6 proofs without levelling** → a kind message + the suggestion to do the previous type first. There is always a next action that ends in a finished proof.

### B6. Abandoning a proof hides mistakes — **should**
- A student can drop every proof after the first slip and keep a perfect record. Rule: a proof left after a miss counts as "not clean"; a proof left with no miss does not count at all. In-progress proof is kept on refresh.

### B7. Numbers are guesses — keep them in one place — **should**
- All thresholds in one constants block in `mastery.js`, each with a test, so Abed/Sulaiman can tune after real data. The research file says the same.

---

## C. Checking: where correct thinking would be marked wrong

### C1. Other valid orders and forms — **must**
- **Weak:** the demo checks against a fixed `ORDER` list and exact strings [plan]. Real classes write צ, ז, צ in any order; `OB = AO`; `∢COA = ∢DOB`; `△OAC ≅ △OBD`; `△BOD ≅ △AOC`.
- **Upgrade:** a proof is a **graph of facts**, not a list. A row is right when its fact is provable now (all the facts it needs are already written) — any such order is accepted. Facts are compared in a normal form: a segment is a pair of points; an angle is a vertex + two **rays** (so ∢OAC and ∢BAC are the same angle when O lies on AB); a congruence is a matching of vertices, accepted in any of the 6 consistent orders and either side first.

### C2. More than one valid reason — **must**
- "AO = OB" when the question says "O אמצע AB": teachers accept both "נתון" and "אמצע קטע". The same for "AD חוצה זווית". Each fact needs a **list of accepted reasons**. Which one the worked example shows: Sulaiman decides.

### C3. True statement, but our list has no reason for it — **must**
- **Weak:** at L3 the student can tap any two parts. In "AB = AC, BD = DC" a grade-9 student may claim ∢B = ∢C (isosceles theorem, not in the phase-1 bank). The demo answers "אין נימוק שאומר שהזוויות שוות" in red — wrong feedback to a correct idea.
- **Upgrade:** five outcomes for a statement, decided from the graph and from the drawing's coordinates: **right now** / **already written** / **too early** (true, needs something first) / **true but not needed or not provable with this list** (neutral, never a mistake) / **false in this figure** (mistake).

### C4. A finger that misses is counted as a mistake — **must**
- **Weak:** at L3, two taps create a statement at once and a non-fact gets red feedback [plan: `formStatement`]. Around point O four segments and two angles meet within a few millimetres; the angle targets at A and B are circles of radius 16 [plan] = 32 pt.
- **Why:** this is "accidental difficulty" [research: tools review]; WCAG 2.2 asks at least 24 px with spacing, 44 px is the enhanced target [web: W3C 2.5.8 / 2.5.5]; DESIGN.md asks 40 px.
- **Upgrade:** tapping only **selects**; a preview chip "AO = OB — להוסיף שורה" confirms. Only a confirmed statement is judged. When a tap lands within reach of two parts, a small chooser asks which one. Plus a "רשימת חלקים" button: the same parts as chips (also the keyboard / screen-reader path).

### C5. The goal looks already proved in the drawing — **must**
- **Weak:** in three screenshots (l0-t2, l2-x1, l3-sel) AC and BD carry three solid ticks before anything is proved [shot]. That contradicts the central rule "a mark appears only after a correct reason" and invites the classic mistake (using the goal). It may be a transition frame of the demo; either way the spec must forbid it.
- **Upgrade:** the goal parts get a **target style** (dashed coral outline, no ticks). Ticks appear only when the row is justified.

### C6. Vertex matching asked as one multiple-choice question — **should**
- "Which vertex matches A?" from 3 chips is a 33% guess and decides the whole order. Upgrade: the first triangle's name is shown; the student taps the three vertices of the second triangle in matching order. Wrong → the first non-matching pair lights up with the equal parts that prove it.

---

## D. Content and variety (missing from the plan)

### D1. No problem inventory at all — **must**
- **Weak:** the plan shows one problem. Nothing says how many, which figures, what changes.
- **Why:** with one figure per type a student learns "X-shape → צ.ז.צ" in two tries. In interleaved practice the student must choose the method, and that choice is what was learned: d = 0.79 on a delayed test in grade 7, and 61% vs 38% in a 54-class trial [web: Rohrer et al. 2015, 2020].
- **Upgrade:** 5 figure families × 2–3 theorems each. Hard rule, tested: **no figure family predicts the theorem**, and two proofs in a row never share family + theorem. Counts: type 3: 10 templates; type 4: 6; type 6: 14; type 8: 33 (11 structures × 3 goals). Each template is hand-written structure (givens, graph, goals) with generated names, turn, mirror and sizes — thousands of surface forms, every one verified against coordinates.

### D2. Hand-authored or generated? — **must (decision)**
- Fully generated proofs: risk of odd or wrong maths nobody reviewed. Fully hand-drawn sets: 30 problems are memorised in a week and cost drawing time.
- **Upgrade:** middle way above. Sulaiman reviews ~63 templates once (a printable sheet from the dev page), not thousands of instances; tests guarantee each instance is true.

### D3. The drawing must not lie — **must**
- Tests per generated figure: every stated equality is true in the coordinates; every pair that is **not** a fact differs clearly (≥ 8% in length, ≥ 6° in angle), except the deliberate "looks equal" consequences; no accidental right angles or isosceles look; labels never on a line (existing project rule).

### D4. Wrong tiles must be chosen with intent — **should**
- Three kinds, one of each where the level allows: the goal itself; a true consequence that is not known yet ("looks equal"); a false look-alike (letters swapped). Evidence on distractors is mixed: they raised load and time for young novices, other studies find them useful for attention [web: Harms 2016; Haynes-Magyar 2024]. So: none at L2-A, two at L2-B, never more.

### D5. Statement kinds in phase 1 — **should (scope)**
- Only three kinds: segment = segment, angle = angle, △ ≅ △. "△BDC שווה שוקיים" and number answers (KP = 5 → ST = ?) wait for phase 2. Keeps the engine small and excellent.

---

## E. Hints and feedback

### E1. Help avoidance is not handled — **should**
- Some students never press the hint [web: Aleven et al. 2006]. After 20 s without a tap on a step at L1/L2 the hint button pulses once. No automatic text.

### E2. "Why" line after every correct row — **should**
- Good at L1 (elaborated feedback beats ✓ [research]), noise at L3. Show the why-line at L1 and in A variants; at L2-B/L3-B only the mark being drawn.

### E3. Feedback wording is uneven — **must**
- Mixed singular/plural ("בדוק" / "בדקו") and one generic line used as fallback. The spec lists every message, plural, one sentence, each tied to an error kind. All are drafts for Sulaiman.

### E4. Two chips with the same name — **must**
- At L3 the bank shows "זוויות מתאימות" twice (between parallel lines / in congruent triangles) [shot l3-match]. The curriculum file itself warns about this word. Phase 1: drop "מתאימות בין ישרים" (no parallel proofs yet); from phase 2 the chips read "מתאימות בין מקבילים" and "זוויות מתאימות במשולשים חופפים" in full.

### E5. Feedback line contrast — **should**
- In the screenshots the red feedback line and the hint line are very pale [shot]; probably mid-animation. Requirement: text contrast ≥ 4.5:1 when the animation ends, and the animation ≤ 300 ms.

---

## F. Phone layout (375 pt) and readability

### F1. Three fixed zones do not fit a small iPhone — **must**
- **Weak:** on the 390×760 pt screenshots the drawing + given strip take ~260 pt and the tray 280–410 pt; 1–2 rows stay visible; the L3 bank alone is taller than half the screen and still scrolls [shot]. On a 375×667 phone Safari leaves ~550 pt: zero rows.
- **Upgrade:** a height budget, written in the spec: drawing ≤ 30% of the visible height (168 pt on small phones), given + goal in one line (34 pt), finished rows become **one-line rows** (30 pt: number · statement · short reason), the active row lives in the tray header, tray ≤ 40%. L3 reasons become a **two-step pick** ("מאיפה יודעים?" 5 groups → 1–3 reasons), so the tray never grows past ~200 pt.

### F2. Statement-under-reason vs table — **should**
- Under is right for the active row. Finished rows fit on one line with short reason names; the true two-column table appears in the "notebook" view at the end. Both needs are met.

### F3. Symbols ∢ △ ≅ — **must**
- ∢ is drawn by a fallback font (it looks like a different sign) and △ is larger than the letters [shot]. Rubik has no such glyphs. Upgrade: small inline SVG signs inside the left-to-right math island, with Hebrew names for screen readers.

### F4. Colours — **should**
- Pair colours blue / violet are close for red-green colour-blind students; orange is used for the third pair AND the accent AND is near the amber "note". Upgrade: pairs = blue, violet, teal with three different lightness steps (and always the tick count); coral only for "now" and "goal"; green/red only for right/wrong.

### F5. Top of the page — **should**
- Top bar + chapter row + level tabs + title would eat ~150 pt. In a proof they collapse to one 40 pt line (type · level · four dots). They must stay in the page because the tracker reads them [code]; the builder verifies events still carry the right chapter text.

---

## G. Accessibility

| Issue | Upgrade | Priority |
|---|---|---|
| Drawing is touch-only | Every part is a real button with a Hebrew name ("הקטע AO"); "רשימת חלקים" gives the same as chips; full keyboard path | must |
| Colour alone | Tick count / arc count always; done rows have a ✓ icon, not only green | must |
| Screen reader | Statement read as a sentence ("הקטע AO שווה לקטע OB"); feedback in a polite live region; marks announced ("סומן בציור") | must |
| Motion | `prefers-reduced-motion`: no pulse/snap; a still highlight instead | must |
| Targets | ≥ 44 pt for chips; drawing targets ≥ 40 pt or the chooser | must |
| Legal | Section stays hidden + noindex; `/legal-check` before it is shown (project rule) | must |

---

## H. Tracking and saving

### H1. The win banner can be missed by the tracker — **must**
- The tracker reacts only within 1.6 s of the student's tap and keeps one event per batch [code]. The demo shows the win 1.5 s after the last answer [plan] — on a slow phone the "win" is lost, or the last "ok" is.
- **Upgrade:** after the last row the student taps a **"מ.ש.ל" button** (teachers end proofs this way). That tap produces the banner → a reliable `win`, separate from the last `ok`.

### H2. What counts as what — **must**
- Right → `.fb.ok`; wrong → `.fb.err`; neutral notes ("too early" first time, "true but not needed", app-filled step) → a private `pf-note` class the tracker ignores. The tracked `.banner` only for a proof with nothing app-filled; a helped proof gets the same visual ending without the tracked class (same rule as "show solution" in the חדש module).

### H3. "Progress moves between devices" without a database change — **should**
- Because levels are locked, any stored event at "› רמה 2" proves level 2 was earned. So a signed-in student on a new device gets the right level from the existing `account_progress` rows; only the four dots restart. No new table or function in phase 1. Guests: `localStorage`, merged into the account key at sign-up.

### H4. Stable names — **should**
- Chapter button text is the key in the database. Fix the four names now; when phase 2 inserts types and the numbers shift, add `RENAMED` entries. Step labels describe the decision kind ("נימוק · משפט חפיפה"), not the row number, so the admin's "most missed" list makes sense across random problems.

---

## I. Motivation without cheap tricks — **should**
- One calm ending per proof (snap + מ.ש.ל) — keep. No streaks, no timers, no confetti per row — keep.
- Add: sets of 3–4 proofs with a clear end ("סיימת סבב") so practice has a stopping point; the self-comparison line (B4); the notebook page as something worth having (A7); a "נסו הוכחת אתגר" link that lets a student try one proof of the next level — passing it clean is the fast track made visible (levels stay earned).

## J. Scope: what can be excellent in phase 1 — **must**
- **In:** engine (graph check, figure with tappable parts, rows, tray, hints, rescue, mastery), 4 types, 5 figure families, ~63 templates, warm-up tasks (7 sub-skills), notebook view, dev preview page, tests.
- **Out (roadmap):** drag to reorder, bubble view, number answers, "is isosceles" statements, parallel lines, overlapping triangles, pull-apart animation, check-at-the-end mode, mixed sets and spaced review, home railway, catalog, any database change.
- **Gate:** build one vertical slice first — type "הוכחת חפיפה", two figure families, all levels — test it on a real iPhone with a scroll video, show Abed, then add the rest.

---

## Sources used in this review (beyond the three research files)
- Interleaving: Rohrer, Dedrick & Stershic 2015 — https://link.springer.com/article/10.3758/s13423-014-0588-3 (related), IES study page https://ies.ed.gov/ncee/WWC/Study/80702 ; Rohrer et al. 2020 preprint https://www.gwern.net/doc/psychology/spaced-repetition/2019-rohrer.pdf [search summary]
- Parsons problems: distractors — https://profiles.wustl.edu/en/publications/distractors-in-parsons-problems-decrease-learning-efficiency-for-/ ; adaptive — https://www.bibsonomy.org/bibtex/2b2617611446ed22e870de6f4d75f9ab8/brusilovsky ; variations — https://arxiv.org/html/2512.22407 [search summary]
- Hints: https://learninganalytics.upenn.edu/ryanbaker/PSCS-gaming-v6.pdf ; https://www.cs.cmu.edu/afs/cs.cmu.edu/Web/People/bmclaren/pubs/AnEtAl-RevisitingTheHintButton-LAK2026.pdf ; https://www.aaai.org/Papers/Workshops/2005/WS-05-02/WS05-02-008.pdf [search summary]
- Target size: https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum ; https://www.w3.org/WAI/WCAG21/Techniques/css/C44.html [search summary]
