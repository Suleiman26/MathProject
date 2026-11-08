/* Duels: what the question engine can ask, for the UI.
   The engine itself lives with the edge function (supabase/functions/_shared/duel,
   plain ESM that runs in Deno, Node and the browser); this file re-exports the
   two things the screens need, so the UI never imports across the repo itself.

   subjectsFor(myGrade, friendGrade) → [{ key, label, sub, empty }]
     The four worlds (src/home/worlds.js keys) for a duel between two students:
     the pool is built for the LOWER grade (missing grade → 9), and a world with
     no generator for that grade is `empty` (the sheet hides its tile).
   randomEmpty(myGrade, friendGrade) → true when even "הפתעה!" has nothing. */
import { poolFor } from "../../supabase/functions/_shared/duel/build.js";
import { GENERATORS } from "../../supabase/functions/_shared/duel/registry.js";

export { poolFor, GENERATORS };

export const SUBJECTS = [
  { key: "num", label: "מספרים", sub: "מכוונים, חזקות, אחוזים" },
  { key: "alg", label: "אלגברה", sub: "משוואות, אי-שוויונות" },
  { key: "fn", label: "פונקציות", sub: "קווית, ריבועית" },
  { key: "geo", label: "גיאומטריה", sub: "משולשים, מעגל, גופים" },
];
export const SUBJECT_LABEL = { random: "הפתעה", ...Object.fromEntries(SUBJECTS.map((s) => [s.key, s.label])) };

export function duelGrade(myGrade, friendGrade) {
  const g = (x) => { const n = Number(x); return n >= 7 && n <= 9 ? n : 9; };
  return Math.min(g(myGrade), g(friendGrade));
}

export function subjectsFor(myGrade, friendGrade) {
  const grade = duelGrade(myGrade, friendGrade);
  return SUBJECTS.map((s) => ({ ...s, empty: poolFor({ grade, subject: s.key }).length === 0 }));
}

export function randomEmpty(myGrade, friendGrade) {
  return poolFor({ grade: duelGrade(myGrade, friendGrade), subject: "random" }).length === 0;
}
