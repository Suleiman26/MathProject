// All duel question generators, with the topic metadata they belong to.
//
// Question object (what a generator returns):
//   { gen, topic, chapter, kind: 'choice'|'number', prompt, choices?, answer, tol?, meta }
//   • prompt: Hebrew text, math inside $…$ (markup: \frac{a}{b}, x^{n}, \sqrt{n}, π, °;
//     negative numbers with the real minus sign "−").
//   • choice: choices = 4 pure-math strings (no $), answer = their index "0".."3".
//   • number: answer = canonical ASCII text ("-3", "0.375"); checked by answer.js
//     (and the SQL twin in Task 3) with tolerance tol ?? 0.
//   • meta: the raw numbers the question was built from. ONLY for tests and
//     admin samples — the server (duel-start) MUST strip `meta` (and `answer`)
//     before anything reaches a student's device.
//
// Generator entry: { id, topic, chapter, grade, world, kinds, make }
//   • topic/grade/world come from src/home/catalog.js (world = its `cat`,
//     grade = the LOWEST grade in its `g`), hard-coded here on 2026-11-08.
//   • chapter = the exact chapter name in src/home/chapters.js (used to link
//     "what to review" to /topics/<topic>?ch=<chapter>); "" for a topic with
//     no chapter buttons (equation-solver).
//   • kinds: which answer kinds it can make; every generator can make 'choice'.
//   • make(r, want?) → Question. want = 'number' asks for a typed answer (only
//     when kinds has it); anything else gives 4 choices.
import * as dn from './topics/directed-numbers.js';
import * as eq from './topics/equation-solver.js';
import * as pr from './topics/powers-roots.js';
import * as rp from './topics/ratio-percent.js';

const BOTH = ['choice', 'number'];

const TOPICS = {
  'directed-numbers': { grade: 7, world: 'num' },
  'equation-solver': { grade: 7, world: 'alg' },
  'powers-roots': { grade: 8, world: 'num' },
  'ratio-percent': { grade: 7, world: 'num' },
};

const LIST = [
  ['dn.add', 'directed-numbers', '1. חיבור', BOTH, dn.add],
  ['dn.sub', 'directed-numbers', '2. חיסור', BOTH, dn.sub],
  ['dn.mul', 'directed-numbers', '3. כפל', BOTH, dn.mul],
  ['dn.div', 'directed-numbers', '4. חילוק', BOTH, dn.div],
  ['dn.combo', 'directed-numbers', '6. תרגול מקיף', BOTH, dn.combo],
  ['eq.linear', 'equation-solver', '', BOTH, eq.linear],
  ['pr.powers', 'powers-roots', '1. הבנת חזקות', BOTH, pr.powers],
  ['pr.laws', 'powers-roots', '2. חוקי חזקות', BOTH, pr.laws],
  ['pr.param', 'powers-roots', '3. פרמטרי', BOTH, pr.param],
  ['pr.roots', 'powers-roots', '4. שורשים', BOTH, pr.roots],
  ['pr.mixed', 'powers-roots', '5. הכל יחד', BOTH, pr.mixed],
  ['rp.ratio', 'ratio-percent', '1. יחס', BOTH, rp.ratio],
  ['rp.proportion', 'ratio-percent', '2. פרופורציה', BOTH, rp.proportion],
  ['rp.convert', 'ratio-percent', '3. המרות', BOTH, rp.convert],
  ['rp.pct', 'ratio-percent', '4. חישובי %', BOTH, rp.pct],
  ['rp.change', 'ratio-percent', '5. עלייה/ירידה', BOTH, rp.change],
];

export const GENERATORS = LIST.map(([id, topic, chapter, kinds, fn]) => ({
  id,
  topic,
  chapter,
  grade: TOPICS[topic].grade,
  world: TOPICS[topic].world,
  kinds,
  make: (r, want) => {
    const q = fn(r, kinds.includes(want) ? want : 'choice');
    return { gen: id, topic, chapter, ...q };
  },
}));
