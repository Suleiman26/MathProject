/* The duel API, without any browser wiring (so node --test can run it).
   src/duel/api.js connects it to the real session token, mpData.rpc and config.
   Database functions: supabase/migrations/20261108100000_duels_friends.sql and
   20261108110000_duels_core.sql. Argument names must match the SQL parameter
   names exactly (api.test.mjs checks both sides).

   Every call resolves (never throws) to the database's JSON, or to
   { error: '<code>' } — show it with duelError(result). Client-side codes:
   signed_out (no or dead session), offline (no database configured),
   network (request failed, no answer or 5xx), bad_request (the server refused
   the request itself, 4xx), start (the question function answered badly).
   deps.onAuthLost() is called ONLY when the function body itself says the
   session is dead ('unauthorized' raised by duel_uid/account_from — SQLSTATE
   28000 — or {error:'signed_out'|'unauthorized'} from duel-start), so the app can
   clear the saved account (src/lib/account.js) and every screen agrees.
   A bare HTTP 401/403 (e.g. a missing grant on one function) still answers
   signed_out for THAT call, but never clears the session. */
import { localNow } from "./clock.js";

/* Short, kind Hebrew for every code. Never blame the child. Codes that might
   hide a block (not_friend, gone, no_code, busy) stay neutral on purpose. */
export const GENERIC_ERROR = "משהו השתבש. נסו שוב בעוד רגע";
const QUESTIONS = "משהו השתבש בהכנת השאלות. נסו שוב";
export const DUEL_ERRORS = {
  // the release switch (duel_guard)
  off: "דו-קרבים עוד לא פתוחים. בקרוב!",
  // client side
  signed_out: "צריך להתחבר לחשבון כדי לשחק דו-קרב",
  offline: "דו-קרבים לא זמינים כרגע",
  network: "אין חיבור כרגע. נסו שוב בעוד רגע",
  // friends
  no_code: "לא מצאנו את הקוד הזה. כדאי לבדוק אותו ולנסות שוב",
  self: "זה הקוד שלך. שלחו אותו לחברים",
  limit_day: "הגעת למקסימום להיום",
  limit_friends: "אי אפשר להוסיף עוד חברים כרגע (עד 100)",
  you_blocked: "המשתמש הזה חסום אצלך. אפשר לבטל את החסימה ואז להוסיף",
  no_user: "לא מצאנו את המשתמש הזה",
  reason: "בחרו סיבה מהרשימה",
  // invites
  subject: "בחרו נושא לדו-קרב",
  not_friend: "אי אפשר לשלוח אתגר לחבר הזה כרגע",
  cooldown: "רגע… אפשר לשלוח אתגר נוסף בעוד כמה שניות",
  busy: "אחד מכם כבר באמצע דו-קרב. נסו שוב עוד מעט",
  gone: "זה כבר לא פעיל. אולי הזמן עבר או שזה בוטל",
  // during a duel
  not_live: "הדו-קרב עוד לא התחיל או שכבר נגמר",
  time: "הזמן של הדו-קרב נגמר",
  order: "התשובה הזאת כבר נקלטה",
  locked: "עוד רגע אפשר לענות",
  // after a duel
  emote: "בחרו אחת מהתגובות",
  not_done: "אפשר לשלוח תגובה בסוף הדו-קרב",
  limit: "אפשר לשלוח עד 3 תגובות בכל דו-קרב",
  // making the questions (duel-start edge function, duel_claim_start, duel_put_questions)
  start: QUESTIONS,
  rows: QUESTIONS,
  secret: QUESTIONS,
  failed: QUESTIONS,
  gen: QUESTIONS,
  db: QUESTIONS,
  method: QUESTIONS,
  // the server refused the request itself (HTTP 4xx that isn't a dead session)
  bad_request: "משהו השתבש בבקשה. נסו שוב בעוד רגע",
  // admin settings (admin_set_setting)
  unknown: "ההגדרה לא נשמרה. נסו שוב",
  value: "ההגדרה לא נשמרה. נסו שוב",
};

/** Hebrew for an error: duelError('cooldown'), duelError(result) or duelError('cooldown', {wait_s}) */
export function duelError(codeOrResult, extra) {
  const r = codeOrResult && typeof codeOrResult === "object" ? codeOrResult : { error: codeOrResult, ...(extra || {}) };
  const code = typeof r.error === "string" ? r.error : "";
  if (code === "cooldown") {
    const s = Math.ceil(Number(r.wait_s));
    if (Number.isFinite(s) && s > 0) return "רגע… אפשר לשלוח אתגר נוסף בעוד " + s + " שניות";
  }
  return Object.prototype.hasOwnProperty.call(DUEL_ERRORS, code) ? DUEL_ERRORS[code] : GENERIC_ERROR;
}

// the function body said the token is dead (duel_uid / account_from raise 'unauthorized', SQLSTATE 28000)
function saysUnauthorized(e) { return !!e && /unauthori[sz]ed/i.test(String(e.message || "")); }
// a bare HTTP 401/403 from the gateway or a missing grant: signed_out for this call, session kept
function isAuthStatus(e) { return !!e && (e.status === 401 || e.status === 403); }

/**
 * deps: { token(): string|null, rpc(fn, args): Promise<json>, fetch, config(): {functionsUrl, supabaseKey} }
 */
export function makeDuelApi(deps) {
  const inflight = new Map();
  function authLost() {
    try { if (typeof deps.onAuthLost === "function") deps.onAuthLost(); } catch {}
    return { error: "signed_out" };
  }
  // the same call while one is still on its way returns that one (double taps)
  function once(key, run) {
    if (inflight.has(key)) return inflight.get(key);
    const p = run().finally(() => inflight.delete(key));
    inflight.set(key, p);
    return p;
  }

  async function call(fn, args, timed) {
    const tok = deps.token();
    if (!tok) return { error: "signed_out" };
    const sent = localNow();
    let r;
    try {
      r = await deps.rpc(fn, { tok, ...(args || {}) });
    } catch (e) {
      if (saysUnauthorized(e)) return authLost();
      if (isAuthStatus(e)) return { error: "signed_out" };
      if (e && /not-connected/.test(String(e.message))) return { error: "offline" };
      const st = e && Number(e.status);
      if (st >= 400 && st < 500) return { error: "bad_request" };   // the request itself was refused
      return { error: "network" };                                   // no answer, or the server fell over (5xx)
    }
    if (r == null) return { ok: true };
    if (r && r.error === "signed_out") return authLost();   // a function that answers with the code instead of raising
    if (timed && typeof r === "object" && !r.error) { r._sent = sent; r._recv = localNow(); }
    return r;
  }

  async function start(id) {
    const tok = deps.token();
    if (!tok) return { error: "signed_out" };
    const c = deps.config() || {};
    let res;
    try {
      res = await deps.fetch(String(c.functionsUrl || "").replace(/\/+$/, "") + "/duel-start", {
        method: "POST",
        headers: { apikey: c.supabaseKey || "", "content-type": "application/json" },
        body: JSON.stringify({ tok, id }),
      });
    } catch {
      return { error: "network" };
    }
    let body = null;
    try { body = JSON.parse(await res.text()); } catch {}
    if (body && typeof body.error === "string") {
      if (/unauthori[sz]ed/i.test(body.error) || body.error === "signed_out") return authLost();   // the function said so
      return res.status === 401 || res.status === 403 ? { error: "signed_out" } : body;
    }
    if (!res.ok || !body) return res.status === 401 || res.status === 403 ? { error: "signed_out" } : { error: "start" };
    return body;
  }

  return {
    // friends
    friends: () => call("friends_me"),
    addFriend: (code) => call("friend_add", { code: String(code || "") }),
    answerFriend: (id, accept) => call("friend_answer", { other: id, accept: !!accept }),
    removeFriend: (id) => call("friend_remove", { other: id }),
    block: (id) => call("friend_block", { other: id }),
    unblock: (id) => call("friend_unblock", { other: id }),
    report: (id, reason, duelId) => call("friend_report", { other: id, reason, duel: duelId || null }),
    // presence + invites
    ping: () => call("presence_ping", null, true),
    invite: (friendId, subject) => once("invite:" + friendId, () => call("duel_invite", { friend: friendId, subject })),
    cancel: (id) => call("duel_cancel", { id }),
    answerInvite: (id, accept) => once("answerInvite:" + id, () => call("duel_answer_invite", { id, accept: !!accept })),
    start: (id) => once("start:" + id, () => start(id)),
    // the duel
    state: (id) => call("duel_state", { id }, true),
    answer: (id, idx, given) => once("answer:" + id + ":" + idx, () =>
      call("duel_answer", { id, idx, given: given == null ? null : String(given) })),
    giveUp: (id) => once("giveUp:" + id, () => call("duel_give_up", { id })),
    emote: (id, emote) => once("emote:" + id + ":" + emote, () => call("duel_emote", { id, emote })),
    history: () => call("duel_history"),
  };
}
