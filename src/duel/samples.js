/* Duels: what the question engine can ask, for the UI.
   The engine itself lives with the edge function (supabase/functions/_shared/duel,
   plain ESM that runs in Deno, Node and the browser); this file re-exports the
   two things the screens need, so the UI never imports across the repo itself.

   subjectsFor(myGrade, friendGrade) → [{ key, label, sub, empty }]
     The four worlds (src/home/worlds.js keys) for a duel between two students:
     the pool is built for the LOWER grade (missing grade → 9), and a world with
     no generator for that grade is `empty` (the sheet hides its tile).
   randomEmpty(myGrade, friendGrade) → true when even "הפתעה!" has nothing.
   This file pulls in the WHOLE engine: import it lazily, never from a page every
   signed-in student loads (the names alone are in ./subjects.js). */
import { poolFor } from "../../supabase/functions/_shared/duel/build.js";
import { GENERATORS } from "../../supabase/functions/_shared/duel/registry.js";
import { SUBJECTS, SUBJECT_LABEL, duelGrade } from "./subjects.js";

export { poolFor, GENERATORS, SUBJECTS, SUBJECT_LABEL, duelGrade };

export function subjectsFor(myGrade, friendGrade) {
  const grade = duelGrade(myGrade, friendGrade);
  return SUBJECTS.map((s) => ({ ...s, empty: poolFor({ grade, subject: s.key }).length === 0 }));
}

export function randomEmpty(myGrade, friendGrade) {
  return poolFor({ grade: duelGrade(myGrade, friendGrade), subject: "random" }).length === 0;
}
