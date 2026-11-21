# Proofs section ("הוכחות"), phase 1: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the hidden geometry-proofs section at `/topics/proofs`: four proof types, a warm-up and three fading levels each, where the drawing fills up as the proof grows and every student can always finish.

**Architecture:** A pure-JS core (fact graph + checker + seeded generators + mastery rules, all under `node --test`) with no React and no DOM. A thin React layer on top (one SVG figure, rows, a bottom tray, an end card) that only renders what the core decides. Progress is saved on the device; the existing answer tracker picks up events from the page's class names, with no database change.

**Tech Stack:** Next.js 16 / React 19 (already installed), plain CSS shipped as a string from `styles.js`, inline SVG, `node --test`. No new dependency.

**Spec:** `docs/superpowers/specs/2026-11-21-proofs-design.md` (binding). Section numbers below ("§7.2") point into it. Where this plan and the spec disagree, the spec wins, except the items in "Decisions this plan makes".

**Visual reference:** the mockup the owner approved. Task 1 copies it to `design/proofs/mockup.html` (the scratchpad copy can vanish). Its figure code (ticks, arcs, hit shapes, `viewBox 0 0 320 196`, pair colours) and its interactions are the look to match; the spec's **(upgrade: …)** notes override it.

**Working folder:** the git worktree `/Users/abedshalgam/MathProject/.claude/worktrees/proofs`, branch `proofs`. Never `cd` to `/Users/abedshalgam/MathProject`. Do not push or deploy.

## Global Constraints

Copied from spec §3 (and the project's CLAUDE.md / DESIGN.md). Every task includes these.

- **Own folder.** Everything in `src/topics/proofs/` plus `app/dev/proofs/page.tsx` and `src/dev/ProofsLab.jsx`. Three hand-added lines in `src/topics/registry.js` (TOPICS, LOADERS, STYLES) with the same warning comment as `new`. No other project file changes (one exception: see "Decisions", D1).
- **Sulaiman's code.** Never touch anything between `BEGIN ORIGINAL` / `END ORIGINAL` in any `Topic.jsx`. Read `src/topics/triangles/Topic.jsx` drawing helpers for ideas only; do not import them. `python3 tools/verify-logic.py` must still say "math and text untouched".
- **CSS.** Prefix `pf-` for every class, keyframe and custom property, scoped under `#root`. **No generic `@property`** (only prefixed, e.g. `--pf-…`). Layout in `@layer legacy`, look from `src/styles/mp.css` tokens (`--ink`, `--line`, `--ok-*`, `--bad-*`, `--a-50…--a-900`, `--r*`, `--sh-*`, `--ease-out`). Font Rubik (already global). No letter-spacing on Hebrew. Do not import duel CSS.
- **Colour.** `data-topic="orange"` (the coral geometry accent). Coral only for "now" (active row, primary button) and "goal". Green/red only for right/wrong. Pair colours: `#0284c7` (blue), `#7c3aed` (violet), `#0d9488` (teal), always together with a count (ticks / arcs).
- **Hidden.** Reachable only at `/topics/proofs`. Not in `src/home/catalog.js`, not in `src/home/chapters.js`, no link from home. `noindex, nofollow` on the page; no sitemap entry. A "note for the team" strip like the `new` module.
- **No database change.** No migration, no new function, no edge function.
- **Tracking contract (§10.4).** Proof type = `.ch-btn` with text `"<n>. <name>"`; level = `.sub-tab`. Right first try → a small new `.fb.ok` node; wrong try → `.fb.err`; neutral notes, hints, filled steps, right-on-second-try → class `pf-note` only. Clean end → small `.banner` node; end with a filled step → `pf-end` (no `.banner`). Every decision sits in a `.step-card` with a `.step-label`.
  - Never put class `done`, `err`, `correct` or `wrong` on a `.step-card` / `.card` / `.choice-btn` (the tracker would count it).
  - A feedback node must be **newly mounted** (change its React `key`), have **≤ 40 descendants**, and appear **≤ 1.6 s** after the student's tap.
  - No button text may contain `בדוק`, `בדיקה`, `אשר`, `אישור` or the character `✓` (the tracker treats it as a check button). Check marks are SVG icons.
- **Hebrew text exactly as the spec drafts it** (§6.1, §6.3, §7, §9). All of it lives in `texts.js` and `reasons.js`, nowhere else. A Hebrew prefix is never glued to a maths island ("לקודקוד {D}", not "ל-{D}"). Where the spec has no draft, write the shortest plain sentence, plural address, and add its key to `NEW_DRAFTS` in `texts.js` (the review sheet prints them for Sulaiman). No emoji.
- **Chapter and sub-tab texts are database keys:** `1. קוראים את הנתון`, `2. מחפיפה לשוויונות`, `3. הוכחת חפיפה`, `4. חפיפה ואז מסקנה`; `חימום`, `רמה 1`, `רמה 2`, `רמה 3`.
- **Design rules.** 40 px minimum for anything pressed (chips 44); labels never on a line (place by measuring); motion = transform/opacity only; `prefers-reduced-motion` = no motion; nothing loops; no typing at any level; SVG always `direction: ltr`; maths in `pf-m` islands (`direction:ltr; unicode-bidi:isolate; white-space:nowrap`).
- **Pure files stay pure.** `core.js`, `session.js`, `mastery.js`, `reasons.js`, `texts.js`, `figure-core.js`, `warmup-core.js`, `families/*`, `types/*` import only by relative path with the `.js` extension (no `@/`, no React, no `window`, no `Date.now()`, no `Math.random()`), so `node --test` can load them. Randomness comes in as `R` (`makeR(seeded(n))` from `../new/core.js`); the day and storage come in as arguments.
- **Checks before a task is done:** `node --test src/topics/proofs/*.test.mjs` (all green), `python3 tools/verify-logic.py` (last line says "math and text untouched"), and, for any task that adds or changes a `.jsx` / `.tsx` / `styles.js` / registry file, `npx next build` (passes).
- **Nothing left running.** Any dev server, browser or `supabase start` a task launches is stopped before the task ends.
- **Commits.** One commit per task on branch `proofs`, message `Proofs: <what>`. No push, no deploy.

## Decisions this plan makes (flag to the lead if any is wrong)

| # | Decision | Why |
|---|---|---|
| D1 | `noindex` is set on the server: `hidden: true` on the registry entry and three lines in `app/topics/[slug]/page.tsx` `generateMetadata` (`robots: { index:false, follow:false }` when hidden). This is the only file touched outside §3's list. | The topic code loads only in the browser, so a tag rendered inside `Topic.jsx` is not in the HTML a crawler receives. §3 demands both "noindex on the page" and "no other file"; they cannot both hold. |
| D2 | Tests are split over several `*.test.mjs` files (one per pure module); `proofs.test.mjs` keeps the §6.6 generator sweep. | The check command is a glob; separate implementers do not collide. |
| D3 | A pure reducer `session.js` holds one proof in progress (tries, hint rung, decision states). | §8 decision states must be testable without a browser; §14 leaves the state shape to the builder. |
| D4 | At Level 3 the congruence row's statement decision **is** the vertex matching (label `התאמת קודקודים`); choosing the two triangles is only a selection. `טענה · חפיפה` is the label of the Level-1 statement gap and the Level-2 tile. | §7.2 says "This is one decision". |
| D5 | The `רמה 1` tab is never locked; the landing's main button leads through the warm-up first. | §7.1 "never blocks"; §9.2's lock text only fits levels 2–3. |
| D6 | `required` = every fact on **any** justification path to the target(s), not only `canon`. | Goal 4: an alternative valid path must not be called "not needed". |
| D7 | Statements use our own `pf-m` island with inline SVG signs; `M` from `rich.jsx` is not used (its `nw-m` CSS is not loaded on this page). | §11 "Signs". |
| D8 | The dev lab page is created early (Task 8) as a bare harness and finished in Task 21. | UI tasks need a place to be seen before the registry wiring. |
| D9 | The tracking check reads the tracker's outgoing request body in a headless browser instead of running `supabase start`. | Same evidence, no Docker left running. |

## Review Focus

Conditions the spec implies but does not list as tests. Each has a test in the task that owns the code.

1. **Storage is missing, full or holds junk** (private mode, an old or hand-edited value): the section must work with empty progress and never throw. → Task 7 (`load` tests), Task 14 (open-proof restore).
2. **A double tap** on a chip, a tile or "מ.ש.ל" within one frame: one decision, one tracker event, one history record. → Task 9 (reducer ignores an action on a closed decision), Task 13 (button guard).
3. **Leaving in the middle by another route** (tapping another type button or sub-tab, browser back, sign-out) must follow the "left in the middle" rule, not lose or double-count the proof. → Task 14.
4. **Server rows that do not look like ours** (no `" › "`, an unknown type name, `רמה 9`): ignored; a level is never lowered. → Task 7.
5. **A short or sideways screen** (375×550 visible, 667×375 landscape) and a long given line: the drawing stays visible, the tray never covers more than 40% of the height, nothing scrolls sideways except the given strip. → Task 22.

---

## File Structure

```
src/topics/proofs/
  reasons.js          reason ids, short/full wording, Level-3 groups (§6.3)
  texts.js            every Hebrew message, hint, label and button text, keyed; tx(key, vars)
  core.js             normal forms, truth in coordinates, checker, present() (§6.2, §10.2, §7)
  session.js          one proof in progress: actions → decision states + effects (§8, §9.1)
  mastery.js          constants block, clean / level-up / fast track / rescue, storage (§8, §10.3)
  figure-core.js      figure → screen layout: parts, hit shapes, marks, labels, chooser, ending motion
  warmup-core.js      W1–W7 task generators and the warm-up flow rule (§7.1)
  families/           kit.js (names, turn/mirror, honesty check) · x.js k.js z.js t.js two.js · cevian.js (type-1 triangle)
  types/              index.js · prove-congruence.js · then-conclusion.js · congruent-parts.js · read-given.js
  signs.jsx           Sign (∢ △ ≅ ↔ as inline SVG), St (a statement island), Tx (a text with islands)
  ProofFigure.jsx     the SVG: parts, hit shapes, marks, goal style, focus, selection, ending motion
  ProofRows.jsx       one-line finished rows + row detail
  Tray.jsx            active row, chips, tiles, options, hint button, feedback line
  TapBuild.jsx        Level-3 pieces: preview chip, chooser, parts list, vertex matching, two-step pick
  ProofScreen.jsx     screen C: header, figure, given strip, rows, tray; drives session.js
  EndCard.jsx         "מ.ש.ל" result, four dots, notebook page, level-up, round end
  Warmup.jsx          screen B
  ProofChapter.jsx    one type: landing, sub-tabs, flow, mastery, rescue cards, open-proof restore
  Topic.jsx           .hdr + .ch-btns (4 types) → <ProofChapter>; team strip
  styles.js           layout in @layer legacy + pf-* under #root
  fixtures.mjs        test-only: the §10.1 X-SAS problem and one over-determined proof
  *.test.mjs          core, session, mastery, texts, figure, families, warmup, proofs (generator sweep)
app/dev/proofs/page.tsx + src/dev/ProofsLab.jsx     every template, level and state; printable review sheet
design/proofs/mockup.html                            the approved mockup (reference only, not deployed)
```

### Shared shapes (used by every task; the single source is this section)

```js
// Parts and statements
seg  = 'AO'                                    // two point names; order free
ang  = { v:'O', r:['A','C'] }                  // vertex + one point on each ray
tri  = ['A','O','C']
st   = { kind:'seg', x:seg, y:seg }
     | { kind:'ang', x:ang, y:ang, right?:true }      // right:true → shown "∢ADB = ∢ADC = 90°"
     | { kind:'cong', map:[['A','B'],['O','O'],['C','D']] }   // triangle 1 = the first letters

// Problem (§10.1, unchanged except: target may be a list; givenText; traps; meta)
problem = { id, type, template, seed, level, variant, family, theorem,
  text:[{he, m:[]}], givenText:[{facts:[id], form:'eq'|'words', word?:reasonId, he?, m?}],
  figure:{ points, lines, segs, angles, tris, motion }, facts, just, given, target, canon, roles,
  tiles:{ wrong:[{st, why}] },                 // why: 'goal'|'consequence'|'letter-swap'|'word'|'position'|'next-letter'|'kind-mix'
  traps:{ [normKey]:{kind, textKey, vars} } }  // a false statement with its own message

// Roles (hints, texts, step labels)
ROLE = 'given' | 'given-more' | 'given-words' | 'vertical' | 'common' | 'congruence' | 'matching' | 'conclusion' | 'partner'
// Error kinds (§8)
ERR  = ['goal-as-known','looks-equal','too-early','wrong-theorem','wrong-matching','wrong-source','wrong-word','false-statement']
// Decision states (§8)
STATE = 'solo' | 'helped' | 'missed' | 'filled'
// Proof record
rec = { n, solo, helped, missed, filled, variant, tpl, day }
// Type ids = file names: 'read-given' (1) · 'congruent-parts' (2) · 'prove-congruence' (3) · 'then-conclusion' (4)
// Template ids: '1-a'…'1-j' · '2-a'…'2-f' · '3-X-SAS' … '3-2-SSS' (14) · '4-X-SAS-1' … '4-T-ASA-3' (33)
```

---

### Task 1: Words — `reasons.js`, `texts.js`, mockup copy

**Files:**
- Create: `src/topics/proofs/reasons.js`, `src/topics/proofs/texts.js`, `src/topics/proofs/texts.test.mjs`
- Create: `design/proofs/mockup.html` (copy of `/private/tmp/claude-501/-Users-abedshalgam-MathProject/55d7e78f-fe67-49b4-8344-c1ef758d2577/scratchpad/proofs/plan.html`; if that file is gone, skip and say so in the task report)

**Interfaces:**
- Produces (`reasons.js`):
  - `REASONS: { [id]: { id, short, full, group } }` for the 14 ids of §6.3, wording copied character for character (`common-angle` and `alternate` have `full: null`).
  - `GROUPS: [{ id, he, reasons:[id] }]` in this order: `written` "כתוב בשאלה" → `given` · `definition` "הגדרה" → `bisector, median, midpoint, altitude` · `seen` "רואים בציור" → `common-side, common-angle, vertical` · `theorem` "משפט חפיפה" → `sas, asa, sss` · `follows` "נובע מהחפיפה" → `cp-sides, cp-angles`.
  - `THEOREMS = ['sas','asa','sss']`, `CP = ['cp-sides','cp-angles']`, `DEFS = ['bisector','median','midpoint','altitude']`, `groupOf(id) → groupId | null`.
- Produces (`texts.js`):
  - `T: { [key]: string }` with `{name}` placeholders for maths islands and `{{name}}` for plain Hebrew inserts.
  - `tx(key, vars = {}) → [{ t:'he', v } | { t:'m', v }]`; throws on an unknown key or a missing variable.
  - `LABELS` (step labels, §10.4): `stmt(role)` / `reason(role)` → `טענה · נתון`, `נימוק · נתון`, `טענה · רואים בציור`, `נימוק · רואים בציור`, `טענה · חפיפה`, `נימוק · משפט חפיפה`, `טענה · מסקנה`, `נימוק · מסקנה`, and `matching: 'התאמת קודקודים'`. Role → word: given, given-more, given-words → נתון · vertical, common → רואים בציור · congruence → חפיפה / משפט חפיפה · conclusion, partner → מסקנה.
  - `NEW_DRAFTS: string[]` (keys whose text is not in the spec).
  - Keys, each holding the text of the matching spec row, in the row order of the spec tables:
    - `hint.<role>.1`, `hint.<role>.2` for the 9 roles (§9.1 table).
    - `why.given`, `why.given-words`, `why.vertical`, `why.common`, `why.sas`, `why.asa`, `why.sss`, `why.concl-side`, `why.concl-angle`, `why.partner` (§9.2 "After a right answer").
    - `st.written`, `st.goalEarly`, `st.congEarly`, `st.consEarly`, `st.notNeeded`, `st.unprovable`, `st.falseSeg`, `st.falseAng`, `st.letterSwap`, `st.word.median`, `st.word.bisector`, `st.word.altitude`, `st.partner`, `st.notAsked`, `st.matching`, `st.matchingShared`, `st.kinds` (§9.2 "Statement chosen").
    - `rs.given.vertical`, `rs.given.common`, `rs.fact.theorem`, `rs.fact.cp`, `rs.seen.given`, `rs.vertical.alternate`, `rs.vertical.common`, `rs.words.otherDef`, `rs.cong.asa1`, `rs.cong.sss2`, `rs.cong.sas1`, `rs.cong.noAngle`, `rs.cong.given`, `rs.cong.cp`, `rs.concl.given`, `rs.concl.theorem`, `rs.concl.otherCp`, `rs.other`, `rs.short` (§9.2 "Reason chosen").
    - `ui.filled`, `ui.endClean`, `ui.endHelped`, `ui.levelUp`, `ui.typeDone`, `ui.lessHelp`, `ui.round`, `ui.rescue1`, `ui.rescue3`, `ui.warmDone`, `ui.locked` (§9.2 "Other texts").
    - `btn.hint` רמז · `btn.hint2` עוד רמז · `btn.show` הראו לי · `btn.add` להוסיף שורה · `btn.parts` רשימת חלקים · `btn.cancel` ביטול · `btn.back` חזרה · `btn.next` הבא · `btn.go` קדימה · `btn.qed` מ.ש.ל · `btn.more` הוכחה נוספת · `btn.finish` סיום · `btn.swap` הוכחה אחרת · `btn.start` מתחילים · `btn.continue` ממשיכים.
    - `lbl.whatReason` מה הנימוק? · `lbl.whereFrom` מאיפה יודעים? · `lbl.leans` על אילו שורות זה נשען? · `lbl.notebook` כך כותבים את זה במחברת · `lbl.given` נתון: · `lbl.toProve` צ"ל: · `lbl.goal` צריך להוכיח · `lbl.claim` טענה · `lbl.reason` נימוק · `lbl.done` הוכחות שהשלמתם: {{n}} · `lbl.dots` {{k}} מתוך 4 · `lbl.marked` סומן בציור · `lbl.byOrder` (החפיפה לפי סדר הקודקודים) · `lbl.planL3` קודם שלושה שוויונות, אחר כך החפיפה. · `lbl.show` הראו בציור · `lbl.leadRows` אילו שורות מובילות לחפיפה? · `lbl.planTris` באילו שני משולשים נמצאים {x}, {y}? · `lbl.rescueCard` נעצור רגע ונחזק דבר אחד. · `lbl.segs` קטעים · `lbl.angs` זוויות · `lbl.tris` משולשים · `lbl.team` מוסתר עד אישור · `lbl.row` שורה {{n}} · `lbl.theSeg` הקטע · `lbl.theAng` הזווית · `lbl.theTri` המשולש · `lbl.equals` שווה · `lbl.congruent` חופף · `lbl.cant` אי אפשר לקבוע.
    - Warm-up prompts (§7.1 table): `w.W1` … `w.W7`; the explanation after a miss `w.W1.why` … `w.W7.why` and the rescue skill names `skill.W1` … `skill.W7` are not drafted in the spec → write them and list them in `NEW_DRAFTS`. Same for the four landing lines `about.<type id>`.

- [ ] **Step 1: Write the failing tests** in `texts.test.mjs`

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { REASONS, GROUPS, THEOREMS, CP, groupOf } from './reasons.js';
import { T, tx, LABELS, NEW_DRAFTS } from './texts.js';

test('reasons: the 14 ids and their exact chips', () => {
  assert.deepEqual(Object.keys(REASONS).sort(), ['alternate','altitude','asa','bisector','common-angle','common-side','cp-angles','cp-sides','given','median','midpoint','sas','sss','vertical']);
  assert.equal(REASONS.sas.short, 'צ.ז.צ'); assert.equal(REASONS.sas.full, 'משפט חפיפה צ.ז.צ');
  assert.equal(REASONS.vertical.full, 'זוויות קודקודיות שוות זו לזו');
  assert.equal(REASONS['cp-sides'].short, 'צלעות מתאימות במשולשים חופפים');
  assert.equal(REASONS.median.full, 'תיכון מחבר קודקוד עם אמצע הצלע שמולו');
  assert.equal(REASONS.alternate.full, null);
  assert.ok(!Object.values(REASONS).some((r) => r.short === 'זוויות מתאימות בין ישרים מקבילים'));   // not in phase 1
  assert.ok(!Object.values(REASONS).some((r) => /ז\.ז\.צ|צ\.צ\.ז/.test(r.short)));
});
test('groups: five, in order, every non-alternate reason in exactly one', () => {
  assert.deepEqual(GROUPS.map((g) => g.he), ['כתוב בשאלה','הגדרה','רואים בציור','משפט חפיפה','נובע מהחפיפה']);
  const all = GROUPS.flatMap((g) => g.reasons);
  assert.equal(new Set(all).size, 13); assert.equal(groupOf('alternate'), null); assert.equal(groupOf('vertical'), 'seen');
});
test('texts: exact spec sentences', () => {
  assert.equal(T['st.goalEarly'], 'זה מה שצריך להוכיח. אי אפשר להשתמש בו לפני שהוכחנו אותו.');
  assert.equal(T['rs.short'], 'הנימוק לא מתאים. נסו שוב.');
  assert.equal(T['ui.endClean'], 'מ.ש.ל. הוכחה נקייה.');
  assert.equal(T['rs.cong.sss2'], 'יש רק שני זוגות צלעות. במשפט צ.צ.צ צריך שלושה.');
  assert.equal(T['hint.common.2'], 'צלע תמיד שווה לעצמה.');
  assert.equal(LABELS.reason('congruence'), 'נימוק · משפט חפיפה'); assert.equal(LABELS.stmt('given'), 'טענה · נתון');
  assert.equal(LABELS.matching, 'התאמת קודקודים');
});
test('tx: islands, and no Hebrew prefix glued to one', () => {
  assert.deepEqual(tx('st.congEarly', { n: '2' }).filter((p) => p.t === 'm').map((p) => p.v), ['2']);
  assert.throws(() => tx('no.such.key')); assert.throws(() => tx('st.congEarly', {}));
  for (const k of Object.keys(T)) {
    assert.ok(!/[א-ת]-?\{[^{]/.test(T[k]), `glued prefix in ${k}`);          // "ל-{D}" or "ל{D}"
    if (k.startsWith('btn.')) assert.ok(!/בדוק|בדיקה|אשר|אישור|✓/.test(T[k]), `check word in ${k}`);
    assert.ok(!/\p{Extended_Pictographic}/u.test(T[k]), `emoji in ${k}`);
  }
});
test('every undrafted text is declared', () => {
  for (const k of NEW_DRAFTS) assert.ok(k in T, k);
  for (const k of ['w.W1.why','w.W7.why','skill.W4','about.prove-congruence']) assert.ok(NEW_DRAFTS.includes(k), k);
});
```

- [ ] **Step 2: Run** `node --test src/topics/proofs/texts.test.mjs` — expected: FAIL (modules not found).
- [ ] **Step 3: Write `reasons.js` and `texts.js`** to the Interfaces above. Copy each sentence from the spec tables; do not rephrase.
- [ ] **Step 4: Run** the test again — expected: PASS. Then copy the mockup file.
- [ ] **Step 5: Commit** `Proofs: reasons and texts (spec §6.3, §9)`.

---

### Task 2: `core.js` part 1 — normal forms and truth in the coordinates

**Files:**
- Create: `src/topics/proofs/core.js`, `src/topics/proofs/fixtures.mjs`, `src/topics/proofs/core.test.mjs`

**Interfaces:**
- Consumes: `dist`, `angle` from `../new/chapters/geometry/geo.js`.
- Produces (`core.js`):
  - `segKey(seg) → string` (letters sorted: `'OA' → 'AO'`).
  - `rayKey(fig, v, p) → string`: the ray from `v` through `p`; two points on the same line of `fig.lines` and on the same side of `v` give the same key.
  - `angKey(fig, ang) → string`, `triKey(tri) → string`.
  - `norm(fig, st) → string` (§6.2): unordered pair of segments; unordered pair of angles by rays; a congruence = the set of three unordered vertex pairs (so all 6 consistent orders and both sides-first are equal).
  - `measure(fig, part) → number` (a length, or degrees for an angle).
  - `holds(fig, st, tol = 1e-6) → boolean`: true in the coordinates. `right:true` also needs both angles = 90. A congruence holds when the three side pairs under the map have equal lengths.
  - `show(st) → string` (`'AO = OB'`, `'∢AOC = ∢BOD'`, `'∢ADB = ∢ADC = 90°'`, `'△AOC ≅ △BOD'`) and `say(st) → string` (the Hebrew sentence of §11.3: `'הקטע AO שווה לקטע OB'`, `'הזווית AOC שווה לזווית BOD'`, `'המשולש AOC חופף למשולש BOD'`).
  - `partsOf(st) → part[]`, `kindOf(part) → 'seg'|'ang'|'tri'`.
- Produces (`fixtures.mjs`):
  - `xsas()` → the §10.1 problem with the mockup coordinates `A:[62,40] B:[258,156] C:[104,170] D:[216,26] O:[160,98]`, facts `a, b, c, cong, goal, e1 (∢OAC = ∢OBD), e2 (∢OCA = ∢ODB)`, `type:'then-conclusion'`.
  - `over()` → a kite `A:[0,0] C:[10,0] B:[3,4] D:[3,-4]`, given `a: AB = AD`, `b: CB = CD`, `g: ∢BAC = ∢DAC`, `k: AC = AC` (common-side), `cong` with **two** justifications `{reasons:['sss'], needs:['a','b','k']}` and `{reasons:['sas'], needs:['a','g','k']}`, `target:'cong'`.

- [ ] **Step 1: Write the failing tests**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { norm, holds, show, say, segKey, measure } from './core.js';
import { xsas, over } from './fixtures.mjs';

const F = xsas().figure;
const S = (x, y) => ({ kind: 'seg', x, y });
const A = (v, r) => ({ v, r });
test('norm: segment statements ignore order and direction', () => {
  assert.equal(norm(F, S('AO', 'OB')), norm(F, S('BO', 'OA'))); assert.notEqual(norm(F, S('AO', 'OB')), norm(F, S('AO', 'CO')));
  assert.equal(segKey('OA'), 'AO');
});
test('norm: an angle is its two rays (∢OAC is ∢BAC when O is on AB)', () => {
  assert.equal(norm(F, { kind: 'ang', x: A('A', ['O', 'C']), y: A('B', ['O', 'D']) }), norm(F, { kind: 'ang', x: A('B', ['D', 'A']), y: A('A', ['C', 'B']) }));
  assert.notEqual(norm(F, { kind: 'ang', x: A('O', ['A', 'C']), y: A('O', ['B', 'D']) }), norm(F, { kind: 'ang', x: A('O', ['A', 'D']), y: A('O', ['B', 'C']) }));
});
test('norm: all 6 vertex orders and both sides-first are one statement', () => {
  const k = norm(F, { kind: 'cong', map: [['A', 'B'], ['O', 'O'], ['C', 'D']] });
  assert.equal(norm(F, { kind: 'cong', map: [['O', 'O'], ['C', 'D'], ['A', 'B']] }), k);
  assert.equal(norm(F, { kind: 'cong', map: [['D', 'C'], ['B', 'A'], ['O', 'O']] }), k);
  assert.notEqual(norm(F, { kind: 'cong', map: [['A', 'D'], ['O', 'O'], ['C', 'B']] }), k);
});
test('holds: only what is true in the coordinates', () => {
  assert.equal(holds(F, S('AO', 'OB')), true); assert.equal(holds(F, S('AC', 'BD')), true);
  assert.equal(holds(F, S('AD', 'CB')), true);            // true, though not a fact of the graph
  assert.equal(holds(F, S('AO', 'CO')), false);
  assert.equal(holds(F, { kind: 'cong', map: [['A', 'B'], ['O', 'O'], ['C', 'D']] }), true);
  assert.equal(holds(F, { kind: 'cong', map: [['A', 'D'], ['O', 'O'], ['C', 'B']] }), false);
  assert.equal(holds(over().figure, S('AB', 'AD')), true);
  assert.ok(Math.abs(measure(F, 'AO') - Math.hypot(98, 58)) < 1e-9);
});
test('show / say', () => {
  assert.equal(show(S('AO', 'OB')), 'AO = OB'); assert.equal(show({ kind: 'cong', map: [['A', 'B'], ['O', 'O'], ['C', 'D']] }), '△AOC ≅ △BOD');
  assert.equal(show({ kind: 'ang', x: A('D', ['A', 'B']), y: A('D', ['A', 'C']), right: true }), '∢ADB = ∢ADC = 90°');
  assert.equal(say(S('AO', 'OB')), 'הקטע AO שווה לקטע OB'); assert.equal(say({ kind: 'cong', map: [['A', 'B'], ['O', 'O'], ['C', 'D']] }), 'המשולש AOC חופף למשולש BOD');
});
```

- [ ] **Step 2: Run** `node --test src/topics/proofs/core.test.mjs` — expected: FAIL.
- [ ] **Step 3: Implement** the functions and the two fixtures. `show` names an angle `∢` + first ray point + vertex + second ray point, as given.
- [ ] **Step 4: Run** — expected: PASS.
- [ ] **Step 5: Commit** `Proofs: statement normal forms and coordinate truth`.

---

### Task 3: `core.js` part 2 — the graph checker

**Files:**
- Modify: `src/topics/proofs/core.js`, `src/topics/proofs/core.test.mjs`

**Interfaces:**
- Consumes: Task 2; `THEOREMS`, `CP`, `DEFS` from `./reasons.js`.
- Produces:
  - `targets(problem) → string[]`; `required(problem) → Set<factId>` (D6); `extras(problem) → Set<factId>`.
  - `findFact(problem, st) → factId | null` (by `norm`).
  - `provable(problem, done, factId) → boolean` (some justification has all its `needs` in `done`).
  - `isDone(problem, done) → boolean` (all targets in `done`).
  - `classify(problem, done, st) → { c, fact?, sub?, kind?, textKey?, vars? }` with `c ∈ 'ok'|'written'|'early'|'extra'|'unprovable'|'false'` (§10.2). Rules, in order:
    1. fact found and in `done` → `written` / `st.written`.
    2. fact found, not provable → `early`; `sub:'congruence'` (kind `too-early`, `st.congEarly`, `vars.n` = how many of the cheapest justification's needs are done) is checked **before** `sub:'target'` (kind `goal-as-known`, `st.goalEarly`), else `sub:'consequence'` (kind `looks-equal`, `st.consEarly`).
    3. fact found, provable, required → `ok`.
    4. fact found, provable, not required → `extra`; `st.notAsked` when `problem.type === 'congruent-parts'`, else `st.notNeeded`.
    5. no fact, `problem.traps[norm]` exists → `false` with the trap's `kind`, `textKey`, `vars`.
    6. no fact, a `cong` statement over the right two triangles with a wrong map → `false`, kind `wrong-matching`, `st.matchingShared` when a shared vertex is not matched to itself, else `st.matching`.
    7. no fact, `holds` → `unprovable` / `st.unprovable`.
    8. else `false`, kind `false-statement`, `st.falseSeg` or `st.falseAng`.
  - `checkReason(problem, done, factId, reasonId) → { ok:true } | { ok:false, kind, textKey, vars }`: ok when some justification `j` has `reasonId ∈ j.reasons` and `j.needs ⊆ done`. Otherwise the first matching row of §9.2 "Reason chosen" (keys of Task 1), ending in `rs.other` (kind `wrong-source`). For a congruence the `wrong-theorem` key is computed from the justified needs: count side pairs and angle pairs → `rs.cong.asa1` (asa chosen, one angle pair) · `rs.cong.sss2` (sss chosen, two side pairs) · `rs.cong.sas1` (sas chosen, one side pair) · `rs.cong.noAngle` (asa or sas chosen, three side pairs).
  - `checkMatching(problem, tri1, ordered) → { ok:true } | { ok:false, kind:'wrong-matching', textKey, vars }`: ok when every pair `(tri1[i], ordered[i])` is in the `cong` map read in either direction consistently.
  - `canonRows(problem) → [{ fact, st, reason }]` (the app's own writing: `canon` order, first reason of the first justification).

- [ ] **Step 1: Write the failing tests** (append)

```js
import { classify, checkReason, checkMatching, required, isDone, canonRows } from './core.js';
const P = xsas(), fact = (id) => P.facts[id];
test('classify: every case of §10.2', () => {
  assert.deepEqual(classify(P, [], fact('a')).c, 'ok');
  assert.equal(classify(P, [], { kind: 'seg', x: 'BO', y: 'OA' }).fact, 'a');
  assert.equal(classify(P, ['a'], fact('a')).c, 'written');
  let r = classify(P, [], fact('cong'));   assert.deepEqual([r.c, r.sub, r.kind, r.textKey, r.vars.n], ['early', 'congruence', 'too-early', 'st.congEarly', 0]);
  assert.equal(classify(P, ['a', 'c'], fact('cong')).vars.n, 2);
  r = classify(P, [], fact('goal'));        assert.deepEqual([r.c, r.sub, r.kind], ['early', 'target', 'goal-as-known']);
  r = classify(P, [], fact('e1'));          assert.deepEqual([r.c, r.sub, r.kind], ['early', 'consequence', 'looks-equal']);
  r = classify(P, ['a', 'b', 'c', 'cong'], fact('e1')); assert.deepEqual([r.c, r.textKey], ['extra', 'st.notNeeded']);
  r = classify(P, [], { kind: 'seg', x: 'AD', y: 'CB' }); assert.deepEqual([r.c, r.textKey], ['unprovable', 'st.unprovable']);
  r = classify(P, [], { kind: 'seg', x: 'AO', y: 'CO' }); assert.deepEqual([r.c, r.kind, r.textKey], ['false', 'false-statement', 'st.falseSeg']);
  r = classify(P, ['a', 'b', 'c'], { kind: 'cong', map: [['A', 'D'], ['O', 'O'], ['C', 'B']] }); assert.deepEqual([r.c, r.kind], ['false', 'wrong-matching']);
  r = classify(P, ['a', 'b', 'c'], { kind: 'cong', map: [['A', 'O'], ['O', 'B'], ['C', 'D']] }); assert.equal(r.textKey, 'st.matchingShared');
  assert.equal(classify(P, ['a', 'b', 'c'], { kind: 'cong', map: [['C', 'D'], ['A', 'B'], ['O', 'O']] }).c, 'ok');
});
test('any valid order is accepted; nothing is compared with canon', () => {
  for (const order of [['a', 'c', 'b'], ['b', 'a', 'c'], ['c', 'b', 'a']]) {
    const done = [];
    for (const id of [...order, 'cong', 'goal']) { assert.equal(classify(P, done, fact(id)).c, 'ok', id); done.push(id); }
    assert.equal(isDone(P, done), true);
  }
  assert.deepEqual(canonRows(P).map((x) => x.fact), ['a', 'c', 'b', 'cong', 'goal']);
});
test('checkReason: the table of §9.2', () => {
  const miss = (done, f, rs) => { const x = checkReason(P, done, f, rs); return [x.ok, x.kind, x.textKey]; };
  assert.equal(checkReason(P, [], 'a', 'given').ok, true);
  assert.deepEqual(miss([], 'a', 'vertical'), [false, 'wrong-source', 'rs.given.vertical']);
  assert.deepEqual(miss([], 'a', 'common-side'), [false, 'wrong-source', 'rs.given.common']);
  assert.deepEqual(miss([], 'a', 'sas'), [false, 'too-early', 'rs.fact.theorem']);
  assert.deepEqual(miss([], 'a', 'cp-sides'), [false, 'goal-as-known', 'rs.fact.cp']);
  assert.deepEqual(miss([], 'c', 'given'), [false, 'wrong-source', 'rs.seen.given']);
  assert.deepEqual(miss([], 'c', 'alternate'), [false, 'wrong-source', 'rs.vertical.alternate']);
  assert.deepEqual(miss([], 'c', 'common-angle'), [false, 'wrong-source', 'rs.vertical.common']);
  const d3 = ['a', 'c', 'b'];
  assert.equal(checkReason(P, d3, 'cong', 'sas').ok, true);
  assert.deepEqual(miss(d3, 'cong', 'asa'), [false, 'wrong-theorem', 'rs.cong.asa1']);
  assert.deepEqual(miss(d3, 'cong', 'sss'), [false, 'wrong-theorem', 'rs.cong.sss2']);
  assert.deepEqual(miss(d3, 'cong', 'given'), [false, 'wrong-source', 'rs.cong.given']);
  assert.deepEqual(miss(d3, 'cong', 'cp-angles'), [false, 'wrong-source', 'rs.cong.cp']);
  const d4 = [...d3, 'cong'];
  assert.equal(checkReason(P, d4, 'goal', 'cp-sides').ok, true);
  assert.deepEqual(miss(d4, 'goal', 'cp-angles'), [false, 'wrong-source', 'rs.concl.otherCp']);
  assert.deepEqual(miss(d4, 'goal', 'given'), [false, 'goal-as-known', 'rs.concl.given']);
  assert.deepEqual(miss(d4, 'goal', 'sas'), [false, 'wrong-source', 'rs.concl.theorem']);
});
test('a fact given in words accepts the definition and "given"; another definition is wrong-word', () => {
  const W = xsas(); W.just.a = [{ reasons: ['midpoint', 'given'], needs: [] }]; W.roles.a = 'given-words';
  assert.equal(checkReason(W, [], 'a', 'midpoint').ok, true); assert.equal(checkReason(W, [], 'a', 'given').ok, true);
  const x = checkReason(W, [], 'a', 'median'); assert.deepEqual([x.kind, x.textKey], ['wrong-word', 'rs.words.otherDef']);
});
test('an over-determined proof: both theorems are right, each on its own premises', () => {
  const O = over();
  assert.deepEqual([...required(O)].sort(), ['a', 'b', 'cong', 'g', 'k']);
  assert.equal(checkReason(O, ['a', 'b', 'k'], 'cong', 'sss').ok, true);  assert.equal(checkReason(O, ['a', 'b', 'k'], 'cong', 'sas').ok, false);
  assert.equal(checkReason(O, ['a', 'g', 'k'], 'cong', 'sas').ok, true);  assert.equal(checkReason(O, ['a', 'g', 'k'], 'cong', 'sss').ok, false);
  assert.equal(classify(O, ['a', 'g', 'k'], O.facts.cong).c, 'ok');       assert.equal(classify(O, ['a', 'k'], O.facts.cong).c, 'early');
  assert.equal(checkReason(O, ['a', 'g', 'k'], 'cong', 'sss').textKey, 'rs.cong.sss2');
});
test('checkMatching: any consistent order', () => {
  assert.equal(checkMatching(P, ['A', 'O', 'C'], ['B', 'O', 'D']).ok, true);
  assert.equal(checkMatching(P, ['C', 'A', 'O'], ['D', 'B', 'O']).ok, true);
  assert.equal(checkMatching(P, ['B', 'O', 'D'], ['A', 'O', 'C']).ok, true);
  assert.equal(checkMatching(P, ['A', 'O', 'C'], ['D', 'O', 'B']).kind, 'wrong-matching');
});
```

- [ ] **Step 2: Run** — expected: FAIL (functions missing).
- [ ] **Step 3: Implement.** Row role comes from `problem.roles[factId]`; a fact with no role and a `cp-*` justification is `conclusion` (or `partner` in type 2).
- [ ] **Step 4: Run** `node --test src/topics/proofs/*.test.mjs` — expected: PASS.
- [ ] **Step 5: Commit** `Proofs: graph checker (any order, any valid reason)`.

---

### Task 4: `figure-core.js` — from a figure to a screen layout

**Files:**
- Create: `src/topics/proofs/figure-core.js`, `src/topics/proofs/figure.test.mjs`

**Interfaces:**
- Consumes: `segKey`, `angKey`, `triKey`, `kindOf` (Task 2); `add sub mul dot unit dist lerp centroid distPointSeg textW TH` from `../new/chapters/geometry/geo.js`.
- Produces:
  - `partId(part) → string`: `'s:AO'`, `'a:O:AC'` (by rays), `'t:ACO'`.
  - `layout(fig, W = 320, H = 196) → L` where `L = { W, H, pts:{A:[x,y]}, segs:[{id,a,b}], tris:[{id,pts}], angles:[{id,v,p1,p2,r,d}], labels:[{p,x,y,w,h}], hits:[{id,kind,shape,…}], scale }`. Screen pixels, y down, fitted with room for labels; maths coordinates of `fig.points` have y up and are not changed.
    - Hit shapes: segments = a line with stroke width 22, pulled back from its ends (28 px where three or more parts meet, 12 px otherwise); angles = a wedge of radius 30; triangles = their fill. Every hit shape spans ≥ 40 px in one direction when the part is long enough.
    - Labels: pushed outward from the figure's centre; then moved until `labelErrors` is empty.
  - `labelErrors(L) → string[]`: a label box touching a segment, leaving the view box, or covering a hit shape's centre.
  - `markGeom(L, part, mark) → { lines:[[x1,y1,x2,y2]], arcs:[d], square:d|null }`: 1–3 ticks (6 px half-length, 4.6 px apart) at a segment's middle; 1–3 arcs (radius 18, +4 each) for an angle; a small square for 90°.
  - `partsNear(L, [x, y], r = 22) → partId[]` (nearest first; for the chooser).
  - `partName(part) → { m, he }` (`{ m:'AO', he:'הקטע AO' }`, `{ m:'∢AOC', he:'הזווית AOC' }`, `{ m:'△AOC', he:'המשולש AOC' }`).
  - `motionMatrix(L, problem) → [a,b,c,d,e,f]`: the rigid motion (SVG matrix, screen space) that carries triangle 1 onto triangle 2 along `cong.map`: half-turn for `motion.kind === 'half-turn'`, reflection for `'flip'`, turn or mirror + slide for `'slide'`.

- [ ] **Step 1: Write the failing tests**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { layout, labelErrors, markGeom, partsNear, partId, partName, motionMatrix } from './figure-core.js';
import { xsas, over } from './fixtures.mjs';

const P = xsas(), L = layout(P.figure);
test('layout: everything inside 320×196, no label on a line', () => {
  assert.equal(L.W, 320); assert.equal(L.H, 196);
  for (const p of Object.values(L.pts)) { assert.ok(p[0] >= 8 && p[0] <= 312 && p[1] >= 8 && p[1] <= 188); }
  assert.deepEqual(labelErrors(L), []); assert.deepEqual(labelErrors(layout(over().figure)), []);
  assert.equal(L.labels.length, 5); assert.equal(L.segs.length, 6); assert.equal(L.tris.length, 2);
});
test('ids and names', () => {
  assert.equal(partId('OA'), 's:AO'); assert.equal(partId(['C', 'A', 'O']), 't:ACO');
  assert.equal(partId({ v: 'A', r: ['O', 'C'] }), partId({ v: 'A', r: ['C', 'B'] }));
  assert.deepEqual(partName('AO'), { m: 'AO', he: 'הקטע AO' }); assert.equal(partName({ v: 'O', r: ['A', 'C'] }).he, 'הזווית AOC');
});
test('marks: tick and arc counts', () => {
  assert.equal(markGeom(L, 'AO', { ticks: 1 }).lines.length, 1); assert.equal(markGeom(L, 'AC', { ticks: 3 }).lines.length, 3);
  assert.equal(markGeom(L, { v: 'O', r: ['A', 'C'] }, { arcs: 2 }).arcs.length, 2);
});
test('chooser: a tap near the crossing point lists several parts, a tap on a side lists one', () => {
  const O = L.pts.O; assert.ok(partsNear(L, [O[0] - 6, O[1]]).length >= 2);
  const mid = [(L.pts.A[0] + L.pts.C[0]) / 2, (L.pts.A[1] + L.pts.C[1]) / 2]; assert.deepEqual(partsNear(L, mid), ['s:AC']);
});
test('ending motion carries triangle 1 onto triangle 2 along the matching', () => {
  const m = motionMatrix(L, P), ap = ([x, y]) => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];
  for (const [u, v] of P.facts.cong.map) { const q = ap(L.pts[u]); assert.ok(Math.hypot(q[0] - L.pts[v][0], q[1] - L.pts[v][1]) < 0.5, `${u}→${v}`); }
});
```

- [ ] **Step 2: Run** `node --test src/topics/proofs/figure.test.mjs` — expected: FAIL.
- [ ] **Step 3: Implement.** Use the mockup's `ticks` / `arcD` maths as the starting point.
- [ ] **Step 4: Run** — expected: PASS.
- [ ] **Step 5: Commit** `Proofs: figure layout, hit shapes, marks, ending motion`.

---

### Task 5: Families X and K + the family kit ("the drawing must not lie")

**Files:**
- Create: `src/topics/proofs/families/kit.js`, `families/x.js`, `families/k.js`, `src/topics/proofs/families.test.mjs`

**Interfaces:**
- Consumes: `holds`, `measure`, `norm` (core); `layout`, `labelErrors` (figure-core); `seeded`, `makeR` from `../../new/core.js`.
- Produces (`kit.js`):
  - `pickNames(R, n, { crossing = false }) → string[]`: `n` capital letters from sets without look-alikes (never `I`, never `O` unless `crossing`, then `O` is the crossing point); no set that spells a word; also sets like `K,P,N` / `S,T,R`.
  - `place(points, R) → points`: turn in steps of 15°, optional mirror.
  - `lies(base) → string[]` (empty = honest), the §6.6 tests 1–5: (1) every fact in `facts` holds at 1e-6; (2) every pair of same-kind tappable parts that is **not** a fact differs by ≥ 8% (lengths) or ≥ 6° (angles); (3) no angle within 6° of 90° unless a `right` fact, no triangle within 8% of isosceles unless `base.isosceles`; (4) for `sas` the angle lies between the two sides in both triangles, for `asa` the side between the two angles, and the three premises agree with one vertex matching; (5) `labelErrors(layout(figure))` is empty.
  - `honest(build, R, tries = 200) → base`: calls `build` until `lies` is empty; throws after `tries`.
- Produces (each family file): `export default { id, variants: { 'X-SAS': { theorem:'sas' }, … }, build(R, variantId, opts) }`.
  - `opts = { words?: boolean, names?: string[] }`.
  - `build → base = { family, variant, theorem, isosceles?, figure, facts, just, given, canon, roles, cong:'cong', consequences:[factId ×3], givenText }`. `facts` holds the three premises, `cong`, and all three remaining matching pairs (the consequences), each with a `mark` (`ticks`/`arcs` 1–3, `color` 1–3). `canon` ends at `cong`. `figure.motion` is set (`half-turn` about O for X; `flip` over the shared side for K).
  - Variants and their given facts exactly as §6.4: `X-SAS` (AO = OB, CO = OD; free ∢AOC = ∢BOD, `vertical`), `X-ASA` (AO = OB, ∢OAC = ∢OBD), `K-SSS` (AB = AD, CB = CD; free AC = AC, `common-side`), `K-SAS` (AB = AD, ∢BAC = ∢DAC), `K-ASA` (∢BAC = ∢DAC, ∢BCA = ∢DCA).
  - With `opts.words`, the word-givens of §6.4 are used and the fact's justification becomes `{ reasons:[<definition>, 'given'] }`, role `given-words`: X-SAS "O אמצע הקטע AB" (`midpoint`) or "הקטעים AB ו-CD חוצים זה את זה בנקודה O" (both facts, `midpoint`); K-SAS "AC חוצה את ∢BAD" (`bisector`). A plain equality keeps `['given']`.
  - Construction: X = two segments through O, each end reflected through O. K = B reflected over line AC gives D.

- [ ] **Step 1: Write the failing tests**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { seeded, makeR } from '../new/core.js';
import { lies, pickNames } from './families/kit.js';
import { classify, checkReason, isDone, canonRows, holds } from './core.js';
import X from './families/x.js'; import K from './families/k.js';

const RUNS = Number(process.env.RUNS || 3000);
const FAMILIES = [X, K];
test('inventory: X has 2 theorems, K has all 3', () => {
  assert.deepEqual(Object.keys(X.variants), ['X-SAS', 'X-ASA']); assert.deepEqual(Object.keys(K.variants), ['K-SSS', 'K-SAS', 'K-ASA']);
});
test('names: no look-alikes, O only as the crossing point', () => {
  const R = makeR(seeded(3));
  for (let i = 0; i < 500; i++) { const n = pickNames(R, 4); assert.ok(!n.includes('I') && !n.includes('O')); assert.equal(new Set(n).size, 4); }
  assert.ok(pickNames(R, 5, { crossing: true }).includes('O'));
});
for (const fam of FAMILIES) for (const v of Object.keys(fam.variants)) for (const words of [false, true]) {
  test(`${v}${words ? ' (words)' : ''}: ${RUNS} honest drawings, canon proof passes`, () => {
    const R = makeR(seeded(12345)); const seen = new Set();
    for (let i = 0; i < RUNS; i++) {
      const b = fam.build(R, v, { words });
      assert.deepEqual(lies(b), [], JSON.stringify(b.figure.points));
      assert.equal(b.theorem, fam.variants[v].theorem); assert.equal(b.consequences.length, 3);
      const p = { ...b, target: 'cong', type: 'prove-congruence', traps: {} }, done = [];
      for (const row of canonRows(p)) { assert.equal(classify(p, done, row.st).c, 'ok'); assert.equal(checkReason(p, done, row.fact, row.reason).ok, true); done.push(row.fact); }
      assert.equal(isDone(p, done), true);
      for (const c of b.consequences) assert.equal(holds(b.figure, b.facts[c]), true);
      seen.add(Object.keys(b.figure.points).join('') + JSON.stringify(Object.values(b.figure.points).map((q) => q.map(Math.round))));
    }
    assert.ok(seen.size >= 12, `only ${seen.size} different drawings`);
  });
}
test('lies() catches a drawing that lies', () => {
  const bad = structuredClone(X.build(makeR(seeded(1)), 'X-SAS', {}));
  const name = Object.keys(bad.figure.points).find((n) => n !== 'O'); const q = bad.figure.points[name];
  bad.figure.points[name] = [q[0] * 1.3 + 1, q[1]];                       // one end moved: a given equality is no longer true
  assert.ok(lies(bad).length > 0);
});
```

- [ ] **Step 2: Run** `node --test src/topics/proofs/families.test.mjs` — expected: FAIL.
- [ ] **Step 3: Implement** `kit.js`, `x.js`, `k.js`. Each `build` draws lengths and angles from ranges, calls `place`, and goes through `honest`.
- [ ] **Step 4: Run** — expected: PASS (3000 runs per variant in under a minute; if slower, lower the rejection rate by narrowing ranges, not the checks).
- [ ] **Step 5: Commit** `Proofs: families X and K with honesty tests`.

---

### Task 6: Families Z, T, 2 and the type-1 triangle

**Files:**
- Create: `src/topics/proofs/families/z.js`, `t.js`, `two.js`, `cevian.js`
- Modify: `src/topics/proofs/families.test.mjs` (add to `FAMILIES`; add the cevian tests)

**Interfaces:**
- Consumes: Task 5 kit and the family contract.
- Produces: the same contract for
  - `Z` (`Z-SSS`: AB = CD, BC = DA · `Z-SAS`: AB = CD, ∢BAC = ∢DCA · `Z-ASA`: ∢BAC = ∢DCA, ∢BCA = ∢DAC; free AC = CA, `common-side`; motion `half-turn` about the middle of AC). Construction: D = A + C − B.
  - `T` (`T-SSS`: AB = AC, BD = DC · `T-SAS`: AB = AC, ∢BAD = ∢CAD · `T-ASA`: ∢BAD = ∢CAD, ∢ADB = ∢ADC; free AD = AD; motion `flip` over AD; `isosceles: true`; ∢ADB = ∢ADC carries `right:true`). Word-givens: T-SSS "AD תיכון לצלע BC" (`median`) or "D אמצע BC" (`midpoint`); T-SAS "AD חוצה את ∢BAC" (`bisector`); T-ASA "AD חוצה את ∢BAC" + "AD גובה לצלע BC" (`altitude`).
  - `two` (`2-SAS`, `2-ASA`, `2-SSS`; three given facts, no free fact; second triangle turned or mirrored beside the first; motion `slide`). No word-givens.
  - `cevian.js`: `export function build(R, spec) → { figure, lines:{ [name]: { word:'bisector'|'median'|'altitude'|'midpoint', gives: st, others:[st] } } }` for a triangle ABC with two lines; `spec = { lines:[{ word, from:0|1|2 }, …] }`. `gives` is what the word means; `others` are what the other two words would give for the same line (the wrong tiles of type 1). The triangle is clearly not isosceles; every `others` statement is false by ≥ 8% / ≥ 6°.

- [ ] **Step 1: Extend the tests**: `FAMILIES = [X, K, Z, T, TWO]`; add

```js
test('inventory: 14 variants; no family predicts the theorem', () => {
  assert.equal(FAMILIES.reduce((n, f) => n + Object.keys(f.variants).length, 0), 14);
  for (const f of FAMILIES) assert.ok(new Set(Object.values(f.variants).map((v) => v.theorem)).size >= 2, f.id);
  for (const f of [K, Z, T, TWO]) assert.equal(new Set(Object.values(f.variants).map((v) => v.theorem)).size, 3);
});
test(`cevian triangle: ${RUNS} drawings, the word is true and the other words are visibly false`, () => {
  const R = makeR(seeded(99));
  for (let i = 0; i < RUNS; i++) for (const word of ['bisector', 'median', 'altitude']) {
    const c = buildCevian(R, { lines: [{ word, from: 0 }, { word: R.pick(['bisector', 'median', 'altitude']), from: 1 }] });
    for (const l of Object.values(c.lines)) { assert.equal(holds(c.figure, l.gives), true); for (const o of l.others) assert.equal(holds(c.figure, o, 0.05), false); }
    assert.deepEqual(labelErrors(layout(c.figure)), []);
  }
});
```

- [ ] **Step 2: Run** — expected: FAIL. **Step 3: Implement.** **Step 4: Run** `node --test src/topics/proofs/*.test.mjs` — expected: PASS.
- [ ] **Step 5: Commit** `Proofs: families Z, T, 2 and the type-1 triangle`.

---

### Task 7: `mastery.js` — rules, rescue ladder, storage

**Files:**
- Create: `src/topics/proofs/mastery.js`, `src/topics/proofs/mastery.test.mjs`

**Interfaces:**
- Produces:
  - `RULES` (the one constants block, §8): `{ CLEAN_SOLO:0.8, WINDOW:4, NEED:3, FAST_MIN_PROOFS:2, FAST_MIN_DECISIONS:6, HIST:6, RECENT:6, RESCUE_STREAK:2, STUCK:6, MAX_TRIES:2, HINT3_WAIT_MS:4000, IDLE_MS:20000, ROUND:3, WARM_TASKS:4, WARM_EXTRA:2, WARM_CAP:8, WARM_PASS:[2,3], Q_BADGE_MS:2500, NEAR_PX:22 }`.
  - `ERR_WARM = { 'goal-as-known':'W6', 'too-early':'W6', 'looks-equal':'W2', 'wrong-theorem':'W4', 'wrong-matching':'W5', 'wrong-source':'W3', 'wrong-word':'W7', 'false-statement':'W1' }`.
  - `isClean(rec) → boolean` (`filled === 0 && solo / n >= 0.8`), `isPerfect(rec)` (`solo === n`).
  - `emptyType() → ts` = `{ level:1, walked:false, warm:{ done:false, kinds:{} }, hist:{1:[],2:[],3:[]}, count:{1:0,2:0,3:0}, done:0, lastHelp:null, recent:[], errs:{}, resc:{ stage:0, bad:0 }, force:null, retry:null }` (the §10.3 shape plus `walked`, `count`, `resc`, `force`, `retry`).
  - `record(ts, level, rec, { counted = true, errs = {}, filledReason = null } = {}) → { ts, event, rescue }`: pure (returns a new `ts`). `event ∈ null | 'level-up' | 'type-done'`; `rescue ∈ null | { step:1, warm } | { step:2 } | { step:3 }`. Always: `done += 1`, `lastHelp = n − solo`, `recent` gets `rec.tpl` (max 6). Counted only: push into `hist[level]` (max 6), `count[level] += 1`, add `errs`, then level-up check, then rescue check. A level-up sets `level + 1` (max 4), clears `errs`, `resc`, `force`. Never lowers a level; recording at a level below `ts.level` changes no level.
  - Level up (§8): 3 clean among the last 4 counted; or fast track: every counted proof at this level so far is perfect, ≥ 2 proofs and ≥ 6 decisions in total.
  - Rescue (§8): 2 counted not-clean in a row → `{ step:1, warm: ERR_WARM[most frequent error] }` (tie → the earlier kind in `ERR`; no errors → `W1`), `force:'A'`, stage 1. At stage ≥ 1, 2 more in a row → `{ step:2 }`, `force:'A'`. `count[level] === 6` with no level-up → `{ step:3 }` (takes priority that once). A clean proof resets the streak, not the stage.
  - `variantFor(ts, level) → { variant:'A'|'B', counted:boolean }`: Level 1 and `!ts.walked` → `A`, not counted; `ts.force === 'A'` or `count[level] === 0` → `A`, counted; else `B`, counted. `walked(ts) → ts`, `useForce(ts) → ts`.
  - `dots(ts, level) → boolean[]` (the last 4 counted, clean or not, oldest first, padded to 4 with `null`).
  - `lessHelp(ts, rec) → boolean` (`ts.lastHelp !== null && rec.n − rec.solo < ts.lastHelp`).
  - Storage (storage object injected; any throw or bad JSON → empty state):
    `whoKey(account) → 'g' | 'u:<id>'`, `KEY = 'mp:proofs:v1:'`, `OPEN_KEY = 'mp:proofs:open'`,
    `load(store, who) → { v:1, types:{} }`, `save(store, who, state) → boolean`, `typeState(state, typeId) → ts`,
    `adoptGuest(store, accountId)` (copy the guest key into an empty user key, once),
    `seedFromServer(state, rows, TYPES) → state` (§10.3: rows with `page === 'proofs.html'`; split `chapter` on `" › "`; `רמה N` → `level = max(level, N)` and `warm.done = true`; anything else ignored).

- [ ] **Step 1: Write the failing tests**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { RULES, ERR_WARM, isClean, emptyType, record, variantFor, dots, load, save, adoptGuest, seedFromServer, whoKey, KEY } from './mastery.js';

const rec = (n, solo, o = {}) => ({ n, solo, helped: 0, missed: n - solo - (o.filled || 0), filled: o.filled || 0, variant: 'B', tpl: o.tpl || '3-X-SAS', day: 1 });
const run = (ts, level, recs, opt) => { let out; for (const r of recs) { out = record(ts, level, r, opt); ts = out.ts; } return out; };
test('constants are the spec numbers', () => {
  assert.deepEqual([RULES.CLEAN_SOLO, RULES.WINDOW, RULES.NEED, RULES.FAST_MIN_PROOFS, RULES.FAST_MIN_DECISIONS, RULES.RESCUE_STREAK, RULES.STUCK, RULES.MAX_TRIES, RULES.HINT3_WAIT_MS, RULES.IDLE_MS, RULES.ROUND, RULES.WARM_CAP], [0.8, 4, 3, 2, 6, 2, 6, 2, 4000, 20000, 3, 8]);
  assert.equal(ERR_WARM['wrong-theorem'], 'W4'); assert.equal(ERR_WARM['looks-equal'], 'W2'); assert.equal(ERR_WARM['false-statement'], 'W1');
});
test('clean: 3–4 decisions all alone, 5–9 one slip, 10+ two; never with a filled step', () => {
  assert.equal(isClean(rec(3, 3)), true);  assert.equal(isClean(rec(3, 2)), false); assert.equal(isClean(rec(4, 3)), false);
  assert.equal(isClean(rec(5, 4)), true);  assert.equal(isClean(rec(9, 8)), true);  assert.equal(isClean(rec(9, 7)), false);
  assert.equal(isClean(rec(10, 8)), true); assert.equal(isClean(rec(10, 7)), false);
  assert.equal(isClean({ ...rec(10, 9), missed: 0, filled: 1 }), false);
});
test('level up: 3 clean among the last 4', () => {
  const C = rec(8, 7), N = rec(8, 5);
  assert.equal(run(emptyType(), 1, [N, C, C]).event, null);
  assert.equal(run(emptyType(), 1, [N, C, C, C]).event, 'level-up');
  assert.equal(run(emptyType(), 1, [C, N, C, C]).ts.level, 2);
  assert.equal(run(emptyType(), 1, [C, C, N, N, C]).event, null);          // last 4 = C N N C
});
test('fast track: first proofs all perfect, at least 2 proofs and 6 decisions', () => {
  assert.equal(run(emptyType(), 1, [rec(3, 3), rec(3, 3)]).event, 'level-up');
  assert.equal(run(emptyType(), 1, [rec(2, 2), rec(2, 2)]).event, null);    // 4 decisions
  assert.equal(run(emptyType(), 1, [rec(2, 2), rec(2, 2), rec(2, 2)]).event, 'level-up');
  assert.equal(run(emptyType(), 1, [rec(8, 8)]).event, null);               // one proof
  assert.equal(run(emptyType(), 1, [rec(8, 7), rec(8, 8)]).event, null);    // not "all perfect" → normal rule
});
test('never down; level 3 passed = 4 = type done; uncounted proofs change no level', () => {
  let ts = { ...emptyType(), level: 3 };
  assert.equal(run(ts, 3, [rec(8, 8), rec(8, 8)]).event, 'type-done'); assert.equal(run(ts, 3, [rec(8, 8), rec(8, 8)]).ts.level, 4);
  assert.equal(run(ts, 1, [rec(8, 0, { filled: 3 }), rec(8, 0, { filled: 3 })]).ts.level, 3);
  const u = run(emptyType(), 1, [rec(1, 1), rec(1, 1), rec(1, 1)], { counted: false });
  assert.deepEqual([u.ts.level, u.ts.done, u.ts.hist[1].length], [1, 3, 0]);
});
test('rescue ladder: 2 bad → warm-up of the commonest error + variant A; 2 more → worked example; 6 without level-up → kind card', () => {
  const N = rec(8, 4); let o = record({ ...emptyType(), level: 2 }, 2, N, { errs: { 'wrong-theorem': 2, 'too-early': 1 } });
  assert.equal(o.rescue, null);
  o = record(o.ts, 2, N, { errs: { 'wrong-theorem': 1 } });
  assert.deepEqual(o.rescue, { step: 1, warm: 'W4' }); assert.equal(variantFor(o.ts, 2).variant, 'A');
  o = record(o.ts, 2, N); assert.equal(o.rescue, null);
  o = record(o.ts, 2, N); assert.deepEqual(o.rescue, { step: 2 });
  o = record(o.ts, 2, N); o = record(o.ts, 2, N); assert.deepEqual(o.rescue, { step: 3 });
});
test('variants: Level 1 starts with an uncounted walk-through; a new level starts with a counted A', () => {
  assert.deepEqual(variantFor(emptyType(), 1), { variant: 'A', counted: false });
  assert.deepEqual(variantFor({ ...emptyType(), walked: true }, 1), { variant: 'A', counted: true });
  assert.deepEqual(variantFor({ ...emptyType(), walked: true, count: { 1: 1, 2: 0, 3: 0 } }, 1), { variant: 'B', counted: true });
  assert.deepEqual(dots(run(emptyType(), 1, [rec(8, 7), rec(8, 4)]).ts, 1), [true, false, null, null]);
});
const mem = () => { const m = {}; return { getItem: (k) => (k in m ? m[k] : null), setItem: (k, v) => { m[k] = String(v); }, m }; };
test('storage: junk, a missing store and a throwing store all give empty progress (Review Focus 1)', () => {
  const s = mem(); s.m[KEY + 'g'] = '{not json';
  assert.deepEqual(load(s, 'g'), { v: 1, types: {} });
  s.m[KEY + 'g'] = JSON.stringify({ v: 7, types: 'x' }); assert.deepEqual(load(s, 'g'), { v: 1, types: {} });
  assert.deepEqual(load(null, 'g'), { v: 1, types: {} });
  const boom = { getItem() { throw new Error('private'); }, setItem() { throw new Error('full'); } };
  assert.deepEqual(load(boom, 'g'), { v: 1, types: {} }); assert.equal(save(boom, 'g', { v: 1, types: {} }), false);
  assert.equal(whoKey(null), 'g'); assert.equal(whoKey({ id: 'ab12' }), 'u:ab12');
});
test('sign-in: the guest progress is copied once into an empty user key', () => {
  const s = mem(); save(s, 'g', { v: 1, types: { 'prove-congruence': { ...emptyType(), level: 2 } } });
  adoptGuest(s, 'ab12'); assert.equal(load(s, 'u:ab12').types['prove-congruence'].level, 2);
  save(s, 'g', { v: 1, types: {} }); adoptGuest(s, 'ab12'); assert.equal(load(s, 'u:ab12').types['prove-congruence'].level, 2);
});
test('server seed: highest "רמה N" row wins, never lowers, ignores rows that are not ours (Review Focus 4)', () => {
  const TYPES = [{ id: 'prove-congruence', button: '3. הוכחת חפיפה' }, { id: 'read-given', button: '1. קוראים את הנתון' }];
  const rows = [{ page: 'proofs.html', chapter: '3. הוכחת חפיפה › רמה 2', ok: 3 }, { page: 'proofs.html', chapter: '3. הוכחת חפיפה › חימום' },
    { page: 'triangles.html', chapter: '1. קוראים את הנתון › רמה 3' }, { page: 'proofs.html', chapter: '9. משהו › רמה 3' },
    { page: 'proofs.html', chapter: '1. קוראים את הנתון' }, { page: 'proofs.html', chapter: '1. קוראים את הנתון › רמה 9' }, { page: 'proofs.html', chapter: null }];
  let st = seedFromServer({ v: 1, types: {} }, rows, TYPES);
  assert.equal(st.types['prove-congruence'].level, 2); assert.equal(st.types['prove-congruence'].warm.done, true);
  assert.equal(st.types['read-given'] ? st.types['read-given'].level : 1, 1);
  st = seedFromServer({ v: 1, types: { 'prove-congruence': { ...emptyType(), level: 3 } } }, rows, TYPES);
  assert.equal(st.types['prove-congruence'].level, 3);
  assert.deepEqual(seedFromServer({ v: 1, types: {} }, null, TYPES), { v: 1, types: {} });
});
```

- [ ] **Step 2: Run** `node --test src/topics/proofs/mastery.test.mjs` — expected: FAIL. **Step 3: Implement.** **Step 4: Run** — expected: PASS.
- [ ] **Step 5: Commit** `Proofs: mastery rules, rescue ladder, device storage`.

---

### Task 8: `ProofFigure.jsx`, `signs.jsx`, base styles, bare dev lab

**Files:**
- Create: `src/topics/proofs/signs.jsx`, `ProofFigure.jsx`, `styles.js`, `src/dev/ProofsLab.jsx`, `app/dev/proofs/page.tsx`

**Interfaces:**
- Consumes: `layout`, `markGeom`, `partsNear`, `partName`, `partId`, `motionMatrix` (Task 4); `show`, `say`, `partsOf` (Task 2); `tx` (Task 1); families (Tasks 5–6).
- Produces:
  - `signs.jsx`: `Sign({ name })` with `name ∈ 'angle'|'tri'|'cong'|'match'` (inline SVG sized to the capital letters, `aria-label` זווית / משולש / חופף ל / מתאים ל); `St({ st, colors })` → `<span class="pf-m" dir="ltr" aria-label={say(st)}>` with signs in place of ∢ △ ≅ (`colors` = optional pair colour per letter position, for type 2 Level 1); `Tx({ k, vars })` → a text from `tx` with islands as `pf-m`; `Part({ part })` → a part name island.
  - `ProofFigure({ problem, marks, focus, selected, pulse, question, tappable, onPart, ending, label })`:
    - `marks: [{ fact, style:'on'|'goal' }]` — `on` = ticks/arcs in the fact's pair colour; `goal` = dashed coral outline, **no ticks, no arcs** (§7.6).
    - `focus`, `selected`, `pulse`, `question`: arrays of `partId`. Parts outside `focus` (when non-empty) draw at 55%. `question` shows the red "?" badge; the caller clears it after `RULES.Q_BADGE_MS`.
    - `tappable: false | ['seg','ang','tri']`. Each tappable part renders a hit shape with `role="button"`, `tabIndex=0`, `aria-label` = its Hebrew name, `aria-pressed` when selected, Enter/Space = tap, a visible focus ring.
    - `onPart(partId, near: partId[])` — `near` from `partsNear` at the pointer position (length ≥ 2 → the caller opens the chooser).
    - `ending: null | 'move' | 'tint'` — `move`: triangle 1's copy travels by `motionMatrix` in 600 ms once and returns; `tint`: a soft fill only. `prefers-reduced-motion` forces `tint`.
  - `styles.js` (default export = CSS string): `@layer legacy` layout for `.hdr`, `.ch-btns`, `.content`, `.sub-tabs`, `.banner` in coral (pattern: `src/topics/new/styles.js:3-17`), then the marker comment `/* ── pf ── */` and after it only `#root .pf-*` rules (Task 20's test reads everything after the marker). This task adds the figure, sign and island rules; later tasks append their own blocks under a `/* ── <name> ── */` comment.
  - Dev lab: `/dev/proofs` (`notFound()` when `process.env.VERCEL_ENV === 'production'`, pattern `app/dev/roots/page.tsx`). `ProofsLab` sets `document.documentElement.dataset.topic = 'orange'` while mounted, injects `styles.js`, wraps its content in `<div id="root">`, and reads `?view=figures` (this task): every family variant drawn three times (marks off / given marks on + goal style / all marks on + selection + question badge + ending button).

- [ ] **Step 1: Build `signs.jsx`, `ProofFigure.jsx`, `styles.js`** to the Interfaces. Lines are 2 px ink, the stage has the faint dotted background (wrap in `.svg-wrap`, `mp.css:851-858`, or a `pf-stage` with the same look), no box around the drawing. Marks draw in over 250 ms (opacity/transform only).
- [ ] **Step 2: Build the lab page.**
- [ ] **Step 3: Verify.** Run `npx next build` (passes), `node --test src/topics/proofs/*.test.mjs`, `python3 tools/verify-logic.py`. Then start `npx next dev -p 5187` in the background, open `http://localhost:5187/dev/proofs?view=figures` at 375 px and at 1280 px with playwright-core WebKit (see Task 22 for the launch snippet), save screenshots to the scratchpad, and look at them: all 14 variants drawn, no label on a line, goal parts dashed coral with no ticks, tick/arc counts 1-2-3 readable without colour, ∢ and △ the same height as the letters. **Stop the dev server** (`lsof -ti :5187 | xargs kill`; check `lsof -i :5187` prints nothing).
- [ ] **Step 4: Commit** `Proofs: the figure component, signs, base styles, dev lab`.

---

### Task 9: `session.js` — one proof in progress

**Files:**
- Create: `src/topics/proofs/session.js`, `src/topics/proofs/session.test.mjs`
- Modify: `src/topics/proofs/core.js` (add `present`), `core.test.mjs`

**Interfaces:**
- Consumes: checker (Task 3), `RULES` (Task 7), `LABELS` (Task 1), `GROUPS` (Task 1).
- Produces (`core.js`):
  - `present(problem, level, variant, ctx = {}) → view` (§7.2–7.4), `ctx = { counted: number, R }`:
    `view = { mode:'walk'|'fill'|'tiles'|'tap', pre:[factId], steps:[{ fact, ask:['statement'?, 'reason'?], options?:[st], chips?:number }], tiles:[{ id, st, fact|null, why? }], chipsN, whyLine:boolean, autoHint:boolean, shortFirst:boolean, plan:'tris'|'line'|null, ties:boolean, letters:boolean }`.

    | | mode | pre (written + justified at the start) | asks | chips | tiles | flags |
    |---|---|---|---|---|---|---|
    | 1-A | walk | none; the app writes every row on "הבא" | types 3/4: the theorem reason only · type 1: one statement gap · type 2: one partner gap | 3 | — | whyLine, autoHint, ties (types 3/4), plan `tris` (type 4), letters (type 2) |
    | 1-B | fill | every plain-equality given row | types 3/4: the reason of every other row (2–4), 4 chips; plus one statement gap (`options`: the congruence among 3 vertex orders, or the conclusion among 3) when `ctx.counted >= 2` · type 1: statement of each sentence from 3 options (reason then shown) · type 2: partner from the 3 parts of the other triangle (reason shown) | 4 | — | whyLine, autoHint, plan `tris` (type 4), letters (type 2) |
    | 2-A | tiles | types 3/4: the given rows · types 1/2: none | statement + reason of every other row | types 3/4: 6 · type 1: 6 · type 2: 4 | right tiles only (type 1: 2 right + 2 wrong; type 2: 3 right + 1 wrong) | whyLine, plan `tris` (type 4) |
    | 2-B | tiles | none | statement + reason of every row | types 3/4: 8 · types 1/2: 6 | all rows shuffled + the wrong tiles of `problem.tiles.wrong` (types 3/4: 2 · type 1: 6 tiles in all · type 2: 3 right + 3 wrong) | plan `tris` (type 4) |
    | 3-A | tap | none | statement + reason of every row | all (two-step) | — | whyLine, plan `line` (types 3/4) |
    | 3-B | tap | none | same | all (two-step) | — | shortFirst |

  - `reasonChips(problem, factId, n, R) → reasonId[]`: `n` shuffled chips containing every accepted reason of that fact plus the most tempting wrong ones for its role (given → `vertical`, `common-side`, a theorem, a `cp-*`; seen → `given`, the other "seen" reasons, `alternate` on family X only; congruence → the other two theorems, `given`, a `cp-*`; conclusion → the other `cp-*`, `given`, the theorem used; given-words → the other definitions). Never a chip outside phase 1.
  - `decisionsOf(view) → number`.
- Produces (`session.js`):
  - `start(problem, view) → s`; `s = { problem, view, done:[factId], rows:[{ fact, reason, by:'app'|'student' }], pending:null|{ fact }, cur:null|{ key, label, tries, rung, wrong:[id] }, decisions:[{ key, label, state }], errs:{}, nonSolo:number, ended:false }`.
  - `act(s, action) → { s, fx }`, pure. Actions: `{ t:'statement', st }` · `{ t:'reason', id }` · `{ t:'matching', tri1, order }` · `{ t:'hint' }` (raises the rung by one) · `{ t:'cancel' }` (drops `pending`; not a decision) · `{ t:'next' }` (Level 1 walk: the app writes the next row) · `{ t:'qed' }`.
    Effects `fx: [{ t:'fb', cls:'ok'|'err'|'note', key, vars } | { t:'mark', fact } | { t:'question', parts } | { t:'why', key, vars } | { t:'filled', fact, reason } | { t:'hint', rung, key, vars, parts } | { t:'end', clean }]`.
  - Rules (§8, §9.1):
    - A decision ends in one state: right on the first try with rung ≤ 1 → `solo`; right on the first try after rung 2 → `helped`; ≥ 1 wrong try then right → `missed`; rung 3, or `RULES.MAX_TRIES` wrong tries → `filled` (the app fills it: `fx filled` + `ui.filled`).
    - `fb.cls`: right on the first try → `ok`; right after a wrong try → `note`; a wrong try → `err`; neutral outcomes (`written`, `extra`, `unprovable`, different kinds) → `note`, **no decision, no try**. `early` is a wrong try for that statement.
    - A wrong reason chip is recorded in `cur.wrong` (the UI disables it); a second tap on it is ignored. Any action on a decision that is already closed is ignored (returns the same `s`, empty `fx`) — Review Focus 2.
    - `view.shortFirst`: the first wrong reason gives `rs.short` with the kind kept; the second gives the content text.
    - `view.autoHint`: the first wrong try also emits `hint` rung 1 (free).
    - Each wrong try adds its kind to `s.errs`.
    - `{ t:'qed' }` is accepted only when `isDone`; emits `{ t:'end', clean }` where `clean` = no `filled` decision (this decides `.banner` vs `pf-end`; mastery's `isClean` is separate).
  - `summary(s) → { n, solo, helped, missed, filled }`; `canSwapFree(s) → boolean` (`s.nonSolo === 0`); `snapshot(s) → json`, `restore(json, make) → s | null` (returns `null` for anything it cannot read).

- [ ] **Step 1: Write the failing tests** (`session.test.mjs`, using `xsas()`; a hand-written `view` of mode `tiles` with no `pre`)

```js
test('states: solo, helped, missed, filled', () => {
  let s = start(P, V), o;
  o = act(s, { t: 'statement', st: P.facts.a }); assert.equal(o.fx[0].cls, 'ok');                       // statement a: solo
  o = act(o.s, { t: 'reason', id: 'vertical' }); assert.deepEqual([o.fx[0].cls, o.fx[0].key], ['err', 'rs.given.vertical']);
  o = act(o.s, { t: 'reason', id: 'vertical' }); assert.deepEqual(o.fx, []);                             // disabled chip
  o = act(o.s, { t: 'reason', id: 'given' });    assert.equal(o.fx[0].cls, 'note');                      // right on try 2: not a tracked ok
  assert.deepEqual(o.s.decisions.map((d) => d.state), ['solo', 'missed']); assert.ok(o.fx.some((f) => f.t === 'mark' && f.fact === 'a'));
  o = act(o.s, { t: 'statement', st: P.facts.c });
  o = act(o.s, { t: 'hint' }); o = act(o.s, { t: 'hint' }); o = act(o.s, { t: 'reason', id: 'vertical' });
  assert.equal(o.s.decisions.at(-1).state, 'helped');
  o = act(o.s, { t: 'statement', st: P.facts.b }); o = act(o.s, { t: 'reason', id: 'sas' }); o = act(o.s, { t: 'reason', id: 'cp-sides' });
  assert.equal(o.s.decisions.at(-1).state, 'filled'); assert.ok(o.fx.some((f) => f.t === 'filled' && f.reason === 'given'));
  assert.deepEqual(o.s.errs, { 'wrong-source': 1, 'too-early': 1, 'goal-as-known': 1 });
});
test('neutral outcomes are not decisions; "too early" is a wrong try', () => {
  let o = act(start(P, V), { t: 'statement', st: { kind: 'seg', x: 'AD', y: 'CB' } });
  assert.deepEqual([o.fx[0].cls, o.fx[0].key, o.s.decisions.length, o.s.nonSolo], ['note', 'st.unprovable', 0, 0]);
  o = act(o.s, { t: 'statement', st: P.facts.goal }); assert.deepEqual([o.fx[0].cls, o.fx[0].key], ['err', 'st.goalEarly']);
  assert.ok(o.fx.some((f) => f.t === 'question')); assert.equal(o.s.nonSolo, 1);
  o = act(o.s, { t: 'statement', st: P.facts.a }); o = act(o.s, { t: 'cancel' }); assert.equal(o.s.pending, null); assert.equal(o.s.done.length, 0);
});
test('a clean run: 10 decisions solo, qed only at the end, a second qed is ignored (Review Focus 2)', () => {
  let s = start(P, V); assert.deepEqual(act(s, { t: 'qed' }).fx, []);
  for (const [f, r] of [['b', 'given'], ['a', 'given'], ['c', 'vertical'], ['cong', 'sas'], ['goal', 'cp-sides']]) { s = act(s, { t: 'statement', st: P.facts[f] }).s; s = act(s, { t: 'reason', id: r }).s; }
  assert.deepEqual(summary(s), { n: 10, solo: 10, helped: 0, missed: 0, filled: 0 });
  const e = act(s, { t: 'qed' }); assert.deepEqual(e.fx, [{ t: 'end', clean: true }]); assert.deepEqual(act(e.s, { t: 'qed' }).fx, []);
});
test('Level 3-B: the first wrong reason is short, the second explains', () => {
  let o = act(start(P, { ...V, mode: 'tap', shortFirst: true }), { t: 'statement', st: P.facts.a });
  o = act(o.s, { t: 'reason', id: 'vertical' }); assert.equal(o.fx[0].key, 'rs.short');
});
test('restore: junk gives null', () => { assert.equal(restore('{', () => P), null); assert.equal(restore(JSON.stringify({ v: 0 }), () => P), null); });
```
and in `core.test.mjs`:
```js
test('present: decisions per level for the X-SAS conclusion proof', () => {
  const R = makeR(seeded(1)), n = (l, v, c = 0) => decisionsOf(present(P, l, v, { counted: c, R }));
  assert.equal(n(1, 'A'), 1); assert.equal(n(1, 'B', 0), 3); assert.equal(n(1, 'B', 2), 4);
  assert.equal(n(2, 'A'), 6); assert.equal(n(2, 'B'), 10); assert.equal(n(3, 'A'), 10); assert.equal(n(3, 'B'), 10);
  assert.equal(present(P, 2, 'A', { R }).tiles.every((t) => t.fact), true);            // no wrong tiles in A
  assert.ok(present(P, 2, 'B', { R }).tiles.filter((t) => !t.fact).length <= 2);
  assert.deepEqual(present(P, 2, 'A', { R }).pre.sort(), ['a', 'b']);
  assert.equal(present(P, 3, 'B', { R }).shortFirst, true); assert.equal(present(P, 3, 'A', { R }).plan, 'line');
});
test('reasonChips: n chips, every accepted reason inside, "alternate" only on the X figure', () => {
  const R = makeR(seeded(2)); const c = reasonChips(P, 'c', 6, R);
  assert.equal(c.length, 6); assert.ok(c.includes('vertical')); assert.equal(new Set(c).size, 6);
  assert.ok(!reasonChips(over(), 'k', 8, R).includes('alternate'));
});
```

- [ ] **Step 2: Run** — expected: FAIL. **Step 3: Implement.** **Step 4: Run** `node --test src/topics/proofs/*.test.mjs` — expected: PASS.
- [ ] **Step 5: Commit** `Proofs: proof session rules and level presentation`.

---

### Task 10: Type 3 generator — `types/prove-congruence.js`, `types/index.js`, the generator sweep

**Files:**
- Create: `src/topics/proofs/types/prove-congruence.js`, `types/index.js`, `src/topics/proofs/proofs.test.mjs`

**Interfaces:**
- Consumes: families, `present`, checker, `honest`.
- Produces:
  - `types/index.js`: `TYPES` (array, in order) and `TABS = ['חימום','רמה 1','רמה 2','רמה 3']`, `tabOf(level)`, `typeById(id)`. A type = `{ id, n, name, button, warm:[W-ids], templates:[{ id, family, variant, theorem }], make(R, level, variant, avoid, ctx) }`. `button === \`${n}. ${name}\``. In this task only type 3 is real; the other three are added by Tasks 16–18 (leave their slots out; the tests below grow with them).
  - Type 3: `id:'prove-congruence'`, `n:3`, `name:'הוכחת חפיפה'`, `warm:['W1','W2','W3','W4']`, 14 templates `3-<variant>`.
  - `make(R, level, variant, avoid = { recent:[], last:null }, ctx = {}) → problem`: `target:'cong'`; `given` = the two (family 2: three) premises that are not the free fact; `canon` = fact, fact, fact, congruence; `text` + `givenText`; `tiles.wrong` chosen by §7.5 (for type 3: one true consequence not known yet → `why:'consequence'`; one letter-swap, tested false → `why:'letter-swap'` with a trap `st.letterSwap`); `id = template + ':' + seed`.
    - Variety rules (§6.4, §6.6): never a template in `avoid.recent` (last 6) unless nothing else is left; never the same family + theorem as `avoid.last`; **family 2 only when `variant === 'A'`**; word-givens (`opts.words`) only when `variant === 'B'` and `ctx.words` lists that word as met; `ctx.want` (a reason id) prefers a template whose proof uses that reason (the "second chance soon" rule of §9.1).

- [ ] **Step 1: Write the failing tests** (`proofs.test.mjs`)

```js
const RUNS = Number(process.env.RUNS || 3000);
test('section 6.1: button and tab texts are the database keys', () => {
  assert.equal(typeById('prove-congruence').button, '3. הוכחת חפיפה'); assert.deepEqual(TABS, ['חימום', 'רמה 1', 'רמה 2', 'רמה 3']);
});
test('type 3 has the 14 templates of §6.4', () => { assert.equal(typeById('prove-congruence').templates.length, 14); });
for (const type of TYPES) for (const level of [1, 2, 3]) for (const variant of ['A', 'B']) {
  test(`${type.id} L${level}-${variant}: ${RUNS} problems`, () => {
    const R = makeR(seeded(12345)); const seen = {}; let avoid = { recent: [], last: null };
    for (let i = 0; i < RUNS; i++) {
      const p = type.make(R, level, variant, avoid, { counted: i % 4, words: ['midpoint', 'bisector', 'median', 'altitude'] });
      assert.deepEqual(lies(p), [], p.id);                                             // §6.6 tests 1–5
      const view = present(p, level, variant, { counted: i % 4, R });
      // 6: the canonical proof passes; a shuffled valid order passes; each wrong tile is rejected with the intended kind
      for (const order of [canonRows(p).map((r) => r.fact), validShuffle(p, R)]) {
        const done = [];
        for (const f of order) { assert.equal(classify(p, done, p.facts[f]).c, 'ok', `${p.id} ${f}`); assert.equal(checkReason(p, done, f, p.just[f][0].reasons[0]).ok, true); done.push(f); }
        assert.equal(isDone(p, done), true);
      }
      for (const t of p.tiles.wrong) { const c = classify(p, p.given, t.st); assert.ok(c.c === 'early' || c.c === 'false', `${p.id} wrong tile is ${c.c}`); assert.equal(c.kind, { consequence: 'looks-equal', goal: c.kind, 'letter-swap': 'false-statement', word: 'wrong-word', position: 'wrong-matching', 'next-letter': 'wrong-matching', 'kind-mix': 'wrong-matching' }[t.why]); }
      assert.ok(p.tiles.wrong.length <= (type.n >= 3 ? 2 : 4));
      if (variant === 'A') assert.equal(view.tiles.filter((t) => !t.fact).length <= (type.n === 1 ? 2 : type.n === 2 ? 1 : 0), true);
      if (variant === 'B' && type.n >= 3) assert.notEqual(p.family, '2');             // family 2 is for entry proofs only
      if (variant === 'A') assert.ok(p.givenText.every((g) => g.form === 'eq') || type.n === 1);
      assert.ok(!(avoid.last && avoid.last.family === p.family && avoid.last.theorem === p.theorem && p.theorem), 'same family + theorem twice in a row');
      (seen[p.template] ||= new Set()).add(JSON.stringify([Object.keys(p.figure.points), Object.values(p.figure.points).map((q) => q.map(Math.round))]));
      avoid = { recent: [p.template, ...avoid.recent].slice(0, 6), last: { family: p.family, theorem: p.theorem } };
    }
    for (const [tpl, set] of Object.entries(seen)) assert.ok(set.size >= 12, `${tpl}: only ${set.size} different instances`);   // 7
  });
}
test('variety: in 200 draws of type 3 no family maps to a single theorem', () => {
  const R = makeR(seeded(5)), by = {}; let avoid = { recent: [], last: null };
  for (let i = 0; i < 200; i++) { const p = typeById('prove-congruence').make(R, 2, 'B', avoid, {}); (by[p.family] ||= new Set()).add(p.theorem); avoid = { recent: [p.template, ...avoid.recent].slice(0, 6), last: { family: p.family, theorem: p.theorem } }; }
  for (const [f, s] of Object.entries(by)) assert.ok(s.size >= 2, f);
});
test('"second chance": ctx.want = vertical gives the X figure', () => {
  const R = makeR(seeded(8)); for (let i = 0; i < 50; i++) assert.equal(typeById('prove-congruence').make(R, 2, 'B', { recent: [], last: null }, { want: 'vertical' }).family, 'X');
});
```
`validShuffle(p, R)` is a test helper: a random order of the required facts in which each fact comes after its needs. `lies(problem)` accepts a problem as well as a family base.

- [ ] **Step 2: Run** `node --test src/topics/proofs/proofs.test.mjs` — expected: FAIL. **Step 3: Implement.** **Step 4: Run** all tests — expected: PASS.
- [ ] **Step 5: Commit** `Proofs: type 3 generator and the generator sweep`.

---

### Task 11: Proof screen for Levels 1 and 2 — `ProofRows.jsx`, `Tray.jsx`, `ProofScreen.jsx`

**Files:**
- Create: `src/topics/proofs/ProofRows.jsx`, `Tray.jsx`, `ProofScreen.jsx`
- Modify: `src/topics/proofs/styles.js` (blocks `head`, `strip`, `rows`, `tray`, `chips`, `fb`), `src/dev/ProofsLab.jsx` (`?view=proof&t=3&l=1|2&v=A|B&tpl=<id>&seed=<n>`)

**Interfaces:**
- Consumes: `session.js`, `present`, `reasonChips`, `ProofFigure`, `St`, `Tx`, `REASONS`, `LABELS`, `RULES`, `typeById`.
- Produces:
  - `ProofScreen({ type, problem, view, dots, levelName, onEnd, onLeave, restored })`: screen C (§11.1). Owns the session state through `act`; calls `onEnd({ summary, errs, clean, filledReason, rows })` after the student taps "מ.ש.ל" and `onLeave({ nonSolo })` on the back arrow or "הוכחה אחרת". Saves `snapshot(s)` to `sessionStorage[OPEN_KEY]` after every action (try/catch).
  - `ProofRows({ problem, rows, openRow, onOpen })`: finished rows, one line each, 30 px: number · statement · short reason · pair glyph + check icon (SVG). Tap opens the full reason (`REASONS[id].full`). The newest row is scrolled into view.
  - `Tray({ head, body, fb, hint, onPick, onHint, onNext, onQed, onCancel })`: fixed to the bottom with safe-area padding. `head` = the active row ("שורה 3 · {statement} · מה הנימוק?"). `body.t ∈ 'chips'|'options'|'tiles'|'next'|'qed'|'plan'|'leans'` (Task 12 adds `'tap'|'preview'|'groups'|'matching'|'parts'`). Chips ≥ 44 px, 2 columns for long names, 3 for short (צ.ז.צ). A wrong chip is disabled.
- Layout (must match §11.1): site top bar 48 · `pf-head` 40 (back arrow · type name · level pill · four dots) · `pf-stage` `clamp(150px, 30dvh, 240px)` sticky · given + goal strip 34 (one line, scrolls sideways; a given chip gets a check icon when used; the goal chip has a lock icon until proved) · `pf-rows` the rest · `pf-tray` min 120, max `40dvh`. From 900 px wide: two columns, drawing sticky on one side, rows and tray (not fixed) on the other.
- Behaviour:
  - Marks: a fact's mark is drawn when its row is justified (`fx mark`); Level 1 given rows arrive justified, so their marks draw in during the 1-second opening. The goal's parts use `style:'goal'` until its row is justified.
  - Focus: the parts of the active row at full strength, the rest at 55%.
  - Feedback line: one node per message with a fresh `key`; class `fb ok` / `fb err` / `pf-note` from `fx.cls`; ≤ 40 descendants; inside the tray's `.step-card`, whose `.step-label` (visually small) is `LABELS.stmt(role)` / `LABELS.reason(role)` of the current decision. One polite live region repeats feedback and "סומן בציור".
  - Hints (§9.1): button "רמז" → rung 1 (parts pulse + `hint.<role>.1`); "עוד רמז" → rung 2 (`hint.<role>.2`, reasons dimmed to 3); "הראו לי" unlocks `RULES.HINT3_WAIT_MS` after rung 2 (a thin fill on the button shows the wait) → the step is filled, the full reason and why-line show, then the one-tap question "על אילו שורות זה נשען?" (unscored). No tap for `RULES.IDLE_MS` on a step (Levels 1–2): the hint button pulses once; no text appears.
  - Why-line after a right row when `view.whyLine` (`why.*` keys); otherwise the mark only.
  - Level 1-A: the app steps row by row on "הבא"; the two unscored ties (`view.ties`): one "הראו בציור" tap and one "אילו שורות מובילות לחפיפה?" tap. They give a `pf-note` reply and never count.
  - Level 2: tap a tile → it becomes the pending row in the tray header → reason chips. "ביטול" drops a placed-but-unjustified row (tap only, no drag).
  - A "?" badge on the parts of a "looks equal" claim for `RULES.Q_BADGE_MS`.
  - The last row justified → the tray shows only the button "מ.ש.ל".
  - "הוכחה אחרת" (swap) is shown; before the first non-solo decision it is free.

- [ ] **Step 1: Build the three components and the style blocks.**
- [ ] **Step 2: Add the lab view** and a small DOM check script in the scratchpad (playwright-core WebKit, 375×550) that, on `?view=proof&t=3&l=2&v=B&seed=7`, taps a right tile and a right reason and asserts: a `.fb.ok` element exists inside a `.step-card` with a non-empty `.step-label`; then taps a wrong reason and asserts `.fb.err` and that the chip is `disabled`; taps the same wrong tile twice fast and asserts one `.fb.err` only; asserts `document.querySelectorAll('#root .step-card.done, #root .card.done').length === 0`; asserts every `#root button` is ≥ 40 px high (chips ≥ 44) and none has text matching `/בדוק|בדיקה|אשר|אישור|✓/`.
- [ ] **Step 3: Verify.** `npx next build`; all node tests; `verify-logic.py`; start the dev server on 5187, run the script, look at screenshots of L1-A, L1-B, L2-A, L2-B at 375×550 and 1280×800 (rows visible ≥ 2 on the small phone; tray ≤ 40% of the height; nothing scrolls sideways but the strip). **Stop the dev server.**
- [ ] **Step 4: Commit** `Proofs: proof screen, Levels 1 and 2`.

---

### Task 12: Level 3 — `TapBuild.jsx`

**Files:**
- Create: `src/topics/proofs/TapBuild.jsx`
- Modify: `src/topics/proofs/Tray.jsx`, `ProofScreen.jsx`, `styles.js` (block `tap`), `src/dev/ProofsLab.jsx` (`l=3`)

**Interfaces:**
- Consumes: `ProofFigure` (`tappable`, `onPart`, `selected`), `partName`, `partId`, `kindOf`, `GROUPS`, `REASONS`, `checkMatching` via `act({ t:'matching' })`.
- Produces: `useSelection(problem) → { selected, tap(partId, near), clear, preview, chooser, pickFromChooser }` and the tray bodies `preview`, `groups`, `matching`, `parts`.
- Behaviour (§7.2 "Level 3 details"):
  - Tap a part → selected (coral outline). Tap a second part of the same kind → a preview chip in the tray (`AO = OB`) + the button "להוסיף שורה". **Only the confirmed statement is judged.** Tapping a selected part again unselects it. A part of another kind starts a new selection and shows `st.kinds` as a `pf-note`.
  - Near misses: `near.length ≥ 2` → a small chooser lists them by Hebrew name ("הקטע AO", "הזווית AOC").
  - "רשימת חלקים": the same parts as chips grouped קטעים / זוויות / משולשים; the full keyboard and screen-reader path. Selecting there behaves exactly like tapping the drawing.
  - Congruence: tap the two triangles (their fills). The first is written `△AOC`; then the student taps the three vertices of the second triangle in matching order (slots fill left to right; "ביטול" clears). Confirm sends one `{ t:'matching' }` action (one decision, label `LABELS.matching`).
  - Reason: the two-step pick, title "מאיפה יודעים?": 5 group chips → the 1–4 reason chips of that group + "חזרה"; never taller than ~200 px.
  - 3-A shows the one plan line `lbl.planL3`; 3-B shows none and uses the short first-miss text (already in the session rules).

- [ ] **Step 1: Build.**
- [ ] **Step 2: Extend the scratchpad DOM script** for `l=3&v=B`: tapping one segment then a different-kind part produces no `.fb.err` and no `.fb.ok` (a mis-tap is never a mistake); select → unselect leaves no preview; a full proof through "רשימת חלקים" using only the keyboard (Tab / Enter) reaches "מ.ש.ל"; a wrong vertex order gives `.fb.err` with the `st.matching` text; a reversed-but-consistent order is accepted.
- [ ] **Step 3: Verify** as in Task 11 (build, tests, verify-logic, screenshots at 375×550: selection, preview chip, chooser, parts list, matching slots, group pick). **Stop the dev server.**
- [ ] **Step 4: Commit** `Proofs: Level 3 tap-to-build`.

---

### Task 13: `EndCard.jsx` — "מ.ש.ל", ending motion, notebook page

**Files:**
- Create: `src/topics/proofs/EndCard.jsx`
- Modify: `src/topics/proofs/ProofScreen.jsx`, `styles.js` (block `end`), `src/dev/ProofsLab.jsx` (`?view=end&state=clean|helped|levelup|typedone|round`)

**Interfaces:**
- Consumes: `canonRows`, `REASONS[id].full`, `St`, `Tx`, `ProofFigure` `ending`, `dots`.
- Produces: `EndCard({ problem, rows, clean, dots, done, lessHelp, event, levelName, typeName, round, onMore, onFinish })`.
- Behaviour (§7.6, §7.7):
  1. Tap "מ.ש.ל" (`btn.qed`) → the button is disabled at once (a second tap does nothing; Review Focus 2) → ending motion → end card.
  2. Ending: types 3 and 4 → `ending='move'` (600 ms, once, returns); types 1 and 2 → a calm tick-draw only; reduced motion → `'tint'`.
  3. The result node is **small and separate** from the notebook page: clean (`fx end.clean`) → `<div class="banner pf-end">` with `ui.endClean`; a filled step → `<div class="pf-end">` (no `.banner`) with `ui.endHelped`. It must mount ≤ 1000 ms after the tap and have ≤ 40 descendants (tracker limits).
  4. Under it: the four dots + `lbl.dots`; `lbl.done`; `ui.lessHelp` when true; `ui.round` after every 3rd proof in one sitting.
  5. "כך כותבים את זה במחברת": `נתון:` … `צ"ל:` … then a real two-column `<table>` טענה | נימוק with the student's row order and **full** reason wording, ending in `מ.ש.ל`. It scrolls inside the card.
  6. Level up (`event`): the same card with the level ladder stepping up once and `ui.levelUp` / `ui.typeDone`. No extra confetti code (the runtime's own win sound plays from `.banner`).
  7. Buttons: "הוכחה נוספת" (primary) · "סיום".

- [ ] **Step 1: Build.**
- [ ] **Step 2: Extend the scratchpad script:** after a clean proof, exactly one `#root .banner` exists, it has ≤ 40 descendants and appears < 1000 ms after the tap; a double tap on "מ.ש.ל" still gives one; after a proof with a filled step there is no `.banner` but `.pf-end` exists; with `reducedMotion: 'reduce'` no element is animating (`getAnimations().length === 0`) 100 ms after the tap; the notebook table's last cell text is `מ.ש.ל` and its reason cells equal the `full` wording.
- [ ] **Step 3: Verify** (build, tests, verify-logic, screenshots of the five lab states at 375×550). **Stop the dev server.**
- [ ] **Step 4: Commit** `Proofs: end card, ending motion, notebook page`.

---

### Task 14: `ProofChapter.jsx` and `Topic.jsx` — landing, levels, flow, rescue

**Files:**
- Create: `src/topics/proofs/ProofChapter.jsx`, `Topic.jsx`
- Modify: `styles.js` (blocks `landing`, `team`, `rescue`), `src/dev/ProofsLab.jsx` (`?view=topic` mounts `<Topic />`; `?s=new|mid|pro` preloads sample progress)

**Interfaces:**
- Consumes: `mastery.js` (all), `TYPES`, `TABS`, `present`, `ProofScreen`, `EndCard`, `restore`, `useAccount` / `accountApi` from `@/lib/account`.
- Produces:
  - `Topic.jsx` default export `App`: the team strip (`lbl.team` + one line that the maths waits for Sulaiman's approval; pattern `nw-place`, `src/topics/new/Engine.jsx:206-209`) at the very top, then `.hdr` (`<h1>הוכחות</h1>`) with `.ch-btns` holding one `.ch-btn` per type with text `type.button` (swipe-row scroll trick: `src/topics/new/Topic.jsx:13-18`), then `<ProofChapter type key />`.
  - `ProofChapter({ type })`: `.content` → `.sub-tabs` with four `.sub-tab` buttons (`TABS`), then one of: landing (screen A, §11.2) · warm-up (Task 19 fills it; until then the tab shows the landing's "מתחילים" straight into Level 1) · proof · end · rescue card (screen F).
- Behaviour:
  - Locked tabs (`רמה 2` when `level < 2`, `רמה 3` when `level < 3`) are disabled and show `ui.locked`; `רמה 1` is never locked (D5). Types are not locked against each other; the landing shows the recommended order and a "next" pointer.
  - Landing: type name, `about.<id>`, a small sample drawing, the level ladder (חימום → 1 → 2 → 3) with the four dots of the current level, `lbl.done`, and one primary button under the thumb: "מתחילים" (nothing done yet) / "ממשיכים".
  - While a proof is open the chapter row and the sub-tabs are **visually collapsed but stay in the DOM** with `.active` on the right ones (so the tracker reads `"<type> › <level>"`); `pf-head` replaces them.
  - Starting a proof: `variantFor(ts, level)` → `type.make(R, level, variant, { recent: ts.recent, last }, { counted: ts.count[level], want: ts.retry, words })` → `present`. Seed from `crypto.getRandomValues`, kept in the snapshot.
  - `onEnd`: `record(ts, level, rec, { counted, errs, filledReason })`; Level 1-A walk-through → `walked(ts)`, `counted:false`; save; show `EndCard` with `event`; then, if `rescue`: step 1 → card `ui.rescue1` (+ `skill.<W>`) → 2 warm-up tasks of that kind → next proof variant A; step 2 → a fully worked example to step through (mode `walk`, no gaps, why-lines; not counted) → variant A; step 3 → card `ui.rescue3` + a button to the previous type (type 1: to this type's warm-up); the student may also continue.
  - Left in the middle (§8; Review Focus 3): the back arrow, another `.ch-btn`, another `.sub-tab`, and component unmount all go through one `leave()` — after a non-solo decision the proof is recorded as not clean (`record` with the summary so far, the open decisions counted as `missed`); with none it does not count. The open proof survives a refresh (`sessionStorage`); a snapshot of another type, of another student (`who`), or unreadable is dropped silently.
  - Storage: `who = whoKey(account)`; on sign-in `adoptGuest`; once per mount when signed in: `accountApi.progress()` → `seedFromServer(state, d.chapters, TYPES)` (failures ignored). When the account changes mid-session, reload the state for the new `who`.

- [ ] **Step 1: Write the failing test** (append to `mastery.test.mjs`) for the pure part of "left in the middle":

```js
test('left in the middle: counts as not clean after a non-solo decision, not at all before one', () => {
  assert.equal(leftRecord({ n: 8, decided: [{ state: 'solo' }, { state: 'solo' }] }), null);
  assert.deepEqual(leftRecord({ n: 8, decided: [{ state: 'solo' }, { state: 'missed' }], variant: 'B', tpl: '3-K-SAS', day: 3 }), { n: 8, solo: 1, helped: 0, missed: 7, filled: 0, variant: 'B', tpl: '3-K-SAS', day: 3 });
  assert.equal(isClean(leftRecord({ n: 10, decided: [{ state: 'helped' }] , variant: 'B', tpl: 'x', day: 1 })), false);
});
```
(`leftRecord(open) → rec | null` is added to `mastery.js`.)

- [ ] **Step 2: Run** — FAIL. **Step 3: Implement** `leftRecord`, `ProofChapter.jsx`, `Topic.jsx`. **Step 4: Run** all node tests — PASS.
- [ ] **Step 5: Verify in the lab** (`?view=topic`, 375×550, scratchpad script): a full Level 1-A → 1-B run of type 3 moves the dots; locked tabs are disabled with the lock line; refresh mid-proof restores the same rows; putting `'{'` into `sessionStorage['mp:proofs:open']` and `localStorage['mp:proofs:v1:g']` before load gives a working empty landing with no console error; tapping another type button after one wrong try records one not-clean proof (read `localStorage`) and tapping it with no wrong try records none; `?s=mid` shows a rescue card with one sentence and one button. `npx next build`, `verify-logic.py`. **Stop the dev server.**
- [ ] **Step 6: Commit** `Proofs: topic shell, landing, level flow, rescue cards`.

---

### Task 15: Gate — the type-3 slice on a phone, shown to the lead

Spec §13 step 4: **do not build the rest before this slice is excellent.** This task writes no feature code.

**Files:** none in the repo (script and captures go to the scratchpad).

- [ ] **Step 1:** Start `npx next dev -p 5187` (background). With playwright-core WebKit (`require('/Users/abedshalgam/.npm/_npx/e41f203b7505f1fb/node_modules/playwright-core')`), viewport 375×550, `deviceScaleFactor: 3`, `hasTouch: true`, `isMobile: true`, `recordVideo`, play type 3 on `/dev/proofs?view=topic` end to end at Level 1-A, 1-B, 2-A, 2-B, 3-A, 3-B (families X and K at least), including one wrong try, all three hint rungs, and the end card.
- [ ] **Step 2:** Turn the video into frames (`ffmpeg -i … -vf fps=4`) and look at every frame at readable size: empty gaps, overlaps, a label on a line, weak type, anything stuck, a tray covering the drawing, a goal part that looks proved.
- [ ] **Step 3:** Measure scroll smoothness in the same WebKit page, scrolling the rows down and back up (`requestAnimationFrame` deltas over 2 s each way): report the worst frame and the share of frames over 20 ms. Fix any stutter in the owning component before going on.
- [ ] **Step 4:** Fix what the review finds (small fixes here; anything larger goes back to its task). Re-run steps 1–3.
- [ ] **Step 5:** **Stop the dev server** (`lsof -i :5187` prints nothing). Report to the lead: the video path, the frame folder, the smoothness numbers, what was fixed, what was not checked (a real iPhone, a screen reader). **Wait for the lead's go before Task 16.**

---

### Task 16: Type 4 — `types/then-conclusion.js`

**Files:**
- Create: `src/topics/proofs/types/then-conclusion.js`
- Modify: `types/index.js`, `proofs.test.mjs`, `ProofScreen.jsx` + `Tray.jsx` (the plan question), `styles.js`

**Interfaces:**
- Produces: type `{ id:'then-conclusion', n:4, name:'חפיפה ואז מסקנה', warm:['W2','W4','W5','W6'] }` with 33 templates `4-<variant>-<1|2|3>` = the 11 variants of X, K, Z, T × the three goals of the §6.5 table, in that table's order. `make`: `target` = the goal fact (role `conclusion`, justified by `cp-sides` / `cp-angles`, `needs:['cong']`); the two unused consequences stay in `facts` (they classify as `extra`); `canon` = fact, fact, fact, congruence, conclusion; `tiles.wrong` by §7.5: (1) the goal itself is a real tile (not a wrong one); wrong = one unused consequence (`why:'consequence'`) + one letter-swap. `ctx.prefer` (a type-3 template id from the student's record) is used for the first Level-1 proof so only the last row is new.
- UI: the unscored plan question (`view.plan === 'tris'`): `lbl.planTris` with the goal's two parts; the student taps two triangles; reply is a `pf-note`; it is not a decision and writes no row.

- [ ] **Step 1: Add tests**

```js
test('type 4: 33 templates = 11 variants × 3 goals, exactly the goals of §6.5', () => {
  const t = typeById('then-conclusion'); assert.equal(t.templates.length, 33); assert.equal(t.button, '4. חפיפה ואז מסקנה');
  assert.ok(!t.templates.some((x) => x.family === '2'));
  const R = makeR(seeded(4)), goals = {};
  for (const tpl of t.templates) { const p = t.make(R, 2, 'B', { recent: [], last: null }, { only: tpl.id }); (goals[tpl.variant] ||= []).push(p.facts[p.target].kind); assert.equal(classify(p, [...p.given, ...canonRows(p).slice(0, 3).map((r) => r.fact), 'cong'], p.facts[p.target]).c, 'ok'); }
  assert.deepEqual(goals['X-SAS'], ['seg', 'ang', 'ang']); assert.deepEqual(goals['X-ASA'], ['seg', 'seg', 'ang']);
  assert.deepEqual(goals['K-SSS'], ['ang', 'ang', 'ang']); assert.deepEqual(goals['T-ASA'], ['seg', 'seg', 'ang']);
});
test('type 4: the unused consequences are "true but not needed"; the goal before the congruence is goal-as-known', () => {
  const p = typeById('then-conclusion').make(makeR(seeded(6)), 3, 'B', { recent: [], last: null }, {});
  const all = canonRows(p).map((r) => r.fact), other = Object.keys(p.facts).find((f) => !all.includes(f));
  assert.equal(classify(p, all.slice(0, 4), p.facts[other]).textKey, 'st.notNeeded');
  assert.equal(classify(p, all.slice(0, 3), p.facts[p.target]).kind, 'goal-as-known');
});
test('type 4: the first Level-1 proof re-uses a variant already proved in type 3', () => {
  const p = typeById('then-conclusion').make(makeR(seeded(9)), 1, 'B', { recent: [], last: null }, { prefer: '3-K-SAS' }); assert.equal(p.template.slice(0, 7), '4-K-SAS');
});
```
(`ctx.only` pins a template; used by tests and the dev lab.) The Task 10 sweep now also covers type 4.

- [ ] **Step 2: Run** — FAIL. **Step 3: Implement.** **Step 4: Run** all — PASS. `npx next build`, `verify-logic.py`; one lab screenshot of the plan question and of a 5-row proof at 375×550; stop the dev server.
- [ ] **Step 5: Commit** `Proofs: type 4, congruence then a conclusion`.

---

### Task 17: Type 2 — `types/congruent-parts.js`

**Files:**
- Create: `src/topics/proofs/types/congruent-parts.js`
- Modify: `types/index.js`, `proofs.test.mjs`, `ProofScreen.jsx`, `Tray.jsx`, `styles.js`

**Interfaces:**
- Produces: type `{ id:'congruent-parts', n:2, name:'מחפיפה לשוויונות', warm:['W5'] }`, 6 templates `2-a` … `2-f` exactly as the §6.5 table (2-a separate ABC/DEF order · 2-b separate, not alphabetical · 2-c separate, second mirrored and turned · 2-d X · 2-e K · 2-f Z). `make`: `cong` is known from the start (`given:['cong']`, justified by `given`, written as the given line with `lbl.byOrder`); **no marks at the start**; three asked facts (at least one side and one angle) = `target` (a list), justified by `cp-sides` / `cp-angles` with `needs:['cong']`, role `partner`; the other three pairs stay as facts (→ `extra`, text `st.notAsked`). Letters also from sets like K, P, N / S, T, R. Wrong tiles (§6.5): the part in the same position in the drawing (`why:'position'`), the part with the next letter (`'next-letter'`), an angle ↔ side mix-up (`'kind-mix'`); each has a trap with kind `wrong-matching` and text `st.partner`.
- UI (§7.4): each asked part is one row, shown as `AB = ▢`. L1-A walk-through with colour-linked letters in `△ABC ≅ △EFD` (`St colors`, position 1 ↔ position 1, only while the row is active, only at Level 1); L1-B: pick from the 3 parts of the other triangle, the reason is then shown; L2: tiles + reason (4 / 6 chips); L3: tap the asked part and its partner in the drawing, two-step reason. Ending: calm tick-draw only.

- [ ] **Step 1: Add tests**

```js
test('type 2: 6 templates; three asked parts with a side and an angle; no marks at the start', () => {
  const t = typeById('congruent-parts'); assert.equal(t.templates.length, 6); assert.equal(t.button, '2. מחפיפה לשוויונות');
  const R = makeR(seeded(11));
  for (let i = 0; i < 500; i++) {
    const p = t.make(R, 2, 'B', { recent: [], last: null }, {});
    assert.equal(p.target.length, 3); const kinds = p.target.map((f) => p.facts[f].kind); assert.ok(kinds.includes('seg') && kinds.includes('ang'));
    assert.deepEqual(p.given, ['cong']); assert.deepEqual(present(p, 2, 'B', { R }).pre, ['cong']);
    for (const f of p.target) { assert.equal(classify(p, ['cong'], p.facts[f]).c, 'ok'); assert.equal(checkReason(p, ['cong'], f, p.facts[f].kind === 'seg' ? 'cp-sides' : 'cp-angles').ok, true); }
    const rest = Object.keys(p.facts).filter((f) => f !== 'cong' && !p.target.includes(f)); assert.equal(rest.length, 3);
    assert.equal(classify(p, ['cong'], p.facts[rest[0]]).textKey, 'st.notAsked');
    for (const w of p.tiles.wrong) { const c = classify(p, ['cong'], w.st); assert.deepEqual([c.c, c.kind, c.textKey], ['false', 'wrong-matching', 'st.partner']); }
  }
});
test('type 2: 2-b is not alphabetical; 2-f matches A with C', () => {
  const t = typeById('congruent-parts'), R = makeR(seeded(12));
  const b = t.make(R, 1, 'B', { recent: [], last: null }, { only: '2-b' }); const second = b.facts.cong.map.map((m) => m[1]).join(''); assert.notEqual(second, [...second].sort().join(''));
  const f = t.make(R, 1, 'B', { recent: [], last: null }, { only: '2-f' }); const m = Object.fromEntries(f.facts.cong.map); const [x] = Object.keys(m).filter((k) => m[m[k]] === k && m[k] !== k); assert.ok(x);
});
test('decisions: type 2 = 1, 3, 6, 6, 6', () => { /* decisionsOf(present(p, …)) for 1-A, 1-B, 2-A, 2-B, 3-B → [1, 3, 6, 6, 6] */ });
```

- [ ] **Step 2: Run** — FAIL. **Step 3: Implement.** **Step 4: Run** all — PASS; build; verify-logic; lab screenshots of L1-A (coloured letters) and L3 at 375×550; stop the dev server.
- [ ] **Step 5: Commit** `Proofs: type 2, from a congruence to equal parts`.

---

### Task 18: Type 1 — `types/read-given.js`

**Files:**
- Create: `src/topics/proofs/types/read-given.js`
- Modify: `types/index.js`, `proofs.test.mjs`, `ProofScreen.jsx`, `Tray.jsx`, `styles.js`

**Interfaces:**
- Produces: type `{ id:'read-given', n:1, name:'קוראים את הנתון', warm:['W1','W7'] }`, 10 templates `1-a` … `1-j`, sentences, statements and accepted reasons **exactly** as the §6.5 table (figures: `cevian.js` for 1-a/b/c/d/i/j, family X for 1-e/f, family K drawn not symmetric for 1-g/h). `make`: two sentences → two facts (1-f: one sentence → two facts), both in `target`, no `needs`; a sentence in words accepts its definition and `given` (role `given-words`); the plain equality of 1-h accepts `given` only (role `given`); altitude rows carry `right:true`. `givenText[i]` holds the sentence (`he` + `m`) and its facts. Wrong tiles: what the other two words would give for the same line (`why:'word'`, traps `st.word.median` / `st.word.bisector` / `st.word.altitude`, kind `wrong-word`) and one letter-swap; 1-i always includes the trap ∢BAD = ∢CAD. What varies: letters, which vertex the line comes from, turn/mirror, triangle shape, the order of the two sentences.
- UI (§7.3): the active sentence is shown in the tray header and highlighted in the given strip. L1-A: sentence → the line lights in the drawing → the statement appears; one gap. L1-B: statement from 3 chips; the reason then appears with its why-line. L2-A: 4 tiles (2 right, 2 wrong) → reason from 6. L2-B: 6 tiles → reason from 6. L3: tap the drawing, then the two-step reason. Ending: calm tick-draw only.

- [ ] **Step 1: Add tests**

```js
test('type 1: 10 templates; the word is true, the other words are false with the right message', () => {
  const t = typeById('read-given'); assert.equal(t.templates.length, 10); assert.equal(t.button, '1. קוראים את הנתון');
  const R = makeR(seeded(21));
  for (const tpl of t.templates) for (let i = 0; i < 300; i++) {
    const p = t.make(R, 2, 'B', { recent: [], last: null }, { only: tpl.id });
    assert.equal(p.target.length, 2);
    for (const f of p.target) { assert.equal(holds(p.figure, p.facts[f]), true); assert.equal(classify(p, [], p.facts[f]).c, 'ok'); assert.equal(checkReason(p, [], f, 'given').ok, true); }
    for (const w of p.tiles.wrong.filter((x) => x.why === 'word')) { const c = classify(p, [], w.st); assert.deepEqual([c.c, c.kind], ['false', 'wrong-word']); assert.ok(/^st\.word\./.test(c.textKey)); }
  }
});
test('type 1: accepted reasons follow the form of the sentence', () => {
  const t = typeById('read-given'), R = makeR(seeded(22)), mk = (id) => t.make(R, 2, 'B', { recent: [], last: null }, { only: id });
  const a = mk('1-a'), bis = a.target.find((f) => a.facts[f].kind === 'ang'), med = a.target.find((f) => a.facts[f].kind === 'seg');
  assert.equal(checkReason(a, [], bis, 'bisector').ok, true); assert.equal(checkReason(a, [], med, 'median').ok, true);
  assert.deepEqual([checkReason(a, [], med, 'bisector').kind, checkReason(a, [], med, 'bisector').textKey], ['wrong-word', 'rs.words.otherDef']);
  const h = mk('1-h'), eq = h.target.find((f) => h.facts[f].kind === 'seg');
  assert.equal(checkReason(h, [], eq, 'given').ok, true); assert.equal(checkReason(h, [], eq, 'bisector').ok, false); assert.equal(h.just[eq][0].reasons.length, 1);
  const b = mk('1-b'), alt = b.target.find((f) => b.facts[f].right); assert.equal(checkReason(b, [], alt, 'altitude').ok, true); assert.match(show(b.facts[alt]), / = 90°$/);
  const d = mk('1-d'); assert.ok(d.target.some((f) => d.just[f][0].reasons.includes('midpoint')));
  const i9 = mk('1-i'); assert.ok(i9.tiles.wrong.some((w) => w.why === 'word' && w.st.kind === 'ang'));
});
test('decisions: type 1 = 1, 2, 4, 4, 4', () => { /* decisionsOf for 1-A, 1-B, 2-A, 2-B, 3-B → [1, 2, 4, 4, 4] */ });
test('all four types are present, in order', () => { assert.deepEqual(TYPES.map((t) => t.button), ['1. קוראים את הנתון', '2. מחפיפה לשוויונות', '3. הוכחת חפיפה', '4. חפיפה ואז מסקנה']); assert.equal(TYPES.reduce((n, t) => n + t.templates.length, 0), 63); });
```

- [ ] **Step 2: Run** — FAIL. **Step 3: Implement.** **Step 4: Run** all — PASS; build; verify-logic; lab screenshots of 1-i (trap tile) and 1-b (right-angle row) at 375×550; stop the dev server.
- [ ] **Step 5: Commit** `Proofs: type 1, reading the given`.

---

### Task 19: Warm-up — `warmup-core.js`, `Warmup.jsx`

**Files:**
- Create: `src/topics/proofs/warmup-core.js`, `Warmup.jsx`, `src/topics/proofs/warmup.test.mjs`
- Modify: `ProofChapter.jsx` (the `חימום` tab, the route from the landing, rescue step 1), `styles.js`

**Interfaces:**
- Consumes: families, `cevian.js`, `holds`, `RULES`.
- Produces (`warmup-core.js`):
  - `makeTask(R, kind) → task = { kind, text:{ k, vars }, figure, marks:[{ part, mark }], input:'chips'|'tap', options?:[{ id, label|st }], tap?:{ kinds, need:[partId] }, answer, why:{ k, vars } }` for the seven kinds of §7.1:
    W1 tap the two segments of a given equality · W2 "ידועה, או רק נראית כך?" for one statement (two options) · W3 which equality is seen without being given (shared side / vertical angles) · W4 which theorem fits the marks, options צ.ז.צ / ז.צ.ז / צ.צ.צ / אי אפשר לקבוע, **including the two traps**: the angle not between the two sides, and three angle pairs (answer `cant`) · W5 which vertex / side matches in `△ABC ≅ △EFD` · W6 "מותר כבר להשתמש בזה?" (the goal or a consequence before the congruence) · W7 a word → pick the equality.
  - `checkTask(task, answer) → boolean`.
  - `flow(kinds) → state`, `next(state) → kind | null`, `answer(state, kind, right) → state`, `passed(state) → boolean`: 4 tasks from the type's kinds (each kind at least once when there are ≤ 4 kinds); all 4 right on the first try → done; otherwise two more tasks of each missed kind (a kind passes with 2 of its last 3 right); hard cap 8 tasks, then done anyway. Results never touch `hist`.
- Produces (`Warmup.jsx`): `Warmup({ type, kinds, only, onDone })` — screen B: header + drawing + one question in the tray with 2–4 chips or a tap in the drawing; a feedback line; after a miss the explanation `w.<kind>.why`; "הבא"; at the end "קדימה" + `ui.warmDone`. `only` = a single kind with 2 tasks (rescue step 1). Warm-up answers use the same tracker classes (`.fb.ok` / `.fb.err`) inside a `.step-card` whose `.step-label` is the kind's short name.

- [ ] **Step 1: Write the failing tests**

```js
test('flow: 4 right in a row ends the warm-up', () => { let s = flow(['W1', 'W2', 'W3', 'W4']); for (let i = 0; i < 4; i++) s = answer(s, next(s), true); assert.equal(next(s), null); assert.equal(passed(s), true); });
test('flow: a miss adds two tasks of that kind; hard cap 8', () => {
  let s = flow(['W1', 'W2', 'W3', 'W4']); const seen = [];
  for (let i = 0; i < 4; i++) { const k = next(s); seen.push(k); s = answer(s, k, k !== 'W4'); }
  assert.deepEqual([next(s)], ['W4']); s = answer(s, 'W4', true); assert.equal(next(s), 'W4'); s = answer(s, 'W4', true); assert.equal(next(s), null);   // 2 of the last 3
  let t = flow(['W5']); let n = 0; while (next(t)) { t = answer(t, next(t), false); n++; } assert.equal(n, 8);
});
for (const kind of ['W1', 'W2', 'W3', 'W4', 'W5', 'W6', 'W7']) test(`${kind}: 3000 tasks, one right answer, the drawing is honest`, () => {
  const R = makeR(seeded(77)); const seen = new Set();
  for (let i = 0; i < 3000; i++) { const t = makeTask(R, kind); assert.equal(checkTask(t, t.answer), true);
    if (t.options) { assert.ok(t.options.length >= 2 && t.options.length <= 4); assert.equal(t.options.filter((o) => checkTask(t, o.id)).length, 1); }
    assert.deepEqual(labelErrors(layout(t.figure)), []); seen.add(JSON.stringify([t.text, t.answer])); }
  assert.ok(seen.size >= 12);
});
test('W4 includes both traps', () => {
  const R = makeR(seeded(78)); let cant = 0, notBetween = 0, threeAngles = 0;
  for (let i = 0; i < 2000; i++) { const t = makeTask(R, 'W4'); assert.deepEqual(t.options.map((o) => o.id), ['sas', 'asa', 'sss', 'cant']); if (t.answer === 'cant') { cant++; if (t.trap === 'not-between') notBetween++; if (t.trap === 'three-angles') threeAngles++; } }
  assert.ok(notBetween > 50 && threeAngles > 50 && cant < 1200);
});
```

- [ ] **Step 2: Run** — FAIL. **Step 3: Implement.** **Step 4: Run** all — PASS; build; verify-logic; lab screenshots of each W kind at 375×550 (`?view=warm&k=W1…W7`); stop the dev server.
- [ ] **Step 5: Commit** `Proofs: warm-up tasks and flow`.

---

### Task 20: Wiring — registry, hidden route, `noindex`, tracking check

**Files:**
- Modify: `src/topics/registry.js` (three lines + the comment), `app/topics/[slug]/page.tsx` (D1)
- Modify: `src/topics/proofs/proofs.test.mjs`

**Interfaces:**
- Registry (hand-added, next to `new`; extend the header comment: `// Exceptions: "new" … and "proofs" (the proofs section, 2026-11-21) were added by hand: no HTML original. Re-running convert-topics.py would drop them.`):
  - `TOPICS`: `"proofs": {"title": "הוכחות", "topic": "orange", "file": "proofs.html", "hidden": true},`
  - `LOADERS`: `"proofs": () => import('./proofs/Topic.jsx'),`
  - `STYLES`: `"proofs": () => import('./proofs/styles.js'),`
- `app/topics/[slug]/page.tsx` `generateMetadata`: when the registry entry has `hidden`, also return `robots: { index: false, follow: false }`. Nothing else in that file changes.

- [ ] **Step 1: Add the failing tests**

```js
test('wiring: registered, coral, hidden from the home lists', async () => {
  const src = (await import('node:fs')).readFileSync(new URL('../registry.js', import.meta.url), 'utf8');
  assert.match(src, /"proofs": \{"title": "הוכחות", "topic": "orange", "file": "proofs\.html", "hidden": true\}/);
  assert.match(src, /"proofs": \(\) => import\('\.\/proofs\/Topic\.jsx'\)/); assert.match(src, /"proofs": \(\) => import\('\.\/proofs\/styles\.js'\)/);
  const { CHAPTERS } = await import('../../home/chapters.js'); assert.equal('proofs' in CHAPTERS, false);
  const cat = (await import('node:fs')).readFileSync(new URL('../../home/catalog.js', import.meta.url), 'utf8'); assert.equal(/proofs/.test(cat), false);
});
test('CSS: every class, keyframe and custom property is pf-; no generic @property; no letter-spacing', async () => {
  const css = (await import('./styles.js')).default; const own = css.slice(css.indexOf('/* ── pf ── */')); assert.ok(css.includes('/* ── pf ── */'));
  for (const m of own.matchAll(/@keyframes\s+([\w-]+)/g)) assert.match(m[1], /^pf-/);
  for (const m of css.matchAll(/@property\s+(--[\w-]+)/g)) assert.match(m[1], /^--pf-/);
  for (const m of own.matchAll(/(--[\w-]+)\s*:/g)) assert.match(m[1], /^--pf-/);
  assert.equal(/letter-spacing/.test(css), false);
  for (const m of own.matchAll(/\.([a-zA-Z][\w-]*)/g)) assert.ok(/^pf-/.test(m[1]) || ['hdr', 'hdr-sub', 'ch-btns', 'ch-btn', 'content', 'sub-tabs', 'sub-tab', 'banner', 'fb', 'ok', 'err', 'step-card', 'step-label', 'active', 'svg-wrap', 'btn', 'bp', 'bg'].includes(m[1]), m[1]);
});
```
(the first test reads the registry as text because the file imports `.jsx` modules lazily; adjust the allow-list only for shared `mp.css` class names actually used.)

- [ ] **Step 2: Run** — FAIL. **Step 3: Make the two edits.** **Step 4: Run** all node tests — PASS. `python3 tools/verify-logic.py` → "math and text untouched". `npx next build` → passes and lists `/topics/proofs`.
- [ ] **Step 5: Check the live page behaviour** (dev server on 5187, scratchpad script, WebKit 375×550):
  - `curl -s http://localhost:5187/topics/proofs | grep -o '<meta name="robots"[^>]*>'` prints `noindex, nofollow`; the same `curl` on `/topics/triangles` prints nothing.
  - The home page (`/`) HTML has no link to `/topics/proofs`.
  - `document.documentElement.dataset.topic === 'orange'`; the team strip is the first thing in `#root`.
  - **Tracking contract (D9):** capture the tracker's requests (`page.on('request')`, POST bodies containing `"page":"proofs.html"`). Play, on type 3 Level 2: one right first-try decision, one wrong try, one right-on-second-try, a hint, a neutral note, then finish clean with "מ.ש.ל". Expected rows, in order: `ok`, `bad`, (nothing for the second try, the hint, the note), …, `win`; every row has `chapter === '3. הוכחת חפיפה › רמה 2'` and a `step` equal to one of the §10.4 labels. Then a proof with a filled step: no `win` row. Then type 1 warm-up: `chapter === '1. קוראים את הנתון › חימום'`.
  - Open every menu on the page (the top bar's account menu, the chapter row, the sub-tabs, the row detail, the parts list): each opens above the sticky drawing and the tray, and closes.
- [ ] **Step 6: Stop the dev server. Commit** `Proofs: registry wiring, hidden route, noindex`.

---

### Task 21: Dev lab and the review sheet for Sulaiman

**Files:**
- Modify: `src/dev/ProofsLab.jsx`, `src/topics/proofs/styles.js` (block `lab`, print rules)

**Interfaces:**
- `/dev/proofs` index: links to every view. Views (query string): `view=figures` · `view=proof&t=<1-4>&l=<1-3>&v=A|B&tpl=<id>&seed=<n>` · `view=warm&k=<W1-W7>` · `view=end&state=…` · `view=topic&s=new|mid|pro` · **`view=sheet&t=<1-4>`**.
- The review sheet (§6.5): one small card per template (63 in all: 10 + 6 + 14 + 33), each with the figure (all marks on), the given, the goal, the canonical proof as a two-column table with full reason wording, and the wrong tiles with their messages. A last page lists every key in `NEW_DRAFTS` with its text, and the reasons of §6.3 marked "unconfirmed wording". Print CSS: cards do not break across pages; `@media print` hides the lab's own controls. The sheet is left-to-right for maths, right-to-left for text.

- [ ] **Step 1: Build.**
- [ ] **Step 2: Verify:** `npx next build`; dev server on 5187; `view=sheet&t=1…4` renders 10 / 6 / 14 / 33 cards (count `.pf-lab-card`); save a PDF of each (`page.pdf()` works in Chromium only: use playwright-core `chromium` for this one step) to the scratchpad and look at the first and last page of each; **stop the dev server.** `/dev/proofs` must return "not found" when `VERCEL_ENV=production` (`VERCEL_ENV=production npx next build` then check the build output lists `/dev/proofs` as a not-found page, or read the page code).
- [ ] **Step 3: Commit** `Proofs: dev lab and review sheet`.

---

### Task 22: Phone-size verification pass (WebKit, 375 and 393 px)

**Files:** none in the repo. Script, screenshots and video go to `<scratchpad>/proofs/verify/` (the session scratchpad; print full absolute paths in the report).

- [ ] **Step 1: Start the server.** `npx next dev -p 5187` in the background from the worktree; wait for `curl -sf http://localhost:5187/topics/proofs`.
- [ ] **Step 2: Write `run.cjs`** (CommonJS):

```js
const { webkit } = require('/Users/abedshalgam/.npm/_npx/e41f203b7505f1fb/node_modules/playwright-core');
const SIZES = [{ name: '375', width: 375, height: 550 }, { name: '393', width: 393, height: 700 }];   // visible Safari height (§11.1)
// per size: browser.newContext({ viewport, deviceScaleFactor: 3, isMobile: true, hasTouch: true, locale: 'he-IL', recordVideo: { dir, size: viewport } })
```
- [ ] **Step 3: Screenshots of each level end to end**, at both sizes, on the real route `/topics/proofs` (fresh storage per run), named `<size>-t<type>-<step>.png`:
  for each of the 4 types: landing → warm-up (one task right, one wrong with its explanation, the "קדימה" end) → Level 1-A walk-through → Level 1-B (one wrong try with the auto hint; all three hint rungs once) → end card + notebook page → Level 2-A → Level 2-B (a wrong tile, a "too early" tile with the "?" badge, a neutral note) → Level 3-A → Level 3-B (selection, preview chip, chooser, parts list, vertex matching, two-step reason, short first miss) → "מ.ש.ל" → ending motion mid-frame → level-up card → locked-tab line → a rescue card. To reach Levels 2 and 3 quickly, preload `localStorage['mp:proofs:v1:g']` with the wanted level (the documented shape of §10.3) before navigation.
- [ ] **Step 4: Assertions in the same script** (fail loudly):
  - No horizontal page scroll: `document.documentElement.scrollWidth <= innerWidth` on every screen.
  - Height budget on the proof screen: `pf-head` 40 ± 2; `pf-stage` 165 ± 3 at height 550 and 210 ± 3 at 700; strip 34 ± 2; tray ≤ 40% of `innerHeight`; at 375×550 at least 2 finished rows fully visible with 3 rows written; at 393×700 at least 5.
  - Every visible `button`, `[role=button]`: height ≥ 40 (reason chips ≥ 44); SVG hit shapes ≥ 40 in their long direction.
  - No label box intersects a segment (`labelErrors` on the live figure's problem, exposed on `window.__pf` in dev only).
  - Before the goal row is justified, the goal parts have the goal style and **no** tick or arc elements.
  - Contrast: computed colour of `.fb`, `.pf-note` and hint text against its background ≥ 4.5:1.
  - `prefers-reduced-motion: reduce` context: no running animations at any step; the ending shows the tint.
  - Landscape 667×375 and a long given line (type 1, two long sentences): the drawing is still visible and the tray ≤ 40% of the height (Review Focus 5).
  - Console: no error and no React warning during the whole run.
- [ ] **Step 5: Scroll video and smoothness.** Record a slow scroll of the rows (10 rows written through the lab's `view=proof&t=4&l=2`) down and back up; export frames (`ffmpeg -vf fps=4`) and look at each one at readable size. Measure `requestAnimationFrame` deltas for 2 s down and 2 s up: report the worst frame and the share over 20 ms; fix stutter in the owning component and re-run.
- [ ] **Step 6: Final checks.** `node --test src/topics/proofs/*.test.mjs` (all pass) · `python3 tools/verify-logic.py` ("math and text untouched") · `npx next build` (passes) · `git status` shows only files under `src/topics/proofs/`, `src/dev/ProofsLab.jsx`, `app/dev/proofs/page.tsx`, `design/proofs/`, `src/topics/registry.js`, `app/topics/[slug]/page.tsx`.
- [ ] **Step 7: Stop everything.** `lsof -ti :5187 | xargs kill`; `lsof -i :5187` prints nothing; `pgrep -fl "playwright|WebKit|ffmpeg"` shows no process started by this task.
- [ ] **Step 8: Report** (no commit unless fixes were made; then `Proofs: phone pass fixes`): the screenshot folder, the video and frame paths, the smoothness numbers, every assertion that failed and its fix, and plainly what was **not** checked: a real iPhone, a screen reader (VoiceOver), the admin's "most missed steps" view with real data, `/legal-check` (required before students see the section), and Sulaiman's 10 open points (§15).

---

## Self-review notes (kept for the executor)

- **Spec coverage:** §6.1 → Tasks 10, 16–18, 20 · §6.2 → 2 · §6.3 → 1 · §6.4 → 5, 6 · §6.5 → 10, 16–18 · §6.6 → 5, 6, 10 (tests 1–7), 10 + 18 (test 8) · §7.1 → 19 · §7.2 → 9, 11, 12 · §7.3 → 18 · §7.4 → 17 · §7.5 → 9, 10, 16 · §7.6 → 8, 11, 13 · §7.7 → 13 · §8 → 7, 9, 14 · §9 → 1, 3, 9, 11 · §10.1–10.2 → 2, 3 · §10.3 → 7, 14 · §10.4 → 11, 13, 20 · §11.1–11.2 → 11, 14, 22 · §11.3 → 8, 12, 22 · §12 → File Structure · §13 gate → 15 · §14 → left open inside the owning tasks · §15 → Task 21's sheet + Task 22's report.
- **Not in phase 1 (do not build):** everything in §2 "Non-goals" and §16.
- **Order note:** the registry wiring comes late on purpose (Task 20), so nothing half-built is reachable at `/topics/proofs`; until then everything is viewed through `/dev/proofs`.
