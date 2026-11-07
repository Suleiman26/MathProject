# Duel fit of the 17 topics (audit, 2026-11-07)

Read-only audit of every `src/topics/<slug>/Topic.jsx`. 84 chapters: **49 A** (one number / one choice, no drawing), **18 B** (one answer + a simple drawing), **14 C** (poor fit as is; 4-choice version possible), **3** no exercise (linear-function ch0/3/5 are explanation only).
"L" = line in `Topic.jsx` on 2026-11-07. Re-check chapter names against `src/home/chapters.js` when porting.

| Topic (grade) | Chapter: asked → generator (L) → returns | Fit | Hebrew wording to reuse | Answer check |
|---|---|---|---|---|
| angles-parallel (—) | Ch1–5 (vertical, adjacent, alternate, corresponding, co-interior): one angle → another `genRelationNumeric` L317 `{givenIdx,givenVal,askIdx,askVal}`; expressions in x `genRelationEquation` L328 `{x0,expr1,expr2}`; config `RELATIONS` L305. Ch6 name the relation `genCh6Identify` L477 (5 names), equation `genCh6Equation` L506 | B (2 lines / parallels + transversal) | "∠{i} = {v}°. מצאו את ∠{j}" · "מה הקשר בין ∠a ל-∠b?" | whole number |
| circle (8) | Ch1 intro `genCh1` L62 (name marked part = B; radius↔diameter = A). Ch2 radians `genCh6` L629 (component `Ch6` L658). Ch3 circumference `genCh2` L191. Ch4 area `genCh3` L270 (+sector). Ch5 arc `genCh4` L385. Ch6 combined `genCh5` L501 | Ch1 B, ch2–6 A | "הרדיוס הוא {r} ס"מ. מה הקוטר?" · "היקף המעגל הוא {k}π. מצא את הרדיוס." · "r = {r}, θ = {θ}°. חשבו את שטח הגזרה." · "המר {deg}° לרדיאנים" | mostly the coefficient of π; numeric case ±0.1 (π≈3.14); `piMatches` L298; θ may be 0.5/1.5/2.5 |
| directed-numbers (7) | Ch1 `genAdd` L83, Ch2 `genSub` L90, Ch3 `genMul` L97, Ch4 `genDiv` L104 → `{a,b,ans}`. Ch5 order of operations `genOrderEx` L538 (C → "which operation first?" 3 choices). Ch6 `genCombo` L636 `{tokens,result}` | A (ch5 C) | "חיבור מספרים מכוונים" (stored as \u escapes) | whole number |
| equation-solver (—) | `genEq` L66 → ax+b = cx+d, whole x | A | "x = ?" | whole number |
| equations-advanced (8–9) | Ch1 linear with denominator `makeLinearEq(level)` L50 (level 3 may be no solution). Ch2 quadratic with denominator `makeQuadEq` L218 (2 roots, forbidden x) C. Ch3 short multiplication `makeFactoring` L1232 / `makeExpansion` L1247 (expressions, C), `makeLinearSM` L1251 (A), `makeQuadSM` L1268 (2 roots, C). Ch4 = `Section5` L2474, `makeCombinedEq` L2249 (level 1 A) | ch1 A (fraction display), ch4 L1 A, rest C | "מצא את הפתרונות של המשוואה" · option "אין פתרון" | whole number |
| inequalities (—) | Ch1 `genCh1` L422 / `makeIneqForSolution` L78 (C: a always > 0, sign never flips). Ch2a line→inequality `genCh2A` L454, ch2b `genCh2B` L473, ch2c whole numbers in range `genCh2C` L491 (B). Ch3 system `genCh3` L552 (C) | B/C | "כתבו את אי-השוויון המתאים לתחום המסומן על הציר" | text / set |
| intersection (9) | Ch1 line–line `genLL` L365 `{m1,b1,m2,b2,type,solX,solY}` (20% parallel/identical). Ch2 line–parabola `genLP` L566 (C → "how many meeting points?") | ch1 A | "בנקודת החיתוך ערכי y שווים" | whole numbers |
| linear-function (—) | Ch1 read points `genPts` L356 (B). Ch2 place a point L425 (B). Ch4 slope from 2 points `Chapter3.genQ` L563. Ch6 m,b from y=mx+b `genQ` L911. Ch7 rearrange then m,b `genQ` L952. Ch8 m + point → b `Chapter5.genQ` L1083. Ch9 2 points → m,b `Chapter6.genQ` L1162. Ch0/3/5 none | ch4,6–9 A | "נתונה משוואת ישר. זהו את השיפוע m ואת נקודת החיתוך עם ציר ה-y." | whole or n/2 (`parseSlopeInput` L113) |
| parabola-practice (—) | All use `makeFunction(sym,allowSym,intVertex)` L23 `{a,b,c,r1,r2,vx,vy}`. Ch4 vertex from equation L522, ch6 y-intercept L704, ch7 roots L848 = A. Ch2 axis L433, ch3 vertex from graph L479 = B. Ch1/5/8/9/10 = C | mixed | "כאשר x=0, y=?" | ±0.1 (vertex x may be .5) |
| powers-roots (8–9) | Ch1 `genCh1` L38, `genBaseExp` L72. Ch2 `genLaw(i)` L205 (ready `q`). Ch3 `genParam(i)` L366. Ch4 `genRoot(i)` L479. Ch5 `genCombined(diff)` L668 | A (two-slot answers → choices or ask one slot) | ready `q`, e.g. `2^3 · 2^4 = 2^?` | whole; 2⁻ⁿ = 1/den |
| pythagoras (8–9) | Ch1 `makeTri` L20. Ch2 `makeQuad` L41 (returns `Set`s) | B | "שלב 1 — זיהוי היתר" | 2 decimals ±0.05; often irrational → √ choices |
| quadratic-solver (9) | `genEq` L94 `{left,right,roots}`; steps 2 coefficients + 3 which case = A; 1 rearrange + 4 solve = C | mixed | "האם אחד המקדמים b או c שווה 0?" | whole |
| quadrilaterals (7–8) | `{answer, given, formula, askLabel, visual:<JSX>}`: square L502–514, rectangle L560–577, rhombus L613–632, parallelogram L676–695, trapezoid L756–897, kite L946–968 | A (text `given` is complete) | `given` "צלע a = {a}", `askLabel` "S =" | whole |
| ratio-percent (7–8) | Ch1 `genRatio` L201, `genRatioAmount` L326. Ch2 `genProportion` L456. Ch3 `genDecFracEx` L666 (L636/L649). Ch4 `genPctCalc` L862. Ch5 `genPctChange` L1065 | A | ready `q` (L862/L1065) · "מה היחס בין {l1} ל{l2}?" | whole; decimal/fraction ch3 |
| similar-triangles (8–9) | Ch1 `genCh1Identify` L269 (`genCh1A` L235, `genCh1Sides` L253, not-similar L366). Ch2 `genCh2B` L466. Ch3 `genCh3A` L575, `genCh3B` L641, `genCh3C` L743 | B | "על פי איזה תנאי דומים?" · "מצא את הצלע החסרה FD" | whole; "a:b" |
| solids3d (—) | `genCube` L182, `genBox` L322 / `pickQuad` L20, `genBoxRatio` L383, `genCylinder` L492, `genCone` L639, `pickPyr` L754, `genSphere` L1013; Q components e.g. `Ch1Q1` L203 (some answers computed inside components). Ch7 combined L1184–1250 = C | ch1–6 A | "חשבו את נפח הקובייה" · "חשבו את שטח הפנים הכולל של התיבה" | π answers ±max(0.5,1%) or coefficient |
| triangles (7–8) | Ch1 angles `genCh1` L488. Ch2 types `genCh4` L1994. Ch3 special `genChRight` L670, `genIsoBasics` L1080, `genIsoHeight` L1318, `genChEquilateral` L1577. Ch4 congruence `genCh3` L1763 (B) | ch1–3 A | "המשולשים חופפים. AB = {x}. מצא את DE." | whole |

## Zero-drawing v1 set
directed-numbers, equation-solver, powers-roots, ratio-percent, quadrilaterals, solids3d ch1–6, circle ch2–6, triangles ch1–3, linear-function ch4/6–9, intersection ch1, equations-advanced ch1 + ch4 level 1 + linear short-multiplication, quadratic-solver steps 2–3. Needs a math text display (fractions, exponents, √, π).

## Drawing kit (phase 2) → chapters unlocked
2 lines / parallels + transversal (6) · labelled triangle (≈6) · number line (3) · coordinate grid with dots (2) · parabola on grid (2, up to 6 with graph choices) · circle with marked part (1).

## Port risks
- Not plain data: quadrilaterals `visual` JSX; pythagoras `makeQuad` returns `Set`; equation/quadratic solver terms carry generated ids; linear-function and parabola generators sit inside components; solids3d computes answers inside components.
- Weak questions to filter: `genRelationEquation` can give angle ≤ 0; `genKiteAngle` / `genTrapGenAngle` angles that don't form a real kite/trapezoid; triangles `genCh3` "complete" can have < 4 choices; inequalities ch1 never flips the sign.
- Heavy retries / recursion: `genLP` (tangent only when m=0), `makeFunction`, linear-function `genQ`s, `genIsoBasics`; 200–500-try loops with a fixed fallback.
- Repeats in 15: sphere radius 4 values; `makeCombinedEq` L2 11 cases; `genMul` |ab| ≤ 20; `genRoot`/powers ch1 tables of 12–16; similar triangles 3 ratios × 8 bases; Pythagorean triple lists 4–7. Dedupe per duel.
- Non-single-integer answers: two roots (order-free), "no solution", .5 vertex, Pythagoras decimals, π answers, n/2 slopes, a:b, fractions → choices or a fixed tolerance rule.
