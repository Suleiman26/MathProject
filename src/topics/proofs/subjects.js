/* The proofs subjects (spec 2026-11-23 §5): subjects → levels (the types, in Ministry order) → help stages.
   A subject = { id, name, when, short, live, types:[type ids, level order], theorems:[reason ids shown on its
   theorem page], hero:{ type, template, seed } | null, demos:{ [reasonId]: { type, template, seed, marks } } }.
   Adding a subject later (משולש שווה שוקיים) = its types + one entry here, in Ministry calendar order.
   Pure: no window. Callers pass the host and whether the page sits in the admin review frame. */
import { T } from './texts.js';
import { typeById } from './types/index.js';

const subject = (id, o) => ({ id, name: T[`subj.${id}`], when: T[`subj.when.${id}`], short: T[`subj.short.${id}`], ...o });

export const SUBJECTS = [
  subject('congruence', {
    live: true,
    types: ['read-given', 'congruent-parts', 'prove-congruence', 'then-conclusion'],
    theorems: ['sas', 'asa', 'sss', 'vertical', 'common-side', 'cp-sides', 'cp-angles', 'bisector', 'median', 'midpoint', 'altitude'],
    hero: { type: 'prove-congruence', template: '3-X-SAS', seed: 20261121 },
    demos: {},
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

