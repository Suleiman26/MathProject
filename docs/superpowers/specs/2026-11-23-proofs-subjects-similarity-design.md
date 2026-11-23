# Proofs by Ministry subject + similarity proofs + theorems always visible: design (2026-11-23)

Status: approved direction (Abed, 2026-11-23), design doc for the build plan. Extends
`docs/superpowers/specs/2026-11-21-proofs-design.md` ("the phase-1 spec", cited as P1 §n). Everything P1 says
still holds unless this file changes it. Hebrew texts here are drafts until Sulaiman approves them.

---

## 1. Intent and why

Abed (2026-11-23, translated):
- "The student doesn't know about our plan of levels. Split it into subjects like the Ministry of Education,
  and inside each subject do it with levels."
- "Do it according to the Ministry." (Grade 8 has דמיון משולשים: yes, checked below.)
- "The aim is to let the student easily understand the subject, step by step, to get to a 'great' level so he
  can do anything in school. We don't want him to feel frustrated and leave. We must take care of him to get to
  top level in those subjects specifically."
- "Add the משפטים always where we use them. Let him always see them. It's important because he will use them
  later in higher grades."

Today the proofs card (grade 8) shows four "chapters" (קוראים את הנתון, מחפיפה לשוויונות, הוכחת חפיפה, חפיפה
ואז מסקנה). They are really the Ministry's own ladder for ONE subject, חפיפת משולשים, and each of them also has
its own row of levels (חימום, רמה 1–3). A student sees two ladders inside each other and no subject name that
matches what the teacher says in class.

**The idea of this change:** the student picks the subject the teacher is teaching now (by its Ministry name),
climbs ONE ladder of levels inside it, always sees the theorem behind every step, and ends the subject with an
exam-style level that proves "I can do this in school".

### What the Ministry says (checked 2026-11-23 in the Ministry files kept in the session scratchpad)

| Source | What it says |
|---|---|
| Teaching plan grade 8 תשפ"ז (`prisa_8`) | Geometry order: … חפיפת משולשים (Jan–Feb) → צלעות במשולש, תיכון → זווית חיצונית → משולש שווה שוקיים → משפטים הפוכים למשולש שווה שוקיים → **דמיון משולשים (March–April, 5 hours)** |
| Teaching plan grade 9 (`prisa_9A`) | **דמיון משולשים: "יחסי שטחים במשולשים דומים"** (June, 4 hours). The basics are grade 8. |
| Updated curriculum grade 8 (`geometry_8`), similarity chapter | Definition of similar triangles; "מומלץ לשיים משולשים דומים לפי סדר ההתאמה בין הקודקודים"; "אם לשני משולשים זוויות שוות, אז הם דומים, ומכאן שגם קיים יחס דמיון בין הצלעות"; "יש ללמוד לזהות משולשים דומים"; "יש ללמוד למצוא נתונים חסרים מתוך תכונת הדמיון ותוך שימוש בפרופורציה"; combine with facts from grade 7 and early grade 8; everyday examples (shadow of a tree, depth of a pit: "הסבירו מדוע המשולשים דומים. חשבו …"); "במצולעים בני ארבע צלעות או יותר … שוויון זוויות איננו מבטיח דמיון". The area ratio is "ללא הוכחה פורמאלית". |
| Ministry list of middle-school theorems (2015, `tamtzit`) | Similarity: the definition (above) and ONE theorem: "אם לשני משולשים זוויות שוות, אז הם דומים." (+ the area ratio). No צ.ז.צ / צ.צ.צ similarity. |

Found on our own site: Sulaiman's `similar-triangles` topic is listed for grade 9 only and practises numbers
(ז"ז / צ"צ identification, ratio, a missing side), no proofs. The Ministry teaches those basics in grade 8.
**Not changed by this work** (Sulaiman's topic); listed as an open point (§13).

## 2. Goals, non-goals, anti-goals

**Goals**
1. The proofs card shows subjects by their Ministry names, in Ministry order, and inside a subject one row of
   levels. A student never sees two ladders inside each other.
2. Every theorem, definition and basic rule used in a proof is on screen in its full wording wherever it is
   used, and the subject's whole list is one tap away from anywhere (§6).
3. A new subject, דמיון משולשים (grade 8), built to the same bar as חפיפה: the notebook screen, the drawing that
   fills up as the proof grows, fading help, warm-up, rescue ladder, mastery.
4. Each subject ends with an exam-style level ("כמו במבחן") on one drawing with sections א/ב, done alone. Passing
   it = the subject's top level ("שולטים בנושא").
5. A weak student always has a next step that works; a strong student reaches the top of a subject fast.
6. Zero loss of saved progress: everything a student did in the four congruence chapters stays theirs (device
   storage, server rows, home railway).
7. **Release gate (Abed decides, asked 2026-11-23):** new MATH content (the similarity subject and the exam
   levels) appears to students only after Sulaiman approves it, or when Abed says so. Until then it shows on
   localhost, preview deployments and in the admin content-review frame only (`subjects.js` flag `live:false`).
   The structure (subjects, labels, help-stage names) and the theorem sentences (Ministry quotes) can go live
   first.
8. Zero database migrations; zero edits to Sulaiman's `Topic.jsx` files; `verify-logic.py` stays clean.

**Non-goals (this round)**
- Subject "משולש שווה שוקיים" and grade-9 subjects (parallel lines, quadrilaterals, area ratio of similar
  triangles). The structure must make adding them a data change (§5.4), but no content now.
- Proofs in grade 9's card (Abed, 2026-11-23: "בנתיים אל תוסיף").
- Moving or changing Sulaiman's `similar-triangles` topic.
- Free typing of statements (numbers only, on a keypad).
- Teacher dashboards; home railway grouping by subject (the railway lists the levels as chapter stops; §5.3).

**Anti-goals (never)**
- Everything in P1 §2 anti-goals still holds (no blocking, no marking a correct idea wrong, no lives/timers/
  streaks, no lying drawing, no level-up by hints, no invented maths or wording without Sulaiman).
- A theorem the student must recall from memory with no way to see it (Abed: always visible).
- A subject that ends without the student knowing what to do next or where they stand.
- Losing a student's existing congruence progress or stats.
- A number answer that needs a calculator or leaves an ugly decimal.

## 3. Constraints

All of P1 §3 (own folder, CSS prefix `prf-` + `is-` states scoped under `#root`, no letter-spacing on Hebrew,
40 px touch targets, motion = transform/opacity, reduced motion, colour not the only signal, keyboard and
screen-reader usable, `noindex` stays as is, checks before done).

Additions:
- **Shared files touched on purpose:** `src/lib/mp-runtime.js` and `src/components/TopicView.jsx` get one small,
  backward-compatible change each (§5.3: read a `data-mp-key` attribute when present — in `chapterOf()`, in the
  `?ch=` / `&sub=` link matching and in the ✓ `data-solved` marks). They are Abed's infrastructure, not
  Sulaiman's. Every other topic must behave exactly as before (no element there has the attribute).
- The subject switcher never uses the tracker's classes (`.ch-btn`, `.nav-btn`, `.sub-tab`, `.tab`, …): the
  tracker reads the first active element of those classes as the chapter.
- No button text in the proofs section may match the tracker's check-word patterns (`בדוק|בדיקה|בדקו|אישור|אשר|✓`):
  they pull in the site-wide check-button sounds and styling.
- `src/home/chapters.js` and `src/home/chapterInfo.js` get the new level names (the railway and "what is it
  about" lines).
- Numbers in similarity problems: whole numbers or one half (x.5) only, both in the given and in every answer.

## 4. Approaches considered

| | A. One "הוכחות" card, subjects inside (chosen) | B. A proofs chapter inside each subject's own card | C. One proofs card per subject |
|---|---|---|---|
| What | Grade 8 card "הוכחות": a subject switcher (חפיפת משולשים · דמיון משולשים), each subject = one row of levels. | "הוכחות" chapter added to משולשים, דמיון משולשים, … | Separate cards "הוכחות: חפיפה", "הוכחות: דמיון" |
| Good | One home for proofs and the theorem list; progress in one place; no change to Sulaiman's topics; one design to make beautiful. | Closest to class. | Subject visible right on the home screen. |
| Cost | Student opens "הוכחות" first, then the subject. | Edits Sulaiman's topic files (not allowed); proofs progress split across cards; `similar-triangles` is grade 9 while Ministry teaches it in grade 8. | Many cards with one subject each; the theorem list and "where am I" scatter; catalog churn for every new subject. |

**Chosen: A** (my recommendation; Abed: "do it according to the Ministry", approved 2026-11-23). The landing
puts the subject name first (giant wordmark = the subject), so the subject is what the student sees.

## 5. Structure: subjects → levels → help stages

### 5.1 The words the student sees

| Layer | Student sees | Example |
|---|---|---|
| Card (home) | הוכחות | grade 8, after משולשים (unchanged) |
| Subject | Ministry subject name + when it is taught | חפיפת משולשים · ינואר–פברואר |
| Level (the ladder inside a subject) | רמה 1 … רמה N + its name | רמה 3 · הוכחת חפיפה |
| Help stage (inside a level; today's sub-tabs) | חימום · מודרך · ביחד · לבד | renames "רמה 1–3", which clashed with the levels |

Help stage names map 1:1 onto P1's levels: מודרך = P1 Level 1 (walk/fill), ביחד = Level 2 (tiles),
לבד = Level 3 (tap). Mechanics unchanged (P1 §7–§9). Draft names; Sulaiman/Abed may rename.

### 5.2 The subjects and their levels (Ministry order)

**חפיפת משולשים** (Ministry grade 8, January–February):

| Level | Name (unchanged) | What (P1) |
|---|---|---|
| רמה 1 | קוראים את הנתון | type 1 |
| רמה 2 | מחפיפה לשוויונות | type 2 |
| רמה 3 | הוכחת חפיפה | type 3 |
| רמה 4 | חפיפה ואז מסקנה | type 4 |
| רמה 5 | כמו במבחן | NEW (§8) |

**דמיון משולשים** (Ministry grade 8, March–April) — NEW (§7):

| Level | Name (draft) | What |
|---|---|---|
| רמה 1 | מדמיון לשוויונות ויחס | given △ABC ∼ △ADE in vertex order → the equal angles and the ratio of the matching sides |
| רמה 2 | מיחס לצלע חסרה | given the similarity → write the ratio (only the fractions needed) → substitute → find the missing side. The calculation is learned here, BEFORE it sits inside a long proof (review 2026-11-23) |
| רמה 3 | הוכחת דמיון | prove two triangles similar by ז.ז (two angle rows with reasons, then the similarity in vertex order) |
| רמה 4 | דמיון ואז חישוב | prove similar → write the ratio → find a missing side (levels 2 + 3 joined) |
| רמה 5 | כמו במבחן | NEW (§8) |

Later subjects (not built now, Ministry order): משולש שווה שוקיים (grade 8, March) would sit between the two.
The switcher order follows the Ministry calendar, so when it is added it goes in the middle.

### 5.3 Saved progress and database keys (nothing is lost)

The answer tracker (`mp-runtime.js`) stores every decision under `chapter = "<.ch-btn text> › <.sub-tab text>"`,
and the home railway, admin stats and `seedFromServer` read those strings. Today those texts ARE what the
student sees, so renaming the tabs would orphan every row.

Decision (my call): **keys stay, labels move.** `mp-runtime.js` `textOf()` reads `el.dataset.mpKey` first when the
element has `data-mp-key`, else its text as today. The proofs buttons and tabs carry the stable key; the visible
label is free.

| Element | `data-mp-key` (stored, never changes) | Visible |
|---|---|---|
| Congruence level buttons | `1. קוראים את הנתון` … `4. חפיפה ואז מסקנה` (exactly today's texts) | רמה 1 · קוראים את הנתון … |
| Congruence exam level | `5. חפיפה – כמו במבחן` | רמה 5 · כמו במבחן |
| Similarity levels | `6. מדמיון לשוויונות ויחס`, `7. מיחס לצלע חסרה`, `8. הוכחת דמיון`, `9. דמיון ואז חישוב`, `10. דמיון – כמו במבחן` | רמה 1 … רמה 5 + name |
| Help-stage tabs | `חימום`, `רמה 1`, `רמה 2`, `רמה 3` (exactly today's texts) | חימום · מודרך · ביחד · לבד |

- **The home railway lists only live keys:** a key goes into `chapters.js` only when its subject/level is live
  (§2 goal 7). Otherwise `Journey.jsx` would count hidden levels (4/4 → 4/9) and link stops that open nothing.
- **The admin content-review panel** (`src/admin/pages/review/frame.js`, `src/admin/review/snapshot.js`,
  `src/admin/pages/review/model.js` `EXTRA_CHAPTERS.proofs`) and `TopicView.activeChapter()` also match chapters
  and tabs by text: they read the key the same way, and the review model lists the new keys (the review frame is
  where Sulaiman checks hidden content, so hidden levels MUST be reachable there).
- Keys are numbered 1–10 across the whole card in Ministry order, so `chapters.js` lists them in that order and
  the railway shows the stops in the order the student meets them. When a new subject is inserted between two,
  it gets new keys at the end of the list plus an entry in `RENAMED` only if an existing key must move (none now).
- A `?ch=<key>` link for a level of the other subject (the railway links every key) switches the subject first,
  then opens the level: the proofs page renders, for the subject not shown, visually hidden `.ch-btn` stubs
  (with their `data-mp-key`) whose click switches subject and opens that level.
- `seedFromServer` keeps matching on `type.button` (= the key) and `T['tab.N']` (= the tab key). The type's
  `button` field stays the key; a new field `label` is what the UI shows.
- Device storage: `mp:proofs:v1:` stays; new types are new entries in `types` (ids `sim-parts`, `sim-side`, `prove-sim`, `sim-calc`, `cong-exam`, `sim-exam`). No version bump. The open-proof key (`mp:proofs:open`) gains no fields.
- The "subject" is derived from the type (`type.subject`); it is not stored.

### 5.4 Subjects as data

`src/topics/proofs/subjects.js` (new): `SUBJECTS = [{ id:'congruence', name, when, types:[…ids], theorems:[…reason ids], hero }, { id:'similarity', … }]`.
Adding "משולש שווה שוקיים" later = new types + one entry here. `types/index.js` keeps one flat `TYPES` list (all
subjects, key order) for the tracker and storage; the UI groups by `SUBJECTS`.

## 6. The theorems, always visible ("המשפטים")

Abed: the student must always see the theorems where they are used, because they will use them in later years.

### 6.1 What counts and the wording

Every reason in `reasons.js` gets three texts: `short` (the chip, as today), `full` (the complete Ministry
sentence, word for word where the Ministry list has it; tagged unconfirmed otherwise) and `kind`
(`theorem` | `definition` | `rule` | `given`). Examples (sources in the 2026-11-21 research, Ministry 2015 list):

| id | short | full | kind |
|---|---|---|---|
| sas | צ.ז.צ | אם שתי צלעות במשולש אחד שוות לשתי צלעות במשולש אחר, וגם הזוויות הכלואות בין הצלעות שוות זו לזו, אז המשולשים חופפים (צלע-זווית-צלע). | theorem |
| asa | ז.צ.ז | אם שתי זוויות במשולש אחד שוות לשתי זוויות במשולש אחר, וגם הצלעות הנמצאות בין הזוויות שוות זו לזו, אז המשולשים חופפים (זווית-צלע-זווית). | theorem |
| sss | צ.צ.צ | אם שלוש צלעות במשולש אחד שוות לשלוש צלעות במשולש אחר אז שני המשולשים חופפים (צלע-צלע-צלע). | theorem |
| vertical | זוויות קודקודיות | זוויות קדקודיות שוות זו לזו. | theorem |
| aa | ז.ז | אם לשני משולשים זוויות שוות, אז הם דומים. | theorem |
| corresponding | זוויות מתאימות | זוויות מתאימות בין ישרים מקבילים שוות זו לזו. | theorem |
| alternate | זוויות מתחלפות | זוויות מתחלפות בין ישרים מקבילים שוות זו לזו. | theorem (today a wrong chip only; becomes a real reason in similarity) |
| sim-ratio | יחס הדמיון | במשולשים דומים קיים יחס שווה בין שלושת זוגות הצלעות המתאימות (צלעות מתאימות נמצאות מול זוויות שוות). | definition |
| cp-sides / cp-angles | as today | as today | rule |
| common-side / common-angle | as today | as today (+ common-angle gets a full text: it becomes a real reason) | rule |

The current `full` texts ("משפט חפיפה צ.ז.צ") are replaced by the complete sentences. All drafts → `NEW_DRAFTS`
for Sulaiman.

### 6.2 Where the student sees them (every place a reason appears)

1. **The finished row in the notebook:** the NEWEST row whose reason is a `theorem` or `definition` shows the
   full sentence under it (smaller, muted, never cut: a צ.ז.צ sentence is ~135 characters = 3–4 lines at
   375 px). Older law rows show the reason's short name plus a small "המשפט" opener (tap → the full sentence).
   Rows with `given` / `rule` reasons keep today's short form. (Review 2026-11-23: full sentences under every row
   would push the open row off the phone and turn the wording into noise.)
2. **When choosing a reason:** the chip shows the short name; the sheet shows the full sentence of the theorem
   the student is about to use (on focus/hover/first tap at מודרך and ביחד: tap = preview the sentence, second
   tap or "בחירה" = choose; at לבד the two-step pick lists each theorem with its full sentence under the name).
   Exact interaction is the builder's within these rules: no extra tap at מודרך for the right answer when the
   app already shows it; never a reason picked by accident while reading.
3. **The why-line after a right row** quotes the theorem's full sentence for theorem rows (today it paraphrases).
4. **"המשפטים" sheet:** a button in the proof header (book icon + "המשפטים") opens a sheet with the subject's
   list (§6.3). Only at מודרך (where the app guides every step) the theorem of the current step is highlighted and
   scrolled into view; at ביחד, לבד and in the exam nothing is highlighted, because there choosing the theorem is
   a counted decision. Opening
   it is never counted as help: it is the student's theorem notebook, like the list a student keeps in class
   (Abed: always visible). One tap to close; the proof state is untouched.
5. **On the subject landing:** an "המשפטים של הנושא" section under the levels: the subject's theorems as a
   notebook page (each with its short name, full sentence and a small drawing showing its pattern with marks).
6. **Warm-up and hints:** a hint that names a theorem shows its full sentence (P1 §9.1 rung 2).

### 6.3 The theorem page design

A notebook page in the same paper style as the proof notebook (P1 redesign 2026-11-22): a title ("המשפטים
בחפיפת משולשים"), then one entry per theorem: short name in the coral "theorem" pill, the full sentence, and a
small honest drawing (reuse the figure renderer with a fixed instance per theorem, marks drawn: e.g. צ.ז.צ = two
side marks + the angle between them on two triangles). Entries the student has already used get a small tick
and "השתמשתם בו N פעמים" (from device storage; optional, builder's call). Definitions and rules follow the
theorems under their own small heading. No boxed "Canva" cards: entries are separated by space and the paper's
ruled lines, not frames.

## 7. Subject: דמיון משולשים

### 7.1 What a grade-8 student must be able to do (Ministry, §1)

1. Read a similarity written in vertex order and say which angles are equal and which sides match.
2. Explain why two triangles are similar: two pairs of equal angles, each with a reason (common angle, vertical
   angles, corresponding or alternate angles between parallel lines, two right angles, a given).
3. Write the ratio of matching sides in the right order and use it to find a missing side.
4. Do this inside everyday drawings (shadow, pit) and inside drawings that mix grade-7/8 facts.
5. Know that equal angles do NOT make quadrilaterals similar (warm-up only).

### 7.2 New statement kinds (core.js)

| Kind | Example | Normal form | Truth in coordinates |
|---|---|---|---|
| `par` | DE ∥ BC | `P:` + sorted segment keys | the two lines' directions are parallel (only ever a given; never asked) |
| `sim` | △ADE ∼ △ABC | `M:` + sorted vertex pairs (like `cong`) | the three angle pairs equal (side ratios then follow) |
| `prop` | AD/AB = AE/AC = DE/BC (2 or 3 fractions) | `R:` + the set of (small, big) segment pairs, direction-free: AD/AB = DE/BC and AB/AD = BC/DE are the same; a mixed direction (AD/AB = BC/DE) is false | all fractions equal |
| `val` | DE = 6 | `V:` + seg key + number | the figure's scale (§7.5) gives that length |

**A proportion is checked by rule, not by matching one stored fact** (review 2026-11-23): it is right when every
fraction pairs a side of one triangle with its matching side of the other (from the similarity's vertex map), all
fractions point the same way, there are at least two, and (in a calculation) one of them holds the asked side and
the other a pair whose both lengths are known. The form with ratios INSIDE each triangle (AD/DE = AB/BC) is true:
it gets a neutral note ("נכון. בהוכחה כותבים את היחס בין הצלעות המתאימות") and the row is not marked wrong.
A `sim` statement is tested with `holds` before it is called a wrong matching (and every family is scalene by
the honesty check).

`show`, `say`, `partsOf`, `findFact`, `classify`, `optionsFor` learn the new kinds. Every place that assumes the
problem's one `cong` fact uses `anchorOf(p)` (the `cong` or the `sim` fact). `cong`'s vertex-matching
explanation (`matchingMiss`) is generalised to `sim` (an equal-angle pair fixes a vertex; a shared vertex
matches itself).

### 7.3 Reasons added

`aa` (ז.ז, theorem), `corresponding` (theorem; chip `מתאימות בין מקבילים`), `alternate` (theorem; chip
`מתחלפות בין מקבילים`; now accepted where it is true), `common-angle` (rule, accepted), `right-angles` ("שתי
זוויות ישרות": both given as 90°, rule; wording unconfirmed), `sim-angles` (definition; chip `משולשים דומים:
זוויות שוות`, full = the Ministry definition of similar triangles — the reason for an angle row that follows
from a similarity, the twin of `cp-angles`), `sim-ratio` (definition; chip `משולשים דומים: יחס הצלעות`, same
full sentence), `solve` ("פתרון הפרופורציה", rule; the number row).

The two parallel-line chips always say "בין מקבילים": the bare words "זוויות מתאימות" would clash with
"זוויות מתאימות במשולשים חופפים" (P1 warned about this). Groups for the
לבד two-step pick: כתוב בשאלה · רואים בציור (common angle, vertical) · ישרים מקבילים (corresponding,
alternate) · משפט דמיון (ז.ז) · נובע מהדמיון (sim-ratio) · חישוב (solve).

### 7.4 Figure families

All drawn by the existing kit (`families/kit.js`: `assemble`, `honest`, `place`, `nameMap`), each with variants:

| id | Drawing | Angle pairs available | Notes |
|---|---|---|---|
| `P` "פירמידה" | △ABC, D on AB, E on AC, DE ∥ BC (given) | ∢A common; ∢ADE = ∢ABC and ∢AED = ∢ACB (corresponding) | the core family; variants: (common + corresponding), (corresponding + corresponding) |
| `B` "פרפר" | AB ∥ CD (given), AD and BC cross at O | ∢AOB = ∢DOC (vertical); ∢OAB = ∢ODC and ∢OBA = ∢OCD (alternate) | matching crosses over; good for the vertex-order skill |
| `H` "גובה ליתר" | △ABC with ∢C = 90°, CD ⊥ AB (given, D on AB) | ∢A common to △ACD and △ABC; two right angles | three similar triangles in one drawing; only one pair asked per problem. The matching crosses (C ↔ B), so like N it is used only at לבד and in the exam. In a calculation the shared side AC is never the asked side (it would give x² = …), and only the sides used are labelled |
| `N` "לא מקביל" | △ABC, D on AB, E on AC, given ∢AED = ∢ABC (not parallel) | ∢A common + the given pair | the trap: D matches C, not B; לבד and exam only |
| `S` stories | **next round**, with Sulaiman's exact Ministry problems (review 2026-11-23: in the nested drawing the parallel lines are the person and the tree, not the sun rays — the geometry must be set by the maths owner) | | |

Honesty (P1 §6.6, extended): the similarity ratio k is between 1.5 and 3 and never within 0.15 of 1 or 2 when
that would make a different matching look right; any two angles that are NOT equal differ by at least 12°; the
parallel line is drawn parallel; labelled lengths are drawn to scale (the drawing scale is fixed per problem).

### 7.5 Numbers

- Lengths are labelled on the drawing next to the segment (P1 rule "labels never on lines": placed by measuring).
- Choose k = p/q with small integers; pick the known lengths so every asked length is a whole number or x.5;
  never ask a length that is given.
- The number is a `val` statement decision (so a refresh mid-number restores the proof like any decision).
- A number row allows 3 tries (not 2) before the app fills it; a format slip (empty, a lone ".", "06") is not a
  try at all — the box just says what is wrong.
- Answer input: at מודרך three number chips (one right, one with the ratio flipped, one with an addition
  mistake; every chip whole or x.5, all different); at ביחד and לבד a small keypad in the sheet (0–9, ".", ⌫, "בדיקה"), right-to-left page but the
  number box is left-to-right. The submit key is labelled `זו התשובה` (never a check word, §3). A wrong number gets a specific message: flipped ratio ("הפכתם את היחס: …"),
  non-matching sides, arithmetic slip ("הפרופורציה נכונה, בדקו את החישוב").
- The work line for the calculation: after the `prop` row, a sub-row shows the substitution with the student's
  numbers (e.g. 4/10 = x/15) built by the app from the labels, then the student enters x. At מודרך the app also
  shows the cross-multiplication step; at לבד it doesn't.

### 7.6 The four proof levels

**רמה 1 · מדמיון לשוויונות ויחס** (the Ministry: "לשיים משולשים דומים לפי סדר ההתאמה"; mirrors congruence
type 2). Given △ADE ∼ △ABC (and the drawing, with matching letters). The student writes: the three equal angle
pairs (or the ones asked) and the ratio line `AD/AB = AE/AC = DE/BC`. Mechanics per help stage exactly like
P1 type 2 (מודרך: worked + fill one gap with letters glowing in the same places; ביחד: tiles; לבד: tap the
parts in the drawing; the ratio is built pair by pair: tap a side of the first triangle, then its partner).

**רמה 2 · מיחס לצלע חסרה** (new step, review 2026-11-23). Given △ADE ∼ △ABC and some lengths; rows: the ratio
(only the two fractions needed), the number. מודרך: the app writes the ratio, the student picks the number among
chips with the substitution and cross-multiplication shown; ביחד: tiles for the ratio, keypad; לבד: tap the
side pairs, keypad. Families P, B only.

**רמה 3 · הוכחת דמיון** (mirrors type 3). Rows: angle pair 1 + reason, angle pair 2 + reason, the similarity
in vertex order + ז.ז. Families P, B (H and N at לבד and in the exam only). Wrong tiles at ביחד: a pair of angles that
looks equal but is not known; a similarity in the wrong vertex order.

**רמה 4 · דמיון ואז חישוב** (mirrors type 4 + the Ministry's "הסבירו מדוע … חשבו …"). Rows: the two angle rows,
the similarity, the ratio (only the fractions needed: the asked side and a known pair), the number. Families
P, B (H at לבד). The first מודרך proof reuses a figure the student proved in רמה 3 (like type 4 after type 3).

The ending motion (P1 "the drawing fills up"; congruence ends with one triangle moving onto the other): the
small triangle scales up (and turns/flips as needed) until it lies exactly on the big one, then settles back.
Reduced motion: both triangles flash once together.

### 7.7 Warm-up kinds (similarity)

| id | Task | Levels |
|---|---|---|
| S1 | "למה הזוויות שוות?" tap the reason for one marked angle pair (common / vertical / corresponding / alternate) | 2, 3 |
| S2 | "△ADE ∼ △ABC. איזה קודקוד מתאים ל-D?" / which side matches DE | 1, 2, 3 |
| S3 | "איזו צלע מתאימה?" the side opposite the equal angle (drawing, no letters order help) | 1, 3 |
| S4 | solve a proportion: 4/10 = x/15 (keypad) | 3 |
| S5 | "האם המצולעים דומים?" equal angles: two triangles (yes) / two rectangles (not necessarily) | 1 |
| W2 | (existing) "ידועה, או רק נראית כך?" | 2, 3 |

Flow, caps and "never blocks" exactly as P1 §7.1.

### 7.8 Error kinds (feed the rescue ladder)

Existing: `looks-equal`, `goal-as-known`, `too-early`, `wrong-matching`, `wrong-source`, `false-statement`.
New: `ratio-flip` (fractions not all small/big or all big/small) → S2; `non-matching-sides` (a side paired with
one that is not opposite the equal angle) → S3; `calc` (right proportion, wrong number) → S4;
`wrong-parallel-reason` (corresponding ↔ alternate mixed up) → S1. `ERR`, `ERR_WARM` and their tie-break order
are extended.

## 8. The exam level ("כמו במבחן"), both subjects

Why: Abed's goal is "so he can do anything in school". School tests give one drawing with sections א, ב, ג, no
row-by-row help, and expect the student to know which theorem to use (Ministry 4-units paper: "2–3 steps per
section").

- One drawing, 2–3 sections, each section a goal written like a test: "א. הוכיחו: △AOC ≅ △BOD. ב. הוכיחו:
  AC = BD." / "א. הוכיחו: △ADE ∼ △ABC. ב. חשבו את DE."
- What makes it different from the last proof level (review 2026-11-23: otherwise it adds nothing): MIXED
  problems from every family of the subject (incl. the ones kept for לבד: N, H, word givens), sections the way a
  test splits them, no why-line, no automatic hint pulse, the theorem sheet without highlight.
  Congruence: א the row a given in words yields (when the problem has one: "הוכיחו: AO = OB"), ב the congruence,
  ג the conclusion; else א congruence, ב conclusion. Similarity: א the similarity, ב the ratio, ג the number. Each section's rows are one block in the notebook under the section letter; a later section uses
  earlier rows. **Not in this round:** the Ministry's step 5 with a hidden datum proved by a second congruence
  (the core assumes one congruence per problem); listed for the next round.
- Help: לבד mechanics (tap + two-step reason pick), no why-line, hints only when asked; the theorem sheet is
  always available (Abed's rule). Same error messages.
- Opens when the subject's last proof level has reached the לבד stage (`ts.level ≥ 3`; reliable on a new device
  too, because server rows restore "רמה 3"). Before that the exam level shows one line: what opens it.
- Tracker: the exam shows one help-stage tab, visible `לבד`, key `רמה 3`, so its rows are stored as
  `<exam key> › רמה 3` and `seedFromServer` restores it like any level.
- Rescue in the exam: step 1 (a warm-up of the commonest error) as usual; steps 2 and 3 become one card "go back
  and practise רמה N" (the subject's last proof level) with "continue here" beside it. No walk-through.
- Mastery mechanics (the existing `record()` would never level an exam up): an exam type is stored starting at
  level 3, is always presented as variant B, and is recorded with exam options — no fast track, no step-2
  walk-through (the exam card instead).
- Mastery: 3 clean of the last 4 → the subject is **"שולטים בנושא"** (top level): a calm, proud end card (no confetti storm; P1 tone) + a mark on the
  subject switcher. It stays open for practice; mixed templates every time.

## 9. Care: never frustrated, always a next step

Everything in P1 (rescue ladder, hint ladder, two tries then the app fills, the kind card after 6 proofs,
"הפעם נעזרתם פחות") applies to every new level. Additions:
- **Where am I, always:** the subject landing shows the ladder with the student's spot ("את/ה כאן"), the next
  step button, and how far to "שולטים בנושא" (levels done of N).
- **Rescue step 3** ("go back one") stays inside the subject: the previous level of the same subject
  (`levelNo − 1`), from רמה 1 the subject's warm-up — never the other subject (the flat `TYPES` list must not be
  used for "previous").
- **Prerequisite nudge, not a lock:** similarity never requires finishing congruence (the teacher may be on
  similarity now). If the student has not done congruence רמה 3, the first similarity visit shows one quiet line
  "דמיון דומה מאוד להוכחת חפיפה. אפשר להתחיל כאן." (no block).
- **Levels are never locked** (as the types today): every level of a subject can be opened, the ladder marks
  the recommended next one ("הבא בתור"). The exam level is the one exception (§8: it opens after the last
  proof level reaches לבד, with a line saying what opens it). Help stages inside a level unlock as today
  (mastery).

## 10. Screens (375 pt first)

### 10.1 Landing (one subject at a time)

```
 ┌ glass top bar (topic page, unchanged) ┐
   חפיפה            ← giant wordmark = the subject's short name, the subject's hero drawing in front
   [ חפיפת משולשים | דמיון משולשים ]   ← subject switcher (segmented, swipe/tap; word + drawing change together)
   ינואר–פברואר · 2 מתוך 5 רמות · עד "שולטים בנושא"
   ── the ladder (P1 path style, numbered רמה 1…5, "את/ה כאן" on the current one) ──
      open level: what it's about · help stages (חימום · מודרך · ביחד · לבד) · main button under the thumb
   ── המשפטים של הנושא (notebook page, §6.3) ──
```

The switcher remembers the last subject (device storage) and opens on it; a first visit opens on the subject
the student has progress in, else חפיפת משולשים. Changing subject keeps the scroll at the top. `?ch=<key>` still
opens a level directly (P1 URL rule).

### 10.2 The proof screen

Unchanged notebook design (2026-11-22) plus: the "המשפטים" header button (§6.2.4), theorem sentences under
theorem rows (§6.2.1), the section letters for the exam level (§8), new row kinds (ratio row shown as stacked
fractions in one left-to-right island; the number row with the keypad sheet).

Height budget at 375×667: the full-sentence line under theorem rows must not push the open row off screen; the
notebook auto-scroll rule (keep the active row in view) still holds; sentences of earlier rows may collapse to
one line with an ellipsis + tap to open when the notebook is taller than the space (builder's call, measured).

## 11. Data model summary

- `reasons.js`: `full` = Ministry sentence, new `kind`; new reasons (§7.3); `GROUPS` per subject.
- `subjects.js` (new): the subjects, their order, names, months, theorem lists, hero instances.
- `types/`: `sim-parts.js`, `sim-side.js`, `prove-sim.js`, `sim-calc.js`, `exam.js` (one generator, two subjects); each type
  gets `subject`, `label`, `button` (= key, §5.3).
- `families/`: `p.js`, `b.js`, `h.js`, `n.js` (+ stories as words on P/B).
- `core.js`: statement kinds `par`, `sim`, `prop`, `val`; classify/check/why/chips/options/present for them;
  `TYPE_N` replaced by a per-type `shape` (`parts` | `prove` | `then` | `exam`) so present() does not depend on
  type numbers.
- `mastery.js`: ERR / ERR_WARM extended; exam passing → subject mastered; nothing else changes.
- `warmup-core.js`: S1–S5.
- `mp-runtime.js`: `data-mp-key` (§5.3).
- `chapters.js` / `chapterInfo.js`: the 9 keys in order with "what is it about" lines.

## 12. Checks before done

- Unit tests for every new pure function, including: every template builds an honest figure (1 000 seeds per
  template), all numbers whole or x.5, `prop` direction rule, `sim` matching explanations, every reason's `full`
  text exists, every key in `chapters.js` equals a type's `button`.
- `mp-runtime`: a test page (or node test) proving topics without `data-mp-key` store exactly what they stored
  before.
- `node --test src/topics/proofs/*.test.mjs`, `python3 tools/verify-logic.py` ("math and text untouched"),
  `npx next build`.
- Real phone pass (375 px, WebKit): each level of each subject, each help stage, the theorem sheet, the keypad,
  the exam level, the subject switcher; scroll smooth down and up; every menu opened; a scroll video reviewed
  frame by frame. Desktop pass.
- An existing student's saved congruence progress (device + server rows) shows unchanged after the update.

## 13. Open points for Sulaiman (the maths owner)

1. All new Hebrew texts (level names, help-stage names, theorem sentences, feedback) — drafts.
2. Similarity reason: write it "משפט דמיון ז.ז" with the Ministry sentence "אם לשני משולשים זוויות שוות, אז הם
   דומים"? The sentence says "זוויות שוות" (all), the classroom uses two angles. OK to accept two angle rows?
3. "שתי זוויות ישרות" as a reason, or must the student write "נתון" for each right angle?
4. `similar-triangles` (his topic) is grade 9 on the site; the Ministry teaches it in grade 8. Move or add grade 8?
5. Is the exam level's format (sections א/ב on one drawing) what his students' tests look like?

## 14. Build order

1. Structure: `data-mp-key`, subjects, labels, help-stage names, landing switcher (congruence only at first) —
   ship-able alone, zero content change.
2. Theorems always visible (wording, rows, chips, why-line, sheet, landing page).
3. Similarity core (statement kinds, reasons, families, honesty tests).
4. Similarity levels 1–4 + numbers + warm-up S1–S5 + error kinds.
5. Exam level for both subjects + "שולטים בנושא".
6. Full phone/desktop review, fixes, Sulaiman's review list.

## 15. Left to the builder

Exact pixel layout within the rules above; the theorem-sentence collapse rule (§10.2); the exact chip
preview interaction (§6.2.2); the keypad's look (must match the notebook); story sentence wording (drafts);
the hero drawing instances per subject; whether "השתמשתם בו N פעמים" ships.
