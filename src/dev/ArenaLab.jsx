'use client';
/* A fake duel for the arena screens (local preview only: app/dev/duel).
   ?s=invite | sentwait | accepted | faceoff | arena | hot | lastq | locked | waiting | finishing | failed | done
   results (Task 8): win | lose | draw | perfect | comeback | xp0 (daily cap) | few (< 3 answers) | giveup
     &cd=1 → the first rematch answers "cooldown 12 s"; the opponent sends an emote 2.5 s in
   extra (arena only): &q=<n> starts at question n+1 (n answered, all right); &slow=<ms> makes every
   state() take that long (a slow network — the "next question" loop must still make progress);
   &prompt=<text> replaces the current question's prompt (stress-test long math), &typed=1 makes it a typed one
   No database: a small in-memory "server" with the real question engine
   (buildDuel) and the real answer rules (checkAnswer), an opponent that
   answers every few seconds (78 % right), realtime hints as function calls,
   and the server's scoring formula. PlayView gets it through its api props. */
import { useEffect, useMemo, useState } from "react";
import { PlayView } from "@/duel/Play";
import { InviteDrop } from "@/duel/InviteDrop";
import { buildDuel } from "../../supabase/functions/_shared/duel/build.js";
import { checkAnswer } from "../../supabase/functions/_shared/duel/answer.js";

const ID = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const DUEL = ID(500);
const iso = (ms) => new Date(ms).toISOString();
const R = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

function points(ok, ms, streak, last) {
  if (!ok) return 0;
  const mult = streak >= 5 ? 1.5 : streak >= 3 ? 1.2 : 1;
  return Math.round((100 + Math.max(0, Math.round(50 - 4 * ms / 1000))) * mult * (last ? 2 : 1));
}

/* n answers for one player, k of them wrong (spread), timed from start */
function seed(p, n, wrongAt, startMs) {
  p.answers = [];
  let at = startMs, streak = 0;
  for (let i = 0; i < n; i++) {
    const ms = R(4000, 9000);
    at += ms;
    const ok = !wrongAt.includes(i);
    streak = ok ? streak + 1 : 0;
    p.answers.push({ idx: i, correct: ok, at, ms, points: points(ok, 6000, streak, i === 14), streak });
  }
}

/* the finished duels for the result screen: [my wrong idx, my answer count, their wrong idx, extra] */
const RESULTS = {
  done:     { me: [5, 9], opp: [2, 6, 11] },
  win:      { me: [3, 10], opp: [1, 6, 9, 12] },
  lose:     { me: [2, 7, 11], opp: [5, 9] },
  draw:     { me: [4, 9], opp: [4, 9], draw: true },
  perfect:  { me: [], opp: [3, 8, 12] },
  comeback: { me: [0, 1, 2, 3], opp: [10, 11, 12, 13, 14], comeback: true },
  xp0:      { me: [6], opp: [2, 8, 13], xp: 0 },
  few:      { me: [1], n: 2, opp: [4], xp: 0 },
  giveup:   { me: [2], n: 6, opp: [1], gaveUp: true },
};

function labParam(k) {
  if (typeof window === "undefined") return null;
  const v = new URLSearchParams(window.location.search).get(k);
  return v == null || v === "" || !Number.isFinite(Number(v)) ? null : Number(v);
}

function labStr(k) {
  if (typeof window === "undefined") return null;
  return new URLSearchParams(window.location.search).get(k);
}

function makeDuel(kind, meColor) {
  const now = Date.now();
  const d = {
    id: DUEL, status: "live", subject: "random", i_invited: true, channel: "lab-" + kind,
    created_at: iso(now - 20000), expires_at: iso(now + 40000), accepted_at: iso(now - 6000),
    start_at: iso(now + 6500), ends_at: iso(now + 6500 + 300000), questions: buildDuel(4242, { grade: 8, subject: "random" }),
    me: { id: "lab", username: "עבד", avatar: meColor, level: 5, answers: [] },
    opp: { id: ID(1), username: "נועה", avatar: meColor === "pink" ? "violet" : "pink", level: 6, answers: [] },
    result: null, emotes: [],
  };
  const live = (ago) => { d.start_at = iso(now - ago); d.ends_at = iso(now - ago + 300000); };
  switch (kind) {
    case "accepted": d.status = "accepted"; d.i_invited = false; d.start_at = null; d.ends_at = null; d.accepted_at = iso(now - 500); break;
    case "faceoff": break;
    case "arena": {
      live(40000);
      const q = labParam("q");
      if (q != null) { live(20000 + q * 6000); seed(d.me, Math.min(14, q), [], now - 20000 - q * 6000); seed(d.opp, Math.max(0, q - 1), [], now - 20000 - q * 6000); }
      else { seed(d.me, 3, [1], now - 40000); seed(d.opp, 2, [], now - 40000); }
      break;
    }
    case "hot": live(275000); seed(d.me, 11, [2, 7], now - 275000); seed(d.opp, 12, [4], now - 275000); break;
    case "lastq": live(200000); seed(d.me, 14, [3], now - 200000); seed(d.opp, 13, [1, 8], now - 200000); break;
    case "locked": live(60000); seed(d.me, 4, [3], now - 60000); d.me.answers[3].at = now - 200; seed(d.opp, 3, [], now - 60000); break;
    case "waiting": live(180000); seed(d.me, 15, [5], now - 180000); seed(d.opp, 9, [2], now - 180000); break;
    case "finishing": live(300400); seed(d.me, 15, [5], now - 300400); seed(d.opp, 13, [2], now - 300400); break;   // time up, inside the 2-s grace
    case "failed": d.status = "failed"; d.start_at = null; d.ends_at = null; break;
    case "sentwait": d.status = "invited"; d.start_at = null; d.ends_at = null; d.accepted_at = null; d.expires_at = iso(now + 52000); break;
    default:
      if (RESULTS[kind]) {
        const k = RESULTS[kind];
        live(320000);
        seed(d.me, k.n || 15, k.me, now - 320000);
        seed(d.opp, 15, k.opp, now - 320000);
        finish(d, k);
      }
      break;
  }
  const forced = labStr("prompt");
  if (forced && d.status === "live") {
    const i = Math.min(14, d.me.answers.length);
    d.questions[i] = { ...d.questions[i], prompt: forced, ...(labStr("typed") ? { kind: "number", choices: undefined } : {}) };
  }
  return d;
}

/* the end, as the server would write it (duel_close + duel_state's result) */
function finish(d, k = {}) {
  d.status = "done";
  const a = sum(d.me), b = sum(d.opp);
  const quit = k.gaveUp ? d.me.id : null;
  const draw = !quit && (k.draw || a === b);
  const winner = quit ? d.opp.id : draw ? null : a > b ? d.me.id : d.opp.id;
  const n = d.me.answers.length;
  const xp = k.xp != null ? k.xp : quit || n < 3 ? 0 : draw ? 20 : winner === d.me.id ? 30 : 10;
  const review = d.questions.map((q, idx) => {
    const my = d.me.answers[idx];
    if (my && my.correct) return null;
    const given = !my ? null : q.kind === "choice" ? String((Number(q.answer) + 1) % 4) : String(Number(q.answer) + 3);
    return { idx, payload: { prompt: q.prompt, choices: q.choices, topic: q.topic, chapter: q.chapter }, right: q.answer, given };
  }).filter(Boolean);
  const ms = d.me.answers.map((x) => x.ms || 6000);
  d.result = {
    winner, draw, xp_me: xp, gave_up: quit, comeback_by: k.comeback && winner === d.me.id ? d.me.id : null, review,
    best_streak: d.me.answers.reduce((m, x) => Math.max(m, x.streak), 0),
    avg_ms: ms.length ? Math.round(ms.reduce((s2, x) => s2 + x, 0) / ms.length) : null,
  };
}
const sum = (p) => p.answers.reduce((s, a) => s + a.points, 0);
const lanes = (p) => Array.from({ length: 15 }, (_, i) => { const a = p.answers[i]; return a ? a.correct : null; });

function player(p, mine, nowMs) {
  const n = p.answers.length, last = p.answers[n - 1];
  const r = { id: p.id, username: p.username, avatar: p.avatar, level: p.level, score: sum(p), ok: p.answers.filter((a) => a.correct).length, idx: n, done: n >= 15 };
  if (mine) {
    r.streak = last ? last.streak : 0;
    r.lock_until = last && !last.correct && last.at + 2000 > nowMs ? iso(last.at + 2000) : null;
  } else r.lanes = lanes(p);
  return r;
}

/** the fake server + fake realtime for one duel */
function makeServer(kind, meColor) {
  const d = makeDuel(kind, meColor);
  const listeners = new Set();
  const hint = (ev) => { for (const l of [...listeners]) setTimeout(() => l(ev), 30); };
  let oppTimer = null;

  function state() {
    const now = Date.now();
    if (d.status === "live" && kind !== "finishing" && now > Date.parse(d.ends_at) + 2000) { finish(d); hint("duel_end"); }
    if (d.status === "live" && d.me.answers.length >= 15 && d.opp.answers.length >= 15) { finish(d); }
    const myIdx = d.me.answers.length;
    const r = {
      id: d.id, now: iso(now), status: d.status, subject: d.subject, i_invited: d.i_invited,
      created_at: d.created_at, expires_at: d.expires_at, accepted_at: d.accepted_at, start_at: d.start_at, ends_at: d.ends_at, channel: d.channel,
      me: player(d.me, true, now), opp: player(d.opp, false, now), my_lanes: lanes(d.me),
      questions: d.status === "live" || d.status === "done"
        ? d.questions.map((q, idx) => ({ idx, kind: q.kind, payload: { prompt: q.prompt, choices: q.choices, topic: q.topic, chapter: q.chapter } })).filter((q) => d.status === "done" || q.idx <= myIdx)
        : [],
      emotes: d.emotes.map((e) => ({ ...e })), _sent: now, _recv: now,
    };
    if (d.status === "done") r.result = d.result;
    return r;
  }

  function oppTurn() {
    clearTimeout(oppTimer);
    if (d.status !== "live" || d.opp.answers.length >= 15) return;
    oppTimer = setTimeout(() => {
      if (d.status !== "live" || Date.now() < Date.parse(d.start_at)) { oppTurn(); return; }
      const n = d.opp.answers.length, prev = d.opp.answers[n - 1];
      const ok = Math.random() < 0.78;
      const streak = ok ? (prev ? prev.streak : 0) + 1 : 0;
      d.opp.answers.push({ idx: n, correct: ok, at: Date.now(), points: points(ok, R(4000, 11000), streak, n === 14), streak });
      hint("opp_answer");
      if (d.me.answers.length >= 15 && d.opp.answers.length >= 15) { finish(d); hint("duel_end"); return; }
      oppTurn();
    }, kind === "waiting" || kind === "lastq" ? R(2500, 5000) : R(4000, 11000));
  }
  if (d.status === "live") oppTurn();
  // the friend answers with an emote a moment after the end (the realtime hint 'emote' → state)
  let emoteT = null;
  if (d.status === "done" && kind !== "giveup") emoteT = setTimeout(() => { d.emotes.push({ uid: d.opp.id, emote: kind === "lose" ? "again" : "gg" }); hint("emote"); }, 2500);
  let cooled = false;
  if (kind === "finishing") setTimeout(() => { finish(d); hint("duel_end"); }, 4500);

  const api = {
    state: async () => { const slow = labParam("slow"); await wait(slow ? R(slow, slow + 300) : R(80, 220)); return state(); },
    answer: async (id, idx, given) => {
      await wait(R(120, 320));
      const now = Date.now();
      if (d.status !== "live" || now < Date.parse(d.start_at)) return { error: "not_live" };
      if (now > Date.parse(d.ends_at) + 2000) { finish(d); hint("duel_end"); return { error: "time" }; }
      const n = d.me.answers.length, prev = d.me.answers[n - 1];
      if (idx !== n || n >= 15) return { error: "order" };
      if (prev && !prev.correct && now < prev.at + 2000) return { error: "locked" };
      const q = d.questions[n];
      const ok = checkAnswer(q, given);
      const ms = now - (prev ? prev.at : Date.parse(d.start_at));
      const streak = ok ? (prev ? prev.streak : 0) + 1 : 0;
      const pts = points(ok, ms, streak, n === 14);
      d.me.answers.push({ idx: n, correct: ok, at: now, points: pts, streak });
      if (d.me.answers.length >= 15 && d.opp.answers.length >= 15) { finish(d); hint("duel_end"); }
      return { correct: ok, right: q.answer, points: pts, score: sum(d.me), streak, lock_until: ok ? null : iso(now + 2000) };
    },
    start: async () => {
      await wait(900);
      if (d.status !== "accepted") return { error: "gone" };
      const now = Date.now();
      d.status = "live"; d.start_at = iso(now + 4000); d.ends_at = iso(now + 304000);
      hint("duel_start"); oppTurn();
      return { ok: true };
    },
    giveUp: async () => { await wait(200); if (d.status !== "live") return { error: "not_live" }; finish(d, { gaveUp: true }); hint("duel_end"); return { ok: true }; },
    answerInvite: async () => ({ error: "gone" }),
    cancel: async () => ({ status: "cancelled" }),
    invite: async () => {
      await wait(500);
      if (labStr("cd") && !cooled) { cooled = true; return { error: "cooldown", wait_s: 12 }; }
      return { id: ID(501), expires_at: iso(Date.now() + 60000) };
    },
    emote: async (id, e) => {
      await wait(250);
      if (d.status !== "done") return { error: "not_done" };
      if (d.emotes.filter((x) => x.uid === d.me.id).length >= 3) return { error: "limit" };
      d.emotes.push({ uid: d.me.id, emote: e }); hint("emote");
      return { ok: true };
    },
    report: async () => { await wait(500); return { ok: true }; },
  };
  const subscribeFn = (topic, onHint, opts) => {
    listeners.add(onHint);
    setTimeout(() => { opts && opts.onStatus && opts.onStatus(true); onHint("sync"); }, 50);
    return () => { listeners.delete(onHint); };
  };
  const stop = () => { clearTimeout(oppTimer); clearTimeout(emoteT); };
  return { api, subscribeFn, stop };
}

const NAV = ["invite", "sentwait", "accepted", "faceoff", "arena", "hot", "lastq", "locked", "waiting", "finishing", "failed", "done",
  "win", "lose", "draw", "perfect", "comeback", "xp0", "few", "giveup"];

export default function ArenaLab({ kind, color = "teal" }) {
  const account = useMemo(() => ({ id: "lab", username: "עבד", avatar: color, grade: 8, level: 5 }), [color]);
  const srv = useMemo(() => (kind === "invite" ? null : makeServer(kind, color)), [kind, color]);
  useEffect(() => () => srv && srv.stop(), [srv]);
  const [busy, setBusy] = useState("");
  const [gone, setGone] = useState(null);

  return (
    <>
      {kind === "invite" ? (
        <div className="duel" data-topic={color} style={{ minHeight: "100dvh" }}>
          <div className="dl-bg" aria-hidden="true" />
          <div className="dl-in" style={{ opacity: .45, filter: "blur(1px)", pointerEvents: "none" }} aria-hidden="true">
            <div className="dl-top" style={{ height: 52 }} />
            <div className="dl-hero"><p className="dl-kicker">תרגול</p><h1>ברוך הבא, עבד</h1></div>
            <div className="dl-card" style={{ height: 180 }} /><div className="dl-card" style={{ height: 120, marginTop: 14 }} />
          </div>
          <InviteDrop invite={{ id: DUEL, from: { id: ID(1), username: "נועה", avatar: "pink" }, subject: "random", expires_at: iso(Date.now() + 60000), h2h: [3, 4] }}
            offset={0} busy={busy} gone={gone}
            onAccept={async () => { setBusy("yes"); await wait(600); location.href = `?s=accepted&c=${color}`; }}
            onDecline={async () => { setBusy("no"); await wait(400); setBusy(""); setGone("declined"); }} />
        </div>
      ) : (
        <PlayView key={kind} id={DUEL} ready account={account} api={srv.api} subscribeFn={srv.subscribeFn}
          navigate={(url) => { location.href = url === "/duel" ? `?s=hub&c=${color}` : `?s=sentwait&c=${color}`; }} />
      )}
      <nav className="dl-labnav" aria-label="מצבי תצוגה">
        <a href={`?s=hub&c=${color}`}>hub</a>
        {NAV.map((s) => <a key={s} href={`?s=${s}&c=${color}`} style={{ fontWeight: kind === s ? 700 : 400 }}>{s}</a>)}
      </nav>
    </>
  );
}

export const ARENA_STATES = NAV;
