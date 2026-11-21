# Geometry proofs for grades 7–9: what to master and in what order

Research file for the new "proofs" section (הוכחות). Written 2026-11-21. Nothing in the project was edited.

## 0. Sources and how to read the wording tags

Every Hebrew theorem below carries a tag that says where the wording comes from.

| Tag | Source | Status |
|---|---|---|
| **[ת]** | Ministry of Education, "תמצית הנלמד בגאומטריית המישור בתכנית הלימודים בחט"ב – מושגים, הגדרות, נוסחאות, הנחות יסוד ומשפטים" (הפיקוח על הוראת המתמטיקה, 11.5.2015). Copy: https://savyonim.schooly.co.il/wp-content/uploads/2019/12/תמצית-הנלמד-ומשפטים-בגיאומטריה-בחטיבת-ביניים-1.pdf | Official list of middle-school theorems. Quoted word for word. Note: the copy I read sits on a school site, not on the Ministry site. |
| **[ח]** | Ministry, updated curriculum grade 8 geometry ("תוכנית הלימודים המעודכנת", chapter "המעבר לגאומטריה היסקית – חפיפת משולשים"): https://meyda.education.gov.il/files/Pop/0files/matmatika/Chativat-Beynayim/curriculum/updating/geometry_8.pdf | Official. Quoted word for word. |
| **[פ]** | Ministry teaching plans 2026–27 (תשפ"ז): local `prisa_7.pdf`, `prisa_8.pdf`, `prisa_9A.pdf` (9A online: https://meyda.education.gov.il/files/Pop/0files/matmatika/Chativat-Beynayim/tashpaz/prisa_9A.pdf) | Official. Quoted word for word. |
| **[ד]** | Ministry, "דגשים בהוראת הגיאומטריה לתלמידים לקראת 4 יח"ל – כיתה ט'": https://meyda.education.gov.il/files/Pop/0files/matmatika/Chativat-Beynayim/tashpah/geometry%20profile%204%20units.pdf | Official. Used for level of difficulty and example questions. |
| **[ב]** | "רשימת משפטים בגיאומטריה – 4 יח"ל" (bagrut.co.il teachers' sheet, merges the Ministry bagrut list with [ת]): https://bagrut.gool.co.il/misc/4pts_GeometryList_Teachers.pdf | NOT an official document. Used only where [ת] has no line. |
| **(unconfirmed)** | Normal classroom phrasing that I could not find word for word in an official document. | Sulaiman should approve the wording. |

Other Ministry material read:
- Ministry test "מבדק בנושא חפיפת משולשים": https://meyda.education.gov.il/files/Pop/0files/matmatika/Chativat-Beynayim/tirgul/review/8G/CongruentTriangles_he.pdf
- Ministry practice booklet grade 8, second half: https://meyda.education.gov.il/files/Pop/0files/matmatika/Chativat-Beynayim/tirgul/review/8G/tirgulB_he.pdf
- מרחב פדגוגי, page "חפיפת משולשים": https://pop.education.gov.il/tchumey_daat/matmatika/chativat-beynayim/noseem_nilmadim/hafifat-mesolasim/

Not checked (say so honestly): the מיצ"ב question collection linked from the מרחב פדגוגי page (Google Drive file), printed textbooks (מתמטיקה משולבת, מט"ח, etc.), and the updated curriculum file for grade 9 (the guessed address returned "not found"). Grade 9 rests on the תשפ"ז plan [פ], the 2015 list [ת] and the 4-units emphasis paper [ד].

### What the Ministry plans say (the order we must respect)

**Grade 7 [פ]:** angles (צמודות, קודקודיות, חוצה זווית, סכום והפרש זוויות), angles in triangles, סכום זוויות במשולש ובמרובע, צורות חופפות במישור. No formal proofs.

**Grade 8 [פ], in this order:** השלמת זוויות מתחלפות ומתאימות בין ישרים מקבילים (Sept) → משפט פיתגורס → **חפיפת משולשים** (Jan–Feb) → צלעות במשולש, תיכון במשולש → זווית חיצונית למשולש → **משולש שווה שוקיים** → **משפטים הפוכים למשולש שווה שוקיים** → דמיון משולשים.

**Grade 9 (9A) [פ], in this order:** דלתון → **משולש שווה שוקיים: "משפטים הפוכים להוכחה כי משולש הוא שווה שוקיים"** → **יחסי צלעות וזוויות** (larger side opposite larger angle, both directions) → **משולש ישר זווית 30°,60°,90°** + משפט הפוך → **ישרים מקבילים – משפט הפוך; טרפז; "הוכחה שמרובע הוא טרפז"** → **מקבילית** (הגדרה, תכונות צלעות, זוויות ואלכסונים, משפטים הפוכים) → **מלבן** → **מעוין** → **ריבוע** → **התיכון ליתר** ("תרגול המשפט בשילוב מרובעים") → דמיון משולשים.

Two limits written in the 9A plan:
- "הנושאים שלא ילמדו בשנת הלימודים תשפ"ז ברמת לימוד זו: קטע אמצעים במשולש ובטרפז." → no midsegment proofs.
- "זוויות חד צדדיות בין ישרים מקבילים (לא חובה)" → never make a proof depend only on חד-צדדיות.

Level of difficulty, from [ד]: "תידרש רמת סיבוכיות נמוכה, כלומר, מענה על שאלה במספר מועט של שלבים (עד כ-2–3 שלבים בסעיף). בשאלות בהן נדרש תהליך היסקי מורכב, יש לחלק את השאלה לסעיפים פשוטים יותר, כך שכל סעיף יספק לתלמידים הכוונה והדרכה לפתרון."

The Ministry's own ladder for learning proof [ח] (this is the backbone of the path in part 2):
1. "בהינתן שני משולשים חופפים, מהם חלק מהשוויונות שאפשר להסיק מכך."
2. "הוכחה של חפיפת משולשים, בעזרת אחד ממשפטי החפיפה."
3. "הוכחה של נתון הדרוש לחפיפה בסעיף נפרד, והוכחת החפיפה עצמה בסעיף נפרד."
4. "הוכחה של חפיפת משולשים, בעזרת אחד ממשפטי החפיפה, והיסק של שוויונות הנובעים מהחפיפה בסעיף נפרד."
5. "הוכחה משולבת של נתון הדרוש לחפיפה, חפיפה, והיסק של שוויון הנובע מהחפיפה."

And the Ministry's ladder for what the student does [ח]: (א) follow and understand a proof someone else wrote, (ב) "להשלים פרטים חסרים בהוכחה שקיימת חלקית", (ג) explain a proof out loud, (ד) write a proof. It also suggests question types: "נכון או לא, מי צודק במסגרת טענות, השלמה של שלד הוכחה".

### What the app already has (build on it, do not repeat it)

| Where | What exists | What it means for the proofs section |
|---|---|---|
| `src/topics/angles-parallel/Topic.jsx` (chapters "1. קודקודיות" … "6. הכל יחד") | Finding angle sizes with vertical, adjacent, alternate, corresponding, co-interior angles | The facts are taught. Proofs section adds "name the reason" (skills 1–2). |
| `src/topics/triangles/Topic.jsx`, chapter "4. חפיפה" (`genCh3`, lines ~1815–2010) | Three exercise kinds: `identify` (which theorem, from marks on two separate triangles), `complete` (what is still missing), `calculate` (matching side). Five "theorems": צ.צ.צ, צ.ז.צ, ז.צ.ז, צ.צ.ז, ז.ז.צ | Covers part of skills 4–5 only. No shared side, no vertical angles, no written congruence in vertex order, no reasons, no conclusion from congruence. **Flag for Sulaiman:** "ז.ז.צ" is not an Israeli congruence theorem. The Ministry text [ח] says a proof must first move to the state where the equal side lies between the two equal angle pairs (third angle by "סכום זוויות במשולש") and only then use ז.צ.ז. Also the updated grade 8 curriculum speaks of "שלושת משפטי החפיפה" plus "ניצב ויתר"; צ.צ.ז ("the fourth theorem") appears in the 2015 list [ת] and as a separate Ministry lesson. I did not change anything. |
| `src/topics/triangles/Topic.jsx`, chapters 1–3 | Angle sums, triangle kinds, isosceles / equilateral / right triangle calculations | Facts for skills 2, 9. |
| `src/topics/quadrilaterals/Topic.jsx` (ריבוע, מלבן, מעוין, מקבילית, טרפז, דלתון) | Property posters and calculations. `ReasonedAngleQuestion` already asks the student to pick a reason (opposite / adjacent / base-equal / co-interior) before giving an angle | The same "pick the reason, then the value" pattern is the right first step for the proofs section. No converse theorems, no "prove it is a parallelogram". |
| `src/topics/new/chapters/geometry/exterior-angle.js` | זווית חיצונית למשולש (find, with isosceles, with x) | Fact for skills 2, 12. |
| `src/topics/new/chapters/geometry/triangle-sides.js` | אי-שוויון המשולש, largest angle, ordering sides | Calculation side of skill 12. |
| `src/topics/new/chapters/geometry/right-triangle-special.js` | 30-60-90 (leg), the converse, median to hypotenuse (length, angles) | Calculation side of skills 13 and 19. |
| `src/topics/new/chapters/geometry/transformations.js`, `area-ratio.js`, `similar-triangles` topic | Congruent shapes by moves, similarity | Background only. |

Simple rule: the app already teaches the **facts and the numbers**; the proofs section teaches **saying why** and **chaining reasons**.

---

## 1. The complete list of reasons (נימוקים)

Short name = what a student-facing chip could say. Grade = when the Ministry plan first teaches it.

### 1A. Basic moves (not theorems)

| # | Hebrew wording | Short name | Grade | Source |
|---|---|---|---|---|
| A1 | נתון | נתון | 7 | (unconfirmed as a quoted line; universal) |
| A2 | צלע משותפת | צלע משותפת | 8 | (unconfirmed) |
| A3 | זווית משותפת | זווית משותפת | 8 | (unconfirmed) |
| A4 | חוצה זווית מחלק את הזווית לשתי זוויות שוות (הגדרת חוצה זווית) | חוצה זווית | 7 | (unconfirmed wording; concept listed in [ת]) |
| A5 | תיכון מחבר קודקוד עם אמצע הצלע שמולו (הגדרת תיכון) | תיכון | 8 | (unconfirmed wording; concept "תיכון לצלע" in [ת]) |
| A6 | גובה מאונך לצלע (הגדרת גובה) | גובה | 7 | (unconfirmed wording). Related definition in [ת]: "ישר (או קטע) ניצב לישר (או קטע) אחר אם הם נחתכים בזווית ישרה." |
| A7 | אמצע קטע מחלק אותו לשני קטעים שווים | אמצע קטע | 7 | (unconfirmed) |
| A8 | חיבור קטעים שווים / חיסור קטעים שווים (also for angles: חיבור זוויות / חיסור זוויות) | חיבור / חיסור | 8 | (unconfirmed wording). The Ministry page links a video named "טעויות בהוכחות גיאומטריה – חיסור וחיבור קטעים". |
| A9 | כלל המעבר (שני גדלים השווים לגודל שלישי שווים זה לזה) | כלל המעבר | 8 | (unconfirmed) |
| A10 | חצאים של קטעים שווים שווים זה לזה | חצאי קטעים שווים | 8 | (unconfirmed) |
| A11 | כל הרדיוסים במעגל שווים | רדיוסים | 8 | (unconfirmed wording). [ח] asks to practise congruence "גם כאשר הנתון מוצג כך שחלק מהצלעות הן רדיוס של מעגל". |

### 1B. Angles and parallel lines

| # | Hebrew wording | Short name | Grade | Source |
|---|---|---|---|---|
| B1 | סכום זוויות צמודות הוא 180°. | זוויות צמודות | 7 | [ת] |
| B2 | זוויות קדקודיות שוות זו לזו. | זוויות קודקודיות | 7 | [ת] (spelling there: קדקודיות; the app and [ב] write קודקודיות) |
| B3 | זוויות מתחלפות בין ישרים מקבילים שוות זו לזו. | מתחלפות | 7/8 | [ת] |
| B4 | זוויות מתאימות בין ישרים מקבילים שוות זו לזו. | מתאימות | 7/8 | [ת], [ח] |
| B5 | אם שתי זוויות מתחלפות בין שני ישרים שוות זו לזו, אזי שני הישרים מקבילים זה לזה. | מתחלפות שוות ← מקבילים | 9 | [ת] |
| B6 | אם שתי זוויות מתאימות בין שני ישרים שוות זו לזו, אזי שני הישרים מקבילים זה לזה. | מתאימות שוות ← מקבילים | 9 | [ת] |
| B7 | אם שני ישרים מקבילים נחתכים על ידי ישר שלישי אז סכום כל זוג זוויות חד-צדדיות הוא 180°. | חד-צדדיות | 8 (9: "לא חובה") | [ב] only. Not in [ת]. |
| B8 | שני ישרים נחתכים על ידי ישר שלישי. אם סכום זוג זוויות חד-צדדיות הוא 180°, אז שני הישרים מקבילים. | חד-צדדיות 180° ← מקבילים | 9, optional | [ב] only |

### 1C. Triangles (general)

| # | Hebrew wording | Short name | Grade | Source |
|---|---|---|---|---|
| C1 | סכום זוויות במשולש הוא 180°. | סכום זוויות במשולש | 7 | [ת] |
| C2 | זווית חיצונית למשולש שווה לסכום הזוויות הפנימיות שאינן צמודות לה. | זווית חיצונית | 8 | [ת] |
| C3 | סכום שתי צלעות במשולש גדול מהצלע השלישית. | אי-שוויון המשולש | 8 | [ת] |
| C4 | אם במשולש שתי צלעות שונות זו מזו, אז מול הצלע הגדולה מביניהן ממוקמת הזווית הגדולה. | מול צלע גדולה – זווית גדולה | 9 | [פ] 9A, same in [ת] |
| C5 | אם במשולש שתי זוויות שונות זו מזו, אז מול הזווית הגדולה מביניהן ממוקמת הצלע הגדולה. | מול זווית גדולה – צלע גדולה | 9 | [פ] 9A, same in [ת] |
| C6 | התיכון מחלק את המשולש לשני משולשים שווי שטח. | תיכון – שטחים שווים | 8 | [ת] |
| C7 | סכום זוויות במרובע הוא 360°. | סכום זוויות במרובע | 7 | [ת] |

### 1D. Congruence

| # | Hebrew wording | Short name | Grade | Source |
|---|---|---|---|---|
| D0 | הגדרה: שני משולשים נקראים חופפים אם אפשר להניח את אחד מהם על האחר כך שיכסה אותו בדיוק. | משולשים חופפים | 8 | [ת], [ח] |
| D1 | אם שתי צלעות במשולש אחד שוות לשתי צלעות במשולש אחר, וגם הזוויות הכלואות בין הצלעות שוות זו לזו, אז המשולשים חופפים (צלע-זווית-צלע). | **צ.ז.צ** | 8 | [ת], [ח] |
| D2 | אם שתי זוויות במשולש אחד שוות לשתי זוויות במשולש אחר, וגם הצלעות הנמצאות בין הזוויות שוות זו לזו, אז המשולשים חופפים (זווית-צלע-זווית). | **ז.צ.ז** | 8 | [ת], [ח] |
| D3 | אם שלוש צלעות במשולש אחד שוות לשלוש צלעות במשולש אחר אז שני המשולשים חופפים (צלע-צלע-צלע). | **צ.צ.צ** | 8 | [ת], [ח] |
| D4 | אם שתי צלעות במשולש אחד שוות לשתי צלעות במשולש אחר, ואם הזווית שמול הצלע הגדולה (בין השתיים) במשולש האחד שווה לזווית המתאימה לה במשולש האחר אזי שני המשולשים חופפים זה לזה (צלע-צלע-זווית מול הצלע הגדולה מביניהן). | **צ.צ.ז** (המשפט הרביעי) | 8 (extension) | [ת]. The updated grade 8 curriculum [ח] lists only three theorems + D5. Treat as a late, optional step. |
| D5 | שני משולשים ישרי זווית שלהם ניצב שווה ויתר שווה חופפים זה לזה. | ניצב ויתר | 8 | [ת]; [ח]: "משפט חפיפה ניצב ויתר במשולש ישר זווית … תוצאת שילוב בין משפט חפיפה צלע-צלע-צלע לבין משפט פיתגורס" |
| D6 | מול צלעות שוות בהתאמה מונחות זוויות שוות בהתאמה. / מול זוויות שוות בהתאמה מונחות צלעות שוות בהתאמה. | צלעות (זוויות) מתאימות במשולשים חופפים | 8 | [ח] (this is how the curriculum words what follows from congruence). The classroom reason "צלעות מתאימות במשולשים חופפים שוות" / "זוויות מתאימות במשולשים חופפים שוות" is (unconfirmed) as exact wording but universal. |

The dotted short forms צ.ז.צ / ז.צ.ז appear in official Ministry material (the congruence test: "המשולשים חופפים לפי משפט חפיפה ז.צ.ז").

Warnings the curriculum itself lists [ח] (good "trap" items): "שני משולשים שיש להם שני נתונים שווים (למשל שתי צלעות או צלע וזווית) אינם בהכרח חופפים." "שני משולשים שזוויותיהם שוות בהתאמה אינם בהכרח חופפים." "שני משולשים שיש להם אותו היקף אינם בהכרח חופפים." "שני משולשים שיש להם אותו שטח אינם בהכרח חופפים."

### 1E. Isosceles triangle

| # | Hebrew wording | Short name | Grade | Source |
|---|---|---|---|---|
| E0 | הגדרה: משולש ששתיים מצלעותיו שוות זו לזו. | הגדרת משולש שווה שוקיים | 7 | [ת] |
| E1 | במשולש שווה שוקיים זוויות הבסיס שוות זו לזו. | זוויות הבסיס שוות | 8 | [ת] |
| E2 | משולש שבו שתי זוויות שוות הוא משולש שווה שוקיים. | שתי זוויות שוות ← שווה שוקיים | 8, again 9 | [ת] |
| E3 | במשולש שווה שוקיים חוצה זווית הראש, הגובה לבסיס והתיכון לבסיס מתלכדים. | חוצה-גובה-תיכון מתלכדים | 8 | [ת]; quoted in [פ] 9A |
| E4 | משולש שבו חוצה זווית מתלכד עם גובה הוא משולש שווה שוקיים. | חוצה = גובה ← שווה שוקיים | 8/9 | [ת] |
| E5 | משולש שבו תיכון מתלכד עם גובה הוא משולש שווה שוקיים. | תיכון = גובה ← שווה שוקיים | 8/9 | [ת] |
| E6 | משולש שבו תיכון מתלכד עם חוצה זווית הוא משולש שווה שוקיים. | תיכון = חוצה ← שווה שוקיים | 9 | [ת] (its proof needs an auxiliary construction; use only as a quoted reason) |
| E7 | במשולש שווה צלעות כל הזוויות שוות 60°. | משולש שווה צלעות | 7 | (unconfirmed wording) |

### 1F. Right triangle

| # | Hebrew wording | Short name | Grade | Source |
|---|---|---|---|---|
| F1 | משפט פיתגורס: במשולש ישר זווית סכום ריבועי הניצבים שווה לריבוע היתר. | משפט פיתגורס | 8 (7 in the תשפ"ז plan) | [ת] |
| F2 | במשולש ישר זווית שאחת מזוויותיו בת 30°, הניצב מול זווית זו שווה באורכו למחצית היתר. | ניצב מול 30° | 9 | [פ] 9A |
| F3 | משפט הפוך – משולש ישר זווית שבו הניצב שווה למחצית מהיתר, הזווית שמול ניצב זה בת 30°. | ניצב = חצי יתר ← 30° | 9 | [פ] 9A |
| F4 | במשולש ישר זווית התיכון ליתר שווה למחצית היתר. | התיכון ליתר | 9 | [ת] |
| F5 | משולש שבו התיכון שווה למחצית הצלע אותה הוא מחלק, הוא משולש ישר זווית. | תיכון = חצי צלע ← ישר זווית | 9 | [ת] |

### 1G. Quadrilaterals

| # | Hebrew wording | Short name | Grade | Source |
|---|---|---|---|---|
| G1 | הגדרה (דלתון): הדלתון הוא מרובע שלו שני זוגות זרים של צלעות סמוכות השוות זו לזו. | הגדרת דלתון | 8/9 | [ת] |
| G2 | זוויות הצד בדלתון שוות זו לזו. | זוויות הצד בדלתון | 8/9 | [ת] |
| G3 | האלכסון הראשי של הדלתון חוצה את זוויות הראש, חוצה את האלכסון המשני ומאונך לו. | האלכסון הראשי בדלתון | 8/9 | [ת] |
| G4 | הגדרה (טרפז): מרובע שבו יש זוג יחיד של צלעות המקבילות זו לזו. | הגדרת טרפז | 9 | [ת] |
| G5 | בטרפז שווה שוקיים זוויות הבסיס שוות זו לזו. | זוויות בסיס בטרפז שו"ש | 9 | [ת] |
| G6 | טרפז שבו זוויות הבסיס שוות זו לזו הוא טרפז שווה שוקיים. | זוויות בסיס שוות ← טרפז שו"ש | 9 | [ת] |
| G7 | בטרפז שווה שוקיים האלכסונים שווים זה לזה. | אלכסונים בטרפז שו"ש | 9 | [ת] |
| G8 | טרפז שבו האלכסונים שווים זה לזה הוא טרפז שווה שוקיים. | אלכסונים שווים ← טרפז שו"ש | 9 | [ת] |
| G9 | הגדרה (מקבילית): מרובע שבו יש שני זוגות של צלעות המקבילות זו לזו. | הגדרת מקבילית | 9 | [ת] |
| G10 | צלעות נגדיות במקבילית שוות זו לזו. | צלעות נגדיות במקבילית | 9 | [ת] |
| G11 | זוויות נגדיות במקבילית שוות זו לזו. | זוויות נגדיות במקבילית | 9 | [ת] |
| G12 | סכום זוויות סמוכות במקבילית הוא 180°. | זוויות סמוכות במקבילית | 9 | [ת] |
| G13 | האלכסונים במקבילית חוצים זה את זה. | אלכסוני מקבילית | 9 | [ת] |
| G14 | מרובע שבו הצלעות הנגדיות שוות זו לזו הוא מקבילית. | נגדיות שוות ← מקבילית | 9 | [ת] |
| G15 | מרובע שבו שתי צלעות נגדיות שוות ומקבילות הוא מקבילית. | זוג שוות ומקבילות ← מקבילית | 9 | [ת] |
| G16 | מרובע שבו האלכסונים חוצים זה את זה הוא מקבילית. | אלכסונים חוצים ← מקבילית | 9 | [ת] |
| G17 | אם הסכום של כל שתי זוויות סמוכות במרובע הוא 180°, אזי המרובע הוא מקבילית. | סמוכות 180° ← מקבילית | 9 | [ת] |
| G18 | מרובע שבו כל שתי זוויות נגדיות שוות הוא מקבילית. | נגדיות שוות (זוויות) ← מקבילית | 9 | [ב] only. Not in [ת]. |
| G19 | הגדרה (מלבן): מרובע בעל כל הזוויות ישרות. | הגדרת מלבן | 9 | [ת] |
| G20 | האלכסונים במלבן שווים זה לזה. | אלכסוני מלבן | 9 | [ת] |
| G21 | מקבילית שבה יש זווית ישרה היא מלבן. | מקבילית + זווית ישרה ← מלבן | 9 | [ת] |
| G22 | מקבילית שבה האלכסונים שווים זה לזה היא מלבן. | מקבילית + אלכסונים שווים ← מלבן | 9 | [ת] |
| G23 | הגדרה (מעוין): מרובע שבו כל הצלעות שוות. | הגדרת מעוין | 9 | [ת] |
| G24 | האלכסונים במעוין מאונכים זה לזה. | אלכסוני מעוין מאונכים | 9 | [ת] |
| G25 | האלכסונים במעוין חוצים את הזוויות. | אלכסוני מעוין חוצי זוויות | 9 | [ת] |
| G26 | מקבילית שבה שתי צלעות סמוכות שוות היא מעוין. | מקבילית + סמוכות שוות ← מעוין | 9 | [ת] |
| G27 | מקבילית שבה האלכסונים מאונכים זה לזה היא מעוין. | מקבילית + אלכסונים מאונכים ← מעוין | 9 | [ת] |
| G28 | מקבילית שבה אלכסון חוצה את זווית המקבילית היא מעוין. | מקבילית + אלכסון חוצה זווית ← מעוין | 9 | [ת] |
| G29 | הגדרה (ריבוע): מרובע שבו כל הצלעות שוות וכל הזוויות ישרות. | הגדרת ריבוע | 9 | [ת] |
| G30 | מעוין שבו האלכסונים שווים הוא ריבוע. | מעוין + אלכסונים שווים ← ריבוע | 9 | [ת] |
| G31 | מלבן בו הצלעות הסמוכות שוות הוא ריבוע. | מלבן + סמוכות שוות ← ריבוע | 9 | [ת] |

Left out on purpose: קטע אמצעים (not taught in תשפ"ז at this level), similarity theorems (a separate topic; the only middle-school similarity theorem is "אם לשני משולשים זוויות שוות, אז הם דומים" [ת]).

Simple rule: about 70 reasons in total, but a grade 8 student needs only about 25 (groups A–E), and each skill below uses a small set of 4–8.

---

## 2. The learning path: 20 skills in 6 units

Notation: ∢ angle, △ triangle, ≅ congruent, ∥ parallel, ⊥ perpendicular. "Steps" = lines in the statement–reason table, not counting the final "מ.ש.ל".

Overview:

| Unit | Grade | Skills | Idea |
|---|---|---|---|
| 1. נימוק אחד | 7–8 | 1–3 | Say why. One reason, then a chain of two or three. Read the given. |
| 2. חפיפת משולשים | 8 | 4–8 | The Ministry ladder: from congruence to equalities → prove congruence → hidden given → conclusion. |
| 3. משולש שווה שוקיים | 8 (again start of 9) | 9–11 | Use the theorem, then the converse, then overlapping triangles. |
| 4. צלעות, זוויות ומשולש 30-60-90 | 9 | 12–13 | Inequality reasoning and the special right triangle. |
| 5. ישרים מקבילים – המשפט ההפוך, טרפז | 9 | 14–15 | Prove lines are parallel; prove a quadrilateral is a trapezoid. |
| 6. מרובעים | 9 | 16–20 | Use parallelogram properties → prove a parallelogram → rectangle / rhombus / square → median to the hypotenuse → a full graded question. |

Simple rule: a student never meets a new reason and a longer proof at the same time. Each skill adds one thing only.

---

### Unit 1 — נימוק אחד (grades 7–8)

#### Skill 1. One step: "why is this true? pick the reason"
- **Grade:** 7 (parallel-line reasons: 7/8). **Prerequisites:** none (angle facts from `angles-parallel`).
- **Typical given / goal:** a drawing with one marked equality or sum; the student picks the reason out of 3–4.
- **Steps:** 1.

**Example 1.** הישרים AB ו-CD נחתכים בנקודה O. מדוע ∢AOC = ∢BOD?
Drawing: two lines crossing at O; A and B on one line on both sides of O, C and D on the other.

| טענה | נימוק |
|---|---|
| ∢AOC = ∢BOD | זוויות קודקודיות שוות זו לזו |

**Example 2.** נתון: AB ∥ CD. הישר EF חותך את AB בנקודה G ואת CD בנקודה H. מדוע ∢AGH = ∢GHD?
Drawing: AB above CD, both horizontal, A and C on the left, B and D on the right; the transversal passes through G (on AB) and H (on CD).

| טענה | נימוק |
|---|---|
| ∢AGH = ∢GHD | זוויות מתחלפות בין ישרים מקבילים שוות זו לזו |

**Common mistakes**
1. Mixing מתחלפות with מתאימות (and both with קודקודיות).
2. Writing "מתחלפות" without the words "בין ישרים מקבילים" when the lines are not given as parallel. The equality holds only between parallels.
3. Answering "because it looks equal in the drawing". A drawing is never a reason.

#### Skill 2. A chain of two or three reasons (find an angle and say why at each step)
- **Grade:** 7–8. **Prerequisites:** 1.
- **Typical given / goal:** parallel lines or a triangle with one or two angles given; find another angle, a reason on every line.
- **Steps:** 2–3.

**Example 1.** נתון: AB ∥ CD. ישר חותך את AB בנקודה G ואת CD בנקודה H. E נקודה על הישר מעל G, ו-F נקודה על הישר מתחת ל-H. ∢EGB = 70°. מצאו את ∢CHF.
Drawing: as in skill 1, with E on the transversal above AB and F below CD.

| # | טענה | נימוק |
|---|---|---|
| 1 | AB ∥ CD, ∢EGB = 70° | נתון |
| 2 | ∢GHD = ∢EGB = 70° | זוויות מתאימות בין ישרים מקבילים שוות זו לזו |
| 3 | ∢CHF = ∢GHD = 70° | זוויות קודקודיות שוות זו לזו |

**Example 2.** במשולש ABC: ∢A = 50°, ∢B = 60°. הנקודה D על המשך הצלע BC (מעבר ל-C). מצאו את ∢ACD.

| # | טענה | נימוק |
|---|---|---|
| 1 | ∢A = 50°, ∢B = 60° | נתון |
| 2 | ∢ACB = 180° − 50° − 60° = 70° | סכום זוויות במשולש הוא 180° |
| 3 | ∢ACD = 180° − 70° = 110° | סכום זוויות צמודות הוא 180° |

(Short way, one step: ∢ACD = 50° + 60° = 110°, "זווית חיצונית למשולש שווה לסכום הזוויות הפנימיות שאינן צמודות לה".)

**Common mistakes**
1. A correct number with no reason, or one reason for two steps.
2. Using a fact about an angle that was not yet found (wrong order of lines).
3. Taking the exterior angle as the sum of the two angles next to it instead of the two far ones.

#### Skill 3. Reading the given: from words to equalities; "נתון" and "צריך להוכיח"
- **Grade:** 8 (start of the congruence chapter). **Prerequisites:** 1.
- **Typical given / goal:** a sentence such as "AD חוצה זווית" / "D אמצע BC" / "AD תיכון" / "AD גובה"; the student picks the equality it gives. Second kind: split a theorem into given and to-prove. [ח]: "יש ללמוד להבין מתוך ניסוח המשפט מהם הנתונים ואת מה צריך להוכיח."
- **Steps:** 1 per item.

**Example 1.** במשולש ABC הנקודה D על הצלע BC. מה אפשר לכתוב מכל נתון?

| נתון במילים | מה כותבים | נימוק |
|---|---|---|
| AD חוצה את הזווית ∢BAC | ∢BAD = ∢DAC | הגדרת חוצה זווית |
| AD תיכון לצלע BC | BD = DC | הגדרת תיכון |
| AD גובה לצלע BC | ∢ADB = ∢ADC = 90° | הגדרת גובה |
| המשולש ABC שווה שוקיים (AB = AC) | AB = AC | נתון |

**Example 2.** המשפט: "במשולש שווה שוקיים זוויות הבסיס שוות זו לזו." מהו הנתון ומה צריך להוכיח? ומה במשפט ההפוך?

| | המשפט | המשפט ההפוך |
|---|---|---|
| נתון | במשולש ABC: AB = AC | במשולש ABC: ∢B = ∢C |
| צ"ל | ∢B = ∢C | AB = AC |
| ניסוח | במשולש שווה שוקיים זוויות הבסיס שוות זו לזו | משולש שבו שתי זוויות שוות הוא משולש שווה שוקיים |

**Common mistakes**
1. Reading "תיכון" as if it also gave a right angle or equal angles (mixing תיכון, גובה, חוצה זווית).
2. Using what has to be proved as if it were given (circular proof).
3. Swapping a theorem with its converse. [ח]: "יש לדעת להבחין בין שני משפטים הפוכים, שאחד מהם נכון, והשני איננו נכון בהכרח."

---

### Unit 2 — חפיפת משולשים (grade 8)

#### Skill 4. From a given congruence to equalities (Ministry step 1)
- **Grade:** 8. **Prerequisites:** 3.
- **Typical given / goal:** △…≅△… is given in matching vertex order; write equal sides and angles, find missing sizes.
- **Steps:** 1–3.

**Example 1.** נתון: △ABC ≅ △DEF (החפיפה לפי סדר הקודקודים הרשומים). רשמו את כל השוויונות.

| טענה | נימוק |
|---|---|
| AB = DE, BC = EF, AC = DF | צלעות מתאימות במשולשים חופפים שוות |
| ∢A = ∢D, ∢B = ∢E, ∢C = ∢F | זוויות מתאימות במשולשים חופפים שוות |

**Example 2** (in the style of question 3 of the Ministry congruence test). נתון: △KPN ≅ △STR. KP = 5 ס"מ, ∢N = 40°, ∢P = 75°. מצאו את ST, ∢R, ∢T ואת ∢S.

| # | טענה | נימוק |
|---|---|---|
| 1 | ST = KP = 5 ס"מ | צלעות מתאימות במשולשים חופפים שוות (K↔S, P↔T) |
| 2 | ∢R = ∢N = 40°, ∢T = ∢P = 75° | זוויות מתאימות במשולשים חופפים שוות |
| 3 | ∢S = 180° − 40° − 75° = 65° | סכום זוויות במשולש הוא 180° |

**Common mistakes**
1. Matching by position in the drawing or by alphabet instead of by the order in the congruence statement.
2. Matching a side to the side that "looks" the same after one triangle is turned or flipped.
3. Forgetting that the matching side lies opposite the matching angle ([ח]: "מול זוויות שוות בהתאמה מונחות צלעות שוות בהתאמה").

#### Skill 5. Which congruence theorem? And write the congruence in the right order
- **Grade:** 8. **Prerequisites:** 4. (The app's chapter "4. חפיפה" already trains the pure identification; here we add "not enough", the third-angle move and writing the order.)
- **Typical given / goal:** three equalities between two triangles; choose צ.ז.צ / ז.צ.ז / צ.צ.צ or "אי אפשר לקבוע", then write △…≅△….
- **Steps:** 1–2.

**Example 1.** במשולשים ABC ו-DEF נתון: AB = DE, ∢B = ∢E, BC = EF. האם המשולשים חופפים? לפי איזה משפט?

| # | טענה | נימוק |
|---|---|---|
| 1 | AB = DE, ∢B = ∢E, BC = EF | נתון (הזווית כלואה בין שתי הצלעות) |
| 2 | △ABC ≅ △DEF | צ.ז.צ |

**Example 2.** במשולשים ABC ו-DEF נתון: ∢A = ∢D, ∢C = ∢F, AB = DE. האם אפשר להשתמש ב-ז.צ.ז?
The side AB is not between ∢A and ∢C, so not directly. First find the third angle:

| # | טענה | נימוק |
|---|---|---|
| 1 | ∢A = ∢D, ∢C = ∢F, AB = DE | נתון |
| 2 | ∢B = ∢E | סכום זוויות במשולש הוא 180° (שתי זוויות שוות בהתאמה, ולכן גם השלישית) |
| 3 | △ABC ≅ △DEF | ז.צ.ז (AB בין ∢A ל-∢B, ו-DE בין ∢D ל-∢E) |

**Common mistakes**
1. Using צ.ז.צ when the angle is not the one between the two sides (the Ministry asks to show this case on purpose).
2. Using ז.צ.ז when the side is not between the two angles, without the third-angle step (this is exactly question 2 of the Ministry test: "הצלע המסומנת אינה בין שתי הזוויות השוות").
3. "Three equal angles, so congruent" (ז.ז.ז is not a congruence theorem), or writing the vertices in an order that does not match.

#### Skill 6. A direct congruence proof (Ministry step 2)
- **Grade:** 8. **Prerequisites:** 5 and reasons A2 (צלע משותפת), B2 (קודקודיות).
- **Typical given / goal:** two given equalities + one the student must see in the drawing (shared side or vertical angles); prove △≅△.
- **Steps:** 4.

**Example 1** ([ח]: "שני קטעים החוצים זה את זה, יוצרים משולשים חופפים"). הקטעים AB ו-CD נחתכים בנקודה O. נתון: AO = OB, CO = OD. צ"ל: △AOC ≅ △BOD.
Drawing: an "X"; A and B at the ends of one segment, C and D at the ends of the other, O in the middle; draw AC and BD.

| # | טענה | נימוק |
|---|---|---|
| 1 | AO = OB | נתון |
| 2 | ∢AOC = ∢BOD | זוויות קודקודיות שוות זו לזו |
| 3 | CO = OD | נתון |
| 4 | △AOC ≅ △BOD | צ.ז.צ |

**Example 2.** במרובע ABCD נתון: AB = AD, CB = CD. צ"ל: △ABC ≅ △ADC.
Drawing: a kite; A on top, C at the bottom, B left, D right; diagonal AC drawn.

| # | טענה | נימוק |
|---|---|---|
| 1 | AB = AD | נתון |
| 2 | CB = CD | נתון |
| 3 | AC = AC | צלע משותפת |
| 4 | △ABC ≅ △ADC | צ.צ.צ |

**Common mistakes**
1. Not seeing the "free" equality (shared side, vertical angles) and saying a datum is missing.
2. Marking as equal two angles that only look equal (for example ∢OAC and ∢OBD before the congruence is proved).
3. The three lines do not fit the theorem named (two sides and a non-included angle written as צ.ז.צ), or the vertex order in line 4 does not match lines 1–3.

#### Skill 7. Congruence with a hidden datum: prove what is needed first (Ministry step 3)
- **Grade:** 8. **Prerequisites:** 6, reasons B3/B4 (parallel lines), A8 (חיבור/חיסור).
- **Typical given / goal:** one of the three equalities is not given; it comes from parallel lines, from adding/subtracting segments or from a bisector. Asked in two parts: (א) explain the equality, (ב) prove the congruence.
- **Steps:** 5.

**Example 1.** במרובע ABCD נתון: AB ∥ DC, AB = DC. AC אלכסון. א. הסבירו מדוע ∢BAC = ∢DCA. ב. הוכיחו: △ABC ≅ △CDA.
Drawing: quadrilateral ABCD (A top-left, B top-right, C bottom-right, D bottom-left) with diagonal AC.

| # | טענה | נימוק |
|---|---|---|
| 1 | AB ∥ DC | נתון |
| 2 | ∢BAC = ∢DCA | זוויות מתחלפות בין ישרים מקבילים שוות זו לזו |
| 3 | AB = CD | נתון |
| 4 | AC = CA | צלע משותפת |
| 5 | △ABC ≅ △CDA | צ.ז.צ |

**Example 2.** הנקודות A, B, C, D נמצאות על ישר אחד בסדר הזה. הנקודות E ו-F נמצאות מאותו צד של הישר. נתון: AB = CD, AE = DF, ∢EAC = ∢FDB. צ"ל: △ACE ≅ △DBF.
Drawing: a horizontal line with A, B, C, D from left to right; E above near A, F above near D; triangles ACE and DBF overlap in the middle.

| # | טענה | נימוק |
|---|---|---|
| 1 | AB = CD | נתון |
| 2 | AC = AB + BC, DB = DC + CB | חיבור קטעים |
| 3 | AC = DB | חיבור קטעים שווים (לשני קטעים שווים הוסיפו אותו קטע BC) |
| 4 | AE = DF, ∢EAC = ∢FDB | נתון |
| 5 | △ACE ≅ △DBF | צ.ז.צ |

**Common mistakes**
1. Using AB = CD as if it were a side of the triangles (the triangle sides are AC and DB). This is the mistake the Ministry video "חיסור וחיבור קטעים" is about.
2. Naming alternate angles with the wrong transversal (taking ∢BCA instead of ∢DCA).
3. Writing the parallel-line equality with no line that says the lines are parallel.

#### Skill 8. Congruence, then a conclusion (Ministry steps 4–5)
- **Grade:** 8. **Prerequisites:** 6–7, reason D6.
- **Typical given / goal:** prove congruence and deduce that a segment or an angle is equal, or that a triangle is isosceles.
- **Steps:** 5–6.

**Example 1.** הקטעים AB ו-CD נחתכים בנקודה O. נתון: AO = OB, CO = OD. צ"ל: AC = BD.

| # | טענה | נימוק |
|---|---|---|
| 1 | AO = OB, CO = OD | נתון |
| 2 | ∢AOC = ∢BOD | זוויות קודקודיות שוות זו לזו |
| 3 | △AOC ≅ △BOD | צ.ז.צ |
| 4 | AC = BD | צלעות מתאימות במשולשים חופפים שוות |

**Example 2** (Ministry practice booklet grade 8, geometry question 1). במרובע ABDC נתון: CA = BA, AD חוצה את הזווית ∢CAB. א. הוכיחו: △ACD ≅ △ABD. ב. הסבירו מדוע המשולש BDC הוא משולש שווה שוקיים.
Drawing: A on top, D below it, B and C on the two sides; diagonal AD drawn, and segment BC.

| # | טענה | נימוק |
|---|---|---|
| 1 | CA = BA | נתון |
| 2 | ∢CAD = ∢BAD | AD חוצה זווית (נתון) |
| 3 | AD = AD | צלע משותפת |
| 4 | △ACD ≅ △ABD | צ.ז.צ |
| 5 | CD = BD | צלעות מתאימות במשולשים חופפים שוות |
| 6 | המשולש BDC שווה שוקיים | משולש ששתיים מצלעותיו שוות זו לזו (הגדרה) |

**Common mistakes**
1. Using the conclusion (CD = BD) as one of the three congruence lines.
2. Stopping at the congruence and not writing the asked conclusion with its reason.
3. Taking a pair of sides that do not match (AC with BD) because the vertex order was written carelessly.

---

### Unit 3 — משולש שווה שוקיים (grade 8; converse theorems again at the start of grade 9)

#### Skill 9. Using the isosceles theorems inside a proof
- **Grade:** 8. **Prerequisites:** 2, 6 (reasons E1, E3).
- **Typical given / goal:** AB = AC is given; deduce equal base angles (often as the angle of a צ.ז.צ), or that the bisector from the apex is also median and altitude.
- **Steps:** 2–5.

**Example 1.** במשולש ABC נתון: AB = AC, ∢A = 40°. מצאו את ∢B ואת ∢C.

| # | טענה | נימוק |
|---|---|---|
| 1 | AB = AC | נתון |
| 2 | ∢B = ∢C | במשולש שווה שוקיים זוויות הבסיס שוות זו לזו |
| 3 | ∢B = ∢C = (180° − 40°) : 2 = 70° | סכום זוויות במשולש הוא 180° |

**Example 2.** במשולש ABC נתון: AB = AC. הנקודות D ו-E נמצאות על הבסיס BC (הסדר: B, D, E, C) כך ש-BD = EC. צ"ל: AD = AE.

| # | טענה | נימוק |
|---|---|---|
| 1 | AB = AC | נתון |
| 2 | ∢B = ∢C | במשולש שווה שוקיים זוויות הבסיס שוות זו לזו |
| 3 | BD = CE | נתון |
| 4 | △ABD ≅ △ACE | צ.ז.צ |
| 5 | AD = AE | צלעות מתאימות במשולשים חופפים שוות |

**Common mistakes**
1. Marking the wrong pair as base angles (the base angles lie opposite the equal sides: AB = AC gives ∢B = ∢C, not ∢A = ∢B).
2. Using "חוצה-גובה-תיכון מתלכדים" for a segment that does not come from the apex.
3. Using the converse wording ("שתי זוויות שוות…") when the equal sides are what is given.

#### Skill 10. Proving that a triangle is isosceles (the converse theorems)
- **Grade:** 8, repeated in 9 ([פ] 9A: "משפטים הפוכים להוכחה כי משולש הוא שווה שוקיים"). **Prerequisites:** 9, 3.
- **Typical given / goal:** show two equal angles (from numbers, from parallel lines + bisector, from congruence) and conclude equal sides; or altitude = median, etc.
- **Steps:** 3–4.

**Example 1.** במשולש ABC נתון: ∢A = 80°, ∢B = 50°. צ"ל: המשולש ABC שווה שוקיים.

| # | טענה | נימוק |
|---|---|---|
| 1 | ∢A = 80°, ∢B = 50° | נתון |
| 2 | ∢C = 180° − 80° − 50° = 50° | סכום זוויות במשולש הוא 180° |
| 3 | ∢B = ∢C | שתיהן 50° |
| 4 | AB = AC, המשולש שווה שוקיים | משולש שבו שתי זוויות שוות הוא משולש שווה שוקיים |

**Example 2.** במשולש ABC, BD חוצה את הזווית ∢ABC (D על הצלע AC). דרך D עובר ישר המקביל ל-BC וחותך את AB בנקודה E. צ"ל: המשולש EBD שווה שוקיים.
Drawing: triangle ABC with base BC at the bottom; D on AC; DE parallel to BC with E on AB; segment BD.

| # | טענה | נימוק |
|---|---|---|
| 1 | ∢EBD = ∢DBC | BD חוצה זווית (נתון) |
| 2 | ∢EDB = ∢DBC | זוויות מתחלפות בין ישרים מקבילים שוות זו לזו (ED ∥ BC) |
| 3 | ∢EBD = ∢EDB | כלל המעבר |
| 4 | EB = ED, המשולש EBD שווה שוקיים | משולש שבו שתי זוויות שוות הוא משולש שווה שוקיים |

Third common form (one line, grade 8/9): AD הוא גם גובה וגם תיכון במשולש ABC ⇒ "משולש שבו תיכון מתלכד עם גובה הוא משולש שווה שוקיים" (or prove it with צ.ז.צ on △ABD, △ACD).

**Common mistakes**
1. Citing the direct theorem ("במשולש שווה שוקיים זוויות הבסיס שוות") to prove the triangle is isosceles — that is assuming the goal.
2. Concluding the wrong equal sides: equal angles ∢B and ∢C give AB = AC (the sides opposite them), not the sides next to them.
3. Skipping the "כלל המעבר" line and jumping from two separate equalities to the conclusion.

#### Skill 11. Triangles that overlap (shared parts inside)
- **Grade:** 8 (end) – 9. [ח]: "בחלק זה תתורגל חפיפת משולשים גם כאשר לשני המשולשים יש חלקים פנימיים משותפים." **Prerequisites:** 8, 9.
- **Typical given / goal:** isosceles triangle with two medians / altitudes / bisectors to the legs; prove they are equal. The student must first pick out the two triangles.
- **Steps:** 5–6.

**Example 1** (from the Ministry list in [ח]: "התיכונים לשוקיים במשולש שווה שוקיים, שווים זה לזה"). במשולש ABC נתון: AB = AC. BD תיכון לצלע AC, CE תיכון לצלע AB. צ"ל: BD = CE.

| # | טענה | נימוק |
|---|---|---|
| 1 | AB = AC | נתון |
| 2 | AD = ½AC, AE = ½AB | הגדרת תיכון (D אמצע AC, E אמצע AB) |
| 3 | AD = AE | חצאים של קטעים שווים שווים זה לזה |
| 4 | ∢A = ∢A | זווית משותפת |
| 5 | △ABD ≅ △ACE | צ.ז.צ (AB = AC, ∢A, AD = AE) |
| 6 | BD = CE | צלעות מתאימות במשולשים חופפים שוות |

**Example 2** (same list: "הגבהים לשוקיים במשולש שווה שוקיים, שווים זה לזה"). במשולש ABC נתון: AB = AC. BD גובה לצלע AC, CE גובה לצלע AB. צ"ל: BD = CE.

| # | טענה | נימוק |
|---|---|---|
| 1 | ∢DCB = ∢EBC | במשולש שווה שוקיים זוויות הבסיס שוות זו לזו |
| 2 | ∢BDC = ∢CEB = 90° | הגדרת גובה |
| 3 | ∢DBC = ∢ECB | סכום זוויות במשולש הוא 180° (שתי זוויות שוות בהתאמה, ולכן גם השלישית) |
| 4 | BC = CB | צלע משותפת |
| 5 | △BDC ≅ △CEB | ז.צ.ז (BC בין ∢DBC ל-∢DCB, ובין ∢ECB ל-∢EBC) |
| 6 | BD = CE | צלעות מתאימות במשולשים חופפים שוות |

**Common mistakes**
1. Choosing a pair of triangles that does not contain the asked segments.
2. Not using the shared angle or shared side because it "belongs to both".
3. Naming an angle with one letter (∢B) where several angles meet at that vertex; here three letters are a must.

---

### Unit 4 — צלעות, זוויות ומשולש 30°-60°-90° (grade 9, before parallels and quadrilaterals in the plan)

#### Skill 12. Larger side opposite larger angle (and the other direction)
- **Grade:** 9. **Prerequisites:** 2, 9.
- **Typical given / goal:** order angles from side lengths, or order sides from angles; a short proof that one segment is longer than another.
- **Steps:** 2–5.

**Example 1.** במשולש ABC: AB = 5 ס"מ, AC = 6 ס"מ, BC = 7 ס"מ. סדרו את זוויות המשולש מהקטנה לגדולה ונמקו.

| # | טענה | נימוק |
|---|---|---|
| 1 | AB < AC < BC | נתון |
| 2 | ∢C < ∢B < ∢A | אם במשולש שתי צלעות שונות זו מזו, אז מול הצלע הגדולה מביניהן ממוקמת הזווית הגדולה (∢C מול AB, ∢B מול AC, ∢A מול BC) |

**Example 2.** במשולש ABC נתון: AB = AC. הנקודה D על המשך הצלע BC (מעבר ל-C). צ"ל: AD > AB.

| # | טענה | נימוק |
|---|---|---|
| 1 | ∢ABC = ∢ACB | במשולש שווה שוקיים זוויות הבסיס שוות זו לזו |
| 2 | ∢ACB = ∢ADC + ∢CAD | זווית חיצונית למשולש (ACD) שווה לסכום הזוויות הפנימיות שאינן צמודות לה |
| 3 | ∢ACB > ∢ADC | השלם גדול מחלקו (מסקנה משורה 2) |
| 4 | ∢ABD > ∢ADB | שורות 1 ו-3 |
| 5 | AD > AB | במשולש ABD: מול הזווית הגדולה מביניהן ממוקמת הצלע הגדולה |

**Common mistakes**
1. Matching an angle with a side next to it instead of the side opposite it.
2. Comparing a side and an angle that belong to two different triangles.
3. Mixing this with אי-שוויון המשולש (which compares a sum of two sides with the third).

#### Skill 13. The 30°-60°-90° triangle and its converse
- **Grade:** 9 ([פ] 9A: "יש ללמד משפט זה במסגרת לימוד משולש שווה צלעות"). **Prerequisites:** 2.
- **Typical given / goal:** right triangle with a 30° angle ⇒ a leg is half the hypotenuse; or a leg that is half the hypotenuse ⇒ 30°.
- **Steps:** 3.

**Example 1.** במשולש ABC: ∢C = 90°, ∢B = 60°. צ"ל: BC = ½AB.

| # | טענה | נימוק |
|---|---|---|
| 1 | ∢C = 90°, ∢B = 60° | נתון |
| 2 | ∢A = 180° − 90° − 60° = 30° | סכום זוויות במשולש הוא 180° |
| 3 | BC = ½AB | במשולש ישר זווית שאחת מזוויותיו בת 30°, הניצב מול זווית זו שווה באורכו למחצית היתר |

**Example 2.** במשולש ABC: ∢C = 90°, AB = 10 ס"מ, BC = 5 ס"מ. מצאו את ∢B ונמקו.

| # | טענה | נימוק |
|---|---|---|
| 1 | BC = 5 = ½ · 10 = ½AB | נתון (חישוב) |
| 2 | ∢A = 30° | משולש ישר זווית שבו הניצב שווה למחצית מהיתר, הזווית שמול ניצב זה בת 30° |
| 3 | ∢B = 180° − 90° − 30° = 60° | סכום זוויות במשולש הוא 180° |

**Common mistakes**
1. Taking the leg next to the 30° angle as the half (it must be the leg opposite it).
2. Using the theorem in a triangle that was not shown to be right-angled.
3. Halving a leg instead of the hypotenuse, or mixing the theorem with its converse.

---

### Unit 5 — ישרים מקבילים: המשפט ההפוך, טרפז (grade 9)

#### Skill 14. Proving that two lines are parallel
- **Grade:** 9 ([פ] 9A: "התנאים שצריכים להתקיים על מנת ששני ישרים הנחתכים ע"י ישר שלישי יהיו מקבילים"). **Prerequisites:** 1, 8.
- **Typical given / goal:** show a pair of equal alternate or corresponding angles (given, or from congruence) and conclude parallel.
- **Steps:** 2–5.

**Example 1.** במשולש ABC, D על הצלע AB ו-E על הצלע AC. נתון: ∢ADE = ∢ABC. צ"ל: DE ∥ BC.

| # | טענה | נימוק |
|---|---|---|
| 1 | ∢ADE = ∢ABC | נתון |
| 2 | DE ∥ BC | אם שתי זוויות מתאימות בין שני ישרים שוות זו לזו, אזי שני הישרים מקבילים זה לזה (הישר החותך: AB) |

**Example 2.** הקטעים AB ו-CD נחתכים בנקודה O. נתון: AO = OB, CO = OD. צ"ל: AC ∥ BD.

| # | טענה | נימוק |
|---|---|---|
| 1 | AO = OB, CO = OD | נתון |
| 2 | ∢AOC = ∢BOD | זוויות קודקודיות שוות זו לזו |
| 3 | △AOC ≅ △BOD | צ.ז.צ |
| 4 | ∢OAC = ∢OBD | זוויות מתאימות במשולשים חופפים שוות |
| 5 | AC ∥ BD | אם שתי זוויות מתחלפות בין שני ישרים שוות זו לזו, אזי שני הישרים מקבילים זה לזה (הישר החותך: AB) |

**Common mistakes**
1. Citing the direct theorem ("זוויות מתחלפות בין ישרים מקבילים שוות") to prove the lines are parallel — assuming the goal.
2. Concluding the wrong pair of lines from the equal angles (the angles must sit on the two lines and the transversal).
3. Confusion between "זוויות מתאימות בין ישרים" and "זוויות מתאימות במשולשים חופפים" — the same word with two meanings. The app should use two clearly different chips.

#### Skill 15. Proving that a quadrilateral is a trapezoid (and an isosceles trapezoid)
- **Grade:** 9 ([פ] 9A: "הוכחה שמרובע הוא טרפז"). **Prerequisites:** 14.
- **Typical given / goal:** show one pair of opposite sides is parallel (and the other pair is not); then base angles or diagonals for "שווה שוקיים".
- **Steps:** 3–4.

**Example 1.** במרובע ABCD, AC אלכסון. נתון: ∢BAC = ∢ACD = 30°, ∢DAC = 40°, ∢ACB = 25°. צ"ל: ABCD טרפז.

| # | טענה | נימוק |
|---|---|---|
| 1 | ∢BAC = ∢ACD | נתון |
| 2 | AB ∥ DC | אם שתי זוויות מתחלפות בין שני ישרים שוות זו לזו, אזי שני הישרים מקבילים זה לזה |
| 3 | AD אינו מקביל ל-BC | ∢DAC ≠ ∢ACB (40° ≠ 25°); אילו הישרים היו מקבילים, הזוויות המתחלפות היו שוות |
| 4 | ABCD טרפז | מרובע שבו יש זוג יחיד של צלעות המקבילות זו לזו (הגדרת טרפז) |

**Example 2.** במשולש ABC נתון: AB = AC. D על הצלע AB ו-E על הצלע AC כך ש-DE ∥ BC. צ"ל: המרובע DBCE הוא טרפז שווה שוקיים.

| # | טענה | נימוק |
|---|---|---|
| 1 | DE ∥ BC | נתון |
| 2 | DB אינו מקביל ל-EC | הם נמצאים על הישרים AB ו-AC, שנחתכים בנקודה A |
| 3 | DBCE טרפז | הגדרת טרפז |
| 4 | ∢DBC = ∢ECB | במשולש שווה שוקיים (ABC) זוויות הבסיס שוות זו לזו |
| 5 | DBCE טרפז שווה שוקיים | טרפז שבו זוויות הבסיס שוות זו לזו הוא טרפז שווה שוקיים |

**Common mistakes**
1. Proving one pair is parallel and forgetting the second half of the definition (the other pair is not parallel; otherwise it could be a parallelogram). At the basic level the app can accept the proof after the parallel pair when the task says so, but the full answer has both.
2. Calling the non-parallel sides "בסיסים".
3. Proving "שווה שוקיים" with base angles that are not next to the same base.

---

### Unit 6 — מרובעים (grade 9)

#### Skill 16. Using the properties of a parallelogram in a proof
- **Grade:** 9. **Prerequisites:** 7, 8.
- **Typical given / goal:** ABCD is given as a parallelogram; use opposite sides equal / parallel, opposite angles, diagonals bisecting, to prove a congruence or an equality.
- **Steps:** 4–6.

**Example 1.** ABCD מקבילית, AC אלכסון. צ"ל: △ABC ≅ △CDA.

| # | טענה | נימוק |
|---|---|---|
| 1 | ABCD מקבילית | נתון |
| 2 | AB = CD, BC = DA | צלעות נגדיות במקבילית שוות זו לזו |
| 3 | AC = CA | צלע משותפת |
| 4 | △ABC ≅ △CDA | צ.צ.צ |

**Example 2.** ABCD מקבילית. האלכסונים נחתכים בנקודה O. ישר העובר דרך O חותך את הצלע AB בנקודה E ואת הצלע DC בנקודה F. צ"ל: OE = OF.

| # | טענה | נימוק |
|---|---|---|
| 1 | AO = OC | האלכסונים במקבילית חוצים זה את זה |
| 2 | ∢AOE = ∢COF | זוויות קודקודיות שוות זו לזו |
| 3 | AB ∥ DC | הגדרת מקבילית |
| 4 | ∢EAO = ∢FCO | זוויות מתחלפות בין ישרים מקבילים שוות זו לזו |
| 5 | △AOE ≅ △COF | ז.צ.ז |
| 6 | OE = OF | צלעות מתאימות במשולשים חופפים שוות |

**Common mistakes**
1. Using a property the parallelogram does not have (equal diagonals, perpendicular diagonals, diagonal bisects the angle) — these belong to the rectangle and the rhombus.
2. "Opposite sides are equal" used for two adjacent sides.
3. Using a parallelogram property before the quadrilateral is known to be a parallelogram.

#### Skill 17. Proving that a quadrilateral is a parallelogram (the converse theorems)
- **Grade:** 9. **Prerequisites:** 14, 16.
- **Typical given / goal:** reach one of the conditions G14–G17 (or the definition), often through a congruence.
- **Steps:** 3–8 (long ones are split into parts).

**Example 1.** במרובע ABCD, AC אלכסון. נתון: AB = CD, ∢BAC = ∢DCA. צ"ל: ABCD מקבילית.

| # | טענה | נימוק |
|---|---|---|
| 1 | ∢BAC = ∢DCA | נתון |
| 2 | AB ∥ DC | אם שתי זוויות מתחלפות בין שני ישרים שוות זו לזו, אזי שני הישרים מקבילים זה לזה |
| 3 | AB = DC | נתון |
| 4 | ABCD מקבילית | מרובע שבו שתי צלעות נגדיות שוות ומקבילות הוא מקבילית |

**Example 2 (full proof through congruence).** ABCD מקבילית. הנקודות E ו-F נמצאות על האלכסון AC כך ש-AE = CF. צ"ל: המרובע BEDF הוא מקבילית.
Drawing: parallelogram ABCD with diagonal AC; E on AC near A, F on AC near C; segments BE, ED, DF, FB.
Part א: prove △ABE ≅ △CDF. Part ב: prove △ADE ≅ △CBF. Part ג: conclude.

| # | טענה | נימוק |
|---|---|---|
| 1 | AB = CD, AD = CB | צלעות נגדיות במקבילית שוות זו לזו |
| 2 | ∢BAE = ∢DCF | זוויות מתחלפות בין ישרים מקבילים שוות זו לזו (AB ∥ DC) |
| 3 | AE = CF | נתון |
| 4 | △ABE ≅ △CDF | צ.ז.צ |
| 5 | BE = DF | צלעות מתאימות במשולשים חופפים שוות |
| 6 | ∢DAE = ∢BCF | זוויות מתחלפות בין ישרים מקבילים שוות זו לזו (AD ∥ BC) |
| 7 | △ADE ≅ △CBF | צ.ז.צ (AD = CB, ∢DAE = ∢BCF, AE = CF) |
| 8 | DE = BF | צלעות מתאימות במשולשים חופפים שוות |
| 9 | BEDF מקבילית | מרובע שבו הצלעות הנגדיות שוות זו לזו הוא מקבילית |

Shorter second way (good as a "find another way" task): O נקודת חיתוך האלכסונים; BO = OD ו-AO = OC (האלכסונים במקבילית חוצים זה את זה); EO = AO − AE = OC − CF = OF (חיסור קטעים שווים); לכן האלכסונים של BEDF חוצים זה את זה ⇒ "מרובע שבו האלכסונים חוצים זה את זה הוא מקבילית".

**Common mistakes**
1. One pair of opposite sides equal and the **other** pair parallel does not make a parallelogram (it can be an isosceles trapezoid). The same pair must be both equal and parallel.
2. Proving one condition halfway (one pair of equal opposite sides) and stopping.
3. Using a property of the parallelogram that is being proved (circular).

#### Skill 18. Proving a rectangle, a rhombus, a square
- **Grade:** 9. **Prerequisites:** 17, 10.
- **Typical given / goal:** two stages — the shape is a parallelogram (given or proved), plus one extra condition (G21–G22, G26–G28, G30–G31).
- **Steps:** 3–5.

**Example 1.** ABCD מקבילית. האלכסונים נחתכים בנקודה O. נתון: OA = OB. צ"ל: ABCD מלבן.

| # | טענה | נימוק |
|---|---|---|
| 1 | AO = OC, BO = OD | האלכסונים במקבילית חוצים זה את זה |
| 2 | AC = 2·AO, BD = 2·BO | משורה 1 |
| 3 | AC = BD | OA = OB (נתון) |
| 4 | ABCD מלבן | מקבילית שבה האלכסונים שווים זה לזה היא מלבן |

**Example 2.** ABCD מקבילית. האלכסון AC חוצה את הזווית ∢BAD. צ"ל: ABCD מעוין.
Short answer: "מקבילית שבה אלכסון חוצה את זווית המקבילית היא מעוין". Full proof:

| # | טענה | נימוק |
|---|---|---|
| 1 | ∢BAC = ∢DAC | AC חוצה זווית (נתון) |
| 2 | ∢DAC = ∢BCA | זוויות מתחלפות בין ישרים מקבילים שוות זו לזו (AD ∥ BC) |
| 3 | ∢BAC = ∢BCA | כלל המעבר |
| 4 | AB = BC | משולש שבו שתי זוויות שוות הוא משולש שווה שוקיים |
| 5 | ABCD מעוין | מקבילית שבה שתי צלעות סמוכות שוות היא מעוין |

(Square: one more stage — "מלבן בו הצלעות הסמוכות שוות הוא ריבוע" or "מעוין שבו האלכסונים שווים הוא ריבוע".)

**Common mistakes**
1. Skipping the parallelogram stage: "the diagonals are equal, so it is a rectangle" for a general quadrilateral (false: an isosceles trapezoid has equal diagonals), or "the diagonals are perpendicular, so it is a rhombus" (false: a kite).
2. Mixing which condition gives which shape (equal diagonals → rectangle; perpendicular diagonals or a diagonal that bisects an angle → rhombus).
3. For a square: proving only the rectangle part or only the rhombus part.

#### Skill 19. The median to the hypotenuse (with quadrilaterals)
- **Grade:** 9 ([פ] 9A: "התיכון ליתר – תרגול המשפט בשילוב מרובעים"). **Prerequisites:** 9, 10, 13.
- **Typical given / goal:** a right triangle with the median to the hypotenuse ⇒ two isosceles triangles; or a median that is half the side ⇒ right angle.
- **Steps:** 3–5.

**Example 1.** במשולש ABC: ∢C = 90°. CM תיכון ליתר AB. צ"ל: ∢MCA = ∢A.

| # | טענה | נימוק |
|---|---|---|
| 1 | CM = ½AB | במשולש ישר זווית התיכון ליתר שווה למחצית היתר |
| 2 | AM = ½AB | הגדרת תיכון (M אמצע AB) |
| 3 | CM = AM | כלל המעבר |
| 4 | ∢MCA = ∢A | במשולש שווה שוקיים (AMC) זוויות הבסיס שוות זו לזו |

**Example 2.** במשולש ABC: ∢C = 90°, ∢A = 30°. CM תיכון ליתר AB. צ"ל: המשולש CMB שווה צלעות.

| # | טענה | נימוק |
|---|---|---|
| 1 | BC = ½AB | במשולש ישר זווית שאחת מזוויותיו בת 30°, הניצב מול זווית זו שווה באורכו למחצית היתר |
| 2 | CM = ½AB | במשולש ישר זווית התיכון ליתר שווה למחצית היתר |
| 3 | MB = ½AB | הגדרת תיכון (M אמצע AB) |
| 4 | BC = CM = MB | כלל המעבר |
| 5 | המשולש CMB שווה צלעות | משולש שכל צלעותיו שוות (הגדרה) |

Link to quadrilaterals: in a rectangle ABCD with diagonals meeting at O, BO is the median to the hypotenuse AC of △ABC, so BO = ½AC — the same fact as "האלכסונים במלבן שווים וחוצים זה את זה".

**Common mistakes**
1. Using the theorem for a median to a leg, or in a triangle that is not right-angled.
2. Saying "the median is half the hypotenuse, so it is also an altitude" (true only in an isosceles right triangle).
3. In the converse (F5): the median must be half of the side it goes to, and the right angle is at the vertex it comes from.

#### Skill 20. A full graded question (several parts, one drawing)
- **Grade:** 9 (end). **Prerequisites:** all earlier skills. This is the form the Ministry asks for [ד]: each part 2–3 steps, each part guides the next, verbs "הוכיחו / הסבירו / נמקו / מהו סוג המשולש".
- **Steps:** 3 parts × 2–4 steps.

**Example 1** (Ministry, [ד] example 4). המרובע ABCD הוא ריבוע. P ו-K נקודות על האלכסון BD. נתון: PD = KB. א. הוכיחו: △CPD ≅ △CKB. ב. הראו כי △CKP הוא משולש שווה שוקיים.
Drawing: square ABCD, diagonal BD, P on BD near D and K on BD near B, segments CP and CK. (The original also gives ∢BKC = ∢CPD; with it the congruence can also be proved by ז.צ.ז.)

| # | טענה | נימוק |
|---|---|---|
| 1 | CD = CB | בריבוע כל הצלעות שוות (הגדרת ריבוע) |
| 2 | ∢CDP = ∢CBK | במשולש שווה שוקיים (BCD, CD = CB) זוויות הבסיס שוות זו לזו |
| 3 | PD = KB | נתון |
| 4 | △CPD ≅ △CKB | צ.ז.צ |
| 5 | CP = CK | צלעות מתאימות במשולשים חופפים שוות |
| 6 | △CKP שווה שוקיים | משולש ששתיים מצלעותיו שוות זו לזו (הגדרה) |

**Example 2** (Ministry practice booklet grade 8, geometry question 4; the drawing is not in the text file — I assume O is where BK crosses the side DC). נתון מלבן ABCD. הנקודה K נמצאת על המשך הצלע AD (מעבר ל-D). הקטע BK חותך את DC בנקודה O. נתון: AD = DK. א. נמקו מדוע ∢CBO = ∢DKO. ב. הוכיחו: △KDO ≅ △BCO.

| # | טענה | נימוק |
|---|---|---|
| 1 | AD ∥ BC | צלעות נגדיות במלבן מקבילות |
| 2 | ∢CBO = ∢DKO | זוויות מתחלפות בין ישרים מקבילים שוות זו לזו (הישר החותך: BK) |
| 3 | BC = AD | צלעות נגדיות במלבן שוות |
| 4 | DK = BC | AD = DK (נתון) וכלל המעבר |
| 5 | ∢BCO = 90° | זווית במלבן |
| 6 | ∢KDO = 180° − 90° = 90° | סכום זוויות צמודות הוא 180° (∢ADC = 90°) |
| 7 | △KDO ≅ △BCO | ז.צ.ז (DK בין ∢DKO ל-∢KDO; BC בין ∢CBO ל-∢BCO) |

(Wording of lines 1, 3, 5 is (unconfirmed): [ת] defines a rectangle only as "מרובע בעל כל הזוויות ישרות"; in grade 8 the Ministry text says these rectangle facts are "ידוע מלימודי היסודי".)

**Common mistakes**
1. Not using the result of part א in part ב (starting again from zero), or using part ב inside part א.
2. Losing track of which triangle is which in a busy drawing; no marks on the drawing.
3. Answering "הסבירו / נמקו" with a number only.

---

## 3. What Israeli teachers expect in a written proof

1. **Three headings, always in this order: נתון / צ"ל (צריך להוכיח) / הוכחה.** The given is copied as symbols (AB = AC, AB ∥ DC), not as a sentence. The proof ends with the goal line, often followed by "מ.ש.ל" (מה שהיה להוכיח). (The headings are universal classroom practice; I did not find them prescribed word for word in a Ministry text → (unconfirmed) as an official rule.)
2. **A two-column table טענה | נימוק is the main form, but not the only one.** The grade 8 curriculum [ח] names three ways and asks that students see all of them: "א. רישום בשתי עמודות של טענות ונימוקים. ב. רישום בעזרת תרשים זרימה של בועיות. ג. רישום במלל שוטף ללא מבנה מוכתב מראש." It also allows, in grade 8, "להסתפק בהסבר משכנע שניתן בעל פה". For the app: the table is the default; a bubble flow chart is an official second view.
3. **Every line has a reason.** Allowed reasons: נתון, a definition, a theorem already learned, or an earlier line ("משורה 2"). [ד]: "בכל פתרון תרגיל התלמידים נדרשים לנמק באמצעות הגדרות, תכונות ומשפטים" and "תלמידים נדרשים לכתוב רצף טענות המובילות למסקנה המתבקשת". "It looks so in the drawing" is never a reason.
4. **A theorem may be written in short** as long as it is clear: "זוויות מתחלפות בין ישרים מקבילים", "זוויות בסיס במשולש שווה שוקיים", "צ.ז.צ". The congruence theorems are written by their initials (the Ministry test itself writes "משפט חפיפה ז.צ.ז").
5. **A congruence proof has a fixed shape:** three numbered equalities, each marked as צ or ז, then the line △… ≅ △… with the theorem name. For ז.צ.ז the proof must show that the equal side lies between the two equal angle pairs ([ח]: "הוכחה בעל פה או בכתב, תכלול את המעבר למצב שבו הצלעות השוות כלואות בין שני זוגות זוויות שוות"). For צ.ז.צ the angle must be the included one.
6. **Vertex order.** The congruence is written so that matching vertices stand in the same place: △ABC ≅ △DEF means A↔D, B↔E, C↔F. The Ministry test asks: "רשמו את החפיפה בהתאמה", and its questions say "(החפיפה לפי סדר הקודקודים הרשומים)". [ח] adds a nuance: congruence does not depend on how the names are written, but keeping matching order is recommended "כדי לסייע לתלמידים בזיהוי ההתאמה". For the app: require matching order, and explain a wrong order kindly rather than just marking it wrong.
7. **After the congruence:** conclusions are written with the reason "צלעות מתאימות במשולשים חופפים שוות" / "זוויות מתאימות במשולשים חופפים שוות" (see D6 for the curriculum's own wording).
8. **Hidden data are proved first, in their own part.** [ח]: "יש להוכיח נתונים הדרושים לחפיפה בסעיפים מקדימים, ולייחד להוכחת החפיפה עצמה סעיף נפרד."
9. **Marking the drawing.** Equal segments get the same number of small ticks ( | , || , ||| ), equal angles get the same arcs or the same Greek letter or number (∢1, ∢2, α), right angles get a small square, parallel lines get arrows. The student marks the given first, then each new equality. [ח] tasks say "סרטטו … וסמנו בו את החלקים השווים" and "סמנו את הגדלים השווים". The app's existing `DualTriSVG` marks (ticks and arcs) already follow this.
10. **Naming angles.** One letter (∢B) only when a single angle sits at that vertex; otherwise three letters with the vertex in the middle (∢ABD), or a number/Greek letter marked on the drawing. Symbols in Ministry papers: ∢ (also ∡), △ (also ∆), ≅ (also ≌), ∥, ⊥.
11. **Converse theorems.** A student must know which direction is being used: "property of the shape" (given the shape → the property) or "sign of the shape" (given the property → the shape). Using the wrong direction is the most common mistake in grade 9 and should be checked by the app on every "prove it is a …" task.
12. **Disproving.** A false claim is refuted with one counter-example ([ח]: "במקרה של משפט לא נכון יש להביא דוגמה נגדית"; [ד]: "הפרכת טענות באמצעות דוגמא נגדית"). "נכון / לא נכון, נמקו" and "מי צודק?" items are official question types and fit weak students well.
13. **Size of a question.** At the grade 9 base level: 2–3 steps per part, long proofs split into guided parts ([ד]). Verbs used by the Ministry: הוכיחו, הסבירו מדוע, נמקו, הראו כי, מהו סוג המשולש / המרובע? נמקו.

### Suggested exercise formats for the app, by the Ministry ladder (א–ד)

| Level | Format | Fits skills |
|---|---|---|
| א. follow | A finished proof; tap the one wrong line / "who is right?" / true-false with a reason | all |
| ב. complete | A proof skeleton with empty reason cells (pick from 4 chips), later empty statement cells too | 1–20 |
| ג. order | All lines given but shuffled; put them in order | 6–20 |
| ד. write | Build each line: choose statement parts (segments/angles) + reason; the app checks each line | 6–20 |

Simple rule: every skill starts at "complete the reason" and ends at "build the whole proof"; a weak student can stay on levels א–ב and still cover the whole Ministry plan.

## 4. Open points for Sulaiman (math owner)

1. Approve the (unconfirmed) wordings in group A and E7, D6, and the rectangle lines in skill 20.
2. Decide whether צ.צ.ז (the fourth theorem) and "ניצב ויתר" are part of the section. The updated grade 8 curriculum works with three theorems + ניצב ויתר; the 2015 list has צ.צ.ז too.
3. The existing chapter "4. חפיפה" offers "ז.ז.צ" as a congruence theorem; the Ministry way is the third-angle step and then ז.צ.ז. Keep, change or leave as is — his call.
4. חד-צדדיות is "לא חובה" in the 9A plan; this path never depends on it.
5. For "prove it is a trapezoid": must the student also show the second pair is not parallel at the basic level?
6. Sources not checked: מיצ"ב question collection, printed textbooks, the updated grade 9 curriculum file.
