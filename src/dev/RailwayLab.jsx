'use client';
/* Sample students for the railway (local preview only: app/dev/railway).
   ?s=new | mid | pro | gold | abed, ?g=7|8|9
   ?d=none|0|1|3|6: the duel tile with a sample (no friends / friends online now) */
import { useEffect, useState } from "react";
import { Railway, Insights } from "@/home/Journey";
import { HomeHero } from "@/home/HomeHero";
import { Bar as BottomBar } from "@/components/BottomNav";
import { AccountMenu } from "@/account/ui";
import { HERO } from "@/home/catalog";
import { TOPICS, CATEGORIES, GRADES } from "@/home/catalog";
import { CHAPTERS } from "@/home/chapters";

const ago = (h) => new Date(Date.now() - h * 3600e3).toISOString();
function sample(kind, topics) {
  const t = [], c = [];
  // how far each topic got, by preset: [win, ok, bad, hoursAgo]
  const plan = {
    new: [],
    mid: [[7, 30, 6, 50], [3, 12, 9, 30], [1, 4, 5, 2]],
    pro: [[34, 120, 10, 200], [18, 70, 9, 120], [9, 30, 14, 60], [5, 22, 4, 26], [2, 8, 7, 3]],
    gold: topics.map((_, i) => [16 + i * 3, 70, 6, 300 - i * 20]),
  }[kind] || [];
  // "abed": many exercises solved, few step checks (the case that hid strengths, 2026-11-02)
  if (kind === "abed") {
    [["directed-numbers", 14, 3, 1, 20], ["powers-roots", 11, 2, 0, 5], ["equation-solver", 1, 0, 0, 40], ["ratio-percent", 0, 2, 7, 3]].forEach(([page, win, ok, bad, h]) => {
      t.push({ page, ok, bad, win, last: ago(h) });
      const ch = (CHAPTERS[page] || [])[1];
      if (ch) c.push({ page, chapter: ch, ok, bad, win, last: ago(h) });
    });
  }
  plan.forEach(([win, ok, bad, h], i) => {
    const tp = topics[i];
    if (!tp) return;
    t.push({ page: tp.slug, ok, bad, win, last: ago(h) });
    const chs = CHAPTERS[tp.slug] || [];
    const nCh = Math.max(1, Math.round(chs.length * Math.min(1, win / 15 + 0.2)));
    chs.slice(0, nCh).forEach((name, k) => {
      const w = k === nCh - 1 && win < 15 ? 0 : Math.max(1, Math.round(win / nCh));
      c.push({ page: tp.slug, chapter: name, ok: Math.round(ok / nCh), bad: k === 1 ? bad : 1, win: w, last: ago(h + k) });
    });
  });
  const totals = t.reduce((a, x) => ({ ok: a.ok + x.ok, bad: a.bad + x.bad, win: a.win + x.win }), { ok: 0, bad: 0, win: 0 });
  return { topics: t.sort((a, b) => (a.last < b.last ? 1 : -1)), chapters: c, totals, streak: kind === "new" ? 0 : 3, days: kind === "new" ? [] : [0, 1, 3].map((d) => ({ day: new Date(Date.now() - d * 864e5).toISOString().slice(0, 10), ok: 5, bad: 1, win: 2 })), today: new Date().toISOString().slice(0, 10) };
}

export default function RailwayLab() {
  const [q, setQ] = useState(null);
  useEffect(() => { const p = new URLSearchParams(location.search); setQ({ s: p.get("s") || "mid", g: p.get("g") || "8", h: p.get("h") || "sky", av: p.get("av") || "", who: p.get("who") || "boy", c: p.get("c") || "", u: p.get("u") || "", d: p.get("d") }); }, []);
  if (!q) return null;
  const all = CATEGORIES.flatMap((c) => TOPICS.filter((t) => t.cat === c.id).map((t) => ({ ...t, zone: { id: c.id, name: c.name, color: c.color } })));
  const mine = all.filter((t) => t.g.includes(q.g));
  const account = { id: "lab-" + q.s, username: q.u || "נועה", avatar: q.c || "violet", grade: q.g, weekly_goal: 4 };
  const p = sample(q.s, mine);
  const people = [{ username: "תמר", avatar: "pink" }, { username: "yoav_10", avatar: "orange" }, { username: "עומר", avatar: "sky" }];
  const duel = q.d == null ? undefined : q.d === "none" ? { online: 0, friends: 0, faces: [] }
    : { online: Number(q.d) || 0, friends: 7, faces: people.slice(0, Math.min(3, Number(q.d) || 0)) };
  return (
    <div className="home in" data-topic={account.avatar}>
      <main>
        <HomeHero account={account} p={p} gradeName={GRADES.find((g) => g.id === q.g).name} look={q.h} figure={q.av ? { src: `/avatars/3d/${q.who}.glb` } : undefined} duel={duel} />
        <nav style={{ display: "flex", gap: 8, justifyContent: "center", margin: "12px 0", flexWrap: "wrap", direction: "ltr" }}>
          {["new", "mid", "pro", "gold", "abed"].map((s) => <a key={s} href={`?s=${s}&g=${q.g}`} style={{ fontWeight: q.s === s ? 700 : 400 }}>{s}</a>)}
          {" | "}
          {["7", "8", "9"].map((g) => <a key={g} href={`?s=${q.s}&g=${g}&h=${q.h}`} style={{ fontWeight: q.g === g ? 700 : 400 }}>g{g}</a>)}
          {" | "}
          {["sky", "night", "card"].map((h) => <a key={h} href={`?s=${q.s}&g=${q.g}&h=${h}`} style={{ fontWeight: q.h === h ? 700 : 400 }}>{h}</a>)}
        </nav>
        <Railway topics={mine} progress={p} account={account} gradeName={GRADES.find((g) => g.id === q.g).name} />
        <Insights progress={p} topics={all} />
      </main>
      <BottomBar account={account} path="/" duelsOn={q.d != null} />
    </div>
  );
}
