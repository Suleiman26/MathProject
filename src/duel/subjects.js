/* Duels: the subject names — tiny on purpose (no question engine here), so the
   invite card, the hub and the duel page can name a subject without loading the
   engine. What the engine can actually ask (poolFor) lives in ./samples.js, which
   only the challenge sheet (lazily) and the admin samples load. */
export const SUBJECTS = [
  { key: "num", label: "מספרים", sub: "מכוונים, חזקות, אחוזים" },
  { key: "alg", label: "אלגברה", sub: "משוואות, אי-שוויונות" },
  { key: "fn", label: "פונקציות", sub: "קווית, ריבועית" },
  { key: "geo", label: "גיאומטריה", sub: "משולשים, מעגל, גופים" },
];
export const SUBJECT_LABEL = { random: "הפתעה", ...Object.fromEntries(SUBJECTS.map((s) => [s.key, s.label])) };

/** the grade a duel between two students is built for: the lower one (missing → 9) */
export function duelGrade(myGrade, friendGrade) {
  const g = (x) => { const n = Number(x); return n >= 7 && n <= 9 ? n : 9; };
  return Math.min(g(myGrade), g(friendGrade));
}
