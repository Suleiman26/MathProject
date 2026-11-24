/* The exam level of each subject, "כמו במבחן" (spec 2026-11-23 §8): one drawing, sections א/ב/ג written like a
   test, no row-by-row help (present() lays every exam out with לבד mechanics, variant B).
   Congruence (`cong-exam`): mixed problems of families X, K, Z, T, the given sometimes in words (any word the
   variant has). The problem is the "חפיפה ואז מסקנה" one (same template, same seed: the same honest drawing and the
   same error messages); its sections: א the row(s) a given in words yields, ב the congruence, ג the conclusion
   (no words: א congruence, ב conclusion).
   Similarity (`sim-exam`): families P, B, H, N (the crossed ones too), with a length to find; א the similarity,
   ב the ratio, ג the number.
   A problem = the level's problem + { shape:'exam', sections:[{ letter, targets:[factId], goalKey, goalVars }],
   target: every section's targets }; the canon is ordered section by section (a later section uses earlier rows).
   make(R, level, variant, avoid, ctx) → problem; ctx.only pins a template. Pure: randomness only through R;
   remake() rebuilds a problem from its seed. */
import { seeded, makeR } from '../../new/core.js';
import { T } from '../texts.js';
import { DEFS } from '../reasons.js';
import { sectionOf } from '../core.js';
import { WORDS, pickTemplate } from './tiles.js';
import thenConclusion from './then-conclusion.js';
import { SIM_FAMS, templatesOf, pickSim, angleWrong, wrongOrder, propWrongs, numberWrongs, numberTraps } from './sim-tools.js';

const LETTERS = [T['exam.sec.1'], T['exam.sec.2'], T['exam.sec.3']];
const WORDS_P = 0.6;        // how often a variant that has a given in words uses it

/** The sections, lettered, and the problem with its targets and its canon in section order. */
function withSections(p, secs) {
  const sections = secs.map((s, i) => ({ letter: LETTERS[i], targets: s.targets, goalKey: s.goalKey, goalVars: s.goalVars || {} }));
  const q = { ...p, shape: 'exam', sections, target: sections.flatMap((s) => s.targets) };
  const at = new Map(q.canon.map((f, i) => [f, i]));
  q.canon = [...q.canon].sort((a, b) => sectionOf(q, a) - sectionOf(q, b) || at.get(a) - at.get(b));
  return q;
}

/* ── congruence ── */
const CONG = thenConclusion.templates.map((t) => ({ ...t, id: `5-${t.id.slice(2)}`, base: t.id }));

function buildCong(t, seed, level, variant, words) {
  const p = thenConclusion.remake({ template: t.base, seed, level, variant, meta: { words } });
  const inWords = p.canon.filter((f) => p.roles[f] === 'given-words'), goal = p.target;
  const secs = [...(inWords.length ? [{ targets: inWords }] : []), { targets: [p.cong] }, { targets: [goal] }].map((s) => ({ ...s, goalKey: 'exam.goal.prove' }));
  return withSections({ ...p, id: `${t.id}:${seed}`, type: 'cong-exam', template: t.id, meta: { words } }, secs);
}
function makeCong(R, level, variant, avoid = { recent: [], last: null }, ctx = {}) {
  const pool = ctx.only ? CONG.filter((t) => t.id === ctx.only) : CONG;
  const t = pickTemplate(R, pool, avoid, ctx, DEFS), seed = R.int(1, 2147483646);
  const can = (WORDS[t.variant] || []).length > 0;
  const words = can && ((ctx.want && DEFS.includes(ctx.want)) || R.bool(WORDS_P));
  return buildCong(t, seed, level, variant, words);
}
function remakeCong(x) {
  const t = CONG.find((q) => q.id === x.template);
  if (!t || !Number.isFinite(x.seed)) return null;
  return buildCong(t, x.seed, x.level, x.variant, !!(x.meta && x.meta.words));
}

/* ── similarity ── */
const SIM = templatesOf(10, ['P', 'B', 'H', 'N']);

function buildSim(t, seed, level, variant) {
  const r = makeR(seeded(seed));
  const base = SIM_FAMS[t.family].build(r, t.variant, { ask: true });
  const p = { ...base, canon: [...base.canon, 'prop', 'val'], target: 'val' };
  const wrong = [angleWrong(p, r), ...propWrongs(p, 1), wrongOrder(p, r), ...numberWrongs(p)].filter(Boolean);
  const x = p.facts.val.x;
  return withSections({
    ...p, id: `${t.id}:${seed}`, type: 'sim-exam', template: t.id, seed, level, variant,
    tiles: { wrong }, traps: numberTraps(p, wrong), meta: null,
  }, [
    { targets: [p.sim], goalKey: 'exam.goal.prove' },
    { targets: ['prop'], goalKey: 'exam.goal.ratio', goalVars: { x } },
    { targets: ['val'], goalKey: 'exam.goal.calc', goalVars: { x } },
  ]);
}
function makeSim(R, level, variant, avoid = { recent: [], last: null }, ctx = {}) {
  const pool = ctx.only ? SIM.filter((t) => t.id === ctx.only) : SIM;
  // six templates: the window of templates to avoid is kept below the pool's size, so the pick always rotates
  const recent = ((avoid && avoid.recent) || []).slice(0, Math.max(0, pool.length - 2));
  const t = pickSim(R, pool, { ...avoid, recent }, ctx), seed = R.int(1, 2147483646);
  return buildSim(t, seed, level, variant);
}
function remakeSim(x) {
  const t = SIM.find((q) => q.id === x.template);
  if (!t || !Number.isFinite(x.seed)) return null;
  return buildSim(t, x.seed, x.level, x.variant);
}

export const congExam = {
  id: 'cong-exam', n: 5, name: T['type.cong-exam'], button: `5. ${T['type.cong-exam']}`,
  warm: ['W2', 'W4', 'W5', 'W6'], templates: CONG, make: makeCong, remake: remakeCong,
  subject: 'congruence', label: T['type.exam'], shape: 'exam', live: true,
};
export const simExam = {
  id: 'sim-exam', n: 10, name: T['type.sim-exam'], button: `10. ${T['type.sim-exam']}`,
  warm: ['S1', 'S2', 'S3', 'S4'], templates: SIM, make: makeSim, remake: remakeSim,
  subject: 'similarity', label: T['type.exam'], shape: 'exam', live: true,
};
