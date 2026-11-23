/* The proofs section ("הוכחות"): the reasons. Pure: no React, no window.
   short = the chip (unchanged since phase 1; chips and the Level-3 two-step pick depend on it).
   full  = the complete sentence (spec 2026-11-23 §6.1): the Ministry's wording word for word for the congruence
           theorems and vertical angles; today's classroom wording as a whole sentence for the rest (drafts, on the
           review list as `reason.<id>` in NEW_DRAFTS until Sulaiman approves them). Shown in the finished row's
           detail, the why-line and the notebook page.
   kind  = 'theorem' | 'definition' | 'rule' | 'given' (§6.1).
   `alternate` is still a wrong-answer chip only (full: null) until similarity makes it a real reason. */

const R = (id, short, full, kind, group) => ({ id, short, full, kind, group });

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
  alternate: R('alternate', 'זוויות מתחלפות בין ישרים מקבילים', null, 'theorem', null),     // wrong chip, family X only
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

/** Level-3 two-step pick ("מאיפה יודעים?"), in this order. */
export const GROUPS = [
  { id: 'written', he: 'כתוב בשאלה', reasons: ['given'] },
  { id: 'definition', he: 'הגדרה', reasons: ['bisector', 'median', 'midpoint', 'altitude'] },
  { id: 'seen', he: 'רואים בציור', reasons: ['common-side', 'common-angle', 'vertical'] },
  { id: 'theorem', he: 'משפט חפיפה', reasons: ['sas', 'asa', 'sss'] },
  { id: 'follows', he: 'נובע מהחפיפה', reasons: ['cp-sides', 'cp-angles'] },
];

export const THEOREMS = ['sas', 'asa', 'sss'];
export const CP = ['cp-sides', 'cp-angles'];
export const DEFS = ['bisector', 'median', 'midpoint', 'altitude'];
export const SEEN = ['common-side', 'common-angle', 'vertical'];

/** The Level-3 group of a reason, or null (alternate has none). */
export function groupOf(id) {
  const g = GROUPS.find((x) => x.reasons.includes(id));
  return g ? g.id : null;
}
