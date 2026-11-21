# Teaching geometry proofs in a phone-first Hebrew app (grades 8–9) — research report

Date: 2026-11-21. Scope: pedagogy + interaction design for a 3-level, fading-guidance proof module.

## How to read this report (what was checked and what was not)

| Mark | Meaning |
|---|---|
| **[read]** | I opened the paper/page itself in this session and took the numbers from it |
| **[abstract]** | I only saw the abstract or a search summary of the source; numbers not verified in the full text |
| **[memory]** | From my own background knowledge; not confirmed on a page in this session |
| **[design]** | My own recommendation built on the evidence; the numbers are a starting point to tune with real data, not a research result |

Not done: I did not install or play any of the apps (DragonBox, Euclidea, Brilliant, Duolingo Math, Mathspace, DeltaMath). Product descriptions come from store pages, help pages, a 2026 review of 33 tools, and memory, marked as such. Several papers (Springer, Southampton eprints, Khan help centre) blocked reading, so they are marked [abstract].

---

## (A) Key findings

**1. The official Israeli grade-8 plan already describes a fading ladder — build on it.** The Ministry's grade-8 geometry document says proof is taught "in stages" around triangle congruence, and lists what is asked of the student in rising order: (a) follow and understand someone else's proof, (b) **complete missing details in a partly written proof**, (c) explain a proof aloud, (d) write a proof. It also lists five content stages: (1) given congruent triangles, what equalities follow; (2) prove congruence with one theorem; (3) prove a needed fact in a separate part, then the congruence; (4) congruence, then conclusions from it; (5) all combined. It names three writing formats students must meet: two columns of **טענה / נימוק**, a **bubble flow chart** ("תרשים זרימה של בועיות"), and free text; and it suggests varied tasks: true/false, "who is right", **completing a proof skeleton**. It says weak groups should stay longer on the first stages. [read] — https://meyda.education.gov.il/files/Pop/0files/matmatika/Chativat-Beynayim/curriculum/updating/geometry_8.pdf

**2. What separates students who succeed from those who fail is mostly three habits — and they are teachable on a screen.** Cirillo & Hummer (2021, ZDM), 20 students aged 13–17 solving two congruence proofs: successful provers (n=7) vs unsuccessful (n=13): used the "Given" productively 100% vs 23%; named reasons as definitions/theorems 86% vs 8%; logical chain 93% vs 8%; marked the diagram 100% vs 65%; used the diagram as a checklist/plan 100% vs 46%; said a plan before writing 64% vs 15%; attended to the "Prove" line 64% vs 23%; attended to the congruence criteria 79% vs 15%. Unsuccessful students: 39% took facts from how the drawing looks instead of from the given; vague reasons 62% of the time (e.g. "definition of bisect"); 57% never came back to the given after line 2; 46% copied the given incompletely. [read] — https://cadrek12.org/sites/default/files/Cirillo___Hummer_2021.pdf (journal: https://link.springer.com/doi/10.1007/s11858-021-01221-w)

**3. Worked examples that fade into problems beat "example then problem", especially for novices; add "which rule is this?" prompts.** Renkl, Atkinson, Maier & Staley (2002): fading out solution steps improved near transfer, through fewer errors while practising. Atkinson, Renkl & Merrill (2003): fading + prompts to name the principle behind each step gave medium-to-large effects on near AND far transfer with no extra time. [abstract] — https://asu.elsevierpure.com/en/publications/transitioning-from-studying-examples-to-solving-problems-effects-/ ; https://escholarship.org/content/qt81b9j9hs/qt81b9j9hs.pdf
   Caveat: which end to fade first is not settled. Renkl's group favoured backward fading (student does the last step first); a search summary reported another study where forward fading scored higher on near transfer. [abstract] Do not treat "backward" as proven; see (B) for what I recommend for proofs.

**4. Fading should adapt to the student, not follow a fixed schedule.** Salden, Aleven, Schwonke & Renkl (2010), two experiments inside the Geometry Cognitive Tutor: adaptive fading of worked examples (based on the student's own explanations) > fixed fading > plain tutored problem solving, best on delayed transfer. This is direct support for "level up per proof type from the student's own results". [abstract] — https://link.springer.com/doi/10.1007/s11251-009-9107-8

**5. "Heuristic" worked examples (showing how a proof is found, not just the finished proof) help grade-8 students, most of all the weak ones.** Reiss, Heinze, Renkl & Groß (2008), 243 grade-8 students: examples that walk through explore → guess → plan → write beat normal teaching; students with poor understanding of proof benefited. The same paper notes many students try to "prove" by measuring or checking one or two cases. [abstract] — https://link.springer.com/article/10.1007/s11858-008-0105-0

**6. Choosing the reason from a list is itself a proven learning move.** Aleven & Koedinger (2002, Cognitive Science): students who had to explain each step in a geometry tutor by picking the rule from a glossary/menu learned with more understanding than students who only solved. A reason picker is therefore not a "cheap shortcut"; it is the self-explanation prompt. [abstract] — https://pact.cs.cmu.edu/koedinger/pubs/Aleven-et-al-AIED99.pdf ; https://serc.carleton.edu/resources/40402.html

**7. Ordering ready-made proof lines ("Proof Blocks") teaches as much as writing, in a quarter of the time — but only after the idea was shown first.** Poulsen et al., randomised trial, 332 university students (proof by induction): Proof Blocks group gained 35.0 points in 11.1 min; mixed group 32.4 in 32.1 min; written-proof group 33.4 in 43.4 min; no difference in post-test (p = 0.76). Authors' own limit: all groups read notes first, so some learning may come from the notes; a later thesis found blocks alone work less well than blocks after reading. Age and topic differ from ours — treat as strong hint, not proof. [read] — https://arxiv.org/pdf/2211.09609 ; tool: https://arxiv.org/pdf/2106.11032 ; distractors (gain not significant): https://arxiv.org/pdf/2311.00792

**8. Teach forward from the given; use backward thinking only as a short plan.** Matsuda & VanLehn (2005), 52 students, same tutor taught either way: forward-chaining students wrote better proofs; backward-chaining students stumbled on "sub-goaling" — writing down things they still needed as if they were already true. That is exactly the "using what must be proved" error. [abstract] — https://noborumatsuda.github.io/Doc/AIED05/index.htm

**9. Flow-chart proofs help grade-8 students see the structure, with a known limit.** Miyazaki, Fujita & Jones (grade 8, Japan): flow charts with "open" problems (several right answers) help students connect givens to conclusion; limits: students may think every proof must use congruence, and the move to normal written proofs is hard. [abstract] — https://eprints.soton.ac.uk/445740 ; https://eprints.soton.ac.uk/445743

**10. Keeping the drawing in sync with the proof cuts "what do I already know?" errors by more than half.** Ender (2026): two-column proof beside a live diagram; tick marks appear only after a line is justified; blue = current line, black = what it relies on, red = missing/contradicting; arrows show which earlier lines a reason needs (3 for צ.ז.צ, 1 for "from congruence"). 12 students, 6 per group: 80.5% vs 58.2% correct on finding/fixing errors (p < 0.03); errors from misremembering what was established: 13 vs 42. Small, one-session study. Authors suggest the visual cues could later be faded. [read] — https://arxiv.org/html/2611.13368

**11. Existing digital tools fail at the diagram and at guessing.** Review of 33 tools + 18 teacher interviews (2026): teachers' top habit is "mark the picture" — and only after the fact was justified; most tools have a static diagram or free scribbling with no feedback; 4-option reason menus (IXL) can be finished by elimination without reading; DeltaMath accepts many solution paths but forces a fixed vertex order and auto-marks the diagram for the student. Four guidelines: integrate diagram and proof; auto-generate problems and feedback; several proof formats and several valid paths; remove "accidental" difficulty (naming, notation, fiddly input). [read, first half of the paper] — https://arxiv.org/html/2608.25117

**12. Seeing is not proving (Duval), and proof readiness depends on the student's geometry level (van Hiele).** Duval: what is drawn cannot be taken as known; students read the figure by eye ("perceptual") and are misled; a 2024 study confirms tasks that need reasoning from statements are harder than tasks solved by looking. [abstract] — https://link.springer.com/article/10.1007/s10649-024-10317-5 ; https://eprints.soton.ac.uk/41308/01/Jones_BSRLM_18_1998.pdf . Senk (1989): proof-writing correlates ~.5 with van Hiele level at the start of the year; a secondary source gives mastery of proof as <22% of students below level 3, 57% at level 3, 85% at level 4. [abstract / secondary] — https://ucsmp.uchicago.edu/resources/van-hiele ; https://en.wikipedia.org/wiki/Van_Hiele_model . Meaning for us: a real share of grade-8 students are not yet ready for a full proof and need a "before proof" rung (see B, Level 0).

**13. Colour-linking text and drawing reduces load; splitting them hurts.** Tarmizi & Sweller (1988) and follow-ups: geometry worked examples only help when text and diagram are integrated; Kalyuga, Chandler & Sweller (1999): colour coding matching text to diagram parts removes the search cost. Colour needs a numbered order beside it to guide the sequence. [abstract] — https://tecfa.unige.ch/tecfa/teaching/methodo/Kalyuga99.pdf ; https://en.wikipedia.org/wiki/Split-attention_effect

**14. Mastery: simple rules are good enough if they have "memory"; stop endless practice at ~10 tries.** Pelánek: "N correct in a row" works when answers are not noisy but forgets everything after one slip; an exponential moving average does nearly as well as complex models (decisions correlate > 0.9); "average performance + number of attempts may be sufficient"; the famous BKT 0.95 threshold is often misread. [read] — https://www.fi.muni.cz/~xpelanek/publications/mastery-modeling.pdf . Beck & Gong "wheel-spinning": not reaching 3-in-a-row within 10 tries signals the student is stuck and more of the same will not help. [abstract] — https://files.eric.ed.gov/fulltext/ED594575.pdf . Rosenshine: aim for ~80% success in practice of new material (a teaching guideline, not a law). [abstract] Khan Academy: Familiar at 70–85%, Proficient at 100%, Mastered only on a later mixed test; drops below 70% demote. [abstract] — https://support.khanacademy.org/hc/en-us/articles/5548760867853

**15. Hints and feedback: explain, don't just mark; expect hint-clicking.** Van der Kleij et al. (2015) meta-analysis, 40 studies: elaborated feedback effect 0.49 vs 0.32 for "here is the right answer" vs 0.05 for right/wrong only; strongest for higher-order learning and in maths. [abstract] — https://doi.org/10.3102/0034654314564881 . In the Geometry Cognitive Tutor students misused hints on 36% of actions (14% when fast repeated clicks count once), mostly racing to the last hint. [abstract] — https://learnlab.org/research/wiki/index.php/Help_abuse . But a final "here is the step" hint works like a worked example when the student stops to think about it (Shih, Koedinger & Scheines 2008). [abstract] — https://www.cmu.edu/dietrich/philosophy/docs/scheines/Shih_Koedinger_Scheines_2008_EDM.pdf

### Error catalogue the design must answer (from findings 2, 8, 12 + classroom literature)

| Error | Evidence | Design answer |
|---|---|---|
| Does not know how to start | plan before writing 64% vs 15% (Cirillo) | fixed opening ritual: mark the given, state the goal |
| Uses what must be proved | sub-goaling (Matsuda) | the "צ״ל" line is locked and visibly "not yet known" |
| Takes facts from the look of the drawing | 39% (Cirillo); Duval | diagram shows a mark only for given/justified facts; "looks equal" tap gets specific feedback |
| Vague or wrong reason | 62% vague (Cirillo) | reason bank with exact, short theorem names + mini-icon |
| Theorem vs its converse | Ministry tasks on "if congruent then equal perimeter / the opposite" [read] | both directions sit in the bank as separate chips; converse = named error |
| Forgets the given after line 2 | 57% (Cirillo) | given chips stay on screen and "use up" visibly |
| Wrong matching of vertices / parts | DeltaMath order pitfall (tools review) | colour + tap-matching of corresponding parts, any consistent order accepted |
| Circular reasoning | classroom literature [memory] | a line can only rely on lines above it (dependency check, as in Ender) |

---

## (B) Recommended model — what the student sees and does

Shared frame for every level (never changes, so the student learns one screen):
- **Top (sticky, ~40% of the phone height):** the drawing. Given facts already marked (tick marks, arcs) in colour. The two triangles under discussion tinted.
- **Under it:** two chips: **נתון** (each given fact a small chip) and **צ״ל** (locked, grey with a small lock until proved).
- **Middle:** the proof as numbered rows; each row = **טענה** (maths, left-to-right) + **נימוק** chip under it (not beside it — on a phone two columns are too narrow).
- **Bottom (thumb zone):** the answer tray for the current step + hint button.
- Opening ritual on every proof, all levels (5 seconds): "מה נתון?" → the given chips light their parts in the drawing one by one; "מה צריך להוכיח?" → the target lights. At levels 2–3 the student does this by tapping.

### Level 0 — "לפני הוכחה" (warm-up rung; entry point for very weak students, optional for others) [design, from findings 1, 2, 12]
Single-skill mini tasks, 20–40 seconds each, always winnable:
1. Tap in the drawing what the given says (נתון: AB = DE → tap the two sides). 
2. "Looks equal" vs "known equal": is this fact given, or does it only look so?
3. Given two congruent triangles — tap the matching side/angle (Ministry stage 1).
4. Which congruence theorem fits these marks? (three marked drawings → צ.ז.צ / ז.צ.ז / צ.צ.צ / none).
5. True / false / "who is right" on one inference (theorem vs converse).
Purpose: these are exactly the sub-skills that split successful from unsuccessful provers. A student who fails at Level 1 is routed here to the one sub-skill that failed, not to "more proofs".

### Level 1 — "מודרך" (lots of help): a worked example the student completes
What the student sees: the **whole proof already written**, row by row, in order, with 1–3 gaps.
What the student does:
- Step through the proof with one tap per row. Each row lights its parts in the drawing and adds its tick mark there.
- At each gap, pick from **3–4 chips** (only reasons at first; later also a statement). After a correct pick, one short "why" line appears.
- One self-explanation tap per proof: "מאיזה שורות נובעת החפיפה?" → tap the three rows that feed the congruence line.
Fading inside the level (per proof type): proof 1 = 1 gap (the congruence theorem); proof 2 = 2 gaps; proof 3+ = 3 gaps including one statement. I recommend the gaps start at the **key decision** (which theorem, and the conclusion from congruence) rather than strictly "last step first": the last step ("from congruence") is the easiest and the evidence on fading direction is mixed (finding 3).
The first proof of each new type is a "heuristic" example: 3 short cards before the proof — "מה מחפשים?", "מה כבר מסומן?", "איזה משפט מתאים?" (finding 5).

### Level 2 — "חצי-מודרך" (less help): build the proof from ready pieces
What the student sees: empty numbered rows; a tray with **all the statement tiles shuffled + 1–2 wrong tiles** (a "looks true" fact not given; the צ״ל itself); a reason bank of **6–8 chips**.
What the student does:
- Start ritual by tapping: taps the given parts in the drawing, taps the target.
- One planning question: "איזה משפט חפיפה נשתמש?" (can be changed later; it is a plan, not a proof line).
- Places tiles in order (tap tile → it flies to the next row; drag to reorder), then picks the reason for each.
- The drawing gains a mark only when a row is placed AND justified.
- Any valid order is accepted (the three facts before congruence in any order).
- Check is per row at once (not at the end): right → mark appears; wrong → specific feedback (D).

### Level 3 — "עצמאי" (almost no help): produce the statements
What the student sees: drawing, given, צ״ל, empty rows. No tiles.
What the student does:
- Creates each statement **by tapping the drawing**: tap two sides → "AB = DE" is offered; tap two angles → "∢B = ∢E"; tap two triangles → "△ABC ≅ △DEF" (student confirms vertex order by tapping matching vertices; any consistent order is accepted).
- Picks the reason from the **full bank** of the topic (grouped: נתון / הגדרות / משפטים / חפיפה), including converses.
- No plan prompt, no auto-highlights; hints only on request; feedback still per row, but the first response to an error is only "בדוק שוב את שורה 3" (location, not content).
- Last proofs at this level mix proof types (to check the student can choose the approach, like Khan's "Mastered only on a mixed test").

Why no free typing at any level: on a phone, typing ∢, ≅ and Hebrew reasons is "accidental difficulty" (finding 11), and auto-checking free text is unreliable. Tap-to-build keeps the thinking and drops the typing.

| | Level 1 מודרך | Level 2 חצי-מודרך | Level 3 עצמאי |
|---|---|---|---|
| Statements | written; 0–1 gap | given as shuffled tiles + distractors | student builds by tapping the drawing |
| Order | given | student orders | student decides |
| Reasons | 1–3 gaps, 3–4 chips | every row, 6–8 chips | every row, full bank with converses |
| Plan | shown as cards | one question | none |
| Drawing | lights by itself on each row | marks appear when a row is justified | student taps; marks appear when justified |
| Hints | offered automatically after an error | button, 3 rungs | button, 3 rungs, first feedback is location only |

Simple rule: **the screen never changes — only who does the work changes** (app → shared → student).

---

## (C) Mastery rule (per proof type, per student) [design, from findings 4, 14]

Two things are counted:
- **Step** = one decision (a statement placed/built or a reason picked). "Right" = correct on the first try without the show-me hint.
- **Clean proof** = finished with at most 1 wrong step and no show-me hint.

| Rule | Numbers | Why |
|---|---|---|
| Level up | **3 clean proofs out of the last 4** at this level, AND ≥ **80%** of steps right over those 4 | has "memory" (one slip does not reset), needs both accuracy and enough evidence (Pelánek); 80% = Rosenshine's practice target |
| Fast track | the **first 2 proofs** at a level both perfect (no error, no hint) → level up at once | avoids boring strong students (expertise-reversal; Khan's two-level jump) |
| Minimum | never level up on fewer than 2 proofs | avoid luck |
| Extra help (not a demotion) | < **50%** steps right over the last 2 proofs, or show-me used in 2 proofs running → next proof comes with one level more support; the badge does not drop | adaptive fading (Salden); avoid the feeling of failing |
| Stuck guard | **6 proofs** at a level without levelling up → stop repeating; send to the one Level-0 skill behind most errors, then a fresh Level-1 example, then back | wheel-spinning: more of the same does not help (Beck & Gong use 10 tries; proofs are long, so 6) |
| Mastered | Level 3 passed + **2 clean proofs in a mixed set** on a later day | Khan's rule: mastery is shown in a mix, later |
| Review | a mastered type reappears after ~1 week and ~1 month; one failed review → offer one Level-2 proof | spacing; keeps the badge honest |

Notes:
- Level-1/2 hints (see D) do not hurt the score; only the show-me hint marks a step as "assisted" (Mathspace's public rule is that hints cost nothing and only wrong/skipped steps do [abstract]).
- Show the student progress as "3 מתוך 4" dots, not as a percentage — a percentage that drops feels like punishment.
- Later, with real data, the same decision can be made with one running number: new = 0.7 × old + 0.3 × (proof score), level up at ≥ 0.8 after at least 3 proofs. These two numbers are my starting guess; Pelánek's paper says such parameters must be tuned and are not obvious.
- "Proof type" should follow the Ministry's five stages × the theorem family (congruence by צ.ז.צ / ז.צ.ז / צ.צ.צ, isosceles triangle, parallel lines…), so the weak student always has a type where they are at Level 2 or 3 — a visible win.

---

## (D) Hint ladder and wrong-answer feedback [design, from findings 2, 10, 11, 15]

### Hint ladder (same three rungs everywhere)
| Rung | Name on the button | What happens | Cost |
|---|---|---|---|
| 1 | **רמז** (where to look) | no new text if possible: the relevant parts pulse in the drawing; one line: "הסתכל על הצלע המשותפת" / "מה עוד לא השתמשנו מהנתון?" | free |
| 2 | **עוד רמז** (which rule) | names the idea with a tiny figure: "זווית בין שתי צלעות שוות → צ.ז.צ"; narrows the bank to 3 chips | free |
| 3 | **הראה לי** (the step) | fills the row, then asks one "why" tap (which earlier rows does it rely on?) so it works as a worked example | step counts as assisted |

- Rung 3 unlocks ~4–5 seconds after rung 2 (stops the race to the answer; hint misuse was 36% of actions in the geometry tutor).
- At Level 1 the app offers rung 1 by itself after the first wrong try; at Levels 2–3 the student asks.
- After a show-me, the next proof of that type starts with that same step as a gap (immediate second chance).

### Wrong-answer feedback: name the kind of mistake, show it in the drawing, keep it to one line
Max two tries per step; after the second miss the app explains and fills the step (assisted). Never a bare ✗.

| The student did | One-line feedback (Hebrew draft) | In the drawing |
|---|---|---|
| used the צ״ל as a known fact | "זה מה שצריך להוכיח — עוד אי אפשר להשתמש בו" | target stays grey with lock, shakes |
| picked a fact that only looks true | "זה נראה כך בשרטוט, אבל לא נתון ולא הוכח" | that part gets a red "?" (no tick mark) |
| true statement, wrong reason | "הטענה נכונה. הנימוק לא מתאים — מאיפה אנחנו יודעים את זה?" | parts stay highlighted |
| reason is the converse | "זה המשפט ההפוך: הוא אומר 'אם… אז…' בכיוון השני" | both directions shown as two tiny arrows |
| correct but too early | "נכון, אבל קודם צריך להראות עוד משהו" | missing prerequisite pulses red |
| wrong congruence theorem | "ב־צ.ז.צ הזווית חייבת להיות בין שתי הצלעות" | the three marked parts light in order |
| wrong matching of vertices | "A מתאים ל־D. בדוק את הסדר" | matching vertices pulse in the same colour |
| vague reason (e.g. "הגדרה") | not possible — the bank only has exact reasons | — |

After a correct step: no praise text; the tick mark draws itself in the drawing and the row locks (the reward is the drawing filling up). At the end of the proof the two triangles "snap" together once.

---

## (E) Top 8 mechanics to steal

| # | Mechanic | From | Evidence / status |
|---|---|---|---|
| 1 | **Marks appear in the drawing only when a row is justified; blue = now, black = relies on, red = missing** | Ender (research prototype, 2026) | [read] 80.5% vs 58.2% |
| 2 | **Shuffled ready-made proof lines to order, with 1–2 distractors, graded automatically, several orders accepted** | Proof Blocks (UIUC, Poulsen) | [read] same learning, 4× faster |
| 3 | **Pick the reason for every step from a rule list** | Geometry Cognitive Tutor (Aleven & Koedinger) | [abstract] deeper understanding |
| 4 | **Tap shapes in the figure to "claim" a fact; a proved property becomes a visible glow/colour on the figure; theorems are unlocked as "powers"** | DragonBox Elements (now Kahoot! Geometry) | mechanics [memory]; store page confirms 110+ levels built on Euclid's proofs; no learning study found. https://dragonbox.com/products/elements |
| 5 | **Skill states per skill: Familiar → Proficient → Mastered, with "mastered" only on a later mixed test, and gentle demotion** | Khan Academy | [abstract] help-centre rules |
| 6 | **Per-step check with "this step is right, but show more first"; hints never cost points** | Mathspace | [abstract] https://mathspace.co/au ; student guide via search |
| 7 | **Snap-to-point (no aiming), stars for a cleaner solution, an "explore" mode, hints that don't give it all away** | Euclidea | [abstract] store listing: 156 levels, auto-pinning, L/E/V stars. Warning from its reviews: star-gated progress frustrates. https://apps.apple.com/app/id927914361 |
| 8 | **Flow-chart ("bubbles") view of the same proof: three facts flow into the congruence bubble, which flows into the conclusion** | Miyazaki/Fujita/Jones research + Israeli curriculum | [abstract] + [read]; use as a *view* of the finished proof at Levels 1–2, not as the main input |

Also worth taking:
- **Short sessions and one idea per screen** (Brilliant: ~15-minute lessons, "learn by doing"; Duolingo: start easy, build up). [abstract] https://brilliant.org/help/why-brilliant/ ; https://blog.duolingo.com/duolingo-teaching-method . Streak pressure is criticised; keep it soft.
- **Accept many valid paths** (DeltaMath does; its fixed vertex order and auto-marking are what teachers disliked). [read, tools review]
- **Diagram configurations** (Koedinger & Anderson's expert model: experts recognise whole patterns — shared side, vertical angles, bisector — and each pattern cues a rule). Use as the content of hint rung 1 and of Level-0 task 4. [abstract/memory] https://dc2.philarchive.org/rec/KOEAPA
- **Israeli products:** I found no Israeli product that practises proofs step-by-step with reasons on a phone. What exists: Hebrew GeoGebra applets on congruence (https://www.geogebra.org/m/cJztFBBj), ORT worksheets, the Ministry's applets on the "pop" portal. I did not check GOOL, Yoel Geva, Ofek/CET or Matific from the inside (search returned nothing specific) — this looks like an open gap, but that is unverified.

---

## (F) Pitfalls to avoid

1. **Guessable menus.** 4 fixed options = finished by elimination without reading (IXL finding). Use 6–8 reasons at Level 2+, include the converse and a "looks true" option, cap at 2 tries, and never let the same wrong pick be retried for free.
2. **A drawing that scrolls away or cannot be touched.** Biggest gap in today's tools. Keep it sticky; every row must point into it.
3. **Marking the drawing for the student at Levels 2–3.** Teachers want the student to mark, and only after justifying. Auto-marks are fine at Level 1 only.
4. **Teaching proof-writing backwards.** Backward chaining made students write unproved needs as facts. Backward = one planning question, never the order of the rows.
5. **Fixed fading for everyone.** Too slow for strong students (they get bored and worse — expertise reversal), too fast for weak ones. Level per proof type, per student, with the fast track.
6. **Reset-to-zero streak rules** ("3 in a row") as the only gate: one slip erases everything and feels unfair. Use "3 of the last 4".
7. **Endless repetition when stuck.** After 6 tries without progress, change the task (Level 0 sub-skill), not the amount.
8. **Blocks/tiles without an example first.** Proof Blocks worked after reading; cold, they work less well. Every new proof type opens with a Level-1 example.
9. **Only congruence, only one format.** Flow-chart-only students came to think every proof needs congruence; two-column-only hides how lines depend on each other. Mix proof types at Level 3 and offer the bubble view.
10. **Penalising hints, or making the last hint free and instant.** The first causes guessing instead of asking; the second causes click-through. Rungs 1–2 free, rung 3 delayed and marked "assisted".
11. **Right/wrong-only feedback.** Effect ~0.05 vs ~0.49 for explained feedback. Always name the kind of mistake.
12. **Accidental difficulty.** Forcing a vertex order, typing symbols, long theorem names, inconsistent names for the same object. Accept any consistent order; one fixed short name per reason across the whole site.
13. **Trusting the eye.** Never draw the figure so that un-given things look exactly equal *and* accept them; and include some figures where the tempting "looks equal" fact is false or unneeded.
14. **Praise noise.** Confetti on every row hides the structure. One calm reward per proof.
15. **Over-reading the research.** Proof Blocks (university, induction), Ender (12 students), the "85% rule" (derived for simple two-choice tasks, not school maths — https://pmc.ncbi.nlm.nih.gov/articles/PMC6831579) are hints, not guarantees. Log step-level data from day one and tune the numbers in (C).

---

## Phone and Hebrew reading rules (item 5 of the brief) [design + sources]

- **Maths is always left-to-right inside Hebrew.** Hebrew mathematical writing keeps formulas LTR (W3C i18n discussion: https://lists.w3.org/Archives/Public/public-i18n-bidi/2010JulSep/0002.html); the bidi algorithm cannot know a "=" or "+" belongs to an LTR phrase, so wrap every statement in an isolated LTR island (`<bdi dir="ltr">` / `unicode-bidi: isolate`) — https://www.w3.org/International/articles/inline-bidi-markup/ . Never mix a Hebrew word inside a formula island; put the Hebrew word before it ("לכן" then the island).
- **One fact per row, at most ~2 short lines.** Statement on its own line (LTR, larger, tabular digits and letters), reason as a chip under it (Hebrew, smaller). Row number on the right.
- **Colour = identity.** Each pair of equal parts gets one colour used in three places at once: the part in the drawing, the letters in the statement, the dot on the reason chip. Max 3 pair colours per proof + one neutral for the shared side. Always pair colour with tick-mark count (1, 2, 3 ticks; arcs for angles) so it works for colour-blind students and in print.
- **Focus tint.** The triangle(s) the current row speaks about are filled lightly; everything else in the drawing drops to ~40% strength. Overlapping triangles: offer a "pull apart" tap that slides the two triangles side by side and back (teachers do this with tracing paper — tools review).
- **Drawing stays visible.** Sticky top; when the answer tray opens, the drawing shrinks but never leaves the screen; the tray never covers the row being answered.
- **Thumb zone.** Chips and tiles at the bottom, min 44 px tall, short labels (צ.ז.צ, "זוויות קודקודיות", "צלע משותפת", "נתון").
- **Numbered order next to colour** (colour alone does not guide the sequence — finding 13).
- **Letters on the drawing** large, with a white halo, never sitting on a line.

---

## Source list (all links used)

Research on learning and proof
- Ministry of Education, grade 8 geometry plan: https://meyda.education.gov.il/files/Pop/0files/matmatika/Chativat-Beynayim/curriculum/updating/geometry_8.pdf
- Cirillo & Hummer 2021: https://cadrek12.org/sites/default/files/Cirillo___Hummer_2021.pdf · https://link.springer.com/doi/10.1007/s11858-021-01221-w
- Cirillo & Herbst, authentic proof practices: https://openjournals.libs.uga.edu/tme/article/view/1964
- Renkl/Atkinson fading: https://escholarship.org/content/qt81b9j9hs/qt81b9j9hs.pdf · https://asu.elsevierpure.com/en/publications/transitioning-from-studying-examples-to-solving-problems-effects-/
- Salden et al. 2010 adaptive fading: https://link.springer.com/doi/10.1007/s11251-009-9107-8
- Reiss, Heinze, Renkl & Groß 2008: https://link.springer.com/article/10.1007/s11858-008-0105-0
- Aleven & Koedinger self-explanation: https://pact.cs.cmu.edu/koedinger/pubs/Aleven-et-al-AIED99.pdf · https://serc.carleton.edu/resources/40402.html
- Matsuda & VanLehn 2005: https://noborumatsuda.github.io/Doc/AIED05/index.htm
- Koedinger & Anderson diagram configurations: https://dc2.philarchive.org/rec/KOEAPA
- Miyazaki, Fujita & Jones flow-chart proofs: https://eprints.soton.ac.uk/445740 · https://eprints.soton.ac.uk/445743
- Senk / van Hiele: https://ucsmp.uchicago.edu/resources/van-hiele · https://en.wikipedia.org/wiki/Van_Hiele_model
- Duval: https://link.springer.com/article/10.1007/s10649-024-10317-5 · https://eprints.soton.ac.uk/41308/01/Jones_BSRLM_18_1998.pdf
- Weber 2001, "Student difficulties in constructing proofs: the need for strategic knowledge", Educational Studies in Mathematics 48(1) (only the citation was seen; link is the DOI from memory, not opened): https://doi.org/10.1023/A:1015535614355
- Split attention / colour coding: https://tecfa.unige.ch/tecfa/teaching/methodo/Kalyuga99.pdf · https://en.wikipedia.org/wiki/Split-attention_effect
- Weizmann material on wrong assumptions in proofs (Hebrew): https://stwww1.weizmann.ac.il/math-rehovot/wp-content/uploads/sites/6/2016/09/Proofs-Nurit.pdf

Interaction designs and tools
- Proof Blocks: https://arxiv.org/pdf/2211.09609 · https://arxiv.org/pdf/2106.11032 · https://arxiv.org/pdf/2311.00792
- Ender: https://arxiv.org/html/2611.13368
- Teaching Geometric Proof with Tech (33 tools, 18 teachers): https://arxiv.org/html/2608.25117
- QED-Tutrix: https://arxiv.org/pdf/1803.01468
- DragonBox Elements: https://dragonbox.com/products/elements · Euclidea: https://apps.apple.com/app/id927914361 · Mathspace: https://mathspace.co/au · Brilliant: https://brilliant.org/help/why-brilliant/ · Duolingo method: https://blog.duolingo.com/duolingo-teaching-method · Hebrew GeoGebra congruence: https://www.geogebra.org/m/cJztFBBj

Mastery, hints, feedback
- Pelánek, mastery criteria: https://www.fi.muni.cz/~xpelanek/publications/mastery-modeling.pdf
- Wheel-spinning: https://files.eric.ed.gov/fulltext/ED594575.pdf · https://www.edutopia.org/article/difference-between-productive-struggle-and-spinning-your-wheels
- Khan mastery levels: https://support.khanacademy.org/hc/en-us/articles/5548760867853
- 85% rule (and its limits): https://pmc.ncbi.nlm.nih.gov/articles/PMC6831579
- Hint misuse: https://learnlab.org/research/wiki/index.php/Help_abuse · bottom-out hints as worked examples: https://www.cmu.edu/dietrich/philosophy/docs/scheines/Shih_Koedinger_Scheines_2008_EDM.pdf · https://www.cs.cmu.edu/afs/cs.cmu.edu/Web/People/bmclaren/pubs/AnEtAl-RevisitingTheHintButton-LAK2026.pdf
- Feedback meta-analysis (Van der Kleij 2015): https://doi.org/10.3102/0034654314564881

RTL + maths
- https://www.w3.org/International/articles/inline-bidi-markup/ · https://lists.w3.org/Archives/Public/public-i18n-bidi/2010JulSep/0002.html · https://developer.mozilla.org/en-US/docs/Web/MathML/Reference/Global_attributes/dir
