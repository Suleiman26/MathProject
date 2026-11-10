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
//   • kinds: which answer kinds it can make. TYPED (['number']) = typed only
//     (pr.powers, pr.mixed); with BOTH, some variants are still typed only (see the top
//     of topics/powers-roots.js) and come back as kind 'number' on a choice slot.
//   • make(r, want?) → Question. want = 'number' asks for a typed answer (only
//     when kinds has it); anything else gives 4 choices where the generator
//     (and the variant it drew) can make them, else a typed question.
import * as dn from './topics/directed-numbers.js';
import * as eq from './topics/equation-solver.js';
import * as pr from './topics/powers-roots.js';
import * as rp from './topics/ratio-percent.js';
import * as qd from './topics/quadrilaterals.js';
import * as so from './topics/solids3d.js';
import * as ci from './topics/circle.js';
import * as tr from './topics/triangles.js';
import * as lf from './topics/linear-function.js';
import * as ix from './topics/intersection.js';
import * as ea from './topics/equations-advanced.js';
import * as qs from './topics/quadratic-solver.js';

const BOTH = ['choice', 'number'];
const TYPED = ['number'];

const TOPICS = {
  'directed-numbers': { grade: 7, world: 'num' },
  'equation-solver': { grade: 7, world: 'alg' },
  'powers-roots': { grade: 8, world: 'num' },
  'ratio-percent': { grade: 7, world: 'num' },
  'quadrilaterals': { grade: 8, world: 'geo' },
  'solids3d': { grade: 7, world: 'geo' },
  'circle': { grade: 9, world: 'geo' },
  'triangles': { grade: 7, world: 'geo' },
  'linear-function': { grade: 8, world: 'fn' },
  'intersection': { grade: 9, world: 'fn' },
  'equations-advanced': { grade: 8, world: 'alg' },
  'quadratic-solver': { grade: 9, world: 'alg' },
};

const LIST = [
  ['dn.add', 'directed-numbers', '1. חיבור', BOTH, dn.add],
  ['dn.sub', 'directed-numbers', '2. חיסור', BOTH, dn.sub],
  ['dn.mul', 'directed-numbers', '3. כפל', BOTH, dn.mul],
  ['dn.div', 'directed-numbers', '4. חילוק', BOTH, dn.div],
  ['dn.combo', 'directed-numbers', '6. תרגול מקיף', BOTH, dn.combo],
  ['eq.linear', 'equation-solver', '', BOTH, eq.linear],
  ['pr.powers', 'powers-roots', '1. הבנת חזקות', TYPED, pr.powers],
  ['pr.laws', 'powers-roots', '2. חוקי חזקות', BOTH, pr.laws],
  ['pr.param', 'powers-roots', '3. פרמטרי', BOTH, pr.param],
  ['pr.roots', 'powers-roots', '4. שורשים', BOTH, pr.roots],
  ['pr.mixed', 'powers-roots', '5. הכל יחד', TYPED, pr.mixed],
  ['rp.ratio', 'ratio-percent', '1. יחס', BOTH, rp.ratio],
  ['rp.proportion', 'ratio-percent', '2. פרופורציה', BOTH, rp.proportion],
  ['rp.convert', 'ratio-percent', '3. המרות', BOTH, rp.convert],
  ['rp.pct', 'ratio-percent', '4. חישובי %', BOTH, rp.pct],
  ['rp.change', 'ratio-percent', '5. עלייה/ירידה', BOTH, rp.change],
  // Task 2b: the rest of the zero-drawing topics
  ['qd.square', 'quadrilaterals', '1. ריבוע', BOTH, qd.square],
  ['qd.rect', 'quadrilaterals', '2. מלבן', BOTH, qd.rectangle],
  ['qd.rhombus', 'quadrilaterals', '3. מעוין', BOTH, qd.rhombus],
  ['qd.para', 'quadrilaterals', '4. מקבילית', BOTH, qd.parallelogram],
  ['qd.trap', 'quadrilaterals', '5. טרפז', BOTH, qd.trapezoid],
  ['qd.kite', 'quadrilaterals', '6. דלתון', BOTH, qd.kite],
  ['so.cube', 'solids3d', '1. קובייה', BOTH, so.cube],
  ['so.box', 'solids3d', '2. תיבה', BOTH, so.box],
  ['so.cyl', 'solids3d', '3. גליל', BOTH, so.cylinder],
  ['so.cone', 'solids3d', '4. קונוס', BOTH, so.cone],
  ['so.pyr', 'solids3d', '5. פירמידה', BOTH, so.pyramid],
  ['so.sphere', 'solids3d', '6. כדור', BOTH, so.sphere],
  ['ci.rad', 'circle', '2. רדיאנים', BOTH, ci.radians],
  ['ci.circ', 'circle', '3. היקף', BOTH, ci.circumference],
  ['ci.area', 'circle', '4. שטח', BOTH, ci.area],
  ['ci.arc', 'circle', '5. קשת', BOTH, ci.arc],
  ['ci.mix', 'circle', '6. הכל יחד', BOTH, ci.combined],
  ['tr.angles', 'triangles', '1. זוויות', BOTH, tr.angles],
  ['tr.special', 'triangles', '3. משולשים מיוחדים', BOTH, tr.special],
  ['lf.slope', 'linear-function', '4. חישוב שיפוע', BOTH, lf.slope],
  ['lf.read', 'linear-function', '6. זיהוי שיפוע וחיתוך', BOTH, lf.readLine],
  ['lf.rearr', 'linear-function', '7. סידור וזיהוי', BOTH, lf.rearrange],
  ['lf.mpoint', 'linear-function', '8. ישר מ-m ונקודה', BOTH, lf.slopePoint],
  ['lf.twopts', 'linear-function', '9. ישר מ-2 נקודות', BOTH, lf.twoPoints],
  ['ix.lines', 'intersection', '1. ישר–ישר', BOTH, ix.lineLine],
  ['ea.linfrac', 'equations-advanced', '1 — לינארית עם מכנה', BOTH, ea.linearFrac],
  ['ea.sm', 'equations-advanced', '3 — כפל מקוצר', BOTH, ea.shortMult],
  ['ea.combo', 'equations-advanced', '4 — הכל יחד', BOTH, ea.combined],
  ['qs.coef', 'quadratic-solver', 'שלב 2: מקדמים', BOTH, qs.coefficients],
];

// The keypad of a typed question: digits, "−" and "⌫" always; "/" (fraction) and "." (decimal)
// only for generators whose answers can need them. Fixed PER GENERATOR (never per answer), so
// the keys never hint whether this answer is whole. duel-keys.test.mjs checks every typed
// answer can be typed with these keys. Sent to the phone as display.keys (arena-core keypadFor).
const KEYS = {
  'pr.powers': ['/'], 'pr.laws': ['/'], 'pr.param': ['/'], 'pr.roots': ['/'], 'pr.mixed': ['/'],
  'rp.ratio': ['/', '.'], 'rp.proportion': ['/', '.'], 'rp.convert': ['/', '.'], 'rp.pct': ['/', '.'], 'rp.change': ['/', '.'],
  'ci.rad': ['/', '.'], 'ci.circ': ['.'],
  'lf.slope': ['/', '.'],
  'ea.linfrac': ['/'], 'ea.combo': ['/'],
};
export const keysFor = (id) => KEYS[id] || [];

export const GENERATORS = LIST.map(([id, topic, chapter, kinds, fn]) => ({
  id,
  topic,
  chapter,
  grade: TOPICS[topic].grade,
  world: TOPICS[topic].world,
  kinds,
  make: (r, want) => {
    const q = fn(r, kinds.includes(want) ? want : kinds[0]);
    const out = { gen: id, topic, chapter, ...q };
    if (out.kind === 'number') out.display = { ...(out.display || {}), keys: keysFor(id) };
    return out;
  },
}));
