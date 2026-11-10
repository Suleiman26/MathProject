/* The result screen's rules, without React or the DOM (node --test runs them:
   result-core.test.mjs). Result.jsx / Emotes.jsx draw from these.

   Everything comes from duel_state after the end (status 'done'):
     result { winner, draw, xp_me, comeback_by, gave_up, best_streak, avg_ms,
              review: [{ idx, payload, right, given }] }   ← the server decides
     me / opp { id, username, score, ok, idx }, my_lanes, emotes [{ uid, emote }]
   The phone never decides who won or how much XP there is (spec §5, Review
   Focus 5). XP rules (spec §5): win 30 / draw 20 / loss 10, only with ≥ 3
   answers, a quitter gets 0, only the first 5 duels per Israeli day. */
import { TOPICS } from "../home/catalog.js";
import { withUnit } from "./math-core.js";

export const QUESTIONS = 15;
export const REVEAL_MS = 1400;     // the columns rise and the numbers count up together
export const REVEAL_DELAY = 250;   // one calm beat before they start
export const REVIEW_MAX = 3;
export const MIN_ANSWERS_FOR_XP = 3;

/** The preset emotes (spec §6: no free text). Each one can be sent once (the server allows 3 per player). */
export const EMOTES = [
  { id: "gg", label: "משחק טוב" },
  { id: "wow", label: "וואו!" },
  { id: "again", label: "עוד אחד?" },
];
export const EMOTE_LABEL = Object.fromEntries(EMOTES.map((e) => [e.id, e.label]));

const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);

/* ── who won, and how ─────────────────────────────────────────────────────── */
/** { kind: 'win'|'lose'|'draw', gaveUp: 'me'|'opp'|null, my, their, gap, tie: null|'ok'|'time',
      comeback, perfect, xp, ok } */
export function outcome(state) {
  const me = (state && state.me) || {}, opp = (state && state.opp) || {}, r = (state && state.result) || {};
  const draw = !!r.draw;
  const gaveUp = r.gave_up ? (r.gave_up === me.id ? "me" : "opp") : null;
  const kind = draw ? "draw" : r.winner && r.winner === me.id ? "win" : "lose";
  const my = num(me.score), their = num(opp.score);
  // the same score but a winner: the server broke the tie on right answers, then on total time
  let tie = null;
  if (!draw && !gaveUp && my === their) tie = num(me.ok) !== num(opp.ok) ? "ok" : "time";
  return {
    kind, gaveUp, my, their, gap: Math.abs(my - their), tie,
    comeback: !!r.comeback_by && r.comeback_by === me.id,
    perfect: num(me.ok) >= QUESTIONS,
    xp: Math.max(0, num(r.xp_me)),
    ok: num(me.ok),
  };
}

/** a lose is "close" when the gap is small next to the winner's score (≤ 150 points, or ≤ 20 %) */
export function closeGap(gap, winnerScore) {
  return gap <= Math.max(150, 0.2 * num(winnerScore));
}

/** the big line and the small one under it. Kind words only: the loser is never taunted.
    (A perfect duel / a comeback get their own moment below the facts, not the sub line.) */
export function headline(state) {
  const o = outcome(state);
  const name = (state && state.opp && state.opp.username) || "";
  if (o.kind === "draw") {
    return { title: "תיקו!", sub: o.my > 0 ? `${o.my} מול ${o.their} — שווים בדיוק` : "שווים בדיוק. מי ישבור את התיקו?" };
  }
  if (o.kind === "win") {
    if (o.gaveUp === "opp") return { title: "ניצחת!", sub: `${name} ויתר/ה באמצע` };
    if (o.tie) return { title: "ניצחת!", sub: o.tie === "ok" ? "אותו ניקוד — הכריעו התשובות הנכונות" : "אותו ניקוד — הכריע הזמן" };
    return { title: "ניצחת!", sub: `הפרש של ${o.gap} נקודות` };
  }
  // lose
  if (o.gaveUp === "me") return { title: "ויתרת הפעם", sub: "זה בסדר. סיבוב חדש מתחיל מאפס" };
  const title = `הפעם ${name}…`;
  if (o.tie) return { title, sub: o.tie === "ok" ? "אותו ניקוד בדיוק! הכריעו התשובות הנכונות" : "אותו ניקוד בדיוק! הכריע הזמן" };
  if (closeGap(o.gap, o.their)) return { title, sub: `הפרש של ${o.gap} נקודות בלבד` };
  return { title, sub: "כל תשובה נכונה מקרבת — בסיבוב הבא זה יכול להתהפך" };
}

/** the duel XP line: { xp, text, zero } — when the server gave 0, say why, gently */
export function xpNote(state) {
  const o = outcome(state);
  if (o.xp > 0) return { xp: o.xp, zero: false, text: `+${o.xp} נקודות דו-קרב` };
  const answered = num(state && state.me && state.me.idx);
  let text;
  if (o.gaveUp === "me") text = "ויתור לא מזכה בנקודות דו-קרב";
  else if (answered < MIN_ANSWERS_FOR_XP) text = "נקודות דו-קרב מגיעות אחרי 3 תשובות לפחות";
  else text = "הגעת למקסימום נקודות דו-קרב להיום";
  return { xp: 0, zero: true, text };
}

/* ── the facts ────────────────────────────────────────────────────────────── */
/** longest run of right answers in a lane of 15 (true / false / null) */
export function streakFromLanes(lanes) {
  let best = 0, run = 0;
  for (const v of Array.isArray(lanes) ? lanes : []) { run = v === true ? run + 1 : 0; best = Math.max(best, run); }
  return best;
}

/** { ok, best, avg } — avg is seconds with one decimal ("8.4"), or null when the server didn't say */
export function facts(state) {
  const r = (state && state.result) || {};
  const ok = num(state && state.me && state.me.ok);
  const best = r.best_streak != null && Number.isFinite(Number(r.best_streak)) ? Number(r.best_streak) : streakFromLanes(state && state.my_lanes);
  const ms = r.avg_ms == null ? NaN : Number(r.avg_ms);
  const avg = Number.isFinite(ms) && ms > 0 ? (Math.round(ms / 100) / 10).toFixed(1) : null;
  return { ok, best, avg };
}

/* ── what to review ──────────────────────────────────────────────────────── */
const SLUG = /^[a-z0-9][a-z0-9-]*$/;
/** /topics/<topic>?ch=<chapter>; no chapter (equation-solver) → /topics/<topic>; a strange topic → null */
export function reviewHref(topic, chapter) {
  const t = String(topic || "");
  if (!SLUG.test(t)) return null;
  const ch = String(chapter || "").trim();
  return `/topics/${t}` + (ch ? `?ch=${encodeURIComponent(ch)}` : "");
}

export function topicName(slug) {
  const t = TOPICS.find((x) => x.slug === slug);
  return t ? t.name : "";
}

/* a number as it is shown on screen: a real minus sign */
const showNum = (s) => String(s).trim().replace(/^-/, "−");

/** up to `max` review items: the ones I got wrong first (in order), then the ones I didn't reach.
    → { items: [{ idx, prompt, kind, given, right, wrong, href, label }], nWrong, nUnreached }
    (wrong = answered wrong; false = not reached) */
export function reviewItems(state, max = REVIEW_MAX) {
  const r = (state && state.result) || {};
  const qs = (state && state.questions) || [];
  const all = (Array.isArray(r.review) ? r.review : []).filter((x) => x && x.payload && x.payload.prompt);
  const wrong = all.filter((x) => x.given != null);
  const unreached = all.filter((x) => x.given == null);
  const pick = [...wrong, ...unreached].slice(0, Math.max(0, max));
  const items = pick.map((x) => {
    const p = x.payload;
    const q = qs.find((y) => y && y.idx === x.idx);
    const choices = Array.isArray(p.choices) ? p.choices : null;
    const kind = q && q.kind ? q.kind : choices && choices.length ? "choice" : "number";
    const fromChoice = (v) => {
      if (v == null || !choices) return null;
      const c = choices[Number(v)];
      return c == null ? null : String(c);
    };
    const unit = (p.display && p.display.unit) || "";
    const u = (v) => (v == null ? null : withUnit(v, unit));
    const right = u(kind === "choice" ? fromChoice(x.right) : x.right == null ? null : showNum(x.right));
    const given = u(x.given == null ? null : kind === "choice" ? fromChoice(x.given) : String(x.given).trim() === "" ? null : showNum(x.given));
    const chapter = String(p.chapter || "").trim();
    return {
      idx: x.idx, prompt: String(p.prompt), kind, right, given, wrong: x.given != null,
      href: reviewHref(p.topic, chapter), label: chapter || topicName(p.topic) || "התרגול",
    };
  });
  return { items, nWrong: wrong.length, nUnreached: unreached.length };
}

/* ── the podium ──────────────────────────────────────────────────────────── */
/** each column's share of the tallest (0..1): the higher score is 1, a 0 score stays at 0 */
export function columnShares(my, their) {
  const a = Math.max(0, num(my)), b = Math.max(0, num(their));
  const mx = Math.max(a, b);
  if (!mx) return [0, 0];
  return [a / mx, b / mx];
}

/** ease-out for the count-up and the rise (same curve: they land together) */
export function easeOut(k) {
  const t = Math.min(1, Math.max(0, k));
  return 1 - Math.pow(1 - t, 3);
}
/** the shown number at reveal progress k (0..1) */
export function countAt(target, k) {
  return Math.round(num(target) * easeOut(k));
}

/* ── emotes ──────────────────────────────────────────────────────────────── */
const validEmote = (e) => !!e && Object.prototype.hasOwnProperty.call(EMOTE_LABEL, e.emote);
/** the emotes one side sent, in order (ids) */
export function emotesOf(state, uid) {
  return ((state && state.emotes) || []).filter((e) => validEmote(e) && e.uid === uid).map((e) => e.emote);
}
/** the last emote one side sent (its id), with how many they sent (the bubble re-pops on a new one) */
export function lastEmote(state, uid) {
  const list = emotesOf(state, uid);
  return list.length ? { id: list[list.length - 1], n: list.length, label: EMOTE_LABEL[list[list.length - 1]] } : null;
}

/* ── the one sentence for screen readers ─────────────────────────────────── */
export function announce(state) {
  const h = headline(state), o = outcome(state), x = xpNote(state);
  return `${h.title} ${h.sub}. ${o.my} מול ${o.their} נקודות. ${o.ok} מתוך 15 נכונות. ${x.text}.`;
}

/* ── the revenge button ──────────────────────────────────────────────────── */
/** "נקמה! עוד סיבוב" is the loser's line; the winner, a draw, or someone who gave up just asks for another round */
export function rematchLabel(state) {
  const o = outcome(state);
  return o.kind === "lose" && o.gaveUp !== "me" ? "נקמה! עוד סיבוב" : "עוד סיבוב";
}
/** seconds left on the 30-s send cooldown (from the server's wait_s, counted on this phone) */
export function waitLeft(untilMs, nowMs) {
  return Math.max(0, Math.ceil((num(untilMs) - num(nowMs)) / 1000));
}
