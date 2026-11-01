'use client';
/* Sample students for the railway (local preview only: app/dev/railway).
   ?s=new | mid | pro | gold, ?g=7|8|9 */
import { useEffect, useState } from "react";
import { Railway, Insights } from "@/home/Journey";
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
  return { topics: t.sort((a, b) => (a.last < b.last ? 1 : -1)), chapters: c, totals, streak: kind === "new" ? 0 : 3, days: [], today: new Date().toISOString().slice(0, 10) };
}

export default function RailwayLab() {
  const [q, setQ] = useState(null);
  useEffect(() => { const p = new URLSearchParams(location.search); setQ({ s: p.get("s") || "mid", g: p.get("g") || "8" }); }, []);
  if (!q) return null;
  const all = CATEGORIES.flatMap((c) => TOPICS.filter((t) => t.cat === c.id).map((t) => ({ ...t, zone: { id: c.id, name: c.name, color: c.color } })));
  const mine = all.filter((t) => t.g.includes(q.g));
  const account = { id: "lab-" + q.s, username: "נועה", avatar: "violet", grade: q.g };
  const p = sample(q.s, mine);
  return (
    <div className="home">
      <main>
        <nav style={{ display: "flex", gap: 8, justifyContent: "center", margin: "12px 0", flexWrap: "wrap", direction: "ltr" }}>
          {["new", "mid", "pro", "gold"].map((s) => <a key={s} href={`?s=${s}&g=${q.g}`} style={{ fontWeight: q.s === s ? 700 : 400 }}>{s}</a>)}
          {" | "}
          {["7", "8", "9"].map((g) => <a key={g} href={`?s=${q.s}&g=${g}`} style={{ fontWeight: q.g === g ? 700 : 400 }}>g{g}</a>)}
        </nav>
        <Railway topics={mine} progress={p} account={account} gradeName={GRADES.find((g) => g.id === q.g).name} />
        <Insights progress={p} topics={all} />
      </main>
    </div>
  );
}
