// node tools/duel-shapes.mjs [id regex] — one example of every prompt shape per duel generator (choice + typed)
// For each generator: one example of every distinct prompt SHAPE (numbers replaced by #), choice and typed.
import { GENERATORS } from '../supabase/functions/_shared/duel/registry.js';
import { mulberry32 } from '../supabase/functions/_shared/duel/rng.js';
const only = process.argv[2] ? new RegExp(process.argv[2]) : null;
for (const g of GENERATORS) {
  if (only && !only.test(g.id)) continue;
  const shapes = new Map();
  for (const want of ['choice', 'number']) for (let s = 1; s <= 400; s++) {
    const q = g.make(mulberry32(s * 104729 + (want === 'number' ? 3 : 0)), want);
    const key = q.kind + '|' + q.prompt.replace(/[−-]?\d+(\.\d+)?/g, '#').replace(/[א-ת]{2,}(?= (כדורים|פירות|תלמידים))/g, 'W');
    if (!shapes.has(key)) shapes.set(key, q);
  }
  console.log(`\n## ${g.id} (${shapes.size} shapes)`);
  for (const q of shapes.values()) console.log((q.kind === 'choice' ? 'C ' : 'T ') + q.prompt + (q.choices ? '  ⟶ [' + q.choices.join(' ‖ ') + '] ✓' + q.answer : '  ⟶ ' + q.answer + (q.tol ? ' ±' + q.tol : '')) + (q.display && q.display.unit ? '  unit=' + q.display.unit : ''));
}
