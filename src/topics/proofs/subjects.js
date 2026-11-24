/* The proofs subjects (spec 2026-11-23 §5): subjects → levels (the types, in Ministry order) → help stages.
   A subject = { id, name, when, short, live, types:[type ids, level order], theorems:[reason ids shown on its
   theorem page], hero:{ type, template, seed } | null, nudge:{ after: type id, level, text: text key } (optional, §9), demos:{ [reasonId]: { type, template, seed, marks } } }.
   A demo = the small drawing beside a theorem on the "המשפטים" page (§6.3): one fixed instance of an existing
   template with only the theorem's own pattern marked (`marks` = fact ids of that problem; a congruence id
   tints its two triangles; `solo` = draw only the points of the triangles and of the marked facts, see soloFigure).
   The test checks every demo builds, marks exactly what its theorem says, and that an angle mark is wide enough to see.
   Adding a subject later (משולש שווה שוקיים) = its types + one entry here, in Ministry calendar order.
   Pure: no window. Callers pass the host and whether the page sits in the admin review frame. */
import { T } from './texts.js';
import { typeById } from './types/index.js';
import { REASONS } from './reasons.js';

const demo = (type, template, seed, marks, solo = false) => ({ type, template, seed, marks, solo });
const subject = (id, o) => ({ id, name: T[`subj.${id}`], when: T[`subj.when.${id}`], short: T[`subj.short.${id}`], ...o });

export const SUBJECTS = [
  subject('congruence', {
    live: true,
    types: ['read-given', 'congruent-parts', 'prove-congruence', 'then-conclusion', 'cong-exam'],   // the exam is always the last level (spec §8)
    theorems: ['sas', 'asa', 'sss', 'vertical', 'common-side', 'cp-sides', 'cp-angles', 'bisector', 'median', 'midpoint', 'altitude'],
    hero: { type: 'prove-congruence', template: '3-X-SAS', seed: 20261121 },
    demos: {
      sas: demo('prove-congruence', '3-2-SAS', 20261123, ['sAB', 'aA', 'sCA']),          // two sides and the angle between them
      asa: demo('prove-congruence', '3-2-ASA', 20261123, ['aB', 'sBC', 'aC']),           // two angles and the side between them
      sss: demo('prove-congruence', '3-2-SSS', 20261123, ['sAB', 'sBC', 'sCA']),
      vertical: demo('prove-congruence', '3-X-SAS', 20261121, ['aO']),
      'common-side': demo('prove-congruence', '3-K-SSS', 20261123, ['sAC']),
      'cp-sides': demo('congruent-parts', '2-a', 20261123, ['cong', 'sAB']),             // the congruent pair + one pair of matching sides
      'cp-angles': demo('congruent-parts', '2-a', 20261123, ['cong', 'aB']),
      // a definition's drawing shows its own line only (`solo`): the template's second line is taken out
      bisector: demo('read-given', '1-b', 20261123, ['f2'], true),                       // a wide angle (78°), so both arcs are easy to see
      median: demo('read-given', '1-a', 20261104, ['f1'], true),
      midpoint: demo('read-given', '1-e', 20261123, ['f1']),
      altitude: demo('read-given', '1-b', 20261145, ['f2'], true),                    // the foot well inside its side (39% along it), never near a corner
    },
  }),
  subject('similarity', {
    live: true,                                                   // Abed 2026-11-23: "Build, show it live"
    types: ['sim-parts', 'sim-side', 'prove-sim', 'sim-calc', 'sim-exam'],
    theorems: ['aa', 'corresponding', 'alternate', 'vertical', 'common-angle', 'right-angles', 'sim-angles', 'sim-ratio', 'solve'],
    hero: { type: 'prove-sim', template: '8-P-CC', seed: 20261127 },
    // a quiet line on the first visit (nothing begun here yet) while congruence רמה 3 is not reached (§9): a nudge, never a lock
    nudge: { after: 'prove-congruence', level: 3, text: 'lbl.simNudge' },
    // the parallel given is never a mark (it has no honest mark yet: ticks would say "equal lengths"); "solve" has no drawing
    demos: {
      aa: demo('prove-sim', '8-P-CC', 20261126, ['a0', 'a1']),                  // the two angle pairs ז.ז stands on
      corresponding: demo('prove-sim', '8-P-CC2', 20261126, ['a1']),
      alternate: demo('prove-sim', '8-B-AA', 20261124, ['a0']),
      vertical: demo('prove-sim', '8-B-VA', 20261123, ['a1']),
      'common-angle': demo('prove-sim', '8-P-CC', 20261125, ['a0']),
      'right-angles': demo('prove-sim', '8-H-CR', 20261124, ['a2']),
      'sim-angles': demo('sim-parts', '6-P', 20261124, ['sim', 'a1']),          // the similar pair + one pair of matching angles
      'sim-ratio': demo('sim-parts', '6-B', 20261123, ['sim']),
    },
  }),
];

const byType = (typeId) => SUBJECTS.find((s) => s.types.includes(typeId)) || null;
/** The subject a type belongs to, or null. */
export const subjectOf = (typeId) => byType(typeId);
/** The type objects of a subject, in level order ([] for an unknown subject). */
export const typesOf = (subjectId) => {
  const s = SUBJECTS.find((x) => x.id === subjectId);
  return s ? s.types.map(typeById).filter(Boolean) : [];
};
/** The level number of a type inside its subject (1-based; 0 when unknown): "רמה N". */
export const levelNo = (typeId) => { const s = byType(typeId); return s ? s.types.indexOf(typeId) + 1 : 0; };
/** The level before this one in the same subject, or null for the first level (or an unknown type). */
export const prevInSubject = (typeId) => {
  const s = byType(typeId), i = s ? s.types.indexOf(typeId) : -1;
  return i > 0 ? typeById(s.types[i - 1]) : null;
};

/** Where rescue step 3 ("go back one", spec 2026-11-23 §9) sends the student: the level before in the same subject
    ({ type }), from a subject's first level that level's warm-up ({ warm:true }); null when there is neither. */
export function stepBack(typeId) {
  const prev = prevInSubject(typeId);
  if (prev) return { type: prev.id };
  const t = byType(typeId) ? typeById(typeId) : null;
  return t && (t.warm || []).length ? { warm: true } : null;
}

/* Hidden subjects/levels still show where Abed and Sulaiman look: localhost, the admin review frame, and
   mathix branch previews on Abed's Vercel team. Never on the live site or anywhere else. */
const PREVIEW = /^mathix-[a-z0-9-]+-abed-shalgams-projects\.vercel\.app$/;
/** May this subject or type be shown? env = { host: location.hostname, framed: isAdminFrame() }. */
export function canShow(x, env) {
  const e = env || {};
  if (x && x.live !== false) return true;
  if (e.framed === true) return true;
  const host = typeof e.host === 'string' ? e.host : '';
  return host === 'localhost' || host === '127.0.0.1' || PREVIEW.test(host);
}


/* ── the "המשפטים" page of a subject (§6.2.4–§6.3) ── */
/** What the page lists, in the subject's order: { laws: the theorems, more: the definitions, then the rules }.
    A reason with no full sentence yet (or "נתון") is left out. Takes a subject or its id. */
export function lawsOf(subjectOrId) {
  const s = typeof subjectOrId === 'string' ? SUBJECTS.find((x) => x.id === subjectOrId) : subjectOrId;
  const ids = (s && s.theorems ? s.theorems : []).filter((id) => REASONS[id] && REASONS[id].full && REASONS[id].kind !== 'given');
  const of = (kind) => ids.filter((id) => REASONS[id].kind === kind);
  return { laws: of('theorem'), more: [...of('definition'), ...of('rule')] };
}
const lettersOf = (st) => (st.kind === 'seg' ? [...st.x, ...st.y] : st.kind === 'ang' ? [st.x.v, ...st.x.r, st.y.v, ...st.y.r] : st.map.flat());
/** A figure with only its triangles' corners and the points of the facts `marks`: every other point goes, with the
    lines through it; a side it cut is drawn whole again. (The read-given drawings carry two special lines; a
    theorem's demo shows one.) Pure: returns a new figure. */
export function soloFigure(problem, marks) {
  const fig = problem.figure, keep = new Set([...(fig.tris || []).flat(), ...marks.flatMap((m) => lettersOf(problem.facts[m]))]);
  const has = (sg) => [...sg].some((q) => !keep.has(q));
  const whole = [], lines = [];
  for (const ln of fig.lines || []) {
    const rest = ln.filter((q) => keep.has(q));
    if (rest.length === ln.length) { lines.push(ln); continue; }
    if (rest.length >= 3) lines.push(rest);
    for (let i = 0; i + 1 < rest.length; i++) if (ln.indexOf(rest[i + 1]) - ln.indexOf(rest[i]) > 1) whole.push(rest[i] + rest[i + 1]);   // the pieces around a point that went
  }
  return {
    ...fig,
    points: Object.fromEntries(Object.entries(fig.points).filter(([q]) => keep.has(q))),
    lines,
    segs: (fig.segs || []).filter((sg) => !has(sg)),
    plain: [...(fig.plain || []).filter((sg) => !has(sg)), ...whole],
    angles: (fig.angles || []).filter((g) => keep.has(g.v) && g.r.every((q) => keep.has(q))),
  };
}
const built = new Map();
/** A theorem's small drawing: { problem, marks:[fact ids] }, or null (no demo, or it does not build). Built once. */
export function demoOf(subjectId, reasonId) {
  const key = `${subjectId}:${reasonId}`;
  if (built.has(key)) return built.get(key);
  const s = SUBJECTS.find((x) => x.id === subjectId), d = s && s.demos ? s.demos[reasonId] : null, t = d ? typeById(d.type) : null;
  let out = null;
  try {
    const problem = t ? t.remake({ template: d.template, seed: d.seed, level: 1, variant: 'A', meta: null }) : null;
    if (problem && d.marks.every((m) => problem.facts[m])) out = { problem: d.solo ? { ...problem, figure: soloFigure(problem, d.marks) } : problem, marks: d.marks };
  } catch { out = null; }
  built.set(key, out);
  return out;
}
