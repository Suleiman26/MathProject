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

// move item to the end of arr (least recently used goes first next time)
const toEnd = (arr, item) => { arr.splice(arr.indexOf(item), 1); arr.push(item); };

/**
 * buildDuel(seed, {grade, subject}) → Question[15]
 * Round-robin over TOPICS first (seeded order), then over the generators of
 * that topic, so a one-generator topic (equation-solver) gets its fair share.
 * No prompt repeats. Slots 3, 7 and 11 are 'number' questions when the pool
 * has a generator that can make one (topics/generators that can are tried
 * first there); all other slots are 'choice'. Throws 'empty_pool' when no
 * generator fits.
 */
export function buildDuel(seed, { grade, subject }) {
  const pool = poolFor({ grade, subject });
  if (!pool.length) throw new Error('empty_pool');
  const r = mulberry32(seed);
  const topics = shuffle(r, [...new Set(pool.map((g) => g.topic))]);
  const gens = Object.fromEntries(topics.map((t) => [t, shuffle(r, pool.filter((g) => g.topic === t))]));
  const anyNumber = pool.some((g) => g.kinds.includes('number'));
  const can = (g, want) => g.kinds.includes(want);
  const seen = new Set();
  const out = [];
  for (let idx = 0; idx < DUEL_LENGTH; idx++) {
    const want = anyNumber && NUMBER_SLOTS.includes(idx) ? 'number' : 'choice';
    const topicOrder = [
      ...topics.filter((t) => gens[t].some((g) => can(g, want))),
      ...topics.filter((t) => !gens[t].some((g) => can(g, want))),
    ];
    let q = null;
    for (const t of topicOrder) {
      const order = [...gens[t].filter((g) => can(g, want)), ...gens[t].filter((g) => !can(g, want))];
      for (const g of order) {
        for (let tries = 0; tries < 40 && !q; tries++) {
          const c = g.make(r, want);
          if (!seen.has(c.prompt)) q = c;
        }
        if (q) { toEnd(gens[t], g); break; }
      }
      if (q) { toEnd(topics, t); break; }
    }
    if (!q) throw new Error('no_unique_question');
    seen.add(q.prompt);
    out.push(q);
  }
  return out;
}
