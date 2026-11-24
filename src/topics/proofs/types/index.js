/* The proof types, in order (spec §6.1; similarity 2026-11-23 §5.2): congruence 1–4 + its exam 5, similarity 6–9 + its exam 10
   (keep TYPES sorted by n; the exams: ./exam.js, spec §8). A type =
   { id, n, name, button: `${n}. ${name}`, warm:[W-ids], templates:[{ id, family, variant, theorem }],
     make(R, level, variant, avoid, ctx) → problem, remake(problem | snapshot meta) → problem,
     subject: 'congruence'|'similarity', label (what the UI shows), shape: 'given'|'parts'|'side'|'prove'|'then'|'exam'
     (how present() lays it out; core.shapeOf), live (false = hidden on the live site, subjects.canShow) }.
   The button and tab texts are database keys (the tracker stores "<button> › <tab>"): keep them stable.
   TYPES is one flat list of every subject in key order (tracker, storage); the UI groups it by subjects.js. */
import { T } from '../texts.js';
import readGiven from './read-given.js';
import congruentParts from './congruent-parts.js';
import proveCongruence from './prove-congruence.js';
import thenConclusion from './then-conclusion.js';
import simParts from './sim-parts.js';
import simSide from './sim-side.js';
import proveSim from './prove-sim.js';
import simCalc from './sim-calc.js';
import { congExam, simExam } from './exam.js';

export const TYPES = [readGiven, congruentParts, proveCongruence, thenConclusion, congExam, simParts, simSide, proveSim, simCalc, simExam];
export const TABS = [T['tab.warm'], T['tab.1'], T['tab.2'], T['tab.3']];
/** The sub-tab of a level: 0 = warm-up; 4 (type finished) stays on רמה 3. */
export const tabOf = (level) => TABS[Math.max(0, Math.min(3, level))];
/** What the student sees on the help-stage tabs (חימום · מודרך · ביחד · לבד); TABS stay the stored keys. */
export const STAGES = [T['stage.0'], T['stage.1'], T['stage.2'], T['stage.3']];
/** The visible help stage of a level: 0 = warm-up; 4 (level finished) stays on the last stage. */
export const stageOf = (level) => STAGES[Math.max(0, Math.min(3, level))];
/** The help-stage tabs a level shows (indices into TABS/STAGES): all four; no חימום without warm-up kinds; the exam
    only לבד (3), plus חימום (0) while its rescue warm-up runs, so the tracker keys that warm-up "<exam key> › חימום"
    like every other level's. */
export const tabsOf = (type, warming = false) => {
  const warm = (type.warm || []).length > 0;
  return [0, 1, 2, 3].filter((i) => (type.shape === 'exam' ? i === 3 || (i === 0 && warming && warm) : i !== 0 || warm));
};
export const typeById = (id) => TYPES.find((t) => t.id === id) || null;
