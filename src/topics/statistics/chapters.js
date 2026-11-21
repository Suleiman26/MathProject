/* The topic "סטטיסטיקה והסתברות" (fixes board #84, Sulaiman 2026-11-21): the statistics and
   probability chapters of the "חדש" module, in the order suggested there. Their data and maths
   live in src/topics/new/chapters/data/ (tested by src/topics/new/new.test.mjs). */
import frequency from '../new/chapters/data/frequency.js';
import central from '../new/chapters/data/central.js';
import probability from '../new/chapters/data/probability.js';
import probabilityTwoStage from '../new/chapters/data/probability-two-stage.js';

export default [frequency, central, probability, probabilityTwoStage];
