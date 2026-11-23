/* The proofs section ("הוכחות"): the reasons. Pure: no React, no window.
   short = the chip (unchanged since phase 1; chips and the Level-3 two-step pick depend on it).
   full  = the complete sentence (spec 2026-11-23 §6.1): the Ministry's wording word for word for the congruence
           theorems and vertical angles; today's classroom wording as a whole sentence for the rest (drafts, on the
           review list as `reason.<id>` in NEW_DRAFTS until Sulaiman approves them). Shown in the finished row's
           detail, the why-line and the notebook page.
   kind  = 'theorem' | 'definition' | 'rule' | 'given' (§6.1).
   Similarity (§7.3): `alternate` is a real reason where it is true (it stays a tempting wrong chip on congruence
   family X, where it is false). The two parallel-line chips always say "בין מקבילים": a bare "זוויות מתאימות"
   would clash with "זוויות מתאימות במשולשים חופפים". */

const R = (id, short, full, kind, group) => ({ id, short, full, kind, group });
/** The Ministry's definition of similar triangles: the full sentence of both "follows from the similarity" reasons. */
const SIM_DEF = 'משולשים דומים הם משולשים שבהם לכל זווית במשולש אחד יש זווית ששווה לה במשולש האחר, וקיים יחס שווה בין שלושת זוגות הצלעות המתאימות (צלעות מתאימות נמצאות מול זוויות שוות).';

export const REASONS = {
  given: R('given', 'נתון', 'נתון', 'given', 'written'),
  'common-side': R('common-side', 'צלע משותפת', 'צלע משותפת לשני המשולשים.', 'rule', 'seen'),
  vertical: R('vertical', 'זוויות קודקודיות', 'זוויות קדקודיות שוות זו לזו.', 'theorem', 'seen'),
  bisector: R('bisector', 'הגדרת חוצה זווית', 'חוצה זווית מחלק את הזווית לשתי זוויות שוות.', 'definition', 'definition'),
  median: R('median', 'הגדרת תיכון', 'תיכון מחבר קודקוד עם אמצע הצלע שמולו.', 'definition', 'definition'),
  midpoint: R('midpoint', 'אמצע קטע', 'אמצע קטע מחלק אותו לשני קטעים שווים.', 'definition', 'definition'),
  altitude: R('altitude', 'הגדרת גובה', 'גובה מאונך לצלע.', 'definition', 'definition'),
  sas: R('sas', 'צ.ז.צ', 'אם שתי צלעות במשולש אחד שוות לשתי צלעות במשולש אחר, וגם הזוויות הכלואות בין הצלעות שוות זו לזו, אז המשולשים חופפים (צלע-זווית-צלע).', 'theorem', 'theorem'),
  asa: R('asa', 'ז.צ.ז', 'אם שתי זוויות במשולש אחד שוות לשתי זוויות במשולש אחר, וגם הצלעות הנמצאות בין הזוויות שוות זו לזו, אז המשולשים חופפים (זווית-צלע-זווית).', 'theorem', 'theorem'),
  sss: R('sss', 'צ.צ.צ', 'אם שלוש צלעות במשולש אחד שוות לשלוש צלעות במשולש אחר אז שני המשולשים חופפים (צלע-צלע-צלע).', 'theorem', 'theorem'),
  'cp-sides': R('cp-sides', 'צלעות מתאימות במשולשים חופפים', 'צלעות מתאימות במשולשים חופפים שוות.', 'rule', 'follows'),
  'cp-angles': R('cp-angles', 'זוויות מתאימות במשולשים חופפים', 'זוויות מתאימות במשולשים חופפים שוות.', 'rule', 'follows'),
  'common-angle': R('common-angle', 'זווית משותפת', 'זווית משותפת לשני המשולשים.', 'rule', 'seen'),
  // similarity (spec 2026-11-23 §7.3)
  aa: R('aa', 'ז.ז', 'אם לשני משולשים זוויות שוות, אז הם דומים.', 'theorem', 'theorem'),
  corresponding: R('corresponding', 'מתאימות בין מקבילים', 'זוויות מתאימות בין ישרים מקבילים שוות זו לזו.', 'theorem', 'parallel'),
  alternate: R('alternate', 'מתחלפות בין מקבילים', 'זוויות מתחלפות בין ישרים מקבילים שוות זו לזו.', 'theorem', 'parallel'),   // a wrong chip on congruence family X
  'right-angles': R('right-angles', 'שתי זוויות ישרות', 'שתי זוויות ישרות שוות זו לזו.', 'rule', 'written'),                 // wording unconfirmed
  'sim-angles': R('sim-angles', 'משולשים דומים: זוויות שוות', SIM_DEF, 'definition', 'follows'),   // the twin of cp-angles
  'sim-ratio': R('sim-ratio', 'משולשים דומים: יחס הצלעות', SIM_DEF, 'definition', 'follows'),
  solve: R('solve', 'פתרון הפרופורציה', 'מציבים את האורכים הידועים בפרופורציה ופותרים.', 'rule', 'calc'),
};

/** A theorem or a definition (the "המשפטים" list); rules and the given are not. */
export function isLaw(id) {
  const r = REASONS[id];
  return !!r && (r.kind === 'theorem' || r.kind === 'definition');
}

/** The reason's wording to put inside a sentence that ends with its own period ("הנימוק: {{reason}}."):
    the full sentence (or the chip when there is none) without its final period. */
export function reasonInline(id) {
  const r = REASONS[id];
  return r ? (r.full || r.short).replace(/\.$/, '') : '';
}

/** Level-3 two-step pick ("מאיפה יודעים?") of congruence, in this order. */
export const GROUPS = [
  { id: 'written', he: 'כתוב בשאלה', reasons: ['given'] },
  { id: 'definition', he: 'הגדרה', reasons: ['bisector', 'median', 'midpoint', 'altitude'] },
  { id: 'seen', he: 'רואים בציור', reasons: ['common-side', 'common-angle', 'vertical'] },
  { id: 'theorem', he: 'משפט חפיפה', reasons: ['sas', 'asa', 'sss'] },
  { id: 'follows', he: 'נובע מהחפיפה', reasons: ['cp-sides', 'cp-angles'] },
];

/** The similarity two-step pick (spec 2026-11-23 §7.3): written · seen · parallel lines · the theorem · follows · calculation. */
export const SIM_GROUPS = [
  { id: 'written', he: 'כתוב בשאלה', reasons: ['given', 'right-angles'] },
  { id: 'seen', he: 'רואים בציור', reasons: ['common-angle', 'vertical'] },
  { id: 'parallel', he: 'ישרים מקבילים', reasons: ['corresponding', 'alternate'] },
  { id: 'theorem', he: 'משפט דמיון', reasons: ['aa'] },
  { id: 'follows', he: 'נובע מהדמיון', reasons: ['sim-angles', 'sim-ratio'] },
  { id: 'calc', he: 'חישוב', reasons: ['solve'] },
];
/** The two-step pick of a subject (an unknown subject gets congruence's). */
export const groupsFor = (subjectId) => (subjectId === 'similarity' ? SIM_GROUPS : GROUPS);

export const THEOREMS = ['sas', 'asa', 'sss'];
export const CP = ['cp-sides', 'cp-angles'];
export const DEFS = ['bisector', 'median', 'midpoint', 'altitude'];
export const SEEN = ['common-side', 'common-angle', 'vertical'];
/** Similarity: the angles between parallel lines, and what follows from a similarity. */
export const PARALLEL = ['corresponding', 'alternate'];
export const SIMF = ['sim-angles', 'sim-ratio'];

/** The two-step group of a reason in a subject, or null (alternate has none in congruence). */
export function groupOf(id, subjectId = 'congruence') {
  const g = groupsFor(subjectId).find((x) => x.reasons.includes(id));
  return g ? g.id : null;
}
