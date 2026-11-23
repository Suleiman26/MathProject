# Proofs by Ministry Subject + Similarity Proofs + Theorems Always Visible — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the grade-8 "הוכחות" card into Ministry subjects (חפיפת משולשים, דמיון משולשים) with one ladder of levels each, show every theorem's full Ministry wording where it is used, add the similarity subject, and end each subject with an exam-style level.

**Architecture:** Keep the pure core (fact graph + checker + reducer + mastery) and extend it: `subjects.js` groups the flat `TYPES` list; statement kinds `par`/`sim`/`prop`/`val` and new reasons extend `core.js`/`reasons.js`; four similarity figure families reuse `families/kit.js`; the UI gains a subject switcher, a theorem sheet and a number keypad. Saved progress and tracker keys stay stable through a `data-mp-key` attribute.

**Tech Stack:** Next.js 16 / React 19, plain JS modules, `node --test`, CSS string in `styles.js` (prefix `prf-`, scoped under `#root`).

**Spec:** `docs/superpowers/specs/2026-11-23-proofs-subjects-similarity-design.md` ("S§n"), extending `docs/superpowers/specs/2026-11-21-proofs-design.md` ("P1§n"). Read both before any task. Reviewed 2026-11-23 by a builder check and by Fable 5.2; their findings are folded in.

## Global Constraints

- All work in `src/topics/proofs/` except: `src/lib/mp-runtime.js`, `src/components/TopicView.jsx`, `src/admin/pages/review/frame.js`, `src/admin/review/snapshot.js`, `src/admin/pages/review/model.js` (Task 1 only, key reading; `model.js` key lists in Tasks 10/14); `src/home/chapters.js`, `src/home/chapterInfo.js` (only for LIVE keys); `app/dev/proofs/` + `src/dev/ProofsLab.jsx` (dev previews).
- Never edit Sulaiman's `Topic.jsx` ORIGINAL blocks or `src/topics/similar-triangles/`. `python3 tools/verify-logic.py` must print "math and text untouched".
- Zero database migrations. Device storage key `mp:proofs:v1:`; open-proof key `mp:proofs:open`.
- Tracker keys never change once stored: congruence `1. קוראים את הנתון`, `2. מחפיפה לשוויונות`, `3. הוכחת חפיפה`, `4. חפיפה ואז מסקנה`, `5. חפיפה – כמו במבחן`; similarity `6. מדמיון לשוויונות ויחס`, `7. מיחס לצלע חסרה`, `8. הוכחת דמיון`, `9. דמיון ואז חישוב`, `10. דמיון – כמו במבחן` (en dash U+2013); tabs `חימום`, `רמה 1`, `רמה 2`, `רמה 3`.
- Visible names (drafts → `NEW_DRAFTS`): help stages `חימום · מודרך · ביחד · לבד`; levels `רמה N · <label>` numbered inside the subject; subjects `חפיפת משולשים` (`ינואר–פברואר`), `דמיון משולשים` (`מרץ–אפריל`). No visible "רמה 1–3" for help stages anywhere (landing, pill, `ui.locked`, EndCard, rescue cards).
- Type ids: `read-given`, `congruent-parts`, `prove-congruence`, `then-conclusion`, `cong-exam`, `sim-parts`, `sim-side`, `prove-sim`, `sim-calc`, `sim-exam`.
- Release (Abed, 2026-11-23: "Build, show it live"): similarity and both exams are LIVE when built (`live:true`). Keep the `live` flag and `canShow(x, env)` (true when `x.live`, or `env.framed`, or host `localhost`/`127.0.0.1`, or `/^mathix-[a-z0-9-]+-abed-shalgams-projects\.vercel\.app$/`) so a subject can be hidden later. Each live key goes into `src/home/chapters.js` + `chapterInfo.js` (key order) in the task that builds it.
- The subject switcher never uses `.ch-btn`/`.nav-btn`/`.sub-tab`/`.tab`/`.sub-btn`/`.sub-tab-btn` classes. No proofs button text matches `/בדוק|בדיקה|בדקו|אישור|אשר|✓/` (keypad submit = `זו התשובה`).
- CSS: classes `prf-…`/`is-…`, every rule under `#root`, no `letter-spacing`, 40 px touch targets, motion only transform/opacity, reduced motion = no motion, colour never the only signal.
- Hebrew only in `texts.js` / `reasons.js`; every new key in `NEW_DRAFTS`; maths islands `{name}`, never glued to a Hebrew prefix.
- Similarity numbers: whole or x.5 in givens, answers and wrong chips; ratio k ∈ [1.5, 3].
- Randomness only through `R`; pure modules never read window/Date/Math.random.
- Per task: `node --test src/topics/proofs/*.test.mjs` PASS. Commit after each task (message ends with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`). No push/deploy inside this plan.

## Review Focus

1. A returning student's saved congruence progress (device + server rows) shows the same levels/stages after the update — Task 2 test `old storage loads unchanged`, Task 1 key tests.
2. A proportion in the other valid direction is accepted; a mixed direction gets `ratio-flip`; the inside-triangle form gets a neutral note — Task 7 tests.
3. A similarity written from either triangle in a valid order is accepted; a true similarity is never called "wrong matching" — Task 7 tests.
4. `?ch=8. הוכחת דמיון` opens similarity רמה 3 even when the page opened on congruence (where similarity is shown) — Task 3 check.
5. The open row stays on screen at 375×667 with the newest theorem sentence AND with the keypad open in a `sim-calc` proof — Task 5 and Task 11 phone checks.

---

### Task 1: Stable tracker keys (`data-mp-key`) everywhere a key is read

**Files:**
- Create: `src/lib/mp-key.js`, `src/lib/mp-key.test.mjs`
- Modify: `src/lib/mp-runtime.js:199-204`; `src/components/TopicView.jsx` (✓ `data-solved` marking ~line 45, `activeChapter()`, `?ch`/`&sub` loop ~58-80); `src/admin/pages/review/frame.js:~106,~110`; `src/admin/review/snapshot.js:~289-291`

**Interfaces:**
- Produces: `keyText(el) → string` = `el.dataset.mpKey` when non-empty, else `el.textContent`. Everything that stores, matches or marks a chapter/tab uses it. Elements without the attribute behave exactly as before.

- [ ] **Step 1: Failing test** `mp-key.test.mjs`: `keyText({dataset:{mpKey:'1. קוראים את הנתון'},textContent:'רמה 1 · קוראים את הנתון'}) === '1. קוראים את הנתון'`; no/empty `mpKey` → `textContent`.
- [ ] **Step 2:** `node --test src/lib/mp-key.test.mjs` → FAIL; implement → PASS.
- [ ] **Step 3:** Use it in the listed places (`mp-runtime.js` is a plain script: if it cannot import, inline the same two lines with a comment pointing at `mp-key.js`).
- [ ] **Step 4:** `node --test src/admin/review/*.test.mjs` PASS. Dev check: `/topics/triangles?ch=4. חפיפה` opens; `chapterOf()` on triangles returns the same strings as before; the admin review frame opens a proofs chapter + tab.
- [ ] **Step 5:** Commit `Proofs: stable tracker keys via data-mp-key (no change for other topics)`.

### Task 2: Subjects layer and type metadata (no visible change)

**Files:**
- Create: `src/topics/proofs/subjects.js`, `subjects.test.mjs`
- Modify: `types/index.js`, each `types/*.js` export (fields only), `core.js` (`TYPE_N` → `shapeOf`), `texts.js`

**Interfaces:**
- Produces:
  - `SUBJECTS: Array<{ id:'congruence'|'similarity', name, when, short /* 'חפיפה' | 'דמיון' */, live:boolean, types:string[] /* level order */, theorems:string[], hero:{ type, template, seed }, demos:{ [reasonId]: { type, template, seed, marks:string[] } } }>` — similarity `types: []`, `live:false` until Task 10.
  - `subjectOf(typeId)`, `levelNo(typeId)` (1-based inside its subject), `typesOf(subjectId)`, `prevInSubject(typeId) → type|null`, `canShow(x, env)` (Global Constraints).
  - Every type gains `subject`, `label`, `shape: 'given'|'parts'|'side'|'prove'|'then'|'exam'`, `live` (default true); `button` stays the tracker key.
  - `core.js`: `shapeOf(p)` replaces `TYPE_N[p.type]` and `p.type === 'congruent-parts'` checks.
  - texts: `stage.0..3` = `חימום`,`מודרך`,`ביחד`,`לבד`; `subj.*`, `subj.when.*`, `lbl.levelN` = `רמה {n}`.
- [ ] **Step 1: Failing tests:** buttons unique, the four congruence buttons equal the keys exactly; `levelNo('prove-congruence') === 3`; `prevInSubject('read-given') === null`; `shapeOf` per existing type = `given`,`parts`,`prove`,`then`; `canShow` cases (`{live:false}` on `mathix-sooty.vercel.app` false, `localhost` true, `mathix-git-x-abed-shalgams-projects.vercel.app` true, `mathproject-gamma.vercel.app` false, framed true); `old storage loads unchanged` (saved JSON with the 4 congruence types at levels 2,3,4,1 → `load` → deep-equal); `present()` for a fixed seed per existing type has the same `mode`, `steps.length`, `chipsN` as before (snapshot taken before the change).
- [ ] **Step 2:** FAIL → implement → whole suite PASS. Commit `Proofs: subjects layer and per-type shape`.

### Task 3: Landing by subject, ladder labels, help-stage names

**Files:** `Topic.jsx`, `ProofChapter.jsx`, `ProofScreen.jsx`, `EndCard.jsx`, `styles.js`, `texts.js`

**Interfaces:**
- Consumes: Tasks 1–2.
- Produces: `Topic.jsx` state `{ subject, ch }`; device key `mp:proofs:subject`. Level buttons `<button class="ch-btn" data-mp-key={type.button}>` showing `רמה {levelNo} · {label}`; tabs `<button class="sub-tab" data-mp-key={T['tab.N']}>` showing `stage.N`.
- [ ] **Step 1:** Landing (S§10.1): wordmark = `subject.short`, hero drawing, segmented switcher `prf-subj` (tap; swipe on the hero; wordmark + drawing change together; hidden when only one subject `canShow`s), meta line `when · {done} מתוך {N} רמות`, the ladder of the current subject only, "הבא בתור", "את/ה כאן".
- [ ] **Step 2:** First subject: open proof's subject → `mp:proofs:subject` → subject with progress → `congruence`. For `?ch=` to the other subject: render visually hidden, `aria-hidden`, `tabIndex=-1` `.ch-btn` stubs (with `data-mp-key`) for the other shown subject's levels; clicking one switches subject and opens that level.
- [ ] **Step 3:** Replace every visible help-stage "רמה N" with the stage name: header pill, `ui.locked`, EndCard `levelName`, rescue cards, landing `prf-land-what` (shows `label`, never `button`).
- [ ] **Step 4:** Dev check 375 px + desktop: switching, `?ch=3. הוכחת חפיפה&sub=רמה 2`, refresh mid-proof returns to the same subject/level. Commit `Proofs: landing by Ministry subject, help stages מודרך/ביחד/לבד`.

### Task 4: Ministry wording for every reason

**Files:** `reasons.js`, `texts.test.mjs`, `texts.js`

**Interfaces:**
- Produces: `REASONS[id] = { id, short, full, kind:'theorem'|'definition'|'rule'|'given', group }`; `isLaw(id)` = kind theorem or definition.
- [ ] **Step 1: Tests first:** `REASONS.sas.full` equals S§6.1's sentence exactly (same for `asa`, `sss`; `vertical` = `זוויות קדקודיות שוות זו לזו.`); kinds per S§6.1; every changed text in `NEW_DRAFTS`.
- [ ] **Step 2:** FAIL → implement → PASS (update tests that assert `'משפט חפיפה צ.ז.צ'`). Commit `Proofs: reasons carry the Ministry's full wording and kind`.

### Task 5: Theorems on screen — rows, choosing, why-line

**Files:** `ProofRows.jsx`, `Tray.jsx`, `ProofScreen.jsx`, `session.js`, `core.js` (`whyOf`), `styles.js`, `texts.js`

**Interfaces:**
- Consumes: Task 4.
- Produces: `whyOf(p,id,reason)` → `{ key, vars, law?: reasonId }`; the why-line renders `REASONS[law].full` after its line.
- [ ] **Step 1: Test first** (`core.test.mjs`): congruence row → `law` = its theorem; vertical row → `law:'vertical'`; given row → no `law`.
- [ ] **Step 2:** Rows (S§6.2.1): only the NEWEST law row shows the full sentence (never cut); older law rows show the short name + a small `המשפט` opener (tap → full, `aria-expanded`).
- [ ] **Step 3:** Choosing (S§6.2.2): at מודרך/ביחד a law chip's first tap previews (`aria-pressed`, the sheet shows its `full` in `prf-q-law`), second tap or `בחירה` commits; non-law chips commit on first tap; previews create no `.fb` node (P1§10.4). At לבד the second step of the pick shows each law's `full` under its name.
- [ ] **Step 4:** Phone check (Playwright WebKit 375×667, script in the session scratchpad): type-4 מודרך and לבד proofs — after every row the open row's box is inside the work area. Commit `Proofs: theorems' full wording on screen`.

### Task 6: "המשפטים" page and sheet

**Files:** create `Theorems.jsx`; modify `ProofScreen.jsx`, `ProofChapter.jsx`, `signs.jsx` (`IcBook`), `styles.js`, `texts.js`, `subjects.js` (congruence demos)

**Interfaces:**
- Produces: `<Theorems subject={id} current={reasonId|null} mode="sheet"|"page" onClose />`. ProofScreen passes `current` only at מודרך (S§6.2.4); opening it is never recorded as help.
- [ ] **Step 1:** Page under the ladder: `המשפטים ב{{subject}}`; theorems first, then definitions/rules; short pill, full sentence, small `ProofFigure` with the demo's marks; spacing + ruled lines, no boxed cards (S§6.3).
- [ ] **Step 2:** Sheet from the header button `המשפטים`: highlight + scroll at מודרך only, focus trapped, Esc/back closes, no `act()` while open. Hint rung 2 texts that name a law append its `full`.
- [ ] **Step 3: Test** (`subjects.test.mjs`): congruence `theorems` all exist with `isLaw`; each congruence demo builds via `remake` and its marks are facts of it.
- [ ] **Step 4:** Phone + desktop check. Commit `Proofs: המשפטים page and sheet`.

### Task 7: Core statement kinds `par`, `sim`, `prop`, `val` and `anchorOf`

**Files:** `core.js`, `ProofScreen.jsx` (only `congOf` → `anchorOf` where it means "the anchor"); test `sim-core.test.mjs`

**Interfaces:**
- Produces:
  - Shapes: `{kind:'par',x,y}` · `{kind:'sim',map}` · `{kind:'prop',pairs:[[a,b],…]}` (2–3 pairs) · `{kind:'val',x,v}`.
  - `anchorOf(p)` → id of the `cong` or `sim` fact (replaces `congOf` in `present`, `optionsFor`, `matchingMiss`, `classify`, ProofScreen); `congOf` kept for congruence-only code.
  - `norm`: `P:`, `M:` (like `C:`), `R:` (direction-free set of sorted pairs), `V:`. `holds`: par parallel; sim three angle pairs equal; prop ratios equal; val `measure × fig.scale ≈ v`. `show`: `DE ∥ BC`, `△ADE ∼ △ABC`, `AD/AB = DE/BC` (one LTR island), `DE = 6`; `say.par/sim/prop/val`.
  - `checkProp(p, st, { need? }) → { ok:true } | { ok:false, kind:'ratio-flip'|'non-matching-sides', textKey } | { note:'st.propInside' }` — by rule from the `sim` map (S§7.2): every pair = matching sides, one direction, ≥ 2 pairs; with `need = { asked, known }` one pair holds the asked side and one a fully known pair.
  - `classify`: `prop` via `checkProp`; `sim` tested with `holds` first — true → handled as a fact (ok/early), false with the right triangles → `wrong-matching` via generalised `matchingMiss`.
- [ ] **Step 1: Failing tests** (hand-built figure A(0,4) B(-3,0) C(3,0), D/E at 1/3 of AB/AC, scale 3): `norm(△ADE∼△ABC) === norm(△ABC∼△ADE)`, ≠ `△ADE∼△ACB`; `norm(AD/AB=DE/BC) === norm(AB/AD=BC/DE)`; `checkProp(AD/AB=BC/DE)` → `ratio-flip`; `checkProp(AD/AB=AE/BC)` → `non-matching-sides`; `checkProp(AD/DE=AB/BC)` → note `st.propInside`; `checkProp(AD/AB=AE/AC, {need:{asked:'DE',known:['AD','AB','AE','AC']}})` → not ok; `show` strings exact; `anchorOf(congruence problem) === congOf(…)`.
- [ ] **Step 2:** FAIL → implement → PASS + all existing suites. Commit `Proofs core: similarity statements, rule-based proportion check, anchorOf`.

### Task 8: Similarity reasons and checker roles

**Files:** `reasons.js`, `core.js` (`roleOf`, `checkReason`, `whyOf`, `reasonChips`, `optionsFor`), `texts.js`, `texts.test.mjs`, `sim-core.test.mjs`

**Interfaces:**
- Produces: reasons `aa`, `corresponding` (`מתאימות בין מקבילים`), `alternate` (`מתחלפות בין מקבילים`, accepted where true), `common-angle` (accepted), `right-angles`, `sim-angles` (`משולשים דומים: זוויות שוות`), `sim-ratio` (`משולשים דומים: יחס הצלעות`), `solve`; texts/kinds per S§6.1/S§7.3. Roles `similarity`, `ratio`, `number`, `parallel`, `sim-partner`. `groupsFor(subjectId)` (congruence = today's `GROUPS`). Error kinds `wrong-parallel-reason`, `ratio-flip`, `non-matching-sides`, `calc`.
- [ ] **Step 1: Tests first:** P-family angle row accepts `corresponding`, `alternate` → `wrong-parallel-reason`; sim row accepts `aa` only after both angle rows; sim chips never include `sas`; `whyOf` sim → `law:'aa'`; `groupsFor('congruence')` deep-equals old `GROUPS`; no chip short text equals bare `זוויות מתאימות`.
- [ ] **Step 2:** FAIL → implement → PASS. Commit `Proofs core: similarity reasons, roles and messages`.

### Task 9: Similarity figure families P, B, H, N

**Files:** create `families/p.js`, `b.js`, `h.js`, `n.js`, `families/sim-kit.js` (`assembleSim`, `liesSim`, `lengths`); test `families-sim.test.mjs`

**Interfaces:**
- Consumes: `kit.js` (`place`, `nameMap`, `honest`, `S`, `Ang`, `G`, `rename`, `cramped`), Task 7.
- Produces: `{ id, variants, build(R, variantId, opts) → simBase }`; `simBase = { family, variant, figure (+ scale, labels:{seg→number}), facts, just, given, canon, roles, sim:'sim', ratio:{p,q}, consequences, givenText, text }`; `opts.ask` = segment to ask (never a side shared by both triangles), labels only on the sides the problem uses. Variants `P-CC` (common + corresponding), `P-CC2`, `B-VA` (vertical + alternate), `B-AA`, `H-CR` (common + right), `N-CG` (common + given angle); each has `crossed` (H, N true). Stories: NOT this round (S§7.4).
- [ ] **Step 1: Tests first:** every variant × 1 000 seeds: builds; `liesSim` `[]` (S§7.4 limits); every fact `holds`; labels/vals multiples of 0.5; k ∈ [1.5,3]; scalene; H never asks AC; N's map pairs D with C.
- [ ] **Step 2:** FAIL → implement → PASS. Commit `Proofs: similarity families P, B, H, N with honesty tests`.

### Task 10: Similarity types (levels 1–4) and `present()`

**Files:** create `types/sim-parts.js` (key `6.`, shape `parts`), `types/sim-side.js` (`7.`, `side`), `types/prove-sim.js` (`8.`, `prove`), `types/sim-calc.js` (`9.`, `then`); modify `types/index.js`, `subjects.js` (similarity `types`, `theorems`, `demos`, `live:true`), `core.js` (`present` per shape), `src/admin/pages/review/model.js` (`EXTRA_CHAPTERS.proofs` + keys 6–9); test `types-sim.test.mjs`

**Interfaces:**
- Produces: types with `make(R, level, variant, avoid, ctx)` / `remake(meta)` (contract of `prove-congruence.js`), `warm: []` (filled in Task 13). Families: sim-parts P,B; sim-side P,B; prove-sim P,B at stages 1–2, + H,N at לבד variant B; sim-calc P,B, + H at לבד. sim-calc's first מודרך proof prefers a template proved in prove-sim (`ctx.prefer`). sim-side/sim-calc end with `prop` (only the needed pairs) + `val`.
- [ ] **Step 1: Tests first:** each type × stage × variant, 200 seeds: `remake(meta)` deep-equal; `present` steps ⊂ `canon`; `decisionsOf(view) > 0`; crossed families never at stages 1–2; similarity demos build and their marks are facts.
- [ ] **Step 2:** FAIL → implement → PASS. Add keys 6–9 to `src/home/chapters.js` and their `chapterInfo.js` lines (drafts). Commit `Proofs: similarity levels 1–4`.

### Task 11: Ratio row, number row, keypad, pair tapping

**Files:** `session.js`, `ProofScreen.jsx`, `Tray.jsx`, `ProofRows.jsx`, `signs.jsx` (`St` for new kinds), `styles.js`, `texts.js`, `mastery.js` (`RULES.MAX_TRIES_NUM`); create `Keypad.jsx`; tests `session.test.mjs`

**Interfaces:**
- Produces: the number is a statement decision `st = {kind:'val', x, v}` (snapshot/restore keep it); `RULES.MAX_TRIES_NUM = 3`; format slips (`''`, `'.'`, leading zero like `06`, > 6 chars) give a note and use no try. Wrong value = flipped-ratio answer → `st.numFlip` (`ratio-flip`); else `st.numCalc` (`calc`). מודרך chips: right, flipped, add-slip — whole/x.5, distinct. Keypad at ביחד/לבד: `0–9 . ⌫` + `זו התשובה`, LTR box, class `prf-kp`; confirm the site-wide `src/components/Keypad.jsx` does not attach (check its selector; opt out). At לבד a prop is built by tapping side pairs (`{t:'pair', a, b}`; complete → `checkProp`). Work line under the prop row: substitution from labels; cross-multiplication only at מודרך.
- [ ] **Step 1: Tests first:** right → `fb ok`; flipped → `st.numFlip`; slip → `st.numCalc`; `'06'` → no try used; 3 wrong → filled; snapshot mid-number → restore → same decision open; walking every similarity type's canon with first accepted reasons/values ends `isDone`.
- [ ] **Step 2:** FAIL → implement → PASS. Phone check: sim-calc at לבד with the keypad open — open row and number box both visible at 375×667. Commit `Proofs: ratio and number rows, keypad, pair tapping`.

### Task 12: Similarity ending motion

**Files:** `figure-core.js` (`motionMatrix` for an `anchorOf(p)` of kind `sim`: scale k + rotation/flip), `ProofFigure.jsx`; test `figure.test.mjs`
- [ ] **Step 1: Test first:** P/B/H/N samples: the final matrix maps △1's screen points onto △2's (1e-6) along the `sim` map.
- [ ] **Step 2:** FAIL → implement → PASS; reduced motion = both triangles flash once. Commit `Proofs: similarity ending`.

### Task 13: Warm-up S1–S5 and rescue inside the subject

**Files:** `warmup-core.js` (`S1`–`S5`), `Warmup.jsx` (keypad for S4, yes/no for S5), `mastery.js` (`ERR`, `ERR_WARM`, `cleanQueued` accepts `S1`–`S5`), `ProofChapter.jsx` (`prevInSubject` replaces `TYPES[idx-1]`), similarity types' `warm`, `texts.js`; tests `warmup.test.mjs`, `mastery.test.mjs`

**Interfaces:**
- `ERR` = existing order + `ratio-flip`, `non-matching-sides`, `calc`, `wrong-parallel-reason`; `ERR_WARM` → `S2`, `S3`, `S4`, `S1`. Warm lists: sim-parts `['S5','S2','S3','W2']`, sim-side `['S2','S3','S4']`, prove-sim `['S1','S2','W2']`, sim-calc `['S1','S3','S4','W2']`.
- [ ] **Step 1: Tests first:** each S-kind × 200 seeds: `checkTask(task, task.answer)` true, a wrong answer false; `record` with `errs:{calc:2}` twice not clean → `{step:1, warm:'S4'}`; old `queued:{step:1,warm:'W3'}` still loads; rescue step 3 from `prove-sim` names `sim-side`, from `sim-parts` the warm-up.
- [ ] **Step 2:** FAIL → implement → PASS. Commit `Proofs: similarity warm-up, rescue inside the subject`.

### Task 14: Exam level per subject + "שולטים בנושא"

**Files:** create `types/exam.js` (`cong-exam` key `5. חפיפה – כמו במבחן`, `sim-exam` key `10. דמיון – כמו במבחן`, shape `exam`, `live:true`); modify `core.js` (`present` for `exam`), `mastery.js`, `ProofRows.jsx` + `ProofScreen.jsx` (section letters + goal lines), `ProofChapter.jsx`, `EndCard.jsx`, `subjects.js`, `src/admin/pages/review/model.js` (keys 5, 10), `texts.js`; test `exam.test.mjs`

**Interfaces:**
- Problem: from a random family of the subject (incl. crossed and words givens); `sections:[{letter, targets:[factId], goalKey, goalVars}]` from canon (S§8): congruence א words-row (if any) / ב congruence / ג conclusion (else א/ב); similarity א sim / ב prop / ג val. `target` = all section targets.
- `mastery.js`: `emptyType({ start })`; `typeState(state, id, { start:3 })` for exam types; `record(ts, level, rec, { …, exam:true })` → no fast track, rescue steps 2/3 → `{ step:'exam' }`; `variantFor` → `{variant:'B', counted:true}` for exam; `examOpen(state, subjectId)` = the subject's last proof type `level >= 3`; `subjectMastered(state, subjectId)` = exam type `level >= 4`; `cleanQueued` accepts `{step:'exam'}`.
- UI: one tab visible `לבד`, `data-mp-key="רמה 3"`; locked line `lbl.examLocked`; exam rescue card `ui.rescueExam` (practise the previous level / continue here); end card `ui.mastered` on the level-up to 4.
- [ ] **Step 1: Tests first:** 200 seeds per subject: sections in order, targets in canon, section ב needs א's target, `remake` deep-equal; `examOpen` false at last proof level 2, true at 3; exam: 2 perfect proofs do NOT level up, 3 clean of 4 do; a not-clean streak never yields `{step:2}`; `seedFromServer` with `5. חפיפה – כמו במבחן › רמה 3`, win ≥ 3 → `subjectMastered(…,'congruence')`.
- [ ] **Step 2:** FAIL → implement → PASS. Insert keys 5 and 10 into `src/home/chapters.js` (key order) + `chapterInfo.js`. Commit `Proofs: exam level per subject and subject mastery`.

### Task 15: Care details

**Files:** `ProofChapter.jsx`, `Topic.jsx`, `texts.js`, `styles.js`
- [ ] **Step 1:** Similarity first visit with `prove-congruence` level < 3: quiet line `lbl.simNudge` = "דמיון דומה מאוד להוכחת חפיפה. אפשר להתחיל כאן." (no block).
- [ ] **Step 2:** Meta line: progress to "שולטים בנושא"; switcher tick on a mastered subject. `node --test` PASS; commit `Proofs: where-am-I and nudges`.

### Task 16: Full verification and review handoff

- [ ] `node --test src/topics/proofs/*.test.mjs src/lib/mp-key.test.mjs src/admin/review/*.test.mjs` PASS; `python3 tools/verify-logic.py` → "math and text untouched"; `npx next build` → success.
- [ ] Saved progress: a pre-update device state for all four congruence types shows the same stages; a `zz` test account on the LOCAL database still seeds levels from server rows.
- [ ] Live check: on localhost both subjects show; the home railway shows proofs with all 10 levels in key order and `?ch` links open each; `canShow` unit tests still pass.
- [ ] Phone pass (WebKit 375×667 + iPhone-size scroll video, frame by frame): each subject/level/stage, theorem page + sheet, keypad, exam, switcher, `?ch` for keys 1–10; scroll smooth down and up; every menu opened. Desktop pass.
- [ ] Stop every dev server/browser started. Write Sulaiman's review list (S§13 + every new `NEW_DRAFTS` key) to `design/proofs-review/2026-11-23-sulaiman.md`. Commit.
- [ ] Merge to `main`, push and deploy mathix per CLAUDE.md (Abed: "show it live"), then check the live site on a phone width.
