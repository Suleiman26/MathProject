/* The four proof types, in order (spec §6.1). Phase 1: all four types (keep TYPES sorted by n). A type =
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

export const TYPES = [readGiven, congruentParts, proveCongruence, thenConclusion];
export const TABS = [T['tab.warm'], T['tab.1'], T['tab.2'], T['tab.3']];
/** The sub-tab of a level: 0 = warm-up; 4 (type finished) stays on רמה 3. */
export const tabOf = (level) => TABS[Math.max(0, Math.min(3, level))];
/** What the student sees on the help-stage tabs (חימום · מודרך · ביחד · לבד); TABS stay the stored keys. */
export const STAGES = [T['stage.0'], T['stage.1'], T['stage.2'], T['stage.3']];
/** The visible help stage of a level: 0 = warm-up; 4 (level finished) stays on the last stage. */
export const stageOf = (level) => STAGES[Math.max(0, Math.min(3, level))];
export const typeById = (id) => TYPES.find((t) => t.id === id) || null;
