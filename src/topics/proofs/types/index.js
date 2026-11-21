/* The four proof types, in order (spec §6.1). Phase 1 so far: type 3 only; types 1, 2 and 4 are
   added by plan Tasks 16–18 (keep TYPES sorted by n). A type =
   { id, n, name, button: `${n}. ${name}`, warm:[W-ids], templates:[{ id, family, variant, theorem }],
     make(R, level, variant, avoid, ctx) → problem, remake(problem | snapshot meta) → problem }.
   The button and tab texts are database keys (the tracker stores "<button> › <tab>"): keep them stable. */
import { T } from '../texts.js';
import proveCongruence from './prove-congruence.js';

export const TYPES = [proveCongruence];
export const TABS = [T['tab.warm'], T['tab.1'], T['tab.2'], T['tab.3']];
/** The sub-tab of a level: 0 = warm-up; 4 (type finished) stays on רמה 3. */
export const tabOf = (level) => TABS[Math.max(0, Math.min(3, level))];
export const typeById = (id) => TYPES.find((t) => t.id === id) || null;
