// Every typed duel answer can be typed on the keypad the phone shows (registry KEYS →
// display.keys → arena-core keypadFor), and a typed answer is never a long or repeating
// decimal nobody could type exactly (unless the question has a tolerance).
// node --test supabase/functions/_shared/duel/duel-keys.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GENERATORS, keysFor } from './registry.js';
import { mulberry32 } from './rng.js';
import { keypadFor } from '../../../../src/duel/arena-core.js';

const N = 400;

test('keys: every typed answer can be typed with the keys its question shows', () => {
  for (const g of GENERATORS) {
    for (let s = 1; s <= N; s++) {
      const q = g.make(mulberry32(s * 7919 + 1), 'number');
      if (q.kind !== 'number') continue;
      assert.deepEqual(q.display && q.display.keys, keysFor(g.id), `${g.id}: display.keys`);
      const k = keypadFor({ payload: q });
      const a = String(q.answer);
      if (a.includes('.')) assert.ok(k.decimal, `${g.id}: "${a}" needs "." — ${q.prompt}`);
      if (a.includes('/')) assert.ok(k.fraction, `${g.id}: "${a}" needs "/" — ${q.prompt}`);
      const dec = (a.split('.')[1] || '').length;
      if (!q.tol) assert.ok(dec <= 3, `${g.id}: "${a}" has too many decimals to type exactly — ${q.prompt}`);
    }
  }
});

test('keys: the keys are the same for every question of a generator (never a hint)', () => {
  for (const g of GENERATORS) {
    const seen = new Set();
    for (let s = 1; s <= 60; s++) {
      const q = g.make(mulberry32(s), 'number');
      if (q.kind === 'number') seen.add(JSON.stringify(q.display.keys));
    }
    assert.ok(seen.size <= 1, `${g.id}: keys differ between questions`);
  }
});
