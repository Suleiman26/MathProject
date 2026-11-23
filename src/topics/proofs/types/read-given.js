/* Type 1 "קוראים את הנתון" (spec §6.5, §7.3): a figure + two sentences → two rows, each the equality
   the sentence gives, with its reason. No row needs another. 9 templates:
     1-a/b/c/d/j a triangle with two lines from two of its vertices (families/cevian.js, clearly
     not isosceles) · 1-e/f family X (midpoints) · 1-g family K (two bisectors along the diagonal) ·
     1-h a "bent" kite: one bisector + one plain equality (accepts נתון only).
   A sentence in words accepts its definition and נתון (role given-words); a plain equality accepts
   נתון only (role given). Altitude rows carry right:true ("∢ADB = ∢ADC = 90°").
   Wrong tiles: what another word would give for the same line (median → the angle equality,
   bisector / altitude → the segment equality; traps st.word.*, kind wrong-word), then letter-swaps.
   Rulings (recorded for the lead / Sulaiman):
   - 1-g: two bisectors along the diagonal force the kite to be symmetric (ז.צ.ז), so it is drawn
     symmetric; AB = AD is then true and cannot be a wrong tile (letter-swaps only).
   - 1-h: the spec's "AC חוצה את ∢BAD" + "AB = AD" would force symmetry too (צ.ז.צ), which contradicts
     "drawn not symmetric". The plain equality is the side pair at the OTHER end of the diagonal,
     CB = CD (side-side-angle: no congruence), so the kite is truly not symmetric and AB = AD is a
     visibly false "bisector → equal segments" tile.
   - 1-d "D אמצע הצלע BC": the point is named, no line AD is drawn.
   - 1-i (median + altitude, E on AB) is dropped (review M4): the vertices are random, so it made the very
     problems of 1-c (median + altitude, E on AC) and drew that pair twice as often. Ids are kept (1-j stays 1-j).
   make(R, level, variant, avoid, ctx) → problem (§10.1); ctx.only pins a template. Pure. */
import { seeded, makeR } from '../../new/core.js';
import { T } from '../texts.js';
import { norm, holds, findFact } from '../core.js';
import { pickNames, place, nameMap, lies, S, Ang, G } from '../families/kit.js';
import { build as buildCevian } from '../families/cevian.js';
import { letterSwap, pickTemplate } from './tiles.js';
import X from '../families/x.js'; import K from '../families/k.js';

const C = (lines) => ({ family: 'cevian', lines });
const TPL = {
  '1-a': C(['bisector', 'median']), '1-b': C(['altitude', 'bisector']), '1-c': C(['median', 'altitude']),
  '1-d': C(['midpoint', 'bisector']), '1-e': { family: 'X' }, '1-f': { family: 'X' }, '1-g': { family: 'K' },
  '1-h': { family: 'K' }, '1-j': C(['altitude', 'altitude']),
};
const TEMPLATES = Object.entries(TPL).map(([id, t]) => ({ id, family: t.family, variant: id, theorem: null }));
// what a wrong reading of a word gives for the same line (§6.5): median → the angle equality, bisector and altitude → the segment equality
const WRONG_READ = { median: 'bisector', bisector: 'median', altitude: 'median' };

/* ── the drawings ── */
function cevianBase(t, r) {
  const words = TPL[t.id].lines, [v1, v2] = r.shuffle([0, 1, 2]);
  const names = pickNames(r, 5);
  const c = buildCevian(r, { lines: [{ word: words[0], from: v1, draw: false }, { word: words[1], from: v2 }], names });
  const sentences = Object.entries(c.lines).map(([l, ln]) => {
    const [p, q] = [...ln.side];
    const sent = ln.word === 'bisector' ? { key: 'gv.bisector', vars: { l, a: `∢${p}${ln.from}${q}` } }
      : ln.word === 'median' ? { key: 'gv.median', vars: { l, s: ln.side } }
        : ln.word === 'altitude' ? { key: 'gv.altitude', vars: { l, s: ln.side } }
          : { key: 'gv.midSide', vars: { p: ln.foot, s: ln.side } };
    // the wrong reading of the word: the "other" statement of the same line that the spec names
    const want = WRONG_READ[ln.word === 'midpoint' ? 'median' : ln.word];
    const wrongRead = ln.others.find((o) => (want === 'bisector' ? o.kind === 'ang' && !o.right : o.kind === 'seg'));
    const cue = ln.drawn ? [l] : [p + ln.foot, ln.foot + q];
    return { facts: [ln.gives], word: ln.word, sent, wrong: wrongRead ? [{ st: wrongRead, text: `st.word.${ln.word === 'midpoint' ? 'median' : ln.word}` }] : [], cue: [cue] };
  });
  return { figure: c.figure, sentences, text: { key: 'tx.cevian', vars: { t: `△${c.figure.tris[0].join('')}` } } };
}
function xBase(t, r) {
  const nm = pickNames(r, 5, { crossing: true }), m = Object.fromEntries(['A', 'B', 'C', 'D', 'O'].map((k, i) => [k, nm[i]]));
  const b = X.build(r, 'X-SAS', { names: nm }), ab = m.A + m.B, cd = m.C + m.D, o = m.O;
  const f1 = b.facts.sAO, f2 = b.facts.sCO, st = (f) => ({ kind: 'seg', x: f.x, y: f.y });
  const sentences = t.id === '1-e'
    ? [{ facts: [st(f1)], word: 'midpoint', sent: { key: 'gv.midpoint', vars: { p: o, s: ab } }, wrong: [], cue: [[f1.x, f1.y]] },
      { facts: [st(f2)], word: 'midpoint', sent: { key: 'gv.midpoint', vars: { p: o, s: cd } }, wrong: [], cue: [[f2.x, f2.y]] }]
    : [{ facts: [st(f1), st(f2)], word: 'midpoint', sent: { key: 'gv.bisect2', vars: { s1: ab, s2: cd, p: o } }, wrong: [], cue: [[f1.x, f1.y], [f2.x, f2.y]] }];
  return { figure: b.figure, sentences, text: { key: 'tx.X', vars: { s1: ab, s2: cd, p: o } } };
}
const ang = (f) => ({ kind: 'ang', x: structuredClone(f.x), y: structuredClone(f.y) });
function kBase(t, r) {
  if (t.id === '1-h') return bentKite(r);
  const nm = pickNames(r, 4), m = Object.fromEntries(['A', 'B', 'C', 'D'].map((k, i) => [k, nm[i]]));
  const b = K.build(r, 'K-ASA', { names: nm }), ac = m.A + m.C;
  return {
    figure: b.figure,
    sentences: [
      { facts: [ang(b.facts.aA)], word: 'bisector', sent: { key: 'gv.bisector', vars: { l: ac, a: `∢${m.B}${m.A}${m.D}` } }, wrong: [], cue: [[ac]] },
      { facts: [ang(b.facts.aC)], word: 'bisector', sent: { key: 'gv.bisector', vars: { l: m.C + m.A, a: `∢${m.B}${m.C}${m.D}` } }, wrong: [], cue: [[ac]] },
    ],
    text: { key: 'tx.K', vars: { t1: `△${m.A}${m.B}${m.C}`, t2: `△${m.A}${m.D}${m.C}`, s: ac } },
  };
}
/* 1-h: A at the origin, C on the axis; ∢BAC = ∢DAC and CB = CD, but D is the OTHER point of the
   reflected ray at distance CB from C (AD = 2·cos∢A − AB ≠ AB), so the kite is not symmetric */
function bentKite(r) {
  for (let i = 0; i < 400; i++) {
    const al = r.int(22, 56) * Math.PI / 180, c = Math.cos(al);
    const b = r.bool() ? c * (0.42 + r.rand() * 0.4) : c * (1.18 + r.rand() * 0.42), d = 2 * c - b;
    if (d <= 0.25 || b <= 0.25) continue;
    const roles = ['A', 'B', 'C', 'D'], m = nameMap(roles, r);
    const raw = place({ A: [0, 0], C: [1, 0], B: [b * c, b * Math.sin(al)], D: [d * c, -d * Math.sin(al)] }, r);
    const points = Object.fromEntries(Object.entries(raw).map(([k, v]) => [m[k], v]));
    const [A, B, Cc, D] = roles.map((k) => m[k]);
    const figure = {
      points, lines: [], segs: [A + B, A + D, Cc + B, Cc + D, A + Cc],
      angles: [Ang(A, [B, Cc]), Ang(A, [D, Cc]), Ang(Cc, [B, A]), Ang(Cc, [D, A]), Ang(B, [A, Cc]), Ang(D, [A, Cc])],
      tris: [[A, B, Cc], [A, D, Cc]], motion: null,
    };
    const bis = G(Ang(A, [B, Cc]), Ang(A, [D, Cc])), eq = S(Cc + B, Cc + D);
    return {
      figure,
      sentences: [
        { facts: [bis], word: 'bisector', sent: { key: 'gv.bisector', vars: { l: A + Cc, a: `∢${B}${A}${D}` } }, wrong: [{ st: S(A + B, A + D), text: 'st.word.bisector' }], cue: [[A + Cc]] },
        { facts: [eq], word: null, plain: true, cue: [[eq.x, eq.y]] },
      ],
      text: { key: 'tx.K', vars: { t1: `△${A}${B}${Cc}`, t2: `△${A}${D}${Cc}`, s: A + Cc } },
    };
  }
  throw new Error('type 1: no bent kite');
}

/* ── one problem ── */
function assembleProblem(t, seed, level, variant, base, r) {
  const sentences = r.shuffle(base.sentences);                   // the order of the two sentences varies
  const facts = {}, just = {}, roles = {}, cue = {}, givenText = [], target = [];
  let ticks = 0, arcs = 0, k = 0;
  for (const s of sentences) {
    const ids = s.facts.map((st, j) => {
      const id = `f${++k}`, color = k;
      facts[id] = { ...st, mark: st.kind === 'seg' ? { ticks: ++ticks, color } : st.right ? { right: true, arcs: ++arcs, color } : { arcs: ++arcs, color } };
      just[id] = [{ reasons: s.plain ? ['given'] : [s.word, 'given'], needs: [] }];
      roles[id] = s.plain ? 'given' : 'given-words';
      cue[id] = s.cue[j];
      target.push(id);
      return id;
    });
    givenText.push(s.plain ? { facts: ids, form: 'eq' } : { facts: ids, form: 'words', word: s.word, key: s.sent.key, vars: { ...s.sent.vars } });
    s.ids = ids;
  }
  const p = {
    id: `${t.id}:${seed}`, type: 'read-given', template: t.id, seed, level, variant,
    family: t.family, theorem: null, figure: base.figure, facts, just, roles, cue,
    given: [], target, canon: [...target], text: [base.text], givenText, meta: null,
  };
  // wrong tiles: the wrong reading of each word first (1-c: "a median is not a bisector"), then letter-swaps to four
  const wrong = [], traps = {}, used = new Set(Object.values(facts).map((f) => norm(p.figure, f)));
  for (const s of sentences) for (const w of s.wrong || []) {
    const key = norm(p.figure, w.st);
    if (used.has(key) || holds(p.figure, w.st, 1e-6) || findFact(p, w.st)) continue;      // never call a true statement false
    used.add(key); traps[key] = { kind: 'wrong-word', textKey: w.text, vars: {} };
    wrong.push({ st: structuredClone(w.st), why: 'word', for: s.ids[0] });
  }
  for (let i = 0; wrong.length < 4 && i < 8; i++) {
    const ls = letterSwap(p, r, [target[i % target.length]], used);
    if (!ls) continue;
    used.add(ls.trap[0]);                                        // type 1 keeps the plain "cannot know" text (the given is a sentence, not this equality)
    wrong.push(ls.tile);
  }
  p.tiles = { wrong }; p.traps = traps;
  return p;
}

function buildFrom(t, seed, level, variant) {
  const r = makeR(seeded(seed));
  for (let i = 0; i < 200; i++) {
    const base = t.family === 'cevian' ? cevianBase(t, r) : t.family === 'X' ? xBase(t, r) : kBase(t, r);
    const p = assembleProblem(t, seed, level, variant, base, r);
    if (!lies(p, { quick: true }).length) return p;
  }
  throw new Error(`type 1: no honest drawing for ${t.id}`);
}

function make(R, level, variant, avoid = { recent: [], last: null }, ctx = {}) {
  const pool = ctx.only ? TEMPLATES.filter((t) => t.id === ctx.only) : TEMPLATES;
  const t = pickTemplate(R, pool, { recent: (avoid && avoid.recent) || [], last: null }, { want: null }, []), seed = R.int(1, 2147483646);
  return buildFrom(t, seed, level, variant);
}
/** Rebuild a problem from itself or from a snapshot's meta ({ template, seed, level, variant }). */
function remake(x) {
  const t = TEMPLATES.find((q) => q.id === x.template);
  if (!t || !Number.isFinite(x.seed)) return null;
  return buildFrom(t, x.seed, x.level, x.variant);
}

export default {
  id: 'read-given', n: 1, name: T['type.read-given'], button: `1. ${T['type.read-given']}`,
  warm: ['W1', 'W7'], templates: TEMPLATES, make, remake,
  subject: 'congruence', label: T['type.read-given'], shape: 'given', live: true,
};
