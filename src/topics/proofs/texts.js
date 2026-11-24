/* The proofs section: every Hebrew message, hint, label and button text, keyed (spec §6.1, §7, §9).
   Texts are copied from the spec tables; they stay drafts until Sulaiman approves them. Keys whose
   text is NOT drafted in the spec are listed in NEW_DRAFTS (the review sheet prints them).
   Pure: no React, no window.

   Placeholders: {name} = a left-to-right maths island (AO, ∢AOC, 2); {{name}} = a plain Hebrew insert.
   Rule: a Hebrew prefix is never glued to an island ("לקודקוד {q}", never "ל-{q}"). */

export const T = {
  /* ── types and tabs (database keys: keep stable, spec §6.1) ── */
  'type.read-given': 'קוראים את הנתון',
  'type.congruent-parts': 'מחפיפה לשוויונות',
  'type.prove-congruence': 'הוכחת חפיפה',
  'type.then-conclusion': 'חפיפה ואז מסקנה',
  // similarity levels (spec 2026-11-23 §5.2, drafts): the tracker keys are `${n}. ${name}` (6–9)
  'type.sim-parts': 'מדמיון לשוויונות ויחס',
  'type.sim-side': 'מיחס לצלע חסרה',
  'type.prove-sim': 'הוכחת דמיון',
  'type.sim-calc': 'דמיון ואז חישוב',
  'tab.warm': 'חימום', 'tab.1': 'רמה 1', 'tab.2': 'רמה 2', 'tab.3': 'רמה 3',
  /* ── subjects → levels → help stages (spec 2026-11-23 §5.1; all in NEW_DRAFTS). The tab texts above stay the
     stored keys; these are what the student sees. ── */
  'stage.0': 'חימום', 'stage.1': 'מודרך', 'stage.2': 'ביחד', 'stage.3': 'לבד',
  'subj.congruence': 'חפיפת משולשים', 'subj.similarity': 'דמיון משולשים',
  'subj.short.congruence': 'חפיפה', 'subj.short.similarity': 'דמיון',
  'subj.when.congruence': 'ינואר–פברואר', 'subj.when.similarity': 'מרץ–אפריל',
  'lbl.levelN': 'רמה {n}',
  'lbl.subjects': 'הנושאים',
  'lbl.subjMeta': '{{when}} · {{done}} מתוך {{n}} רמות',

  /* ── hint ladder, rungs 1 and 2, by row role (§9.1) ── */
  'hint.given.1': 'התחילו ממה שנתון. הסתכלו על החלקים המהבהבים.',
  'hint.given.2': 'השוויון הזה כתוב בשאלה.',
  'hint.given-more.1': 'יש עוד נתון שלא השתמשנו בו.',
  'hint.given-more.2': 'חפשו בשורת הנתון מה עוד לא מסומן בציור.',
  'hint.given-words.1': 'קראו שוב את הנתון: מה המילה {{word}} אומרת?',
  'hint.given-words.2': 'למילה הזאת יש הגדרה. מה היא נותנת: קטעים שווים או זוויות שוות?',
  'hint.vertical.1': 'הסתכלו על הנקודה {pt}. שני ישרים נחתכים שם.',
  'hint.vertical.2': 'שתי זוויות זו מול זו, בין שני ישרים נחתכים.',
  'hint.common.1': 'יש צלע ששייכת לשני המשולשים.',
  'hint.common.2': 'צלע תמיד שווה לעצמה.',
  'hint.congruence.1': 'בציור מסומנים שלושה שוויונות. מה הם אומרים על שני המשולשים?',
  'hint.congruence.2': 'ספרו: כמה צלעות וכמה זוויות מסומנות, ומה נמצא בין מה?',
  'hint.matching.1': 'הסתכלו על הסימונים: חלקים עם אותו סימון מתאימים זה לזה.',
  'hint.matching.2': 'הקודקוד שמול הצלע עם קו אחד מתאים לקודקוד שמול הצלע השנייה עם קו אחד.',
  'hint.conclusion.1': 'המשולשים חופפים. הסתכלו על שני החלקים המהבהבים.',
  'hint.conclusion.2': 'במשולשים חופפים, חלקים מתאימים שווים. אלה צלעות או זוויות?',
  'hint.partner.1': 'מצאו את האות {letter} בכתיבת החפיפה. באיזה מקום היא כתובה?',
  'hint.partner.2': 'האות שכתובה באותו מקום במשולש השני היא המתאימה.',
  /* similarity roles (spec 2026-11-23 §7.3; all in NEW_DRAFTS) */
  'hint.similarity.1': 'כמה זוגות של זוויות שוות כבר כתובים? מה הם אומרים על שני המשולשים?',
  'hint.similarity.2': 'שני זוגות של זוויות שוות מספיקים כדי ששני משולשים יהיו דומים.',
  'hint.ratio.1': 'המשולשים דומים. אילו צלעות מתאימות זו לזו?',
  'hint.ratio.2': 'צלעות מתאימות נמצאות מול זוויות שוות. בכל שבר: למעלה צלע מהמשולש הראשון, ולמטה הצלע המתאימה לה מהמשולש השני.',
  'hint.number.1': 'הציבו בפרופורציה את האורכים הידועים.',
  'hint.number.2': 'כופלים בהצלבה, ואחר כך מחלקים כדי למצוא את האורך החסר.',
  'hint.parallel.1': 'יש בנתון ישרים מקבילים. מצאו את הישר שחותך את שניהם.',
  'hint.parallel.2': 'בין ישרים מקבילים, זוויות מתאימות שוות וגם זוויות מתחלפות שוות. באיזה צד של החותך נמצאות הזוויות?',
  'hint.common-angle.1': 'יש זווית ששייכת לשני המשולשים.',
  'hint.common-angle.2': 'זווית תמיד שווה לעצמה.',
  'hint.given-par.1': 'התחילו ממה שנתון: אילו ישרים מקבילים?',
  'hint.given-par.2': 'הנתון הזה כתוב בשאלה.',
  'hint.matching-sim.1': 'הסתכלו על הזוויות המסומנות: זוויות עם אותו סימון נמצאות בקודקודים מתאימים.',
  'hint.matching-sim.2': 'כתבו את הקודקודים של המשולש השני באותו סדר: קודקוד מול קודקוד שהזווית שלו שווה.',
  'hint.sim-partner.1': 'מצאו את האות של הקודקוד בכתיבת הדמיון. באיזה מקום היא כתובה?',
  'hint.sim-partner.2': 'האות שכתובה באותו מקום במשולש השני היא המתאימה. במשולשים דומים, זוויות מתאימות שוות.',

  /* ── after a right answer: the why-line (§9.2) ── */
  'why.given': 'זה כתוב בנתון.',
  'why.given-words': 'לפי הגדרת {{word}}: {st}.',
  'why.vertical': 'שני ישרים נחתכים בנקודה {pt}, והזוויות האלה זו מול זו.',
  'why.common': 'זו אותה צלע בשני המשולשים.',
  'why.sas': 'צלע, הזווית שביניהן, צלע. ההתאמה: {m}',
  'why.asa': 'זווית, הצלע שביניהן, זווית. ההתאמה: {m}',
  'why.sss': 'שלוש צלעות שוות בהתאמה. ההתאמה: {m}',
  'why.concl-side': 'הצלעות {x}, {y} נמצאות מול זוויות שוות. אלה צלעות מתאימות.',
  'why.concl-angle': 'הזוויות {x}, {y} נמצאות מול צלעות שוות. אלה זוויות מתאימות.',
  'why.partner': 'האותיות {p}, {q} כתובות באותו מקום בחפיפה.',
  /* similarity (spec 2026-11-23 §7.3; all in NEW_DRAFTS) */
  'why.aa': 'שני זוגות של זוויות שוות. ההתאמה: {m}',
  'why.corresponding': 'הישרים מקבילים, והזוויות נמצאות באותו צד של החותך, באותו מקום ליד כל אחד מהישרים.',
  'why.alternate': 'הישרים מקבילים, והזוויות נמצאות משני צדי החותך, בין שני הישרים.',
  'why.commonAngle': 'זו אותה זווית בשני המשולשים.',
  'why.right': 'לפי הנתון שתי הזוויות ישרות, ולכן הן שוות.',
  'why.ratio': 'בכל שבר צלע מהמשולש הראשון, והצלע המתאימה לה מהמשולש השני, באותו סדר.',
  'why.number': 'מציבים בפרופורציה את האורכים הידועים, ומקבלים {st}.',
  'why.sim-partner': 'האותיות {p}, {q} כתובות באותו מקום בדמיון.',

  /* ── a statement was chosen (§9.2) ── */
  'st.written': 'השורה הזו כבר כתובה.',
  'st.goalEarly': 'זה מה שצריך להוכיח. אי אפשר להשתמש בו לפני שהוכחנו אותו.',
  'st.congEarly': 'נכון, אבל מוקדם מדי. לחפיפה צריך שלושה שוויונות. יש כרגע {n}.',
  'st.consEarly': 'זה נראה כך בציור, אבל עוד לא ידוע. זה ינבע מהחפיפה, אחרי שנוכיח אותה.',
  'st.notNeeded': 'נכון, אבל לא צריך את זה כדי להגיע למה שצריך להוכיח.',
  'st.isoLater': 'נכון, אבל עוד לא למדנו את המשפט שמנמק את זה כאן. נמשיך בדרך אחרת.',
  'st.unprovable': 'ייתכן שזה נכון, אבל ברשימת הנימוקים שלנו אין נימוק שמוכיח את זה. נסו דרך אחרת.',
  'st.falseSeg': 'מהנתון אי אפשר לדעת שהקטעים {x}, {y} שווים.',
  'st.falseAng': 'מהנתון אי אפשר לדעת שהזוויות {x}, {y} שוות.',
  'st.letterSwap': 'בדקו את האותיות. בנתון כתוב {given}.',
  'st.word.median': 'תיכון מגיע לאמצע הצלע. הוא לא אומר שום דבר על הזוויות.',
  'st.word.bisector': 'חוצה זווית מחלק את הזווית לשתי זוויות שוות. הוא לא אומר שהקטעים שווים.',
  'st.word.altitude': 'גובה יוצר זווית ישרה עם הצלע. הוא לא בהכרח מגיע לאמצע שלה.',
  'st.partner': 'האות {p} כתובה במקום {{place}} במשולש הראשון, והאות {q} באותו מקום במשולש השני. לכן הקודקוד {p} מתאים לקודקוד {q}.',
  'st.notAsked': 'נכון, אבל לא על זה שאלו.',
  'st.matchingAng': 'בדקו את הסדר. ידוע כבר: {st}. לכן הקודקוד {p} מתאים לקודקוד {q}.',
  'st.matchingTwo': 'בדקו את הסדר. ידוע כבר: {st1}, {st2}. הקודקוד {p} נמצא על שתי הצלעות האלה, ולכן הוא מתאים לקודקוד {q}.',
  'st.matchingSide': 'בדקו את הסדר. ידוע כבר: {st}, והקודקוד {r} מתאים לקודקוד {s}. לכן הקודקוד {p} מתאים לקודקוד {q}.',
  'st.matchingPlain': 'בדקו את הסדר. חלקים עם אותו סימון מתאימים זה לזה, ובאותו סדר.',
  'st.matchingShared': 'הנקודה {p} שייכת לשני המשולשים, והיא מתאימה לעצמה.',
  /* ── similarity statements (spec 2026-11-23 §7.2, §7.8; all in NEW_DRAFTS) ── */
  'st.simEarly': 'נכון, אבל מוקדם מדי. לדמיון צריך שני זוגות של זוויות שוות. יש כרגע {n}.',
  'st.consEarlySim': 'זה נראה כך בציור, אבל עוד לא ידוע. זה ינבע מהדמיון, אחרי שנוכיח אותו.',
  'st.ratioFlip': 'הפכתם את היחס באחד השברים. בכל השברים כותבים באותו סדר: למעלה צלע מהמשולש הראשון, ולמטה הצלע המתאימה לה מהמשולש השני.',
  'st.nonMatchingSides': 'בכל שבר צריכות להיות שתי צלעות מתאימות: צלעות שנמצאות מול זוויות שוות, באותו מקום בסדר הדמיון.',
  'st.propInside': 'נכון. בהוכחה כותבים את היחס בין הצלעות המתאימות.',
  'st.propNoSim': 'כדי לכתוב יחס צלעות צריך קודם לדעת אילו משולשים דומים.',
  'st.propSame': 'כתבתם את אותו שבר פעמיים. כל שבר בנוי מזוג אחר של צלעות מתאימות.',
  'st.propNeed': 'היחס נכון, אבל הוא לא עוזר כאן. צריך שבר עם הצלע שמחפשים, ועוד שבר ששתי הצלעות שלו ידועות.',
  'st.falsePar': 'מהנתון אי אפשר לדעת שהישרים {x}, {y} מקבילים.',
  'st.falseVal': 'האורך של הקטע {x} הוא לא {v}. בדקו את החישוב.',
  /* the number row and the ratio built by tapping (spec 2026-11-23 §7.5–§7.6; Task 11; all in NEW_DRAFTS) */
  'st.numFlip': 'הפכתם את היחס. בשני השברים אותו סדר: למעלה צלע ממשולש אחד, ולמטה הצלע המתאימה לה.',
  'st.numCalc': 'הפרופורציה נכונה, בדקו את החישוב.',
  'st.numEmpty': 'כתבו קודם את המספר במקשים.',
  'st.numDot': 'זה עוד לא מספר. כתבו ספרות, ונקודה רק בין ספרות.',
  'st.numZero': 'מספר לא מתחיל באפס. כתבו {good} במקום {bad}.',
  'st.numLong': 'המספר ארוך מדי. האורך כאן הוא מספר שלם, או מספר עם חצי.',
  'st.numNone': 'אורך של קטע הוא מספר גדול מאפס.',
  'st.numAgain': 'את המספר הזה כבר ניסיתם. חשבו שוב, וכתבו מספר אחר.',
  'st.propAgain': 'את היחס הזה כבר ניסיתם. בנו אותו שוב, שבר אחרי שבר.',
  'st.needFirst': 'את זה יודעים מהנתון. כותבים קודם, בשורה משלו, את הנתון שזה נשען עליו, ואחר כך את השורה הזאת.',
  'st.needRow': 'קודם כותבים את השורה שזה נשען עליה, ואחר כך את השורה הזאת.',
  'st.kinds': 'בוחרים שני חלקים מאותו סוג: שני קטעים, שתי זוויות או שני משולשים.',

  /* ── the statement is right, the reason is not (§9.2) ── */
  'rs.given.vertical': 'אלה קטעים, לא זוויות. את השוויון הזה יודעים מהנתון.',
  'rs.given.common': 'צלע משותפת היא אותה צלע בשני המשולשים. כאן אלה שני חלקים שונים.',
  'rs.fact.theorem': 'משפט חפיפה מוכיח שמשולשים חופפים. כאן צריך נימוק לשוויון אחד.',
  'rs.fact.cp': 'עוד לא הוכחנו חפיפה. אי אפשר להשתמש בה כנימוק.',
  'rs.seen.given': 'זה לא כתוב בנתון. חפשו בציור: מאיפה יודעים את זה?',
  'rs.vertical.alternate': 'הנימוק הזה דורש ישרים מקבילים, ואין כאן נתון כזה.',
  'rs.vertical.common': 'אלה שתי זוויות שונות, זו מול זו. אין כאן חלק משותף.',
  'rs.words.otherDef': 'בנתון כתוב {{word}}. איזו הגדרה מתאימה למילה הזאת?',
  'rs.cong.asa1': 'יש רק זוג זוויות אחד. במשפט ז.צ.ז צריך שני זוגות זוויות.',
  'rs.cong.sss2': 'יש רק שני זוגות צלעות. במשפט צ.צ.צ צריך שלושה.',
  'rs.cong.sss1': 'יש רק זוג צלעות אחד. במשפט צ.צ.צ צריך שלושה.',
  'rs.cong.sas1': 'יש רק זוג צלעות אחד. במשפט צ.ז.צ צריך שני זוגות צלעות.',
  'rs.cong.noAngle': 'מסומנות שלוש צלעות ואף זווית. איזה משפט מתאים לזה?',
  'rs.cong.given': 'החפיפה לא נתונה. מוכיחים אותה משלושת השוויונות.',
  'rs.cong.cp': 'זה נימוק למה שנובע מהחפיפה, לא לחפיפה עצמה.',
  'rs.concl.given': 'זה לא נתון. זה מה שצריך להוכיח, והוא נובע מהחפיפה.',
  'rs.concl.theorem': 'משפט החפיפה כבר הוכיח שהמשולשים חופפים. עכשיו צריך נימוק לשוויון שנובע מזה.',
  'rs.concl.otherCp': 'כמעט. אלה {{these}}, לא {{those}}.',
  /* similarity (spec 2026-11-23 §7.3, §7.8; all in NEW_DRAFTS) */
  'rs.par.notAlt': 'אלה לא זוויות מתחלפות. הן נמצאות באותו צד של החותך, באותו מקום ליד כל אחד מהישרים המקבילים: אלה זוויות מתאימות.',
  'rs.par.notCorr': 'אלה לא זוויות מתאימות. הן נמצאות משני צדי החותך, בין שני הישרים המקבילים: אלה זוויות מתחלפות.',
  'rs.par.given': 'השוויון הזה לא כתוב בנתון. בנתון כתוב שהישרים מקבילים. איזה משפט על ישרים מקבילים נותן אותו?',
  'rs.par.seen': 'הזוויות נוצרות מהישרים המקבילים ומהישר שחותך אותם. איזה משפט על ישרים מקבילים מתאים?',
  'rs.vertical.parallelSim': 'הזוויות האלה זו מול זו, בין שני ישרים נחתכים. הן לא נוצרות מהישרים המקבילים.',
  'rs.given.noPar': 'אין בנתון ישרים מקבילים. את השוויון הזה יודעים מהנתון עצמו.',
  'rs.fact.simTheorem': 'משפט דמיון מוכיח שמשולשים דומים. כאן צריך נימוק לשוויון אחד.',
  'rs.fact.sim': 'עוד לא הוכחנו דמיון. אי אפשר להשתמש בו כנימוק.',
  'rs.sim.cong': 'משפטי החפיפה מוכיחים חפיפה. כאן מוכיחים דמיון, משני זוגות של זוויות שוות. איזה משפט מתאים?',
  'rs.sim.given': 'הדמיון לא נתון. מוכיחים אותו משני זוגות הזוויות השוות.',
  'rs.sim.follows': 'זה נימוק למה שנובע מהדמיון, לא לדמיון עצמו.',
  'rs.sim.angle': 'זה נימוק לזוג זוויות אחד. הדמיון נובע משני זוגות הזוויות: איזה משפט אומר את זה?',
  'rs.sim.after': 'משפט ז.ז מוכיח שמשולשים דומים. כאן המשולשים כבר דומים, וצריך נימוק למה שנובע מזה.',
  'rs.sim.cp': 'המשולשים דומים, לא חופפים. מה נובע מדמיון?',
  'rs.ratio.given': 'היחס לא כתוב בנתון. הוא נובע מהדמיון.',
  'rs.ratio.solve': 'פתרון הפרופורציה נותן מספר. כאן כותבים את הפרופורציה עצמה, והיא נובעת מהדמיון.',
  'rs.num.given': 'האורך הזה לא נתון. מחשבים אותו מהפרופורציה.',
  'rs.num.ratio': 'היחס כבר כתוב בשורה הקודמת. איך מקבלים ממנו את המספר?',
  'rs.simc.given': 'זה לא נתון. זה נובע מהדמיון.',
  'rs.other': 'הטענה נכונה. הנימוק לא מתאים. מאיפה יודעים את זה?',
  'rs.short': 'הנימוק לא מתאים. נסו שוב.',

  /* ── short feedback words ── */
  'fb.ok': 'נכון.',

  /* ── other texts (§9.2) ── */
  'ui.filled': 'מילאנו את הצעד הזה יחד. הנימוק: {{reason}}.',
  'ui.filledSt': 'מילאנו את הצעד הזה יחד: {st}.',
  'ui.endClean': 'מ.ש.ל. הוכחה נקייה.',
  'ui.endHelped': 'מ.ש.ל. ההוכחה הושלמה. היה צעד שמילאנו יחד, ולכן היא לא נספרת כנקייה. השלב לא יורד.',
  'ui.endSlips': 'מ.ש.ל. ההוכחה הושלמה. בכמה צעדים היה צריך רמז או ניסיון נוסף, ולכן היא לא נספרת כנקייה. השלב לא יורד.',
  'ui.levelUp': 'עליתם שלב. {{type}} · {{stage}}',
  'ui.typeDone': 'בניתם הוכחות שלמות לבד. {{type}} · כל השלבים הושלמו.',
  'ui.lessHelp': 'הפעם נעזרתם פחות מבפעם הקודמת.',
  'ui.round': 'סיימתם סבב של 3 הוכחות.',
  'ui.rescue1': 'נעצור רגע ונחזק דבר אחד: {{skill}}.',
  'ui.rescue2': 'נעבור יחד על הוכחה אחת שלמה, צעד אחר צעד.',
  'ui.rescue3': 'הרמה הזאת עוד קשה, וזה בסדר. כדאי לחזק קודם: {{prev}}.',
  'ui.warmDone': 'החימום מאחוריכם. עכשיו מוכיחים.',
  'ui.locked': 'נפתח אחרי 3 הוכחות נקיות בשלב {{stage}}.',

  /* ── buttons (never a check word or ✓: the tracker would treat them as check buttons) ── */
  'btn.hint': 'רמז', 'btn.hint2': 'עוד רמז', 'btn.show': 'הראו לי', 'btn.add': 'להוסיף שורה',
  'btn.parts': 'רשימת חלקים', 'btn.cancel': 'ביטול', 'btn.back': 'חזרה', 'btn.next': 'הבא',
  'btn.go': 'קדימה', 'btn.qed': 'מ.ש.ל.', 'btn.more': 'הוכחה נוספת', 'btn.finish': 'סיום',
  'btn.swap': 'תרגיל אחר', 'btn.start': 'מתחילים', 'btn.continue': 'ממשיכים',

  /* ── labels ── */
  'lbl.whatReason': 'מה הנימוק?',
  'lbl.whereFrom': 'מאיפה יודעים?',
  'lbl.leans': 'על אילו שורות זה נשען?',
  'lbl.notebook': 'כך כותבים את זה במחברת',
  'lbl.given': 'נתון:',
  'lbl.toProve': 'צ״ל:',
  'lbl.goal': 'צריך להוכיח',
  'lbl.claim': 'טענה',
  'lbl.reason': 'נימוק',
  'lbl.done': 'הוכחות שהשלמתם: {{n}}',
  'lbl.dots': '{{k}} מתוך 4',
  'lbl.marked': 'סומן בציור',
  'lbl.byOrder': '(החפיפה לפי סדר הקודקודים)',
  'lbl.byOrderSim': '(הדמיון לפי סדר הקודקודים)',
  'lbl.planL3': 'קודם שלושה שוויונות, אחר כך החפיפה.',
  'lbl.planL3Sim': 'קודם שני זוגות של זוויות שוות, אחר כך הדמיון.',
  'lbl.planL3SimCalc': 'קודם שני זוגות של זוויות שוות ואחר כך הדמיון. בסוף היחס והחישוב.',
  'lbl.show': 'הראו בציור',
  'lbl.leadRows': 'אילו שורות מובילות לחפיפה?',
  'lbl.planTris': 'באילו שני משולשים נמצאים {x}, {y}?',
  'lbl.rescueCard': 'נעצור רגע ונחזק דבר אחד.',
  'lbl.segs': 'קטעים', 'lbl.angs': 'זוויות', 'lbl.tris': 'משולשים',
  'lbl.row': 'שורה {{n}}',
  'lbl.theSeg': 'הקטע', 'lbl.theAng': 'הזווית', 'lbl.theTri': 'המשולש',
  'lbl.equals': 'שווה', 'lbl.congruent': 'חופף',
  'lbl.cant': 'אי אפשר לקבוע',
  'lbl.sidesWord': 'צלעות', 'lbl.anglesWord': 'זוויות',
  'lbl.place1': 'הראשון', 'lbl.place2': 'השני', 'lbl.place3': 'השלישי',

  /* ── statements read as sentences (screen readers, §11.3) ── */
  'say.seg': 'הקטע {x} שווה לקטע {y}',
  'say.ang': 'הזווית {x} שווה לזווית {y}',
  'say.angRight': 'הזווית {x} שווה לזווית {y}, ושתיהן ישרות',
  'say.cong': 'המשולש {x} חופף למשולש {y}',
  'say.par': 'הישר {x} מקביל לישר {y}',
  'say.sim': 'המשולש {x} דומה למשולש {y}',
  'say.prop': 'היחסים שווים: {x}',
  'say.val': 'אורך הקטע {x} הוא {v}',
  'say.ask': 'מחפשים את החלק ששווה לחלק {x}',
  'say.askProp': 'מחפשים את הצלעות שמתאימות לצלעות {x}',
  'say.askVal': 'מחפשים את האורך של {x}',

  /* ── the words a given sentence can use (inserted into rs.words.otherDef, why.given-words) ── */
  'word.median': 'תיכון', 'word.bisector': 'חוצה זווית', 'word.midpoint': 'אמצע', 'word.altitude': 'גובה',

  /* ── given sentences in words (§6.4, §6.5) ── */
  'gv.midpoint': '{p} אמצע הקטע {s}',
  'gv.midSide': '{p} אמצע הצלע {s}',
  'gv.bisect2': 'הקטעים {s1}, {s2} חוצים זה את זה בנקודה {p}',
  'gv.bisector': '{l} חוצה את {a}',
  'gv.median': '{l} תיכון לצלע {s}',
  'gv.altitude': '{l} גובה לצלע {s}',

  /* ── problem intros (one line above the given) ── */
  'tx.X': 'הקטעים {s1}, {s2} נחתכים בנקודה {p}.',
  'tx.K': 'המשולשים {t1}, {t2} נמצאים משני צדי הצלע {s}.',
  'tx.Z': 'המשולשים {t1}, {t2} חולקים את הצלע {s}.',
  'tx.T': 'הנקודה {p} נמצאת על הצלע {s} במשולש {t}.',
  'tx.2': 'בציור שני משולשים: {t1}, {t2}.',
  'tx.cevian': 'בציור המשולש {t}.',
  'tx.P': 'במשולש {t} הנקודה {d} נמצאת על הצלע {s1}, והנקודה {e} נמצאת על הצלע {s2}.',
  'tx.H': 'במשולש ישר הזווית {t} הנקודה {d} נמצאת על היתר {s}.',
  'gv.math': '{s}',                                  // a given written in maths only (∢ACB = 90°, CD ⊥ AB, AD = 4): one island

  /* ── warm-up (§7.1) ── */
  'w.W1': 'נתון: {st}. געו בציור בשני הקטעים האלה.',
  'w.W2': 'ידוע, או רק נראה כך?',
  'w.W2.known': 'ידוע',
  'w.W2.looks': 'רק נראה כך',
  'w.W3': 'איזה שוויון ידוע מהציור עצמו, בלי נתון?',
  'w.W4': 'איזה משפט חפיפה מתאים לסימונים?',
  'w.W5': '{cong}. איזה קודקוד מתאים לקודקוד {p}?',
  'w.W5side': '{cong}. איזו צלע מתאימה לצלע {s}?',
  'w.W6': 'מותר כבר להשתמש בזה?',
  'w.W6.yes': 'כן, מותר',
  'w.W6.no': 'עוד לא',
  'w.W7': 'מה נותן הנתון הזה? בחרו את השוויון.',
  'w.W1.why': 'בציור מסמנים רק את מה שכתוב בנתון: את שני הקטעים שהנתון אומר שהם שווים.',
  'w.W2.why': 'בציור דברים יכולים להיראות שווים. ידוע רק מה שכתוב בנתון או מה שכבר הוכחנו.',
  'w.W3.why': 'צלע ששייכת לשני המשולשים, או שתי זוויות זו מול זו בין ישרים נחתכים, רואים בציור בלי נתון.',
  'w.W4.why': 'סופרים כמה צלעות וכמה זוויות מסומנות, ומסתכלים מה נמצא בין מה.',
  'w.W5.why': 'הקודקודים המתאימים כתובים באותו מקום בכתיבת החפיפה.',
  'w.W6.why': 'את מה שצריך להוכיח, ואת מה שנובע מהחפיפה, אפשר להשתמש רק אחרי שהוכחנו אותם.',
  'w.W7.why': 'לכל מילה בנתון יש הגדרה: תיכון נותן קטעים שווים, חוצה זווית נותן זוויות שוות, גובה נותן זווית ישרה.',
  'skill.W1': 'לסמן בציור את הנתון',
  'skill.W2': 'מה ידוע ומה רק נראה כך',
  'skill.W3': 'מה רואים בציור בלי נתון',
  'skill.W4': 'איזה משפט חפיפה מתאים',
  'skill.W5': 'אילו קודקודים מתאימים',
  'skill.W6': 'מתי מותר להשתמש במסקנה',
  'skill.W7': 'מה המילה בנתון אומרת',

  /* ── screen texts written by the builder (all in NEW_DRAFTS) ── */
  'lbl.title': 'הוכחות',
  'lbl.whatClaim': 'איזו טענה מתאימה כאן?',
  'lbl.pickTile': 'מה השורה הבאה? בחרו טענה.',
  'lbl.tapTwo': 'געו בציור בשני חלקים שווים.',
  'lbl.tapSecond': 'עכשיו געו בחלק השני, מאותו סוג.',
  'lbl.matchOrder': 'כתבו את המשולש השני לפי סדר ההתאמה.',
  'lbl.chooser': 'לאיזה חלק התכוונתם?',
  'lbl.goalCong': 'המשולשים {t1}, {t2} חופפים',
  'lbl.goalSim': 'המשולשים {t1}, {t2} דומים',
  'lbl.sameSeg': 'אותו קטע בשני המשולשים',
  'lbl.walkIntro': 'עוברים יחד על הוכחה שלמה, שורה אחרי שורה.',
  'lbl.proofDone': 'כל השורות מנומקות. נשאר רק לסיים.',
  'lbl.cleanN': 'הוכחות נקיות: {{k}} מתוך 4',
  'lbl.cleanAria': 'הוכחות נקיות מתוך ארבע האחרונות',
  'lbl.figure': 'הציור',
  'lbl.leanGiven': 'על הנתון',
  'lbl.leanSeen': 'על הציור',
  'lbl.leanRows': 'על שורות קודמות',
  'lbl.here': 'אתם כאן',
  'lbl.passed': 'הושלמה',
  'lbl.order': 'סדר מומלץ',
  'lbl.sample': 'כך נראית הוכחה',
  'ui.rescue2Btn': 'נעבור יחד',
  'lbl.nextUp': 'הבא בתור',
  'btn.these': 'אלה השניים',
  'ui.planOk': 'נכון: החלקים האלה נמצאים במשולשים {t1}, {t2}. נוכיח קודם שהמשולשים חופפים.',

  /* ── the number row, the keypad and the ratio built by tapping (spec 2026-11-23 §7.5–§7.6; Task 11; all in NEW_DRAFTS) ── */
  'btn.answer': 'זו התשובה',
  'btn.unpair': 'למחוק את השבר האחרון',
  'q.number': 'מה האורך של {x}?',
  'lbl.kp': 'מקשי מספרים',
  'lbl.kpDel': 'מחיקה',
  'lbl.kpDot': 'נקודה עשרונית',
  'lbl.work': 'מציבים',
  'lbl.cross': 'כופלים בהצלבה',
  'lbl.tapSim': 'געו בציור בשני חלקים: שתי זוויות שוות, שני משולשים דומים, או צלע והצלע המתאימה לה.',
  'lbl.sameAng': 'אותה זווית בשני המשולשים',
  'lbl.tapSimParts': 'געו בציור בשני חלקים: שתי זוויות שוות, או צלע והצלע המתאימה לה.',
  'lbl.rowN': 'שורה {{n}}',
  'lbl.tapPair1': 'עכשיו געו בצלע המתאימה לה, מהמשולש השני.',
  'lbl.tapPair2': 'עוד שבר: געו בצלע, ואחר כך בצלע המתאימה לה.',
  'say.frac': '{x} חלקי {y}',
  'say.numBox': 'המספר שכתבתם: {v}',
  'say.numLabel': 'אורך הקטע {x} הוא {v}',
  'say.numAsk': 'האורך של הקטע {x} הוא מה שמחפשים',

  /* ── the notebook screen (2026-11-22 redesign; all in NEW_DRAFTS) ── */
  'lbl.rowOf': 'שורה {{n}} מתוך {{t}}',
  'lbl.allRows': 'כל השורות כתובות',
  'lbl.rowStmt': 'שורה {{n}} · מה כותבים בטענה?',
  'lbl.rowReason': 'שורה {{n}} · מה הנימוק?',
  'lbl.rowShow': 'שורה {{n}} · ככה עושים',
  'lbl.howTo': 'ככה עושים',
  'lbl.later': 'אחר כך',
  'lbl.beforeStart': 'לפני שמתחילים',
  'q.sentence': 'מה המשפט הזה אומר? בחרו את השוויון.',
  'q.partner': 'מה כותבים בריבוע? היעזרו בסדר האותיות בחפיפה.',
  'q.partnerSim': 'מה כותבים בריבוע? היעזרו בסדר האותיות בדמיון.',
  'q.whyRow': 'מאיפה יודעים את הטענה הזאת?',
  'q.whyCong': 'איזה משפט חפיפה מתאים לשוויונות שמעל?',
  'q.whyConcl': 'המשולשים חופפים. מה הנימוק לשוויון הזה?',
  'coach.start': 'נבנה יחד הוכחה שלמה, שורה אחרי שורה. כל שורה היא טענה, ולידה נימוק: מאיפה יודעים אותה. בשורה אחת תבחרו בעצמכם.',
  'coach.given': 'השוויון הזה כתוב בנתון, אז מעתיקים אותו לטענה כמו שהוא. הנימוק: נתון.',
  'coach.reason': 'הנימוק: {{reason}}.',
  'btn.gotIt': 'הבנתי, לשורה הבאה',
  'btn.doneRead': 'סיימנו',
  'lbl.law.theorem': 'המשפט', 'lbl.law.definition': 'ההגדרה', 'btn.choose': 'בחירה',
  /* ── the "המשפטים" page and sheet (spec 2026-11-23 §6.2.4–§6.3; all in NEW_DRAFTS) ── */
  'lbl.laws': 'המשפטים', 'lbl.lawsIn': 'המשפטים ב{{subject}}', 'lbl.lawsOf': 'המשפטים של הנושא',
  'lbl.lawsSub': 'אלה המשפטים של הנושא. הם ילוו אתכם גם בכיתות הגבוהות.',
  'lbl.lawsMore': 'הגדרות וכללים', 'lbl.lawNow': 'משתמשים בו בשורה הזאת', 'lbl.lawFig': 'ציור לדוגמה: {{name}}',
  'btn.close': 'סגירה',
  'sub.sas': 'צלע, זווית, צלע', 'sub.asa': 'זווית, צלע, זווית', 'sub.sss': 'שלוש צלעות',
  'ui.endCleanRead': 'סיימנו. עבודה נקייה.',
  'ui.endHelpedRead': 'סיימנו. היה צעד שמילאנו יחד, ולכן זה לא נספר כנקי. השלב לא יורד.',
  'ui.endSlipsRead': 'סיימנו. בכמה צעדים היה צריך רמז או ניסיון נוסף, ולכן זה לא נספר כנקי. השלב לא יורד.',

  /* ── one line per type on its landing ── */
  'about.read-given': 'מהמשפט שבנתון אל השוויון שהוא נותן, עם הנימוק הנכון.',
  'about.congruent-parts': 'שני משולשים חופפים: מוצאים אילו צלעות ואילו זוויות שוות.',
  'about.prove-congruence': 'משלושה שוויונות מוכיחים ששני משולשים חופפים.',
  'about.then-conclusion': 'קודם מוכיחים חפיפה, ואחר כך שוויון שנובע ממנה.',
  'about.sim-parts': 'שני משולשים דומים: מוצאים אילו זוויות שוות ואיך כותבים את יחס הצלעות.',
  'about.sim-side': 'שני משולשים דומים: כותבים את היחס ומוצאים צלע חסרה.',
  'about.prove-sim': 'משתי זוויות שוות מוכיחים ששני משולשים דומים.',
  'about.sim-calc': 'קודם מוכיחים דמיון, ואחר כך כותבים יחס ומוצאים צלע חסרה.',
};

/** Open maths points for Sulaiman (printed on the review sheet, above the new texts). */
export const OPEN_POINTS = [
  'משפחה T, כשנתון AB = AC: זוויות הבסיס שוות, וחוצה הזווית מהקודקוד הוא גם תיכון וגם גובה. זה נכון, אבל בשלב 1 אין לזה נימוק ברשימה. כרגע תלמיד שכותב את זה מקבל הערה ניטרלית (st.isoLater), בלי טעות ובלי השפעה על הרמה. להחליט: להשאיר כך, להוסיף את משפטי המשולש שווה השוקיים, או לתת את משפחה T רק לפני הפרק הזה.',
];

/** Keys whose text is not drafted in the spec (written by the builder; for Sulaiman's review sheet). */
export const NEW_DRAFTS = [
  'stage.0', 'stage.1', 'stage.2', 'stage.3', 'subj.congruence', 'subj.similarity', 'subj.short.congruence', 'subj.short.similarity',
  'subj.when.congruence', 'subj.when.similarity', 'lbl.levelN', 'lbl.subjects', 'lbl.subjMeta',
  'ui.endHelped', 'ui.levelUp', 'ui.typeDone', 'ui.rescue3', 'ui.locked',   // reworded 2026-11-23: a help stage is a "שלב" (מודרך · ביחד · לבד), a level ("רמה") is a step of the subject's ladder
  'fb.ok', 'rs.cong.sss1', 'ui.rescue2', 'ui.filledSt',
  'say.angRight', 'lbl.place1', 'lbl.place2', 'lbl.place3',
  'gv.bisect2', 'tx.X', 'tx.K', 'tx.Z', 'tx.T', 'tx.2', 'tx.cevian',
  'w.W2.known', 'w.W2.looks', 'w.W5side', 'w.W6.yes', 'w.W6.no', 'w.W7',
  'w.W1.why', 'w.W2.why', 'w.W3.why', 'w.W4.why', 'w.W5.why', 'w.W6.why', 'w.W7.why',
  'skill.W1', 'skill.W2', 'skill.W3', 'skill.W4', 'skill.W5', 'skill.W6', 'skill.W7',
  'about.read-given', 'about.congruent-parts', 'about.prove-congruence', 'about.then-conclusion',
  'lbl.title', 'lbl.whatClaim', 'lbl.pickTile', 'lbl.tapTwo', 'lbl.tapSecond', 'lbl.matchOrder', 'lbl.chooser', 'lbl.goalCong', 'lbl.sameSeg', 'lbl.walkIntro',
  'lbl.proofDone', 'lbl.cleanN', 'lbl.cleanAria', 'lbl.figure', 'lbl.leanGiven', 'lbl.leanSeen', 'lbl.leanRows', 'lbl.here',
  'lbl.passed', 'lbl.order', 'lbl.sample', 'ui.rescue2Btn', 'lbl.nextUp', 'btn.these',
  'ui.planOk', 'say.ask',
  'ui.endSlips', 'st.isoLater', 'st.matchingAng', 'st.matchingTwo', 'st.matchingSide', 'st.matchingPlain',
  'lbl.rowOf', 'lbl.allRows', 'lbl.rowStmt', 'lbl.rowReason', 'lbl.rowShow', 'lbl.howTo', 'lbl.later', 'lbl.beforeStart',
  'q.sentence', 'q.partner', 'q.whyRow', 'q.whyCong', 'q.whyConcl', 'coach.start', 'coach.given', 'coach.reason',
  'btn.gotIt', 'btn.doneRead', 'sub.sas', 'sub.asa', 'sub.sss', 'ui.endCleanRead', 'ui.endHelpedRead', 'ui.endSlipsRead',
  'why.given', 'why.given-words', 'why.vertical', 'why.common', 'why.sas', 'why.asa', 'why.sss', 'why.concl-side', 'why.concl-angle', 'why.partner', 'btn.swap',   // reworded 2026-11-22: no "נכון" (the feedback line already says it), one island for the matching
  'w.W2', 'w.W3', 'st.partner',                       // reworded after the review (the spec drafts read less clearly)
  // the reasons' full sentences (reasons.js, spec 2026-11-23 §6.1): `reason.<id>` = REASONS[id].full
  'lbl.law.theorem', 'lbl.law.definition', 'btn.choose',                                 // the theorems on screen (spec 2026-11-23 §6.2)
  'lbl.laws', 'lbl.lawsIn', 'lbl.lawsOf', 'lbl.lawsSub', 'lbl.lawsMore', 'lbl.lawNow', 'lbl.lawFig', 'btn.close',   // the "המשפטים" page and sheet (§6.2.4–§6.3)
  'reason.sas', 'reason.asa', 'reason.sss', 'reason.vertical',                          // the Ministry 2015 list, word for word
  'reason.bisector', 'reason.median', 'reason.midpoint', 'reason.altitude',             // today's wording as a sentence (unconfirmed)
  'reason.common-side', 'reason.common-angle', 'reason.cp-sides', 'reason.cp-angles',   // builder drafts (unconfirmed)
  // similarity statements (spec 2026-11-23 §7.2): the checker's messages and the screen-reader sentences
  'st.simEarly', 'st.consEarlySim', 'st.ratioFlip', 'st.nonMatchingSides', 'st.propInside', 'st.propNoSim', 'st.propSame', 'st.propNeed',
  'st.falsePar', 'st.falseVal', 'say.par', 'say.sim', 'say.prop', 'say.val',
  // similarity reasons, roles and messages (spec 2026-11-23 §7.3, §7.8)
  'reason.aa', 'reason.corresponding', 'reason.alternate', 'reason.right-angles', 'reason.sim-angles', 'reason.sim-ratio', 'reason.solve',
  'hint.similarity.1', 'hint.similarity.2', 'hint.ratio.1', 'hint.ratio.2', 'hint.number.1', 'hint.number.2',
  'hint.parallel.1', 'hint.parallel.2', 'hint.sim-partner.1', 'hint.sim-partner.2',
  'why.aa', 'why.corresponding', 'why.alternate', 'why.commonAngle', 'why.right', 'why.ratio', 'why.number', 'why.sim-partner',
  'st.needFirst', 'st.needRow', 'rs.par.notAlt', 'rs.par.notCorr', 'rs.par.given', 'rs.par.seen', 'rs.vertical.parallelSim', 'rs.given.noPar',
  'rs.fact.simTheorem', 'rs.fact.sim', 'rs.sim.cong', 'rs.sim.given', 'rs.sim.follows', 'rs.sim.angle', 'rs.sim.after', 'rs.sim.cp',
  'rs.ratio.given', 'rs.ratio.solve', 'rs.num.given', 'rs.num.ratio', 'rs.simc.given',
  'tx.P', 'tx.H',                                                                          // similarity family intros (P and N share tx.P; B uses tx.X)
  // the similarity levels (spec 2026-11-23 §5.2, §7.6)
  'type.sim-parts', 'type.sim-side', 'type.prove-sim', 'type.sim-calc', 'about.sim-parts', 'about.sim-side', 'about.prove-sim', 'about.sim-calc',
  'lbl.byOrderSim', 'lbl.planL3Sim', 'lbl.planL3SimCalc', 'say.askProp', 'say.askVal', 'lbl.goalSim', 'q.partnerSim',
  // the number row, the keypad, the ratio built by tapping, the similarity hints (spec 2026-11-23 §7.5–§7.6; Task 11)
  'st.numFlip', 'st.numCalc', 'st.numEmpty', 'st.numDot', 'st.numZero', 'st.numLong', 'st.numNone', 'st.numAgain', 'st.propAgain',
  'btn.answer', 'btn.unpair', 'q.number', 'lbl.kp', 'lbl.kpDel', 'lbl.kpDot', 'lbl.work', 'lbl.cross', 'lbl.tapSim', 'lbl.tapSimParts', 'lbl.sameAng', 'lbl.rowN', 'lbl.tapPair1', 'lbl.tapPair2',
  'say.frac', 'say.numBox', 'say.numLabel', 'say.numAsk',
  'hint.common-angle.1', 'hint.common-angle.2', 'hint.given-par.1', 'hint.given-par.2', 'hint.matching-sim.1', 'hint.matching-sim.2',
];

const PH = /\{\{(\w+)\}\}|\{(\w+)\}/g;

/** A text as parts: [{ t:'he', v }, { t:'m', v }]. Throws on an unknown key or a missing variable. */
export function tx(key, vars = {}) {
  const s = T[key];
  if (s == null) throw new Error(`proofs texts: no key "${key}"`);
  const out = [];
  const he = (v) => { if (!v) return; const last = out[out.length - 1]; if (last && last.t === 'he') last.v += v; else out.push({ t: 'he', v }); };
  let at = 0;
  for (const m of s.matchAll(PH)) {
    he(s.slice(at, m.index));
    const name = m[1] || m[2];
    if (!(name in vars) || vars[name] == null) throw new Error(`proofs texts: "${key}" needs {${name}}`);
    if (m[1]) he(String(vars[name])); else out.push({ t: 'm', v: String(vars[name]) });
    at = m.index + m[0].length;
  }
  he(s.slice(at));
  return out;
}

/** The same text as one plain string (islands inlined), e.g. for aria-labels and tests. */
export const fill = (key, vars = {}) => tx(key, vars).map((p) => p.v).join('');

/* Step labels (§10.4): the tracker stores them as the decision kind. */
const ROLE_WORD = {
  given: ['נתון', 'נתון'], 'given-more': ['נתון', 'נתון'], 'given-words': ['נתון', 'נתון'],
  vertical: ['רואים בציור', 'רואים בציור'], common: ['רואים בציור', 'רואים בציור'],
  congruence: ['חפיפה', 'משפט חפיפה'],
  conclusion: ['מסקנה', 'מסקנה'], partner: ['מסקנה', 'מסקנה'],
  // similarity (spec 2026-11-23 §7.3)
  similarity: ['דמיון', 'משפט דמיון'], ratio: ['יחס', 'מסקנה'], number: ['חישוב', 'חישוב'],
  parallel: ['ישרים מקבילים', 'ישרים מקבילים'], 'sim-partner': ['מסקנה', 'מסקנה'],
};
const roleWord = (role, i) => { const w = ROLE_WORD[role]; if (!w) throw new Error(`proofs texts: no role "${role}"`); return w[i]; };
export const LABELS = {
  stmt: (role) => `טענה · ${roleWord(role, 0)}`,
  reason: (role) => `נימוק · ${roleWord(role, 1)}`,
  matching: 'התאמת קודקודים',
};
