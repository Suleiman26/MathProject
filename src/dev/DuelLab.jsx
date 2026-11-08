'use client';
/* Sample students for the duel hub (local preview only: app/dev/duel).
   ?s=hub | sheet | waiting | empty | guest | soon   ?c=<my colour>  ?g=7|8|9
   No database: the actions change the sample data in memory (with a short delay). */
import { useEffect, useMemo, useRef, useState } from "react";
import { HubView } from "@/duel/Hub";

const ago = (s) => new Date(Date.now() - s * 1000).toISOString();
const ID = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

function sampleFriends() {
  return [
    { id: ID(1), username: "נועה", avatar: "pink", grade: 8, level: 6, online: true, seen_ago_s: 3, wins: 4, losses: 3 },
    { id: ID(2), username: "יוסף", avatar: "violet", grade: 8, level: 4, online: true, seen_ago_s: 20, wins: 2, losses: 2 },
    { id: ID(3), username: "ליאן", avatar: "orange", grade: 9, level: 7, online: false, seen_ago_s: 3600, wins: 0, losses: 1 },
    { id: ID(4), username: "adam_2013", avatar: "sky", grade: 7, level: 2, online: false, seen_ago_s: 86400 * 2, wins: 0, losses: 0 },
    { id: ID(5), username: "מיכאל", avatar: "cyan", grade: 8, level: 5, online: false, seen_ago_s: null, wins: 1, losses: 5 },
  ];
}
function sampleData(kind) {
  const empty = kind === "empty";
  return {
    status: "on", code: "K7M2PQ", inbox: "inbox-sample",
    friends: empty ? [] : sampleFriends(),
    incoming: empty ? [] : [{ id: ID(11), username: "דניאל", avatar: "blue", created_at: ago(600) }],
    outgoing: empty ? [] : [{ id: ID(12), username: "shira.k", avatar: "indigo", created_at: ago(7200) }],
    blocked: empty ? [] : [{ id: ID(13), username: "troll99", avatar: "teal" }],
  };
}
function sampleHistory(kind) {
  if (kind === "empty") return { stats: { played: 0, wins: 0, losses: 0, draws: 0, duel_xp: 0 }, recent: [] };
  return {
    stats: { played: 9, wins: 5, losses: 3, draws: 1, perfect: 1, comebacks: 1, duel_xp: 230 },
    recent: [
      { id: ID(21), opp: { username: "נועה", avatar: "pink" }, subject: "random", my: 1240, their: 980, result: "win", at: ago(1800) },
      { id: ID(22), opp: { username: "יוסף", avatar: "violet" }, subject: "num", my: 860, their: 860, result: "draw", at: ago(86400) },
      { id: ID(23), opp: { username: "ליאן", avatar: "orange" }, subject: "alg", my: 640, their: 1120, result: "loss", at: ago(86400 * 3) },
    ],
  };
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

export default function DuelLab() {
  const [q, setQ] = useState(null);
  useEffect(() => { const p = new URLSearchParams(location.search); setQ({ s: p.get("s") || "hub", c: p.get("c") || "teal", g: p.get("g") || "8" }); }, []);
  const [data, setData] = useState(null);
  const [history, setHistory] = useState(null);
  const [cooldownUntil, setCooldownUntil] = useState(0);
  const [liveId, setLiveId] = useState(null);
  const sheetRef = useRef(null);
  useEffect(() => { if (q) { setData(sampleData(q.s)); setHistory(sampleHistory(q.s)); } }, [q]);

  const actions = useMemo(() => ({
    addFriend: async (code) => { await wait(500); if (code === "K7M2PQ") return { error: "self", message: "זה הקוד שלך. שלחו אותו לחברים" }; if (code === "ZZZZZZ") return { error: "no_code", message: "לא מצאנו את הקוד הזה. כדאי לבדוק אותו ולנסות שוב" };
      setData((d) => ({ ...d, outgoing: [{ id: ID(90), username: "new_" + code.toLowerCase(), avatar: "sky", created_at: ago(1) }, ...d.outgoing] })); return { ok: true, state: "sent" }; },
    answerFriend: async (id, ok) => { await wait(500); setData((d) => { const f = d.incoming.find((x) => x.id === id); return { ...d, incoming: d.incoming.filter((x) => x.id !== id), friends: ok && f ? [...d.friends, { ...f, grade: 8, level: 1, online: true, seen_ago_s: 1, wins: 0, losses: 0 }] : d.friends }; }); return { ok: true, state: ok ? "accepted" : "declined" }; },
    removeFriend: async (id) => { await wait(500); setData((d) => ({ ...d, friends: d.friends.filter((x) => x.id !== id), outgoing: d.outgoing.filter((x) => x.id !== id) })); return { ok: true }; },
    block: async (id) => { await wait(500); setData((d) => { const f = [...d.friends, ...d.incoming, ...d.outgoing].find((x) => x.id === id); return { ...d, friends: d.friends.filter((x) => x.id !== id), incoming: d.incoming.filter((x) => x.id !== id), outgoing: d.outgoing.filter((x) => x.id !== id), blocked: f ? [...d.blocked, f] : d.blocked }; }); return { ok: true }; },
    unblock: async (id) => { await wait(400); setData((d) => ({ ...d, blocked: d.blocked.filter((x) => x.id !== id) })); return { ok: true }; },
    report: async () => { await wait(500); return { ok: true }; },
    invite: async () => { await wait(600); return { id: ID(77), expires_at: new Date(Date.now() + 60000).toISOString() }; },
    cancel: async () => ({ status: "cancelled" }),
    state: async () => ({ status: "invited" }),
  }), []);

  if (!q || !data) return null;
  const guest = q.s === "guest";
  const account = guest ? null : { id: "lab", username: "עבד", avatar: q.c, grade: Number(q.g) };
  const first = data.friends[0];
  const initialSheet = q.s === "sheet" && first ? { friend: first } : q.s === "waiting" && first ? { friend: first, waiting: { id: ID(77), expires_at: new Date(Date.now() + 47000).toISOString() } } : null;
  const state = guest ? "guest" : q.s === "soon" ? "soon" : "ok";
  return (
    <>
      <HubView key={q.s} account={account} data={data} history={history} presence={{ liveId, status: "ok", offset: 0 }} actions={actions} state={state}
        cooldownUntil={cooldownUntil} onCooldown={setCooldownUntil} onLive={(id) => setLiveId(id)} sheetRef={sheetRef} initialSheet={initialSheet} />
      <nav className="dl-labnav" aria-label="מצבי תצוגה">
        {["hub", "sheet", "waiting", "empty", "guest", "soon"].map((s) => <a key={s} href={`?s=${s}&c=${q.c}&g=${q.g}`} style={{ fontWeight: q.s === s ? 700 : 400 }}>{s}</a>)}
      </nav>
    </>
  );
}
