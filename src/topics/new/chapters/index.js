/* The chapters of the "חדש" module (board #84), in the order of the chapter buttons.
   ALL = every chapter built here (ORDER lists ids; a chapter that is not listed goes to the end).
   The default export = the ones still waiting for a place: since 2026-11-21 the statistics,
   probability and algebra chapters live in real topics (../placed.js says where). */
import algebra from './algebra/index.js';
import equations from './equations/index.js';
import data from './data/index.js';
import geometry from './geometry/index.js';
import { PLACED_IDS } from '../placed.js';

export const ORDER = [
  // grade 7
  'like-terms', 'distributive', 'word-problems', 'transformations', 'prism', 'frequency', 'probability',
  // grade 8
  'scale', 'functions-intro', 'systems', 'central', 'exterior-angle', 'triangle-sides',
  // grade 9
  'short-mult', 'factoring', 'alg-fractions', 'parabola-shifts', 'quad-inequality', 'two-parabolas', 'right-triangle-special', 'area-ratio', 'probability-two-stage',
];

const all = [...algebra, ...equations, ...data, ...geometry];
const at = (c) => { const i = ORDER.indexOf(c.id); return i < 0 ? ORDER.length : i; };
export const ALL = all.map((c, i) => [c, i]).sort((a, b) => at(a[0]) - at(b[0]) || a[1] - b[1]).map(([c]) => c);
const CHAPTERS = ALL.filter((c) => !PLACED_IDS.has(c.id));
export default CHAPTERS;
