// Duel question engine — the guessers' guard for the first four topics
// (directed numbers, equations, powers and roots, ratio and percent): every
// guesser ≤ 40 % per generator and per variant on 3 seeds (see testkit.mjs).
// Its own file only so that node --test runs it in parallel with duel.test.mjs.
// Run: node --test supabase/functions/_shared/duel/*.test.mjs
import { GENERATORS } from './registry.js';
import { guardTests } from './testkit.mjs';
import { TOPICS_2B } from './expect-2b.mjs';

const TASK_2B = Object.values(TOPICS_2B).flat();
guardTests(GENERATORS.filter((g) => !TASK_2B.includes(g.topic)));
