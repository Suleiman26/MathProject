// Building one duel: 15 questions from a seed, a grade and a subject.
import { mulberry32, shuffle } from './rng.js';
import { GENERATORS } from './registry.js';

export const DUEL_LENGTH = 15;
// every 4th question is typed (keypad) when the generator allows it
export const NUMBER_SLOTS = [3, 7, 11];

/** Generators for a duel: topics up to the grade; subject = world key, or 'random' = all. */
export function poolFor({ grade, subject }) {
  return GENERATORS.filter((g) => g.grade <= grade && (subject === 'random' || g.world === subject));
}

/**
 * buildDuel(seed, {grade, subject}) → Question[15]
 * Generators take turns (the least recently used goes next, starting from a
 * seeded shuffle), so a random duel mixes topics. No prompt repeats. Slots
 * 3, 7 and 11 are 'number' questions when the pool has a generator that can
 * make one; all others are 'choice'. Throws when the pool is empty.
 */
export function buildDuel(seed, { grade, subject }) {
  const pool = poolFor({ grade, subject });
  if (!pool.length) throw new Error('empty_pool');
  const r = mulberry32(seed);
  const queue = shuffle(r, pool);
  const anyNumber = pool.some((g) => g.kinds.includes('number'));
  const seen = new Set();
  const out = [];
  for (let idx = 0; idx < DUEL_LENGTH; idx++) {
    const want = anyNumber && NUMBER_SLOTS.includes(idx) ? 'number' : 'choice';
    // try generators in queue order, the ones that can answer `want` first
    const order = [
      ...queue.filter((g) => g.kinds.includes(want)),
      ...queue.filter((g) => !g.kinds.includes(want)),
    ];
    let q = null;
    for (const g of order) {
      for (let tries = 0; tries < 40 && !q; tries++) {
        const c = g.make(r, want);
        if (!seen.has(c.prompt)) q = c;
      }
      if (q) {
        queue.splice(queue.indexOf(g), 1);
        queue.push(g);
        break;
      }
    }
    if (!q) throw new Error('no_unique_question');
    seen.add(q.prompt);
    out.push(q);
  }
  return out;
}
