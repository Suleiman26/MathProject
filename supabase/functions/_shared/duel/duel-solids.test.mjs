// Duel question engine — Task-2b generators: geometry (solids, circle).
// Run with the others: node --test supabase/functions/_shared/duel/*.test.mjs
// (the files run in parallel). Same contract as duel.test.mjs: 1,000 runs per
// generator per answer kind, the right answer recomputed in expect-2b.mjs from
// the numbers printed in the prompt, and every guesser ≤ 40 % per generator
// and per variant on 3 seeds.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GENERATORS } from './registry.js';
import { contractTests, guardTests } from './testkit.mjs';
import { EXPECT_2B, TOPICS_2B } from './expect-2b.mjs';

const MINE = GENERATORS.filter((g) => TOPICS_2B.solids.includes(g.topic));

test('solids: every generator of these topics has an independent check', () => {
  assert.deepEqual([...new Set(MINE.map((g) => g.topic))].sort(), [...TOPICS_2B.solids].sort());
  for (const g of MINE) assert.ok(EXPECT_2B[g.id], 'no independent check for ' + g.id);
});

contractTests(MINE, EXPECT_2B);
guardTests(MINE);
