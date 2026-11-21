/* The proofs section ("הוכחות"): the reasons of phase 1 (spec §6.3), worded character for
   character as the spec drafts them (drafts until Sulaiman approves them).
   Pure: no React, no window. short = the chip; full = the finished row's detail, the why-line and
   the notebook page. `common-angle` and `alternate` are wrong-answer chips only (full: null). */

const R = (id, short, full, group) => ({ id, short, full, group });

export const REASONS = {
  given: R('given', 'נתון', 'נתון', 'written'),
  'common-side': R('common-side', 'צלע משותפת', 'צלע משותפת', 'seen'),
  vertical: R('vertical', 'זוויות קודקודיות', 'זוויות קודקודיות שוות זו לזו', 'seen'),
  bisector: R('bisector', 'הגדרת חוצה זווית', 'חוצה זווית מחלק את הזווית לשתי זוויות שוות', 'definition'),
  median: R('median', 'הגדרת תיכון', 'תיכון מחבר קודקוד עם אמצע הצלע שמולו', 'definition'),
  midpoint: R('midpoint', 'אמצע קטע', 'אמצע קטע מחלק אותו לשני קטעים שווים', 'definition'),
  altitude: R('altitude', 'הגדרת גובה', 'גובה מאונך לצלע', 'definition'),
  sas: R('sas', 'צ.ז.צ', 'משפט חפיפה צ.ז.צ', 'theorem'),
  asa: R('asa', 'ז.צ.ז', 'משפט חפיפה ז.צ.ז', 'theorem'),
  sss: R('sss', 'צ.צ.צ', 'משפט חפיפה צ.צ.צ', 'theorem'),
  'cp-sides': R('cp-sides', 'צלעות מתאימות במשולשים חופפים', 'צלעות מתאימות במשולשים חופפים שוות', 'follows'),
  'cp-angles': R('cp-angles', 'זוויות מתאימות במשולשים חופפים', 'זוויות מתאימות במשולשים חופפים שוות', 'follows'),
  'common-angle': R('common-angle', 'זווית משותפת', null, 'seen'),
  alternate: R('alternate', 'זוויות מתחלפות בין ישרים מקבילים', null, null),     // wrong chip, family X only
};

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
