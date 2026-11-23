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
  'tab.warm': 'חימום', 'tab.1': 'רמה 1', 'tab.2': 'רמה 2', 'tab.3': 'רמה 3',

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
  'rs.other': 'הטענה נכונה. הנימוק לא מתאים. מאיפה יודעים את זה?',
  'rs.short': 'הנימוק לא מתאים. נסו שוב.',

  /* ── short feedback words ── */
  'fb.ok': 'נכון.',

  /* ── other texts (§9.2) ── */
  'ui.filled': 'מילאנו את הצעד הזה יחד. הנימוק: {{reason}}.',
  'ui.filledSt': 'מילאנו את הצעד הזה יחד: {st}.',
  'ui.endClean': 'מ.ש.ל. הוכחה נקייה.',
  'ui.endHelped': 'מ.ש.ל. ההוכחה הושלמה. היה צעד שמילאנו יחד, ולכן היא לא נספרת כנקייה. הרמה לא יורדת.',
  'ui.endSlips': 'מ.ש.ל. ההוכחה הושלמה. בכמה צעדים היה צריך רמז או ניסיון נוסף, ולכן היא לא נספרת כנקייה. הרמה לא יורדת.',
  'ui.levelUp': 'עליתם רמה. {{type}} · רמה {{n}}',
  'ui.typeDone': 'בניתם הוכחות שלמות לבד. {{type}} · רמה 3 הושלמה.',
  'ui.lessHelp': 'הפעם נעזרתם פחות מבפעם הקודמת.',
  'ui.round': 'סיימתם סבב של 3 הוכחות.',
  'ui.rescue1': 'נעצור רגע ונחזק דבר אחד: {{skill}}.',
  'ui.rescue2': 'נעבור יחד על הוכחה אחת שלמה, צעד אחר צעד.',
  'ui.rescue3': 'הסוג הזה עוד קשה, וזה בסדר. כדאי לחזק קודם: {{prev}}.',
  'ui.warmDone': 'החימום מאחוריכם. עכשיו מוכיחים.',
  'ui.locked': 'נפתח אחרי 3 הוכחות נקיות ברמה {{n}}.',

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
  'lbl.planL3': 'קודם שלושה שוויונות, אחר כך החפיפה.',
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
  'say.ask': 'מחפשים את החלק ששווה לחלק {x}',

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
  'q.whyRow': 'מאיפה יודעים את הטענה הזאת?',
  'q.whyCong': 'איזה משפט חפיפה מתאים לשוויונות שמעל?',
  'q.whyConcl': 'המשולשים חופפים. מה הנימוק לשוויון הזה?',
  'coach.start': 'נבנה יחד הוכחה שלמה, שורה אחרי שורה. כל שורה היא טענה, ולידה נימוק: מאיפה יודעים אותה. בשורה אחת תבחרו בעצמכם.',
  'coach.given': 'השוויון הזה כתוב בנתון, אז מעתיקים אותו לטענה כמו שהוא. הנימוק: נתון.',
  'coach.reason': 'הנימוק: {{reason}}.',
  'btn.gotIt': 'הבנתי, לשורה הבאה',
  'btn.doneRead': 'סיימנו',
  'sub.sas': 'צלע, זווית, צלע', 'sub.asa': 'זווית, צלע, זווית', 'sub.sss': 'שלוש צלעות',
  'ui.endCleanRead': 'סיימנו. עבודה נקייה.',
  'ui.endHelpedRead': 'סיימנו. היה צעד שמילאנו יחד, ולכן זה לא נספר כנקי. הרמה לא יורדת.',
  'ui.endSlipsRead': 'סיימנו. בכמה צעדים היה צריך רמז או ניסיון נוסף, ולכן זה לא נספר כנקי. הרמה לא יורדת.',

  /* ── one line per type on its landing ── */
  'about.read-given': 'מהמשפט שבנתון אל השוויון שהוא נותן, עם הנימוק הנכון.',
  'about.congruent-parts': 'שני משולשים חופפים: מוצאים אילו צלעות ואילו זוויות שוות.',
  'about.prove-congruence': 'משלושה שוויונות מוכיחים ששני משולשים חופפים.',
  'about.then-conclusion': 'קודם מוכיחים חפיפה, ואחר כך שוויון שנובע ממנה.',
};

/** Open maths points for Sulaiman (printed on the review sheet, above the new texts). */
export const OPEN_POINTS = [
  'משפחה T, כשנתון AB = AC: זוויות הבסיס שוות, וחוצה הזווית מהקודקוד הוא גם תיכון וגם גובה. זה נכון, אבל בשלב 1 אין לזה נימוק ברשימה. כרגע תלמיד שכותב את זה מקבל הערה ניטרלית (st.isoLater), בלי טעות ובלי השפעה על הרמה. להחליט: להשאיר כך, להוסיף את משפטי המשולש שווה השוקיים, או לתת את משפחה T רק לפני הפרק הזה.',
];

/** Keys whose text is not drafted in the spec (written by the builder; for Sulaiman's review sheet). */
export const NEW_DRAFTS = [
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
};
const roleWord = (role, i) => { const w = ROLE_WORD[role]; if (!w) throw new Error(`proofs texts: no role "${role}"`); return w[i]; };
export const LABELS = {
  stmt: (role) => `טענה · ${roleWord(role, 0)}`,
  reason: (role) => `נימוק · ${roleWord(role, 1)}`,
  matching: 'התאמת קודקודים',
};
