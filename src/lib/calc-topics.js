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
  "equations-advanced": false,
  "inequalities": false,
};

const norm = (t) => (t || "").replace(/\s+/g, " ").trim();

/** Does this topic (in this chapter, if it has chapters) get the calculator? */
export function calcAllowed(slug, chapter) {
  const rule = CALC_TOPICS[slug];
  if (!rule) return false;
  if (rule === true) return true;
  const ch = norm(chapter);
  if (rule.only) return rule.only.map(norm).includes(ch);
  if (rule.except) return !rule.except.map(norm).includes(ch);
  return true;
}
