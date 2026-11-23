/* The proofs subjects (spec 2026-11-23 §5): subjects → levels (the types, in Ministry order) → help stages.
   A subject = { id, name, when, short, live, types:[type ids, level order], theorems:[reason ids shown on its
   theorem page], hero:{ type, template, seed } | null, demos:{ [reasonId]: { type, template, seed, marks } } }.
   A demo = the small drawing beside a theorem on the "המשפטים" page (§6.3): one fixed instance of an existing
   template with only the theorem's own pattern marked (`marks` = fact ids of that problem; a congruence id
   tints its two triangles). The test checks every demo builds and marks exactly what its theorem says.
   Adding a subject later (משולש שווה שוקיים) = its types + one entry here, in Ministry calendar order.
   Pure: no window. Callers pass the host and whether the page sits in the admin review frame. */
import { T } from './texts.js';
import { typeById } from './types/index.js';
import { REASONS } from './reasons.js';

const demo = (type, template, seed, marks) => ({ type, template, seed, marks });
const subject = (id, o) => ({ id, name: T[`subj.${id}`], when: T[`subj.when.${id}`], short: T[`subj.short.${id}`], ...o });

export const SUBJECTS = [
  subject('congruence', {
    live: true,
    types: ['read-given', 'congruent-parts', 'prove-congruence', 'then-conclusion'],
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
      bisector: demo('read-given', '1-a', 20261123, ['f1']),
      median: demo('read-given', '1-c', 20261123, ['f1']),
      midpoint: demo('read-given', '1-e', 20261123, ['f1']),
      altitude: demo('read-given', '1-b', 20261123, ['f1']),
    },
  }),
  subject('similarity', { live: false, types: [], theorems: [], hero: null, demos: {} }),
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
const built = new Map();
/** A theorem's small drawing: { problem, marks:[fact ids] }, or null (no demo, or it does not build). Built once. */
export function demoOf(subjectId, reasonId) {
  const key = `${subjectId}:${reasonId}`;
  if (built.has(key)) return built.get(key);
  const s = SUBJECTS.find((x) => x.id === subjectId), d = s && s.demos ? s.demos[reasonId] : null, t = d ? typeById(d.type) : null;
  let out = null;
  try {
    const problem = t ? t.remake({ template: d.template, seed: d.seed, level: 1, variant: 'A', meta: null }) : null;
    if (problem && d.marks.every((m) => problem.facts[m])) out = { problem, marks: d.marks };
  } catch { out = null; }
  built.set(key, out);
  return out;
}
