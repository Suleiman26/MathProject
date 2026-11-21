# Proofs section ("הוכחות"): design spec, phase 1 (2026-11-21)

Status: design, nothing built. Hidden section; the maths waits for Sulaiman's approval.
Inputs (session scratchpad, folder
`/private/tmp/claude-501/-Users-abedshalgam-MathProject/55d7e78f-fe67-49b4-8344-c1ef758d2577/scratchpad/proofs/`):
`plan.html` (the plan + clickable mockup Abed liked), `research-pedagogy.md`, `curriculum-path.md`,
`codebase-fit.md`, `challenge.md` (the critique this spec answers). The scratchpad can be cleared; this file must
stand alone.

Every change against the approved plan is marked **(upgrade: …)**. Hebrew texts in this file are drafts
until Sulaiman approves them.

---

## 1. Intent and why

Abed (translated): proofs are hard; here **every student, even a very weak one, must find the path to success**.
Guide a lot at first, then less, then less. Three levels. Level up per proof type by % correct. It must look
really good and be very easy to understand. The proofs section must be a real strength of the app. The right
questions in the right order.

Why it is worth doing well: the Ministry's grade-8 plan starts deductive geometry at triangle congruence, and
that is where students break. Research on who succeeds (Cirillo & Hummer 2021) points at a few teachable
habits: use the given, mark the drawing, name exact reasons, keep a chain, never take a fact from how the
drawing looks. No Israeli product was found that practises proofs step by step on a phone (not fully verified).

**The one idea of the section:** *the drawing fills up as the proof grows.* A mark appears in the drawing only
when a row is justified; at the end one triangle moves onto the other. The screen never changes between
levels; only who does the work changes (app → shared → student).

## 2. Goals, non-goals, anti-goals

**Goals (phase 1)**
1. A weak grade-8 student can always finish a proof and always has a next step that works.
2. A strong student reaches Level 3 of a type in about 6 proofs.
3. A student who passes Level 3 can write the same kind of proof on paper in the form teachers mark.
4. Any mathematically valid row order, statement form and accepted reason is marked right.
5. First-class on a 375 pt phone; correct right-to-left page with left-to-right maths; usable without colour,
   without motion, by keyboard and by screen reader.
6. Zero database changes; zero edits to Sulaiman's `Topic.jsx` files.

**Non-goals (phase 1)**: free typing; grade-9 content; parallel-line proofs; overlapping triangles; number
answers; "is isosceles" conclusions; bubble (flow-chart) view; mixed sets and spaced review; home railway,
catalog, Google; teacher dashboards.

**Anti-goals (never)**
- A student blocked with nothing to do, or failing the same thing more than twice with no change of help.
- Marking a correct idea wrong (other order, other valid reason, a mis-tap, a true statement we have no reason for).
- Streaks, timers, confetti per row, lives, "you lost".
- A drawing that shows as known something that is not known.
- A level-up that can be reached by pressing hints.
- Inventing maths, wording or thresholds without Sulaiman seeing them.

## 3. Constraints (project rules)

| Rule | Detail |
|---|---|
| Own folder | Everything in `src/topics/proofs/` (+ `app/dev/proofs/page.tsx`, `src/dev/ProofsLab.jsx`). Three hand-added lines in `src/topics/registry.js` (TOPICS, LOADERS, STYLES) with the same warning comment as `new`. No other project file changes in phase 1. |
| Sulaiman's code | Never touch anything between `BEGIN ORIGINAL` / `END ORIGINAL`. Read `triangles/Topic.jsx` drawing helpers for ideas only. `python3 tools/verify-logic.py` must still say "math and text untouched". |
| CSS | Prefix `pf-` for every class, keyframe and custom property, scoped under `#root`. **No generic `@property`** (only prefixed, e.g. `--pf-…`). Layout in `@layer legacy`, look from `mp.css` tokens. Font Rubik (already global). No letter-spacing on Hebrew. |
| Colour | `data-topic="orange"` (the coral geometry accent, `--a-50…--a-900`). Coral is used only for "now" (active row, primary button) and "goal". Green/red only for right/wrong. |
| Hidden | Reachable only at `/topics/proofs`. Not in `src/home/catalog.js`, not in `src/home/chapters.js`, no link from home. `noindex, nofollow` on the page; not in any sitemap. A "note for the team" strip like the `new` module. |
| Tracking | Proof type = chapter button (`.ch-btn`, text `"<n>. <name>"`); level = sub-tab (`.sub-tab`). The runtime then stores every decision as `chapter = "<type> › <level>"` with no new code (`src/lib/mp-runtime.js`). |
| Saving | Guests: `localStorage`. Signed-in: `localStorage` per user + level restored from existing `account_progress` rows. No migration. |
| Re-use | `M` / `Rich` from `src/topics/new/rich.jsx`, vector maths + `textW` from `src/topics/new/chapters/geometry/geo.js`, palette from `figs-kit.js`, `seeded` / `makeR` from `src/topics/new/core.js`, `useAccount` / `accountApi` from `src/lib/account.js`. Do not import duel CSS; build a small `pf-` sheet if needed. |
| Design rules | DESIGN.md: 40 px minimum for anything pressed, labels never on a line (place by measuring), motion = transform/opacity only, reduced motion = no motion. No emoji. |
| Checks before done | `node --test src/topics/proofs/*.test.mjs`, `python3 tools/verify-logic.py`, `npx next build`, iPhone-size scroll video reviewed frame by frame, scroll smoothness in WebKit down and up, every menu opened. |
| Deploy | Only when Abed asks (mathix steps in CLAUDE.md). Keep all code under `src/` (`.vercelignore`). |

## 4. Approaches considered

| | A. One screen, three fading levels (the plan) | B. One invisible "help dial" | C. Ministry format ladder as separate exercise kinds |
|---|---|---|---|
| What | Same screen always. L1 complete a written proof → L2 order ready lines → L3 build lines. Mastery per type. | No levels. The app adds or removes help per step from the student's own results. | Four separate activities: find the wrong line / complete / order / write. |
| Good | Easy to explain ("3 levels"), visible progress, one screen to learn, matches the Ministry's "complete → write". | Best fit to each student (adaptive fading beat fixed fading in the Geometry Tutor, Salden 2010). | Most variety; "who is right" items fit weak students. |
| Cost | Fixed steps can be too big for weak and too slow for strong students. | Progress is invisible; hard to explain; hard to test; not "3 levels". | Four screens to build, learn and keep beautiful. |

**Chosen: A** (Abed's pick), with two things borrowed: from B, a small support step **inside** each level
(variants A/B, section 7) and a rescue ladder driven by the student's own errors; from C, short single-skill
warm-up tasks. **(upgrade: A/B variants + rescue ladder)**

## 5. Learning model in one table

| | Warm-up "חימום" | Level 1 "רמה 1" | Level 2 "רמה 2" | Level 3 "רמה 3" |
|---|---|---|---|---|
| Idea | one small skill, 20–40 s | the proof is written; complete it | order ready lines | build the lines |
| Statements | — | written | tiles | tap the drawing |
| Order | — | given | student's | student's |
| Reasons | — | 3–4 chips, some rows | 6–8 chips, every row | all reasons, two-step pick |
| Marks in drawing | per task | drawn by the app on each row | drawn when a row is justified | same |
| Hints | explanation after a miss | offered after a miss | on request | on request; first miss = short |

Rules that hold everywhere:
- Forward order only. Backward thinking appears as one unscored planning question, never as row order.
- One fact per row. Each row = statement (left-to-right maths) + reason.
- The goal ("צריך להוכיח") is visibly "not known yet" until its row is justified.
- No typing at any level.

## 6. Phase-1 content

### 6.1 The four proof types (chapter buttons — these texts are database keys, keep them stable)

| Button text | Curriculum skill | What the student learns | Rows |
|---|---|---|---|
| `1. קוראים את הנתון` | 3 | From a sentence ("AD תיכון") to the right equality and its reason | 2 independent |
| `2. מחפיפה לשוויונות` | 4 (Ministry step 1) | Given △≅△ in vertex order, which parts are equal | 3 independent |
| `3. הוכחת חפיפה` | 6 (Ministry step 2) | Three equalities → the congruence, with the right theorem | 4 |
| `4. חפיפה ואז מסקנה` | 8 (Ministry step 4) | Congruence, then one equality that follows from it | 5 |

Sub-tab texts (also keys): `חימום`, `רמה 1`, `רמה 2`, `רמה 3`.

Types are **not** locked against each other; the landing shows the recommended order and a "next" pointer.
Levels inside a type are locked until earned (approved decision).

Skill 5 (which theorem; "not enough information") is not a phase-1 type, but type 3 needs it, so its core lives
in the warm-up of type 3 (W4 below). Skill 7 (hidden datum) is phase 2, so type 4 here never needs a fact that
must be proved first. **(upgrade: skill-5 core in the warm-up; type 4 limited to Ministry step 4)**

### 6.2 Statement kinds (only three in phase 1) **(upgrade: scope cut)**

| Kind | Shown as | Normal form (for comparing) |
|---|---|---|
| segment = segment | `AO = OB` | unordered pair of segments; a segment = unordered pair of points |
| angle = angle | `∢AOC = ∢BOD` (altitude rows show `∢ADB = ∢ADC = 90°`) | unordered pair of angles; an angle = vertex + two **rays** (so ∢OAC ≡ ∢BAC when O is on AB) |
| triangle ≅ triangle | `△AOC ≅ △BOD` | a matching of three vertex pairs; all 6 consistent orders and both sides-first are the same statement |

### 6.3 Reasons used in phase 1

Short = the chip. Full = shown in the finished row's detail, the why-line and the notebook page.

| id | Short (chip) | Full | Source of wording |
|---|---|---|---|
| `given` | נתון | נתון | unconfirmed (universal) |
| `common-side` | צלע משותפת | צלע משותפת | unconfirmed |
| `vertical` | זוויות קודקודיות | זוויות קודקודיות שוות זו לזו | Ministry list (spelled קדקודיות there) |
| `bisector` | הגדרת חוצה זווית | חוצה זווית מחלק את הזווית לשתי זוויות שוות | unconfirmed wording |
| `median` | הגדרת תיכון | תיכון מחבר קודקוד עם אמצע הצלע שמולו | unconfirmed wording |
| `midpoint` | אמצע קטע | אמצע קטע מחלק אותו לשני קטעים שווים | unconfirmed |
| `altitude` | הגדרת גובה | גובה מאונך לצלע | unconfirmed wording |
| `sas` | צ.ז.צ | משפט חפיפה צ.ז.צ | Ministry |
| `asa` | ז.צ.ז | משפט חפיפה ז.צ.ז | Ministry |
| `sss` | צ.צ.צ | משפט חפיפה צ.צ.צ | Ministry |
| `cp-sides` | צלעות מתאימות במשולשים חופפים | צלעות מתאימות במשולשים חופפים שוות | unconfirmed (universal) |
| `cp-angles` | זוויות מתאימות במשולשים חופפים | זוויות מתאימות במשולשים חופפים שוות | unconfirmed (universal) |
| `common-angle` | זווית משותפת | — | wrong-answer chip only in phase 1 |
| `alternate` | זוויות מתחלפות בין ישרים מקבילים | — | wrong-answer chip only, only on the X figure |

- The chip "זוויות מתאימות בין ישרים מקבילים" is **not** in phase 1: at 375 pt the mockup showed two chips
  both reading "זוויות מתאימות". From phase 2 the two must read differently in full. **(upgrade)**
- No ז.ז.צ and no צ.צ.ז in this section (Ministry way: third angle, then ז.צ.ז). See open points.
- **Accepted alternatives:** when the question gives a fact in words ("O אמצע AB", "AD חוצה את ∢BAC"), the row
  accepts both the definition and `given`. When it is given as an equality, only `given`. **(upgrade)**

Level-3 groups for the two-step pick ("מאיפה יודעים?"):
`כתוב בשאלה` → נתון · `הגדרה` → חוצה זווית, תיכון, אמצע קטע, גובה · `רואים בציור` → צלע משותפת, זווית משותפת,
זוויות קודקודיות · `משפט חפיפה` → צ.ז.צ, ז.צ.ז, צ.צ.צ · `נובע מהחפיפה` → צלעות מתאימות…, זוויות מתאימות….

### 6.4 Figure families

Letters below are the template's roles; the generator renames them (6.6).

| Family | Picture | Free fact (seen, not given) | Congruence variants (given → theorem) |
|---|---|---|---|
| **X** two segments AB, CD crossing at O; triangles AOC, BOD | bow-tie | ∢AOC = ∢BOD (vertical) | X-SAS: AO = OB, CO = OD · X-ASA: AO = OB, ∢OAC = ∢OBD |
| **K** triangles ABC, ADC on both sides of a shared side AC | kite | AC = AC (common) | K-SSS: AB = AD, CB = CD · K-SAS: AB = AD, ∢BAC = ∢DAC · K-ASA: ∢BAC = ∢DAC, ∢BCA = ∢DCA |
| **Z** triangles ABC, CDA sharing the diagonal AC (one is the other turned half-way round) | slanted four-sided shape | AC = CA (common) | Z-SSS: AB = CD, BC = DA · Z-SAS: AB = CD, ∢BAC = ∢DCA · Z-ASA: ∢BAC = ∢DCA, ∢BCA = ∢DAC |
| **T** triangle ABC, D on BC; triangles ABD, ACD share AD | split triangle | AD = AD (common) | T-SSS: AB = AC, BD = DC · T-SAS: AB = AC, ∢BAD = ∢CAD · T-ASA: ∢BAD = ∢CAD, ∢ADB = ∢ADC |
| **2** two separate triangles | side by side, second one turned or mirrored | none (all three given) | 2-SAS, 2-ASA, 2-SSS |

Given facts may be worded as equalities or in words where it fits (K-SAS: "AC חוצה את ∢BAD"; T-SSS: "AD תיכון
לצלע BC" or "D אמצע BC"; T-SAS: "AD חוצה את ∢BAC"; T-ASA: "AD חוצה את ∢BAC" + "AD גובה לצלע BC"; X-SAS: "O אמצע
AB" / "הקטעים AB ו-CD חוצים זה את זה"). Word-givens appear only from variant B on, and only after the student
met that word in type 1 or in a warm-up.

**Hard rule (tested): no family predicts the theorem** — every family except X has all three theorems, X has
two. Two proofs in a row never share family + theorem. Family 2 is used only for A variants (entry proofs).
**(upgrade: variety inventory; the plan showed one problem)**

Exactly the three needed equalities are known in every phase-1 template, so one theorem fits. The engine still
supports several valid justifications per fact (section 10) and is tested with one made-up over-determined proof.

### 6.5 Templates per type

**Type 1 `קוראים את הנתון` — 10 templates.** A figure + two sentences → two rows. Triangles here are drawn
clearly **not** isosceles, so only what the sentence says is true (the trap "תיכון = equal angles" is visibly false).

| # | Figure | Sentences → statements (accepted reasons) |
|---|---|---|
| 1-a | triangle ABC, D on BC, E on AC | "AD חוצה את ∢BAC" → ∢BAD = ∢DAC (`bisector`, `given`) · "BE תיכון לצלע AC" → AE = EC (`median`, `given`) |
| 1-b | same | "AD גובה לצלע BC" → ∢ADB = ∢ADC = 90° (`altitude`, `given`) · "BE חוצה את ∢ABC" → ∢ABE = ∢EBC |
| 1-c | same | "AD תיכון לצלע BC" → BD = DC · "BE גובה לצלע AC" → ∢BEA = ∢BEC = 90° |
| 1-d | triangle ABC, D on BC, E on AB | "D אמצע הצלע BC" → BD = DC (`midpoint`, `given`) · "CE חוצה את ∢ACB" → ∢ACE = ∢ECB |
| 1-e | X | "O אמצע הקטע AB" → AO = OB · "O אמצע הקטע CD" → CO = OD |
| 1-f | X | "הקטעים AB ו-CD חוצים זה את זה בנקודה O" → AO = OB and CO = OD (`midpoint`, `given`) |
| 1-g | K | "AC חוצה את ∢BAD" → ∢BAC = ∢DAC · "AC חוצה את ∢BCD" → ∢BCA = ∢DCA |
| 1-h | K (drawn not symmetric) | "AC חוצה את ∢BAD" → ∢BAC = ∢DAC · "AB = AD" (a plain equality among the sentences) → AB = AD (`given` only) |
| 1-i | triangle ABC (clearly not isosceles), D on BC, E on AB | "AD תיכון לצלע BC" → BD = DC · "CE גובה לצלע AB" → ∢CEA = ∢CEB = 90°. Trap tile: ∢BAD = ∢CAD (a median is not a bisector) |
| 1-j | triangle ABC with two altitudes AD, BE | "AD גובה לצלע BC", "BE גובה לצלע AC" → two right-angle rows |

What varies: letters, which vertex the line comes from, turn/mirror, triangle shape, order of the two sentences.
Wrong tiles: what the *other* two words would give (median → the angle equality; bisector → the segment equality;
altitude → the segment equality) and one letter-swap.

**Type 2 `מחפיפה לשוויונות` — 6 templates.** Given: `△… ≅ △…` "(החפיפה לפי סדר הקודקודים)". No marks in the
drawing at the start. The task asks for the partner of three named parts (at least one side and one angle).

| # | Figure | Point |
|---|---|---|
| 2-a | two separate triangles, names in ABC / DEF order | entry (A variants) |
| 2-b | separate, statement not alphabetical (△ABC ≅ △EFD) | must read the statement, not the alphabet |
| 2-c | separate, second triangle mirrored and turned | position in the drawing misleads |
| 2-d | X figure, given △AOC ≅ △BOD | a vertex matches itself |
| 2-e | K figure, given △ABC ≅ △ADC | two vertices match themselves |
| 2-f | Z figure, given △ABC ≅ △CDA | A ↔ C, C ↔ A |

What varies: letters (also sets like K, P, N / S, T, R), which three parts are asked, turn/mirror, shapes.
Wrong tiles: the part in the same *position in the drawing*; the part with the next letter; angle ↔ side mix-up.
The three equalities that were not asked are "true but not asked" (neutral, never a mistake).

**Type 3 `הוכחת חפיפה` — 14 templates** = all variants of section 6.4 (X: 2, K: 3, Z: 3, T: 3, 2: 3).
Given: two facts (family 2: three). Goal: the congruence. Canonical rows: fact, fact, fact, congruence.
Accepted orders: the three facts in any order; congruence after all three.

**Type 4 `חפיפה ואז מסקנה` — 33 templates** = the 11 variants of X, K, Z, T × 3 goals. After any phase-1
congruence, three matching pairs are still unknown; each is a possible goal:

| Variant | Possible goals |
|---|---|
| X-SAS | AC = BD · ∢OAC = ∢OBD · ∢OCA = ∢ODB |
| X-ASA | CO = OD · AC = BD · ∢OCA = ∢ODB |
| K-SSS | ∢BAC = ∢DAC · ∢BCA = ∢DCA · ∢ABC = ∢ADC |
| K-SAS | CB = CD · ∢BCA = ∢DCA · ∢ABC = ∢ADC |
| K-ASA | AB = AD · CB = CD · ∢ABC = ∢ADC |
| Z-SSS | ∢BAC = ∢DCA · ∢BCA = ∢DAC · ∢ABC = ∢CDA |
| Z-SAS | BC = DA · ∢BCA = ∢DAC · ∢ABC = ∢CDA |
| Z-ASA | AB = CD · BC = DA · ∢ABC = ∢CDA |
| T-SSS | ∢ABD = ∢ACD · ∢BAD = ∢CAD · ∢ADB = ∢ADC |
| T-SAS | BD = DC · ∢ABD = ∢ACD · ∢ADB = ∢ADC |
| T-ASA | AB = AC · BD = DC · ∢ABD = ∢ACD |

Canonical rows: fact, fact, fact, congruence, conclusion. Accepted orders: facts in any order → congruence →
conclusion. The two unused consequences are "true but not needed". The first Level-1 proof of type 4 re-uses a
variant the student has already proved in type 3 when the record shows one (only the last row is new).

Sulaiman reviews templates, not instances: the dev page prints one sheet per type (figure, given, goal,
canonical proof, wrong tiles) — about 63 small cards.

### 6.6 What the generator varies, and what tests guarantee **(upgrade: "the drawing must not lie")**

`make(R, level, variant, avoid)` → problem. Seeded like the `new` module.
- **Names:** from letter sets without look-alikes (no I/l/O mix; O reserved for a crossing point; avoid sets that
  spell words). Type 2 uses non-alphabetical matchings on purpose.
- **Geometry:** side lengths and angles from ranges; then a turn in steps of 15° and an optional mirror; fitted
  into the stage by measuring (reuse `frame`).
- **Order:** order of given facts in the text; which triangle is named first.
- **Avoid:** the last 6 template ids of this student, and the last family + theorem.

Tests (3000 seeds per template per level, like `new.test.mjs`):
1. every stated fact is true in the coordinates (tolerance 1e-6 before rounding);
2. every pair of same-kind tappable parts that is **not** a listed fact differs by ≥ 8% (lengths) or ≥ 6°
   (angles) — so nothing false looks equal; listed consequences are the only "looks equal" pairs;
3. no angle within 6° of 90° unless it is a right-angle fact; no triangle within 8% of isosceles unless the template says so;
4. for `sas` the angle lies between the two sides in both triangles, for `asa` the side between the two angles,
   and the three premises agree with one vertex matching;
5. labels: none on a line, all inside the view box, none overlapping a tap target centre;
6. the canonical proof passes the checker; a shuffled valid order passes; each wrong tile is rejected with the intended kind;
7. variety: ≥ 12 visibly different instances per template; in 200 draws per type no family maps to a single theorem;
8. the page's chapter and sub-tab texts equal the constants in section 6.1.

## 7. Level mechanics, precisely

Each level has two variants. **A** = entry/support: the first proof at that level, and any proof served by the
rescue ladder. **B** = standard. The student never sees the letters. **(upgrade: fixes the Level 1 → 2 cliff)**

### 7.1 Warm-up ("חימום") **(upgrade: never blocks; diagnostic, not a streak)**

Seven single-skill task kinds, each 20–40 s, each with an explanation after a miss:

| id | Task | Used by type |
|---|---|---|
| W1 | "נתון: AO = OB. געו בציור בשני הקטעים האלה." (mark the given) | 1, 3 |
| W2 | "ידועה, או רק נראית כך?" for one statement | 3, 4 |
| W3 | "איזה שוויון רואים בציור בלי שהוא נתון?" (shared side / vertical angles) | 3 |
| W4 | "איזה משפט חפיפה מתאים לסימונים?" options צ.ז.צ / ז.צ.ז / צ.צ.צ / אי אפשר לקבוע — includes the two traps: angle not between the sides; three angle pairs | 3, 4 |
| W5 | "△ABC ≅ △EFD. איזה קודקוד מתאים לקודקוד B?" / which side matches | 2, 4 |
| W6 | "מותר כבר להשתמש בזה?" (the goal, or a consequence, before the congruence) | 4 |
| W7 | A word → what it gives ("AD תיכון לצלע BC" → pick the equality) | 1 |

Flow per type: 4 tasks from that type's kinds. All 4 right on the first try → "קדימה" → Level 1. A miss → after
the 4, two more tasks of each missed kind (pass a kind with 2 of its last 3 right). Hard cap: 8 tasks, then
Level 1 opens anyway. The warm-up tab stays available later and is where the rescue ladder sends students.
Warm-up results do not count toward levels.

### 7.2 Types 3 and 4 (real proofs)

| | Level 1-A (walk-through, once per type; not counted) | Level 1-B | Level 2-A | Level 2-B | Level 3-A | Level 3-B |
|---|---|---|---|---|---|---|
| Statements | all written | all written; from the 3rd counted proof one statement gap (pick the congruence line among 3 vertex orders, or the conclusion among 3) | given rows already placed and justified; the rest as tiles, **no wrong tiles** | all rows as shuffled tiles + 2 wrong tiles (kinds in 7.5) | tap two parts in the drawing → preview chip → confirm | same |
| Order | app steps row by row on "הבא" | given | any valid | any valid | any valid | any valid |
| Reasons | 1 gap: the theorem, 3 chips | every row that is not a plain-equality given: 2–4 gaps, 4 chips | every row the student places, 6 chips | every row, 8 chips | every row, two-step pick | same |
| Plan | type 4: unscored "באילו שני משולשים נמצאים …?" (tap two triangles) | type 4: same | type 4: same | type 4: same | one line: "קודם שלושה שוויונות, אחר כך החפיפה." | none |
| Unscored ties to the drawing | one "הראו בציור" tap; one "אילו שורות מובילות לחפיפה?" tap | — | — | — | — | — |
| Wrong answer | content feedback + hint 1 shown by itself | content feedback + hint 1 by itself | content feedback | content feedback | content feedback | first miss: short ("הנימוק לא מתאים. נסו שוב."), second: content |
| Why-line after a right row | yes | yes | yes | mark only | yes | mark only |
| Typical decisions | 1 | 3 / 4 | 4 / 6 | 8 / 10 | 8 / 10 + matching | 8 / 10 + matching |

(Decisions "a / b" = type 3 / type 4. A statement and its reason are two decisions.)

Level 3 details:
- **Selecting:** tap a part → it is selected (coral outline). Tap a second part of the same kind → a preview chip
  appears in the tray: `AO = OB` + button "להוסיף שורה". Only the confirmed statement is judged. Tapping a
  selected part again unselects it; a part of another kind starts a new selection. **(upgrade: a mis-tap is never a mistake)**
- **Near misses:** when a tap is within 22 px of two or more parts, a small chooser lists them ("הקטע AO",
  "הזווית ∢AOC").
- **"רשימת חלקים"** button in the tray: the same parts as chips, grouped קטעים / זוויות / משולשים. This is also the
  keyboard and screen-reader path.
- **Congruence statement:** tap the two triangles (their fills). The first is written `△AOC`; the student then
  taps the three vertices of the second triangle in matching order (slots fill left to right; "ביטול" clears).
  Any consistent matching is right. This is one decision. **(upgrade: replaces the one 3-option question)**
- In Level 2 the congruence tile is already written in a correct order.

### 7.3 Type 1 `קוראים את הנתון`

| | L1-A | L1-B | L2-A | L2-B | L3 |
|---|---|---|---|---|---|
| Per sentence | app shows sentence → lights the line in the drawing → statement appears; 1 gap | pick the statement from 3 chips; the reason then appears with its why-line | 4 tiles (2 right, 2 wrong): give each sentence its tile, then reason from 6 | 6 tiles, reason from 6 | tap the drawing to build the statement, then two-step reason |
| Decisions | 1 | 2 | 4 | 4 | 4 |

The active sentence is shown in the tray header and highlighted in the given strip.

### 7.4 Type 2 `מחפיפה לשוויונות`

| | L1-A | L1-B | L2-A | L2-B | L3 |
|---|---|---|---|---|---|
| Per asked part | walk-through with colour-linked letters in the statement `△ABC ≅ △EFD`; 1 gap | "AB = ▢": pick from the 3 parts of the other triangle; reason shown | tiles: 3 right + 1 wrong; reason from 4 | tiles: 3 right + 3 wrong; reason from 6 | tap the asked part and its partner in the drawing; two-step reason |
| Decisions | 1 | 3 | 6 | 6 | 6 |

Only in L1 the matching letters in the congruence statement carry the pair colour when the row is active
(position 1 ↔ position 1); from L2 the statement is plain.

### 7.5 Wrong tiles (Level 2-B) — chosen with intent

At most two, one each from: (1) the goal itself (types 3: the congruence is the goal and is simply "too early");
(2) a true consequence that is not known yet (looks equal in the drawing); (3) a false look-alike (letters
swapped, e.g. `AO = CO`), tested to be false. Evidence on distractors is mixed, so never more than two and none in A.

### 7.6 Marks, colours and the drawing

- Pair colours: blue, violet, teal — three different lightness steps — always together with a count: 1, 2, 3
  ticks for sides; 1, 2, 3 arcs for angles; a small square for 90°. Colour is never the only carrier.
- The same pair colour appears in three places: the parts in the drawing, the small glyph beside the finished
  row, and (L1 only) the letters of the active statement.
- A mark is drawn only when its row is justified. At L1 given rows arrive justified, so their marks are there
  from the start (drawn in during the 1-second opening).
- **Goal parts use a target style: dashed coral outline, no ticks, no arcs.** When the goal row is justified the
  outline becomes a normal mark. **(upgrade: in the mockup the goal sides showed three solid ticks before being proved)**
- "?" badges (red) appear for 2.5 s only when the student claims a "looks equal" fact.
- Focus: the parts of the active row are at full strength, the rest at ~55%.
- **Ending:** when the proof is done, one triangle moves onto the other by the real motion (X and Z: half turn;
  K and T: flip over the shared side; family 2: slide + turn/flip), 600 ms, once, then returns. This is the
  curriculum's own definition of congruent ("אפשר להניח את אחד מהם על האחר"). Types 1 and 2: a calm tick-draw
  only. Reduced motion: a soft tint, no movement. **(upgrade: the ending means something)**

### 7.7 The end of a proof

1. Last row justified → the tray shows one button: **"מ.ש.ל"**. The student taps it. **(upgrade: reliable win event + the way teachers end a proof)**
2. Ending motion (7.6), then the end card: result line, the four dots, and "כך כותבים את זה במחברת" —
   the proof as a page: `נתון:` … `צ"ל:` … then a true two-column table טענה | נימוק with full reason
   wording, ending in `מ.ש.ל`. **(upgrade: transfer to paper)**
3. Buttons: "הוכחה נוספת" (primary) · "סיום" (back to the landing). After every 3rd proof in one sitting the
   card says "סיימתם סבב של 3 הוכחות." so practice has a natural stop. **(upgrade)**

## 8. Mastery rule (per proof type, per student)

All numbers live in one constants block in `mastery.js`, each covered by a test; they are starting values to
tune with real data.

**Decision** = one statement choice or one reason choice. Each ends in exactly one state:

| State | Meaning |
|---|---|
| `solo` | right on the first try, no hint of rung 2 or 3 |
| `helped` | right on the first try after hint 2 |
| `missed` | at least one wrong try, then right |
| `filled` | the app filled it (hint 3, or two wrong tries) |

Neutral outcomes (already written, true but not needed, true but no reason in our list, cancelled selection)
are not decisions and never count. "Too early" counts as a wrong try for that row's statement.

**Clean proof** = no `filled` decision AND `solo` ≥ 80% of the proof's decisions.
(3–4 decisions: all solo. 5–9: one slip. 10+: two.) **(upgrade: one definition instead of two rules that disagreed at Level 1; hint 2 no longer free for mastery)**

| Rule | Numbers |
|---|---|
| Level up | **3 clean proofs among the last 4** counted proofs at this level |
| Fast track | the first counted proofs at a level all **perfect** (every decision `solo`), at least 2 proofs and at least 6 decisions in total → level up at once **(upgrade: minimum evidence)** |
| Not counted | Level 1-A walk-through; rescue worked examples; warm-up |
| Never down | a level, once earned, is never taken away |
| Left in the middle | a proof left after a non-solo decision counts as not clean; left with none, it does not count. An open proof survives a refresh (`sessionStorage`). "הוכחה אחרת" (swap) is free only before the first non-solo decision **(upgrade)** |
| Type finished (phase 1) | Level 3 passed. "Mastered" (mixed set on a later day) is phase 4 |

What the student sees: four dots ("3 מתוך 4"), never a percentage. Plus a quiet second line that is true for
every student: "הוכחות שהשלמתם: 7", and, when true, "הפעם נעזרתם פחות מבפעם הקודמת."
**(upgrade: a student who needs help still sees real progress)**

### Rescue ladder (replaces "6 proofs, then warm-up") **(upgrade)**

Every wrong try carries an error kind: `goal-as-known`, `looks-equal`, `too-early`, `wrong-theorem`,
`wrong-matching`, `wrong-source` (given / seen / follows), `wrong-word` (median / bisector / altitude), `false-statement`.

| Trigger (at one level of one type) | What happens next |
|---|---|
| 2 counted proofs in a row not clean | a short card "נעצור רגע ונחזק דבר אחד." → 2 warm-up tasks of the kind mapped to the most frequent error (table below) → the next proof is variant A |
| 2 more in a row not clean | a fully worked example to step through (no gaps, with why-lines) → then variant A |
| 6 counted proofs at the level without levelling up | a kind card: "הסוג הזה עוד קשה, וזה בסדר." + a button to the previous type (or to this type's warm-up for type 1). The student may also continue |

Error kind → warm-up: `goal-as-known`, `too-early` → W6 · `looks-equal` → W2 · `wrong-theorem` → W4 ·
`wrong-matching` → W5 · `wrong-source` → W3 · `wrong-word` → W7 · `false-statement` → W1.

There is always a next action that ends in a finished proof (hint 3 completes any step; a helped proof still
ends with מ.ש.ל).

## 9. Hints and feedback

### 9.1 Hint ladder (same three rungs everywhere)

| Rung | Button | What happens | Effect on the decision |
|---|---|---|---|
| 1 | רמז | the relevant parts pulse in the drawing + one line that says where to look | none (free) |
| 2 | עוד רמז | names the **idea**, not the chip; dims the reasons to 3 | decision becomes `helped` **(upgrade: in the mockup this hint named the answer and was free)** |
| 3 | הראו לי | fills the step, shows the full reason and why-line, then asks one tap: "על אילו שורות זה נשען?" | `filled`; the proof is not clean |

- Rung 3 unlocks 4 s after rung 2 (a thin fill on the button shows the wait).
- Two wrong tries on one decision → the app explains and fills it (same as rung 3).
- Level 1: rung 1 appears by itself after the first wrong try.
- No tap for 20 s on a step (Levels 1–2): the hint button pulses once. No automatic text. **(upgrade: help avoidance)**
- After a filled step, the next proof of that type contains the same kind of decision (second chance soon).
- A wrong chip is disabled for that decision (no free repeat).

Hint texts by row role (drafts; `{…}` = left-to-right maths island):

| Row role | Rung 1 | Rung 2 |
|---|---|---|
| given (equality) | התחילו ממה שנתון. הסתכלו על החלקים המהבהבים. | השוויון הזה כתוב בשאלה. |
| given, not used yet | יש עוד נתון שלא השתמשנו בו. | חפשו בשורת הנתון מה עוד לא מסומן בציור. |
| given in words | קראו שוב את הנתון: מה המילה {word} אומרת? | למילה הזאת יש הגדרה. מה היא נותנת: קטעים שווים או זוויות שוות? |
| vertical angles | הסתכלו על הנקודה {O}. שני ישרים נחתכים שם. | שתי זוויות זו מול זו, בין שני ישרים נחתכים. |
| common side | יש צלע ששייכת לשני המשולשים. | צלע תמיד שווה לעצמה. |
| congruence | בציור מסומנים שלושה שוויונות. מה הם אומרים על שני המשולשים? | ספרו: כמה צלעות וכמה זוויות מסומנות, ומה נמצא בין מה? |
| vertex matching | הסתכלו על הסימונים: חלקים עם אותו סימון מתאימים זה לזה. | הקודקוד שמול הצלע עם קו אחד מתאים לקודקוד שמול הצלע השנייה עם קו אחד. |
| conclusion | המשולשים חופפים. הסתכלו על שני החלקים המהבהבים. | במשולשים חופפים, חלקים מתאימים שווים. אלה צלעות או זוויות? |
| type 2 partner | מצאו את האות {A} בכתיבת החפיפה. באיזה מקום היא כתובה? | האות שכתובה באותו מקום במשולש השני היא המתאימה. |

### 9.2 Feedback messages (drafts for Sulaiman; plural address, one sentence, never a bare ✗)

Rule for all texts: a Hebrew prefix is never glued to a maths island (write "לקודקוד {D}", not "ל-{D}").

**After a right answer** (why-line; shown at L1 and in A variants)

| Row role | Text |
|---|---|
| given | נכון. זה כתוב בנתון. |
| given in words | נכון. {word} — לכן {statement}. |
| vertical | נכון. שני ישרים נחתכים בנקודה {O}, והזוויות האלה זו מול זו. |
| common side | נכון. זו אותה צלע בשני המשולשים. |
| צ.ז.צ | נכון: צלע, הזווית שביניהן, צלע. ההתאמה: {A ↔ B}, {O ↔ O}, {C ↔ D}. |
| ז.צ.ז | נכון: זווית, הצלע שביניהן, זווית. ההתאמה: … |
| צ.צ.צ | נכון: שלוש צלעות שוות בהתאמה. ההתאמה: … |
| conclusion (side) | נכון. הצלעות {AC}, {BD} נמצאות מול זוויות שוות. אלה צלעות מתאימות. |
| conclusion (angle) | נכון. הזוויות {∢A}, {∢B} נמצאות מול צלעות שוות. אלה זוויות מתאימות. |
| type 2 | נכון. האותיות {A}, {E} כתובות באותו מקום בחפיפה. |

**Statement chosen** (kind → class → text)

| Case | Counts as | Text |
|---|---|---|
| already written | neutral | השורה הזו כבר כתובה. |
| the goal, before it can be proved | wrong try (`goal-as-known`) | זה מה שצריך להוכיח. אי אפשר להשתמש בו לפני שהוכחנו אותו. |
| the congruence, too early | wrong try (`too-early`) | נכון, אבל מוקדם מדי. לחפיפה צריך שלושה שוויונות. יש כרגע {n}. |
| a consequence of the congruence, too early | wrong try (`looks-equal`) | זה נראה כך בציור, אבל עוד לא ידוע. זה ינבע מהחפיפה, אחרי שנוכיח אותה. |
| true, provable now, not needed for the goal | neutral | נכון, אבל לא צריך את זה כדי להגיע למה שצריך להוכיח. |
| true in the figure, but no reason in our list proves it | neutral | ייתכן שזה נכון, אבל ברשימת הנימוקים שלנו אין נימוק שמוכיח את זה. נסו דרך אחרת. |
| false in this figure (segments) | wrong try (`false-statement`) | מהנתון אי אפשר לדעת שהקטעים {x}, {y} שווים. |
| false in this figure (angles) | wrong try (`false-statement`) | מהנתון אי אפשר לדעת שהזוויות {x}, {y} שוות. |
| letter-swap tile | wrong try (`false-statement`) | בדקו את האותיות. בנתון כתוב {given}. |
| type 1: wrong meaning of תיכון | wrong try (`wrong-word`) | תיכון מגיע לאמצע הצלע. הוא לא אומר שום דבר על הזוויות. |
| type 1: wrong meaning of חוצה זווית | wrong try (`wrong-word`) | חוצה זווית מחלק את הזווית לשתי זוויות שוות. הוא לא אומר שהקטעים שווים. |
| type 1: wrong meaning of גובה | wrong try (`wrong-word`) | גובה יוצר זווית ישרה עם הצלע. הוא לא בהכרח מגיע לאמצע שלה. |
| type 2: wrong partner | wrong try (`wrong-matching`) | בכתיבת החפיפה {A} כתובה במקום הראשון, וגם {E}. לכן הקודקוד {A} מתאים לקודקוד {E}. |
| type 2: true but not asked | neutral | נכון, אבל לא על זה שאלו. |
| vertex matching wrong | wrong try (`wrong-matching`) | בדקו את הסדר. הקטע {AO} שווה לקטע {OB}, ולכן הקודקוד {A} מתאים לקודקוד {B}. |
| vertex matching, shared vertex | wrong try (`wrong-matching`) | הנקודה {O} שייכת לשני המשולשים, והיא מתאימה לעצמה. |
| two parts of different kinds | — (new selection) | בוחרים שני חלקים מאותו סוג: שני קטעים, שתי זוויות או שני משולשים. |

**Reason chosen** (the statement is right, the reason is not)

| Row | Chosen | Kind | Text |
|---|---|---|---|
| given | זוויות קודקודיות (row is about segments) | `wrong-source` | אלה קטעים, לא זוויות. את השוויון הזה יודעים מהנתון. |
| given | צלע משותפת | `wrong-source` | צלע משותפת היא אותה צלע בשני המשולשים. כאן אלה שני חלקים שונים. |
| any single fact | a congruence theorem | `too-early` | משפט חפיפה מוכיח שמשולשים חופפים. כאן צריך נימוק לשוויון אחד. |
| any fact before the congruence | צלעות / זוויות מתאימות | `goal-as-known` | עוד לא הוכחנו חפיפה. אי אפשר להשתמש בה כנימוק. |
| seen in the drawing | נתון | `wrong-source` | זה לא כתוב בנתון. חפשו בציור: מאיפה יודעים את זה? |
| vertical | זוויות מתחלפות | `wrong-source` | הנימוק הזה דורש ישרים מקבילים, ואין כאן נתון כזה. |
| vertical | צלע / זווית משותפת | `wrong-source` | אלה שתי זוויות שונות, זו מול זו. אין כאן חלק משותף. |
| given in words | another definition | `wrong-word` | בנתון כתוב {word}. איזו הגדרה מתאימה למילה הזאת? |
| congruence | ז.צ.ז, but one angle pair | `wrong-theorem` | יש רק זוג זוויות אחד. במשפט ז.צ.ז צריך שני זוגות זוויות. |
| congruence | צ.צ.צ, but two side pairs | `wrong-theorem` | יש רק שני זוגות צלעות. במשפט צ.צ.צ צריך שלושה. |
| congruence | צ.ז.צ, but one side pair | `wrong-theorem` | יש רק זוג צלעות אחד. במשפט צ.ז.צ צריך שני זוגות צלעות. |
| congruence | ז.צ.ז / צ.ז.צ, but three side pairs | `wrong-theorem` | מסומנות שלוש צלעות ואף זווית. איזה משפט מתאים לזה? |
| congruence | נתון | `wrong-source` | החפיפה לא נתונה. מוכיחים אותה משלושת השוויונות. |
| congruence | צלעות / זוויות מתאימות | `wrong-source` | זה נימוק למה שנובע מהחפיפה, לא לחפיפה עצמה. |
| conclusion | נתון | `goal-as-known` | זה לא נתון. זה מה שצריך להוכיח, והוא נובע מהחפיפה. |
| conclusion | a congruence theorem | `wrong-source` | משפט החפיפה כבר הוכיח שהמשולשים חופפים. עכשיו צריך נימוק לשוויון שנובע מזה. |
| conclusion | the other "מתאימות" | `wrong-source` | כמעט. אלה {צלעות / זוויות}, לא {זוויות / צלעות}. |
| any | anything else | — | הטענה נכונה. הנימוק לא מתאים. מאיפה יודעים את זה? |
| Level 3-B, first miss | any | (kind kept) | הנימוק לא מתאים. נסו שוב. |

The `wrong-theorem` text is computed from what is marked (count of side pairs and angle pairs, and what lies
between what), not written per problem.

**Other texts**

| Where | Text |
|---|---|
| step filled by the app | מילאנו את הצעד הזה יחד. הנימוק: {full reason}. |
| end, clean | מ.ש.ל. הוכחה נקייה. |
| end, with help | מ.ש.ל. ההוכחה הושלמה. היה צעד שמילאנו יחד, ולכן היא לא נספרת כנקייה. הרמה לא יורדת. |
| level up | עליתם רמה. {type} · רמה {n} |
| type finished | בניתם הוכחות שלמות לבד. {type} · רמה 3 הושלמה. |
| self-comparison | הפעם נעזרתם פחות מבפעם הקודמת. |
| round end | סיימתם סבב של 3 הוכחות. |
| rescue 1 | נעצור רגע ונחזק דבר אחד: {skill name}. |
| rescue 3 | הסוג הזה עוד קשה, וזה בסדר. כדאי לחזק קודם: {previous type}. |
| warm-up passed | החימום מאחוריכם. עכשיו מוכיחים. |
| locked level tab | נפתח אחרי 3 הוכחות נקיות ברמה {n}. |

## 10. Data model

### 10.1 Problem = figure + a graph of facts (not a list) **(upgrade: any valid order, form and reason is accepted)**

```
problem = {
  id, type, template, seed, level, variant,            // 'A' | 'B'
  text:   [ { he:'הקטעים … נחתכים בנקודה', m:['AB','CD','O'] } ],   // intro line(s)
  figure: {
    points: { A:[x,y], … },
    lines:  [ ['A','O','B'], ['C','O','D'] ],           // collinear sets → rays
    segs:   [ 'AO','OB','CO','OD','AC','BD' ],          // tappable segments
    angles: [ { v:'O', r:['A','C'] }, … ],              // tappable angles (by rays)
    tris:   [ ['A','O','C'], ['B','O','D'] ],           // tappable triangles
    motion: { kind:'half-turn', about:'O' },            // for the ending
  },
  facts: {
    a:    { kind:'seg',  x:'AO', y:'OB', mark:{ticks:1,color:1} },
    b:    { kind:'seg',  x:'CO', y:'OD', mark:{ticks:2,color:2} },
    c:    { kind:'ang',  x:{v:'O',r:['A','C']}, y:{v:'O',r:['B','D']}, mark:{arcs:1,color:3} },
    cong: { kind:'cong', map:[['A','B'],['O','O'],['C','D']] },
    goal: { kind:'seg',  x:'AC', y:'BD', mark:{ticks:3,color:'goal'} },
    e1:   { kind:'ang',  … },  e2: { kind:'ang', … },    // other consequences
  },
  just: {                                   // every way a fact may be justified
    a:    [ { reasons:['given'],            needs:[] } ],        // word-given: ['midpoint','given']
    b:    [ { reasons:['given'],            needs:[] } ],
    c:    [ { reasons:['vertical'],         needs:[] } ],
    cong: [ { reasons:['sas'],              needs:['a','c','b'] } ],
    goal: [ { reasons:['cp-sides'],         needs:['cong'] } ],
    e1:   [ { reasons:['cp-angles'],        needs:['cong'] } ],
  },
  given: ['a','b'],  target: 'goal',
  canon: ['a','c','b','cong','goal'],        // order used when the app writes the proof
  // derived: required = target + everything it needs (recursively); extras = other facts
  tiles: { wrong:[ {kind:'seg', x:'AO', y:'CO', why:'letter-swap'} ] },
  roles: { a:'given', c:'vertical', cong:'congruence', goal:'conclusion' },   // for hints, texts, step labels
}
```

Types 1 and 2 use the same shape: type 1 facts have no `needs` (each is justified by its sentence); type 2
starts with `cong` already known and the three asked facts as required, the other three as extras.

### 10.2 The checker (pure functions in `core.js`, fully tested)

```
norm(statement)                      → canonical key (6.2)
classify(problem, done, statement)   → 'ok' | 'written' | 'early' | 'extra' | 'unprovable' | 'false'
     ok         fact exists, required, and some justification has all its needs in `done`
     written    fact already in `done`
     early      fact exists (required or extra) but no justification has its needs yet
                 (sub-kind for the text: target / congruence / consequence)
     extra      fact exists, provable now, not required
     unprovable not a fact of the graph, but true in the coordinates
     false      not true in the coordinates
checkReason(problem, done, factId, reasonId) → { ok } | { ok:false, kind, textKey }
     ok when some justification j has reasonId ∈ j.reasons and j.needs ⊆ done
checkMatching(problem, tri1, orderedVertices) → ok when every pair is in cong.map (any consistent order)
present(problem, level, variant)     → what is pre-filled, which decisions are gaps, tiles, chips
errorKind(...)                       → one of the kinds in section 8
```

A row is accepted in **any order** in which its needs are already written. Nothing compares against `canon`
except the app's own writing of the proof (Level 1, hint 3, the notebook page).

### 10.3 Saved state

```
localStorage['mp:proofs:v1:' + who]      who = 'g' (guest) | 'u:<account id>'
{ v:1,
  types: { '<type id>': {
      level: 1|2|3|4,                    // 4 = Level 3 passed
      warm:  { done:true, kinds:{ W4:[1,0,1] } },
      hist:  { 1:[rec,…], 2:[…], 3:[…] },   // last 6 counted proofs per level
      done:  7,                          // proofs completed (any help)
      lastHelp: 2,                       // non-solo decisions in the previous proof
      recent: ['3-K-SAS', …],            // last 6 template ids
      errs:  { 'wrong-theorem':3, … }    // at the current level, for the rescue ladder
  } } }
rec = { n, solo, helped, missed, filled, variant, tpl, day }
sessionStorage['mp:proofs:open'] = the proof in progress (problem seed + rows + decisions)
```

- Sign-up / sign-in: if the user key is empty, copy the guest key into it (the server already moves the
  device's events into the account).
- New device, signed-in: `accountApi.progress().chapters`, rows with `page === 'proofs.html'`; split `chapter`
  on `" › "`. Because levels are locked, **any row at "רמה N" proves level N was earned** → set `level` to the
  highest N seen. The four dots start empty there. No migration, no new function. **(upgrade)**
- The level is a learning aid, not a grade; it is kept on the device and can be edited by a curious student.
  That is accepted.

### 10.4 Tracking contract with `mp-runtime.js` (read in the code: reacts only within 1.6 s of the student's tap; one event per change batch, strongest wins; ignores new nodes with more than 40 descendants)

| Moment | DOM | Event |
|---|---|---|
| decision right (`solo`, `helped`, `missed` when finally right on try 2) | a small `.fb.ok` line in the tray (first try only gets `.fb.ok`; a right second try shows the same look with `pf-note` so it is not stored as a clean "ok") | `ok` |
| wrong try | `.fb.err` line | `bad` |
| neutral notes, filled steps, hints | `pf-note` (private class, not tracked) | none |
| student taps "מ.ש.ל" on a proof with no `filled` decision | `.banner` end card | `win` |
| "מ.ש.ל" on a proof with a filled step | same look, class `pf-end` without `.banner` | none (same rule as "show solution" in the חדש module) |

- Each decision sits in a `.step-card` whose `.step-label` names the decision kind, not the row number:
  `טענה · נתון`, `נימוק · רואים בציור`, `נימוק · משפט חפיפה`, `טענה · חפיפה`, `התאמת קודקודים`, `נימוק · מסקנה`,
  `טענה · מסקנה`. The admin's "most missed steps" then makes sense across random problems.
- The `.ch-btn.active` and the active `.sub-tab` must exist with the exact texts of section 6.1 whenever a
  decision is made (they may be collapsed visually, section 11). Builder: verify with the real event log on
  localhost (`supabase start`) that chapter = `"3. הוכחת חפיפה › רמה 2"` etc.
- Mastery does **not** depend on the tracker: `ProofChapter` calls `mastery.record()` directly with the
  decision states. (Different from the codebase-fit sketch, which listened to `mp:fb`; proof-level "clean"
  needs states the tracker does not carry.) **(upgrade)**

## 11. UI: screens at 375 pt

Visual language: white paper, the drawing on the faint dotted stage, ink lines 2 px, marks in the pair colours,
coral only for "now" and "goal", Rubik throughout, maths in left-to-right islands (`pf-m`: `direction:ltr;
unicode-bidi:isolate; white-space:nowrap`), tabular figures. No boxes around the drawing. Motion: marks draw in
(250 ms), rows slide in (200 ms), the ending motion (600 ms); nothing loops.

**Signs:** ∢, △, ≅ and ↔ are small inline SVGs inside the maths island (Rubik has no such glyphs; in the mockup
∢ came from a fallback font and △ was larger than the letters). Each has a Hebrew name for screen readers.
**(upgrade)**

### 11.1 Height budget (the layout must be built to this) **(upgrade: the mockup left 1–2 rows visible)**

Visible height on a 375×667 iPhone in Safari ≈ 550 pt; on 390×844 ≈ 700 pt. Use `dvh`.

| Zone | Height | Notes |
|---|---|---|
| Site top bar | 48 | existing `TopBar` |
| Proof header `pf-head` | 40 | back arrow · type name · level pill · four dots. Replaces the chapter row and sub-tabs **visually** while a proof is open (they stay in the DOM) |
| Drawing `pf-stage` | `clamp(150px, 30dvh, 240px)` | sticky under the header; 165 pt on the small phone |
| Given + goal strip | 34 | one line, scrolls sideways if long; given chips get a ✓ when used; goal chip has a lock until proved |
| Rows `pf-rows` | the rest | finished rows are **one line, 30 pt**: number · statement · short reason · pair glyph ✓. Tap a row to open its full reason. Scrolls; newest row kept in view |
| Tray `pf-tray` | min 120, max `40dvh` | fixed to the bottom with safe-area padding. Header = the active row ("שורה 3 · {statement} · מה הנימוק?"), then chips, then the hint button |

Small phone: 48 + 40 + 165 + 34 + ~190 = 477 → about 75 pt of rows (2 one-line rows + scroll).
390×844: about 6 rows visible.

- The active row is shown **in the tray header**, statement above, "מה הנימוק?" under it. Finished rows are
  one-liners. The true two-column table appears on the notebook page (7.7).
- Chips: min height 44, 2-column grid for long names, 3-column for short (צ.ז.צ). Level 2: at most 8 chips =
  4 rows of 2 → the tray scrolls inside itself only on the smallest phones. Level 3: two-step pick (5 group
  chips → 1–4 reason chips + "חזרה"), never taller than ~200 pt.
- From 900 px wide: two columns — drawing sticky on one side, rows and tray (not fixed) on the other.

### 11.2 Screens

| Screen | Content |
|---|---|
| **A. Type landing** (after choosing a chapter button) | normal topic header + chapter row (one swipe row) + sub-tabs (locked tabs disabled with the "נפתח אחרי…" line). Below: type name, one "what is it about" line, a small sample drawing, the level ladder (חימום → 1 → 2 → 3) with the four dots of the current level, "הוכחות שהשלמתם", and one primary button under the thumb: "מתחילים" / "ממשיכים". The team strip ("מוסתר עד אישור") sits at the very top |
| **B. Warm-up task** | header + drawing + one question in the tray with 2–4 chips or a tap in the drawing; feedback line; "הבא" |
| **C. Proof** | the layout of 11.1 |
| **D. End** | ending motion → card: result line, dots, notebook page (scrolls), buttons |
| **E. Level up** | same card with the level ladder stepping up once (no confetti storm; the runtime's own win sound) |
| **F. Rescue card** | one sentence + one button; never a red screen |

### 11.3 Accessibility **(upgrade: specified; the plan only said "colour + ticks")**

- Every tappable part is a `<button>`-role element with a Hebrew name ("הקטע AO", "הזווית AOC", "המשולש AOC"),
  focusable, with a visible focus ring; invisible hit shapes ≥ 40 pt (wide transparent stroke for segments,
  wedge for angles). Where two targets are closer than that, the chooser (7.2) appears.
- "רשימת חלקים" gives a complete non-pointing path.
- Statements are read as sentences ("הקטע AO שווה לקטע OB"; "המשולש AOC חופף למשולש BOD").
- Feedback and "סומן בציור" announcements in one polite live region.
- Colour never alone: tick/arc counts, ✓ icons on finished rows, lock icon on the goal.
- Text contrast ≥ 4.5:1 for all feedback and hint lines at rest; pair colours ≥ 3:1 against white.
- `prefers-reduced-motion`: no pulse, no draw-in, no ending motion; still highlights instead.
- Chips ≥ 44 pt high; nothing important only on hover.
- Before the section is shown to students: `/legal-check` (project rule).

## 12. Files

```
src/topics/proofs/
  Topic.jsx            .hdr + .ch-btns (4 types) → <ProofChapter>; team strip
  styles.js            layout in @layer legacy + pf-* under #root
  core.js              norm, classify, checkReason, checkMatching, present, errorKind (pure)
  mastery.js           constants block, record(), levelOf(), rescue(), seedFromServer() + storage wrapper
  reasons.js           ids, short, full, groups (section 6.3)
  texts.js             every Hebrew message and hint (section 9), keyed
  figure-core.js       points/lines → segments, rays, angles, triangles, marks, motion, label placement (pure)
  ProofFigure.jsx      SVG: parts, hit shapes, marks, target style, focus, ending motion
  ProofRows.jsx        one-line finished rows + row detail
  Tray.jsx             active row, chips, two-step pick, tiles, preview chip, parts list, hint button
  Warmup.jsx           W1–W7
  EndCard.jsx          result, dots, notebook page
  ProofChapter.jsx     one type: landing, level tabs, flow, mastery, rescue
  families/            x.js k.js z.js t.js two.js   (geometry + fact graphs per variant)
  types/               read-given.js congruent-parts.js prove-congruence.js then-conclusion.js index.js
  proofs.test.mjs      section 6.6 tests + checker + mastery + texts (every key exists, no glued prefix)
app/dev/proofs/page.tsx + src/dev/ProofsLab.jsx   every template, level, state; printable review sheet; notFound() in production
```

## 13. Build order and the quality gate

1. `figure-core.js` + `ProofFigure.jsx` for families X and K (parts, marks, target style, hit shapes, chooser).
2. `core.js` (graph checker) with tests, including a made-up proof with two valid justifications.
3. Type `3. הוכחת חפיפה` end to end on X and K, all levels and variants, hints, end card.
4. **Gate:** iPhone-size scroll video (WebKit), frame-by-frame review, scroll smoothness down and up, a real
   iPhone if possible → show Abed. Do not build the rest before this slice is excellent.
5. Families Z, T, 2; type 4; then types 2 and 1; warm-up tasks; mastery + rescue; notebook page.
6. Dev lab + printable review sheet for Sulaiman. Tests, `verify-logic.py`, `next build`.

## 14. Left to the builder

- Exact geometry ranges per family, label placement details, the look of ticks/arcs/target outline.
- Component split inside the files above; state shape inside `ProofChapter`.
- How the chapter row and sub-tabs collapse while staying readable by the tracker (verify with the event log).
- Whether the tray needs an inner scroll on the smallest phones or tighter chips.
- The exact ending motion per family (must be the real rigid motion; must return; must respect reduced motion).
- Tile placement interaction at Level 2: tap only (no drag in phase 1); how a placed-but-unjustified row is cancelled.
- Final microcopy polish after Sulaiman's pass (all in `texts.js` and `reasons.js`).

## 15. Open points for Sulaiman (the maths owner)

1. **Wordings not found word for word in an official document:** "נתון", "צלע משותפת", "זווית משותפת",
   "צלעות / זוויות מתאימות במשולשים חופפים שוות", הגדרת חוצה זווית, הגדרת תיכון, אמצע קטע, הגדרת גובה.
2. **The ז.ז.צ flag.** The existing chapter "4. חפיפה" (`triangles`) offers ז.ז.צ as a congruence theorem. The
   Ministry way is: third angle by "סכום זוויות במשולש", then ז.צ.ז. This section follows the Ministry and has
   no ז.ז.צ chip. What to do in the existing chapter is his call; nothing there was changed. Also: צ.צ.ז and
   "ניצב ויתר" — in or out for later phases?
3. **Accepted reasons for a fact given in words** ("O אמצע AB" → AO = OB): this spec accepts both the definition
   and "נתון". Which one should the worked examples show?
4. **Altitude rows** are written `∢ADB = ∢ADC = 90°` with the reason "הגדרת גובה". Acceptable form?
5. **One fact per row.** Teachers often write two givens in one row ("AO = OB, CO = OD | נתון"). Here each is
   its own row. OK?
6. **Vertex order:** any consistent matching is accepted, either triangle first. OK?
7. **Spelling and signs:** קודקודיות (as in the site) vs קדקודיות (Ministry list); ∢ as the angle sign.
8. **Address:** all texts speak in the plural ("געו", "בדקו"). Matches his topics?
9. **Templates:** approve the ~63 cards on the review sheet, especially type 1 traps and the type 4 goal list.
10. **Numbers:** clean = 80% alone; level up = 3 of the last 4; fast track = first proofs perfect (≥ 2 proofs,
    ≥ 6 decisions); rescue after 2 not clean.

## 16. Roadmap after phase 1

| Phase | Content | New engine parts |
|---|---|---|
| 2. Rest of grade 8 | skills 1, 2, 5, 7, 9, 10, 11 | parallel-line reasons (two clearly different "מתאימות" chips), חיבור / חיסור קטעים, כלל המעבר, third-angle step, number statements, "is isosceles" statements, overlapping triangles with "pull apart", `RENAMED` entries when chapter numbers shift |
| 3. Grade 9 | skills 12–20 | converse theorems as separate chips, quadrilateral figures, multi-part questions (2–3 steps per part) |
| 4. Finish | mixed sets on a later day ("mastered"), spaced review, bubble (flow-chart) view, check-at-the-end variant of Level 3, cross-device four dots (`account_proof_levels`, one read-only function), home railway station, catalog, `/legal-check`, unhide after Sulaiman's approval and Abed's go |

## 17. Evidence notes (short)

From the research files: Ministry grade-8 ladder (complete → write; five content stages); Cirillo & Hummer 2021
(habits of successful provers); Renkl / Atkinson (fading), Salden 2010 (adaptive fading); Aleven & Koedinger
(choosing the reason is self-explanation); Poulsen (ordering ready lines works after an example); Matsuda &
VanLehn (forward order); Ender 2026 (marks only after justification); the 33-tools review (accept many paths,
remove accidental difficulty); Pelánek (simple mastery rules with memory); Van der Kleij (explained feedback).
Added in the critique (search summaries, papers not opened): interleaved practice in grade 7 (Rohrer et al.
2015, 2020) → variety rule; adaptive ordering problems and mixed evidence on distractors (Ericson 2018; Harms
2016; Haynes-Magyar 2024) → A/B variants, at most two wrong tiles; hint misuse and help avoidance (Baker 2004;
Aleven 2006) → hint 2 not free for mastery, idle nudge; WCAG 2.2 target size (24 px minimum, 44 px enhanced) →
hit shapes, chooser, parts list. Not verified: that the Israeli accessibility standard equals WCAG 2.0 AA (from
memory); behaviour on a real iPhone and with a screen reader (nothing is built yet).
