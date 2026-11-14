/* Which topic pages show the side calculator (fixes board #55, Sulaiman:
   "wherever a numeric calculation is needed, add a calculator on the side").

   THE LIST TO EDIT. One line per topic:
     true                      → the calculator button shows in every chapter
     { except: ["3. המרות"] }  → everywhere except these chapters
     { only: ["4. שטח"] }      → only in these chapters
   Chapter names = the chapter buttons' text, exactly as in src/home/chapters.js.
   A topic that is not listed (or is `false`) has no calculator: there the
   arithmetic itself is what the student practises. */
export const CALC_TOPICS = {
  // geometry and measuring: the thinking is the skill, the arithmetic is only a tool
  "pythagoras": true,
  "circle": true,
  "solids3d": true,
  "quadrilaterals": true,
  "triangles": true,
  "similar-triangles": true,
  "angles-parallel": true,
  // ratio and percent — but not "conversions": 3 ÷ 8 on a calculator IS the answer there
  "ratio-percent": { except: ["3. המרות"] },
  // functions and the quadratic formula: substituting numbers, the discriminant, roots
  "quadratic-solver": true,
  "parabola-practice": true,
  "intersection": true,
  "linear-function": true,

  // no calculator: the exercise is "compute this" / the algebra steps themselves
  "directed-numbers": false,
  "powers-roots": false,
  "equation-solver": false,
  "equations-advanced": false, // (its quadratic chapters get the calculator through EQN_TOPICS below)
  "inequalities": false,
};

/* Where the calculator also has the scientific "equation mode" (board #55, reopened 2026-11-14, Sulaiman:
   "where a quadratic equation has to be solved, add a scientific calculator: MODE 5 3, then a, b, c").
   Same kind of rule as above. A chapter listed here always gets the calculator button, even when
   CALC_TOPICS says `false` for its topic (equations-advanced: only its quadratic chapters). */
export const EQN_TOPICS = {
  "quadratic-solver": true,
  "parabola-practice": { only: ["7. שורשים", "9. חיוביות/שליליות", "10. חקירה מלאה"] }, // where the roots are needed
  "intersection": { only: ["2. ישר–פרבולה"] },
  "equations-advanced": { only: ["2 — ריבועית עם מכנה", "4 — הכל יחד"] },
};

const norm = (t) => (t || "").replace(/\s+/g, " ").trim();

function allowed(rule, chapter) {
  if (!rule) return false;
  if (rule === true) return true;
  const ch = norm(chapter);
  if (rule.only) return rule.only.map(norm).includes(ch);
  if (rule.except) return !rule.except.map(norm).includes(ch);
  return true;
}

/** Does this chapter's calculator have the equation mode (MODE 5 3: aX² + bX + c = 0)? */
export function eqnAllowed(slug, chapter) {
  return allowed(EQN_TOPICS[slug], chapter);
}

/** Does this topic (in this chapter, if it has chapters) get the calculator? */
export function calcAllowed(slug, chapter) {
  return allowed(CALC_TOPICS[slug], chapter) || eqnAllowed(slug, chapter);
}
