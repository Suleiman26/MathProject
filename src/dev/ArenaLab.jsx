'use client';
/* A fake duel for the arena screens (local preview only: app/dev/duel).
   ?s=invite | accepted | faceoff | arena | hot | lastq | locked | waiting | finishing | failed | done
   extra (arena only): &q=<n> starts at question n+1 (n answered, all right); &slow=<ms> makes every
   state() take that long (a slow network — the "next question" loop must still make progress)
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
    at += R(4000, 9000);
    const ok = !wrongAt.includes(i);
    streak = ok ? streak + 1 : 0;
    p.answers.push({ idx: i, correct: ok, at, points: points(ok, 6000, streak, i === 14), streak });
  }
}

function labParam(k) {
  if (typeof window === "undefined") return null;
  const v = new URLSearchParams(window.location.search).get(k);
  return v == null || v === "" || !Number.isFinite(Number(v)) ? null : Number(v);
}

function makeDuel(kind, meColor) {
  const now = Date.now();
  const d = {
    id: DUEL, status: "live", subject: "random", i_invited: true, channel: "lab-" + kind,
    created_at: iso(now - 20000), expires_at: iso(now + 40000), accepted_at: iso(now - 6000),
    start_at: iso(now + 6500), ends_at: iso(now + 6500 + 300000), questions: buildDuel(4242, { grade: 8, subject: "random" }),
    me: { id: "lab", username: "עבד", avatar: meColor, level: 5, answers: [] },
    opp: { id: ID(1), username: "נועה", avatar: meColor === "pink" ? "violet" : "pink", level: 6, answers: [] },
    result: null,
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
    case "done": live(320000); seed(d.me, 15, [5, 9], now - 320000); seed(d.opp, 15, [2, 6, 11], now - 320000); finish(d); break;
    default: break;
  }
  return d;
}

function finish(d) {
  d.status = "done";
  const a = sum(d.me), b = sum(d.opp);
  d.result = { winner: a === b ? null : a > b ? d.me.id : d.opp.id, draw: a === b, xp_me: a > b ? 30 : a === b ? 20 : 10, review: [] };
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
      emotes: [], _sent: now, _recv: now,
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
    giveUp: async () => { await wait(200); if (d.status !== "live") return { error: "not_live" }; d.status = "done"; d.result = { winner: d.opp.id, draw: false, xp_me: 0, gave_up: d.me.id, review: [] }; hint("duel_end"); return { ok: true }; },
    answerInvite: async () => ({ error: "gone" }),
    cancel: async () => ({ status: "cancelled" }),
    invite: async () => { await wait(500); return { id: DUEL, expires_at: iso(Date.now() + 60000) }; },
  };
  const subscribeFn = (topic, onHint, opts) => {
    listeners.add(onHint);
    setTimeout(() => { opts && opts.onStatus && opts.onStatus(true); onHint("sync"); }, 50);
    return () => { listeners.delete(onHint); };
  };
  const stop = () => clearTimeout(oppTimer);
  return { api, subscribeFn, stop };
}

const NAV = ["invite", "accepted", "faceoff", "arena", "hot", "lastq", "locked", "waiting", "finishing", "failed", "done"];

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
        <PlayView key={kind} id={DUEL} ready account={account} api={srv.api} subscribeFn={srv.subscribeFn} />
      )}
      <nav className="dl-labnav" aria-label="מצבי תצוגה">
        <a href={`?s=hub&c=${color}`}>hub</a>
        {NAV.map((s) => <a key={s} href={`?s=${s}&c=${color}`} style={{ fontWeight: kind === s ? 700 : 400 }}>{s}</a>)}
      </nav>
    </>
  );
}

export const ARENA_STATES = NAV;
