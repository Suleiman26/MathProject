/* The live duel's rules on the phone, without React or the DOM (node --test
   runs them: arena-core.test.mjs). Play.jsx / Hud.jsx / FaceOff.jsx draw from
   these. Everything that is a *time* takes server milliseconds (clock.js
   serverNow(offset)); the phone's own clock is never compared to the server's.

   Spec numbers (Global Constraints): 15 questions · 300 s · 3-2-1 from start_at ·
   wrong → 2 s lock (lock_until from the server) · tug bar: opponent fill width
   = 50 − clamp(diff/14, −42, 42) % · streak mult 1.2 at 3–4, 1.5 at 5+ ·
   last question ×2 · timer "hot" in the last 30 s. */

export const QUESTIONS = 15;
export const DUEL_MS = 300000;
export const HOT_MS = 30000;         // timer turns red and pulses
export const COUNT_MS = 3000;        // 3-2-1 starts 3 s before start_at
export const GO_MS = 700;            // "יאללה!" stays this long after start_at
export const LOCK_MS = 2000;
export const FEEDBACK_MS = 450;      // a correct answer glows this long before the next question
export const PING_MS = 1100;         // "נועה ענתה ✓" stays this long
export const TUG_MAX = 42, TUG_DIV = 14;

/* ── time ──────────────────────────────────────────────────────────────────── */
/** Postgres json timestamps ("2026-11-08T10:00:10.123456+00:00", or with a
    space / "+00") → ms. Safari is strict about fractions: cut them to 3 digits. */
export function parseTs(s) {
  if (typeof s === "number") return s;
  if (typeof s !== "string" || !s) return NaN;
  let t = s.trim().replace(" ", "T");
  t = t.replace(/(\.\d{3})\d+/, "$1");
  t = t.replace(/([+-]\d{2})$/, "$1:00");
  const ms = Date.parse(t);
  return Number.isFinite(ms) ? ms : Date.parse(s);
}

export function fmtClock(msLeft) {
  const s = Math.max(0, Math.ceil(msLeft / 1000));
  return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0");
}

export function timeLeft(endsAt, nowMs) {
  const e = parseTs(endsAt);
  return Number.isFinite(e) ? e - nowMs : 0;
}

export function lockLeft(lockUntil, nowMs) {
  const l = parseTs(lockUntil);
  return Number.isFinite(l) ? Math.max(0, l - nowMs) : 0;
}

/** The face-off before start_at: 'hold' (VS on screen) → 'count' n=3,2,1 → 'go' ("יאללה!") → 'live' */
export function countdown(startAt, nowMs) {
  const s = parseTs(startAt);
  if (!Number.isFinite(s)) return { phase: "hold", n: 0, left: Infinity };
  const left = s - nowMs;
  if (left > COUNT_MS) return { phase: "hold", n: 0, left };
  if (left > 0) return { phase: "count", n: Math.min(3, Math.ceil(left / 1000)), left };
  if (left > -GO_MS) return { phase: "go", n: 0, left };
  return { phase: "live", n: 0, left };
}

/* ── which screen ─────────────────────────────────────────────────────────── */
export const ENDED = ["failed", "expired", "cancelled", "declined"];
/** 'invited' | 'accepted' | 'faceoff' | 'arena' | 'waiting' | 'finishing' | 'done' | 'ended' */
export function phaseOf(state, nowMs) {
  if (!state) return "loading";
  const s = state.status;
  if (s === "done") return "done";
  if (ENDED.includes(s)) return "ended";
  if (s === "invited") return "invited";
  if (s === "accepted") return "accepted";
  if (s === "live") {
    if (countdown(state.start_at, nowMs).phase !== "live") return "faceoff";
    if (timeLeft(state.ends_at, nowMs) <= 0) return "finishing";
    if (state.me && state.me.done) return "waiting";
    return "arena";
  }
  return "loading";
}

/* ── the HUD ──────────────────────────────────────────────────────────────── */
export function tugWidth(myScore, oppScore) {
  const diff = (Number(myScore) || 0) - (Number(oppScore) || 0);
  return 50 - Math.max(-TUG_MAX, Math.min(TUG_MAX, diff / TUG_DIV));
}

export function leadOf(myScore, oppScore) {
  const d = (Number(myScore) || 0) - (Number(oppScore) || 0);
  return d > 0 ? 1 : d < 0 ? -1 : 0;
}

/** 'me' when I just took the lead, 'opp' when they did, else null.
    A first score from 0–0 is not an overtake; a flip, or a lead from a tie
    where both have points, is. */
export function overtake(prev, next) {
  const a = leadOf(prev.my, prev.opp), b = leadOf(next.my, next.opp);
  if (b === 0 || a === b) return null;
  if (a === 0 && !((Number(prev.my) || 0) > 0 && (Number(prev.opp) || 0) > 0)) return null;
  return b === 1 ? "me" : "opp";
}

export function streakMult(streak) { return streak >= 5 ? 1.5 : streak >= 3 ? 1.2 : 1; }
export function streakLabel(streak) {
  if (streak < 3) return "";
  return "רצף " + streak + " · ×" + (streak >= 5 ? "1.5" : "1.2");
}

/** dash i of a lane: 'ok' | 'no' | 'now' | '' */
export function laneClass(lanes, i, idx, live) {
  const v = Array.isArray(lanes) ? lanes[i] : null;
  if (v === true) return "ok";
  if (v === false) return "no";
  return live && i === idx ? "now" : "";
}

/** the opponent answered since the last state: { ok } or null */
export function oppPing(prevOpp, nextOpp) {
  if (!prevOpp || !nextOpp) return null;
  const a = Number(prevOpp.idx) || 0, b = Number(nextOpp.idx) || 0;
  if (b <= a) return null;
  const v = Array.isArray(nextOpp.lanes) ? nextOpp.lanes[b - 1] : null;
  return { ok: v === true, idx: b - 1 };
}

/* ── questions and answers ───────────────────────────────────────────────── */
export function currentQuestion(state, idx) {
  const qs = (state && state.questions) || [];
  const i = idx == null ? (state && state.me ? state.me.idx : 0) : idx;
  return qs.find((q) => q && q.idx === i) || null;
}

/** Keypad keys for a typed answer: digits and "−" always; "/" (fraction) and
    "." (decimal) only where the answer can be one. A hint in the payload wins
    (`keys: ["/", "."]`, or `display: { fraction, decimal }`); without one:
    "/" for ratio-percent and powers-roots, "." for ratio-percent, and either
    when the prompt itself talks about fractions / decimals.
    The server accepts "3/8", "0.375", "0,375" and "−3" alike (answer.js). */
export function keypadFor(q) {
  const p = (q && q.payload) || q || {};
  const text = String(p.prompt || "");
  const topic = String(p.topic || "");
  const d = p.display || {};
  const keys = Array.isArray(p.keys) ? p.keys : Array.isArray(d.keys) ? d.keys : null;
  if (keys) return { fraction: keys.includes("/"), decimal: keys.includes(".") || keys.includes(",") };
  if (typeof d.fraction === "boolean" || typeof d.decimal === "boolean") return { fraction: !!d.fraction, decimal: !!d.decimal };
  const fraction = topic === "ratio-percent" || topic === "powers-roots" || /\\frac|שבר/.test(text);
  const decimal = topic === "ratio-percent" || /עשרוני|אחוז|%/.test(text);
  return { fraction, decimal };
}

/** what the student typed, for display: "−3", "3/8" → { neg, num, den } (den null when no "/") */
export function typedParts(s) {
  const t = String(s || "");
  const neg = t.startsWith("−") || t.startsWith("-");
  const body = neg ? t.slice(1) : t;
  const i = body.indexOf("/");
  return i < 0 ? { neg, num: body, den: null } : { neg, num: body.slice(0, i), den: body.slice(i + 1) };
}

/** one keypad key applied to the typed text (digits, "−" toggles the sign, "." / "/" once, "⌫") */
export function typeKey(s, k, max = 10) {
  const t = String(s || "");
  if (k === "⌫") return t.slice(0, -1);
  if (k === "−" || k === "-") return t.startsWith("−") ? t.slice(1) : "−" + t;
  if (k === "." || k === ",") { const { num, den } = typedParts(t); if ((den == null ? num : den).includes(".")) return t; return t.replace(/−$/, "−") + "."; }
  if (k === "/") { if (t.includes("/") || !/\d/.test(t)) return t; return t + "/"; }
  if (!/^\d$/.test(k)) return t;
  if (t.replace(/[^\d]/g, "").length >= max) return t;
  return t + k;
}
/** can this be sent? at least one digit, nothing dangling */
export function typedOk(s) {
  const t = String(s || "");
  if (!/\d/.test(t)) return false;
  if (/[./]$/.test(t)) return false;
  const { den } = typedParts(t);
  if (den != null && (!/\d/.test(den) || /^0+(\.0*)?$/.test(den))) return false;
  return true;
}

/** what duel_answer told us, folded into the last known state (the next
    duel_state overwrites it with the truth) */
export function applyAnswer(state, idx, r) {
  if (!state || !state.me || !r || r.error) return state;
  if (Number(state.me.idx) !== idx) return state;       // already moved on
  const lanes = Array.isArray(state.my_lanes) ? [...state.my_lanes] : Array(QUESTIONS).fill(null);
  lanes[idx] = !!r.correct;
  const me = { ...state.me, idx: idx + 1, done: idx + 1 >= QUESTIONS,
    score: Number.isFinite(Number(r.score)) ? Number(r.score) : state.me.score,
    ok: (Number(state.me.ok) || 0) + (r.correct ? 1 : 0),
    streak: Number.isFinite(Number(r.streak)) ? Number(r.streak) : (r.correct ? (state.me.streak || 0) + 1 : 0),
    lock_until: r.lock_until || null };
  return { ...state, me, my_lanes: lanes };
}

/** a fresh duel_state replaces the old one — except it must never move my
    progress backwards (a slow response from before my last answer) */
export function mergeState(prev, next) {
  if (!next || next.error) return prev;
  if (!prev || !prev.me || !next.me) return next;
  if (prev.status === next.status && Number(next.me.idx) < Number(prev.me.idx)) {
    return { ...next, me: prev.me, my_lanes: prev.my_lanes, questions: prev.questions.length > (next.questions || []).length ? prev.questions : next.questions };
  }
  return next;
}

/** how long the answer feedback stays: a glow for a right answer, the lock for a wrong one */
export function feedbackMs(r, nowMs) {
  if (!r || r.error) return 0;
  if (r.correct) return FEEDBACK_MS;
  return Math.max(600, lockLeft(r.lock_until, nowMs) || LOCK_MS);
}

/* ── the invite ring ─────────────────────────────────────────────────────── */
export const INVITE_MS = 60000;
export function inviteLeft(expiresAt, nowMs) {
  const e = parseTs(expiresAt);
  return Number.isFinite(e) ? Math.max(0, e - nowMs) : 0;
}

/** my colour vs theirs: the same colour → the opponent turns rose */
export const RAMPS = {
  teal:   { 3: "#5eead4", 5: "#14b8a6", 6: "#0d9488", 7: "#0f766e", 9: "#134e4a" },
  sky:    { 3: "#7dd3fc", 5: "#0ea5e9", 6: "#0284c7", 7: "#0369a1", 9: "#0c4a6e" },
  blue:   { 3: "#93c5fd", 5: "#3b82f6", 6: "#2563eb", 7: "#1d4ed8", 9: "#1e3a8a" },
  indigo: { 3: "#a5b4fc", 5: "#6366f1", 6: "#4f46e5", 7: "#4338ca", 9: "#312e81" },
  violet: { 3: "#c4b5fd", 5: "#8b5cf6", 6: "#7c3aed", 7: "#6d28d9", 9: "#4c1d95" },
  pink:   { 3: "#f9a8d4", 5: "#ec4899", 6: "#db2777", 7: "#be185d", 9: "#831843" },
  cyan:   { 3: "#67e8f9", 5: "#06b6d4", 6: "#0891b2", 7: "#0e7490", 9: "#164e63" },
  orange: { 3: "#fdba74", 5: "#f97316", 6: "#ea580c", 7: "#c2410c", 9: "#7c2d12" },
  rose:   { 3: "#fda4af", 5: "#f43f5e", 6: "#e11d48", 7: "#be123c", 9: "#881337" },
};
export function duelColors(meAvatar, oppAvatar) {
  const me = RAMPS[meAvatar] ? meAvatar : "teal";
  let op = RAMPS[oppAvatar] ? oppAvatar : "rose";
  if (op === me) op = "rose";
  return { me, op };
}
/** CSS variables for the arena root: --me-3/5/6/7/9 and --op-3/5/6/7/9 */
export function colorVars(meAvatar, oppAvatar) {
  const c = duelColors(meAvatar, oppAvatar);
  const out = {};
  for (const k of Object.keys(RAMPS[c.me])) { out["--me-" + k] = RAMPS[c.me][k]; out["--op-" + k] = RAMPS[c.op][k]; }
  return out;
}

/* ── copy ─────────────────────────────────────────────────────────────────── */
/* "ל" + a Latin username needs a hyphen: "ל-noa"; Hebrew names glue: "לנועה" */
export const toName = (n) => (/^[A-Za-z0-9]/.test(String(n || "")) ? "ל-" : "ל") + n;
export const atName = (n) => (/^[A-Za-z0-9]/.test(String(n || "")) ? "את-" : "את ") + n;
/* "ו" + name: "ו-noa" / "ונועה" */
export const andName = (n) => (/^[A-Za-z0-9]/.test(String(n || "")) ? "ו-" : "ו") + n;

/* ── fetching duel_state on a slow network ─────────────────────────────────
   At most one state() on its way at a time: a refetch asked for while one is
   in flight is remembered and runs once when that one lands (never lost,
   never piled up). force (after my own answer / give-up / start) sends at once
   anyway. A response is applied when it is newer than the last one APPLIED —
   a slow answer is never thrown away just because a newer request started
   (mergeState already keeps my own progress from going backwards).
     const g = createFetchGate();
     const t = g.begin(force); if (!t) return;          // queued behind the one in flight
     const r = await api.state(id);
     const { apply, again } = g.end(t, !r.error);       // again → call refetch() once more */
export function createFetchGate() {
  let seq = 0, applied = 0, inflight = 0, pending = false;
  return {
    begin(force) {
      if (inflight > 0 && !force) { pending = true; return 0; }
      inflight++;
      return ++seq;
    },
    end(token, ok) {
      inflight = Math.max(0, inflight - 1);
      const apply = token > applied;
      if (apply && ok) applied = token;
      const again = pending && inflight === 0;
      if (again) pending = false;
      return { apply, again };
    },
    get busy() { return inflight > 0; },
  };
}

/* ── the keypad's window keydown listener: whose key is it? ────────────────
   'ignore' — a sheet/dialog is open or the key was meant for a text field, or
              for a button / link outside the keypad;
   'key'    — a focused keypad button (Enter / Space press that button);
   'free'   — nothing in particular has focus: the keypad takes it.
   target / pad are DOM elements (closest / contains); sheetOpen = html.dl-locked. */
export function keypadKeyTarget(target, pad, sheetOpen) {
  if (sheetOpen) return "ignore";
  const t = target && typeof target.closest === "function" ? target : null;
  if (!t) return "free";
  if (t.closest('[role="dialog"], [aria-modal="true"]')) return "ignore";
  if (t.isContentEditable || t.closest('input, textarea, select, [contenteditable="true"], [contenteditable=""]')) return "ignore";
  if (t.closest('button, a[href], [role="button"], summary')) return pad && pad.contains(t) ? "key" : "ignore";
  return "free";
}
