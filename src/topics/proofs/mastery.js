/* The proofs section: the mastery rule per proof type (spec §8), the rescue ladder, the A/B variant
   choice, the four dots, and device storage (§10.3). Pure: the storage object and the day come in
   as arguments; nothing here reads window, Date or Math.random. Every number is in RULES (starting
   values to tune with real data; each is covered by mastery.test.mjs). */
import { T } from './texts.js';

export const RULES = {
  CLEAN_SOLO: 0.8,          // clean = no filled decision and solo ≥ 80% of the decisions
  WINDOW: 4, NEED: 3,       // level up: 3 clean among the last 4 counted proofs
  FAST_MIN_PROOFS: 2, FAST_MIN_DECISIONS: 6,   // fast track: the first proofs all perfect, ≥ 2 proofs, ≥ 6 decisions
  HIST: 6, RECENT: 6,       // kept per level / last template ids
  RESCUE_STREAK: 2,         // not-clean proofs in a row before the rescue ladder steps in
  STUCK: 6,                 // counted proofs at a level without levelling up → the kind card
  MAX_TRIES: 2,             // wrong tries on one decision before the app fills it
  HINT3_WAIT_MS: 4000,      // "הראו לי" unlocks this long after hint 2
  IDLE_MS: 20000,           // no tap this long (Levels 1–2): the hint button pulses once
  ROUND: 3,                 // "סיימתם סבב של 3 הוכחות."
  WARM_TASKS: 4, WARM_EXTRA: 2, WARM_CAP: 8, WARM_PASS: [2, 3],   // warm-up flow (§7.1)
  Q_BADGE_MS: 2500,         // the red "?" on a "looks equal" claim
  NEAR_PX: 22,              // a tap this close to two parts opens the chooser
};

/** Error kinds (§8), in tie-break order. */
export const ERR = ['goal-as-known', 'looks-equal', 'too-early', 'wrong-theorem', 'wrong-matching', 'wrong-source', 'wrong-word', 'false-statement'];
/** The warm-up kind each error kind sends the student to. */
export const ERR_WARM = {
  'goal-as-known': 'W6', 'too-early': 'W6', 'looks-equal': 'W2', 'wrong-theorem': 'W4',
  'wrong-matching': 'W5', 'wrong-source': 'W3', 'wrong-word': 'W7', 'false-statement': 'W1',
};

/* rec = { n, solo, helped, missed, filled, variant, tpl, day } */
export const isClean = (rec) => rec.filled === 0 && rec.n > 0 && rec.solo / rec.n >= RULES.CLEAN_SOLO;
export const isPerfect = (rec) => rec.n > 0 && rec.solo === rec.n;

/** A fresh state for one proof type. */
export function emptyType() {
  return {
    level: 1, walked: false, warm: { done: false, kinds: {} },
    hist: { 1: [], 2: [], 3: [] }, count: { 1: 0, 2: 0, 3: 0 },
    done: 0, lastHelp: null, recent: [], errs: {},
    resc: { stage: 0, bad: 0 }, force: null, retry: null,
  };
}

/* ── cleaning anything read from storage (an old, broken or hand-edited value) ── */
const isObj = (x) => !!x && typeof x === 'object' && !Array.isArray(x);
const nat = (x, max = Infinity) => (Number.isFinite(x) && x >= 0 ? Math.min(Math.floor(x), max) : 0);
const cleanRec = (r) => (isObj(r) && ['n', 'solo', 'helped', 'missed', 'filled'].every((k) => Number.isFinite(r[k]) && r[k] >= 0)
  ? { n: r.n, solo: r.solo, helped: r.helped, missed: r.missed, filled: r.filled, variant: r.variant === 'A' ? 'A' : 'B', tpl: typeof r.tpl === 'string' ? r.tpl : '', day: Number.isFinite(r.day) ? r.day : 0 }
  : null);
function cleanType(x) {
  const e = emptyType();
  if (!isObj(x)) return e;
  const lv = Number.isFinite(x.level) ? Math.max(1, Math.min(4, Math.floor(x.level))) : 1;
  const hist = {}, count = {};
  for (const l of [1, 2, 3]) {
    hist[l] = isObj(x.hist) && Array.isArray(x.hist[l]) ? x.hist[l].map(cleanRec).filter(Boolean).slice(-RULES.HIST) : [];
    count[l] = isObj(x.count) ? nat(x.count[l]) : 0;
  }
  const kinds = {};
  if (isObj(x.warm) && isObj(x.warm.kinds)) for (const [k, v] of Object.entries(x.warm.kinds)) if (Array.isArray(v)) kinds[k] = v.map((b) => (b ? 1 : 0)).slice(-RULES.WARM_CAP);
  const errs = {};
  if (isObj(x.errs)) for (const k of ERR) if (nat(x.errs[k])) errs[k] = nat(x.errs[k]);
  return {
    level: lv, walked: x.walked === true,
    warm: { done: isObj(x.warm) && x.warm.done === true, kinds },
    hist, count, done: nat(x.done),
    lastHelp: Number.isFinite(x.lastHelp) && x.lastHelp >= 0 ? x.lastHelp : null,
    recent: Array.isArray(x.recent) ? x.recent.filter((t) => typeof t === 'string').slice(0, RULES.RECENT) : [],
    errs,
    resc: isObj(x.resc) ? { stage: nat(x.resc.stage, 2), bad: nat(x.resc.bad) } : { stage: 0, bad: 0 },
    force: x.force === 'A' ? 'A' : null,
    retry: typeof x.retry === 'string' ? x.retry : null,
  };
}
const copy = (ts) => cleanType(ts);

/* the warm-up kind for the commonest error at this level (tie → the earlier kind; none → W1) */
function warmFor(errs) {
  let best = null;
  for (const k of ERR) if ((errs[k] || 0) > 0 && (!best || errs[k] > errs[best])) best = k;
  return best ? ERR_WARM[best] : 'W1';
}

/**
 * Record one finished proof. Pure: returns a new state.
 * → { ts, event: null | 'level-up' | 'type-done', rescue: null | { step:1, warm } | { step:2 } | { step:3 } }
 */
export function record(ts0, level, rec, { counted = true, errs = {}, filledReason = null } = {}) {
  const ts = copy(ts0);
  ts.done += 1;
  ts.lastHelp = rec.n - rec.solo;
  if (rec.tpl) ts.recent = [rec.tpl, ...ts.recent].slice(0, RULES.RECENT);
  ts.retry = filledReason || null;                       // "second chance soon" (§9.1)
  let event = null, rescue = null;
  if (!counted || level < 1 || level > 3) return { ts, event, rescue };

  const r = cleanRec(rec);
  ts.hist[level] = [...ts.hist[level], r].slice(-RULES.HIST);
  ts.count[level] += 1;
  for (const [k, v] of Object.entries(errs || {})) if (ERR.includes(k) && v > 0) ts.errs[k] = (ts.errs[k] || 0) + v;
  if (level !== ts.level) return { ts, event, rescue };   // practising an earlier level changes no level

  // level up: 3 clean among the last 4, or the fast track
  const h = ts.hist[level], last = h.slice(-RULES.WINDOW);
  const allPerfect = ts.count[level] === h.length && h.every(isPerfect);
  const fast = allPerfect && h.length >= RULES.FAST_MIN_PROOFS && h.reduce((s, x) => s + x.n, 0) >= RULES.FAST_MIN_DECISIONS;
  if (fast || last.filter(isClean).length >= RULES.NEED) {
    ts.level = Math.min(4, ts.level + 1);
    ts.errs = {}; ts.resc = { stage: 0, bad: 0 }; ts.force = null;
    return { ts, event: ts.level === 4 ? 'type-done' : 'level-up', rescue };
  }

  // the rescue ladder
  if (isClean(r)) ts.resc.bad = 0; else ts.resc.bad += 1;
  if (ts.count[level] === RULES.STUCK) rescue = { step: 3 };
  else if (ts.resc.bad >= RULES.RESCUE_STREAK) {
    if (ts.resc.stage === 0) { rescue = { step: 1, warm: warmFor(ts.errs) }; ts.resc.stage = 1; }
    else { rescue = { step: 2 }; ts.resc.stage = 2; }
    ts.resc.bad = 0; ts.force = 'A';
  }
  return { ts, event, rescue };
}

/** Which variant the next proof at this level is, and whether it counts. */
export function variantFor(ts, level) {
  if (level === 1 && !ts.walked) return { variant: 'A', counted: false };
  if (ts.force === 'A' || !(ts.count && ts.count[level])) return { variant: 'A', counted: true };
  return { variant: 'B', counted: true };
}
export const walked = (ts) => ({ ...copy(ts), walked: true });
export const useForce = (ts) => ({ ...copy(ts), force: null });

/** The four dots: the last 4 counted proofs at this level (clean or not), oldest first, padded with null. */
export function dots(ts, level) {
  const out = (ts.hist[level] || []).slice(-RULES.WINDOW).map(isClean);
  while (out.length < RULES.WINDOW) out.push(null);
  return out;
}
/** "הפעם נעזרתם פחות מבפעם הקודמת." — call before record(). */
export const lessHelp = (ts, rec) => ts.lastHelp !== null && rec.n - rec.solo < ts.lastHelp;

/* ── storage (§10.3) ──────────────────────────────────────────────────────── */
export const KEY = 'mp:proofs:v1:';
export const OPEN_KEY = 'mp:proofs:open';
const empty = () => ({ v: 1, types: {} });
export const whoKey = (account) => (account && account.id ? `u:${account.id}` : 'g');

/** The saved progress, or empty progress for anything missing, broken or unreadable. */
export function load(store, who) {
  try {
    const raw = store && store.getItem(KEY + who);
    if (!raw) return empty();
    const x = JSON.parse(raw);
    if (!isObj(x) || x.v !== 1 || !isObj(x.types)) return empty();
    const types = {};
    for (const [id, t] of Object.entries(x.types)) if (isObj(t)) types[id] = cleanType(t);
    return { v: 1, types };
  } catch { return empty(); }
}
export function save(store, who, state) {
  try { if (!store) return false; store.setItem(KEY + who, JSON.stringify(state)); return true; } catch { return false; }
}
export const typeState = (state, typeId) => cleanType(state && isObj(state.types) ? state.types[typeId] : null);

/** After sign-up / sign-in: copy the guest progress into the user's key when that key is empty. */
export function adoptGuest(store, accountId) {
  try {
    if (!store || !accountId) return;
    const who = `u:${accountId}`;
    if (Object.keys(load(store, who).types).length) return;
    const g = store.getItem(KEY + 'g');
    if (g && Object.keys(load(store, 'g').types).length) store.setItem(KEY + who, g);
  } catch { /* private mode: nothing to adopt */ }
}

/** A signed-in student on a new device: any row at "רמה N" proves level N was earned. Never lowers. */
export function seedFromServer(state, rows, TYPES) {
  if (!Array.isArray(rows)) return state;
  const tabs = { [T['tab.1']]: 1, [T['tab.2']]: 2, [T['tab.3']]: 3 };
  let types = null;
  for (const row of rows) {
    if (!isObj(row) || row.page !== 'proofs.html' || typeof row.chapter !== 'string') continue;
    const parts = row.chapter.split(' › ');
    if (parts.length !== 2) continue;
    const type = TYPES.find((t) => t.button === parts[0]), n = tabs[parts[1]];
    if (!type || !n) continue;
    types = types || { ...state.types };
    const ts = cleanType(types[type.id]);
    ts.level = Math.max(ts.level, n); ts.warm.done = true;
    types[type.id] = ts;
  }
  return types ? { ...state, types } : state;
}
