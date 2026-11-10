// Independent checks for the Task-2b generators (geometry, functions, more
// algebra). Used by duel-geo / duel-solids / duel-fnalg .test.mjs (and the
// registry test in duel.test.mjs). Not a test file itself.
// Each EXPECT_2B[id](meta, q) recomputes the right answer from the NUMBERS
// PRINTED IN THE PROMPT (read back with the test's own parsers) — or from
// q.meta where the prompt has no name for a number — with the formula
// written here, not copied from the port. It also asserts the audit's
// filters: every angle of a triangle / quadrilateral is > 0° and < 180°,
// angles add up (180° / 360°), trapezoid A + B = 180°, kite R = L.
// Split 2026-11-10 into one file per group (so topic work never edits a shared file):
// expect-geo.mjs, expect-solids.mjs, expect-fnalg.mjs; shared readers in expect-helpers.mjs.
import { EXPECT_GEO } from './expect-geo.mjs';
import { EXPECT_SOLIDS } from './expect-solids.mjs';
import { EXPECT_FNALG } from './expect-fnalg.mjs';

// which test file checks which topics (the files run in parallel)
export const TOPICS_2B = {
  geo: ['quadrilaterals', 'triangles'], // duel-geo.test.mjs
  solids: ['solids3d', 'circle'], // duel-solids.test.mjs
  fnalg: ['linear-function', 'intersection', 'equations-advanced', 'quadratic-solver'], // duel-fnalg.test.mjs
};

export const EXPECT_2B = { ...EXPECT_GEO, ...EXPECT_SOLIDS, ...EXPECT_FNALG };
