'use client';
/* Signed-in home: the student's grade as a railway of topics (stations).
   v4 (2026-11-01), built so nothing is a mystery:
   - one "next step" ticket on top: the exact chapter, its topic and why;
   - one straight railway line: every topic is a station on it, coloured rail
     where the student has been, a dotted path where they haven't yet;
   - tap a station: it opens and shows its chapters as numbered stops, each
     with its name and progress (well spaced, never crowded);
   - tap a chapter: it opens in place and says what it is about (chapterInfo.js),
     how far the student got, and a button into exactly that chapter.
   The station of the next step is open on arrival, with that chapter open.
   Styles: src/styles/journey.css */
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { iconSvg } from "@/lib/icons";
import { Avatar } from "@/account/ui";
import { chapterStats, chapterTitle } from "./chapters";
import { topicInfo, chapterInfo } from "./chapterInfo";
import { levelOf, fmt, slugOf, ago, confettiAt } from "@/lib/progress";

export { levelOf };
const lastPart = (ch) => (ch || "").split(" › ").pop().replace(/^[0-9א-ת]{1,2}[.)]\s*/, "");
const Icon = ({ k }) => <span className="jr-ic" dangerouslySetInnerHTML={{ __html: iconSvg(k) }} />;
const Arrow = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 6l-6 6 6 6" /></svg>;
const Check = () => <svg viewBox="0 0 12 12" aria-hidden="true"><path d="M3 6.2l2 2 4-4.4" /></svg>;
const Chev = () => <svg className="chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>;
const chHref = (slug, name) => `/topics/${slug}` + (name ? `?ch=${encodeURIComponent(name)}` : "");
const isWeak = (c) => c.n >= 6 && c.acc != null && c.acc < 65;   // the same bar everywhere

/* zone glyphs: one per category */
const ZONE = { num: "±", alg: "x", fn: "ƒ", geo: "△" };
function zoneKey(z) {
  const n = (z && z.name) || "";
  if (/מספר/.test(n) || z?.id === "num") return "num";
  if (/פונקצ/.test(n) || z?.id === "fn") return "fn";
  if (/גיאומ/.test(n) || z?.id === "geo") return "geo";
  return "alg";
}

/* ── strengths and what to strengthen ─────────────────────────────────────── */
export function Insights({ progress, topics }) {
  const bySlug = Object.fromEntries(topics.map((t) => [t.slug, t]));
  const strong = (progress.topics || [])
    .map((t) => ({ ...t, slug: slugOf(t.page), n: t.ok + t.bad }))
    .filter((t) => bySlug[t.slug] && t.n >= 8 && t.ok / t.n >= 0.8)
    .sort((a, b) => b.win - a.win || b.ok / b.n - a.ok / a.n).slice(0, 3);
  const weak = (progress.chapters || [])
    .map((c) => ({ ...c, slug: slugOf(c.page), n: c.ok + c.bad }))
    .filter((c) => bySlug[c.slug] && c.n >= 4 && c.ok / c.n < 0.65)
    .sort((a, b) => a.ok / a.n - b.ok / b.n || b.bad - a.bad).slice(0, 3);
  const any = (progress.totals.ok + progress.totals.bad) > 0;

  if (!any) {
    return (
      <section className="jr-ins jr-ins-empty">
        <span aria-hidden="true">🧭</span>
        <p><b>כאן יופיעו החוזקות שלך ומה כדאי לחזק.</b> מתחילים בתחנה הראשונה במסלול, ואחרי כמה תרגילים נראה את התמונה.</p>
      </section>
    );
  }
  return (
    <section className="jr-ins" aria-label="חוזקות ומה לחזק">
      <div className="jr-card good">
        <div className="jr-card-h"><span aria-hidden="true">💪</span><h2>החוזקות שלך</h2></div>
        {strong.length ? (
          <ul>
            {strong.map((t) => (
              <li key={t.slug} data-topic={bySlug[t.slug].color}>
                <Icon k={bySlug[t.slug].icon} />
                <span className="jr-ins-t"><b>{bySlug[t.slug].name}</b><small>{Math.round((t.ok / t.n) * 100)}% נכון · {fmt(t.win)} נפתרו</small></span>
              </li>
            ))}
          </ul>
        ) : <p className="jr-ins-none">עוד מעט! נושא נכנס לכאן אחרי 8 תשובות עם 80% הצלחה ומעלה.</p>}
      </div>
      <div className="jr-card warn">
        <div className="jr-card-h"><span aria-hidden="true">🎯</span><h2>כדאי לחזק</h2></div>
        {weak.length ? (
          <ul>
            {weak.map((c) => (
              <li key={c.page + c.chapter} data-topic={bySlug[c.slug].color}>
                <Icon k={bySlug[c.slug].icon} />
                <span className="jr-ins-t"><b>{lastPart(c.chapter) || bySlug[c.slug].name}</b><small>{bySlug[c.slug].name} · {Math.round((c.ok / c.n) * 100)}% נכון</small></span>
                <Link className="jr-ins-go" href={`/topics/${c.slug}`}>לתרגל</Link>
              </li>
            ))}
          </ul>
        ) : <p className="jr-ins-none">אין כרגע פרק חלש. כל הכבוד! 🎉</p>}
      </div>
    </section>
  );
}

/* ── the next step: one rule for the ticket, the gold trail and the tags ── */
export function planNext(stations, here) {
  if (!stations.length) return null;
  const pick = (i, c, kind, why) => ({ i, ch: c ? { name: c.name, title: chapterTitle(c.name) } : null, kind, why });
  // 1. a chapter that keeps going wrong (enough answers to be sure)
  let weak = null;
  stations.forEach((st, i) => st.known.forEach((c) => {
    if (c.n >= 6 && c.acc != null && c.acc < 65 && (!weak || c.acc < weak.c.acc)) weak = { i, c };  // same bar as "worth strengthening" below
  }));
  if (weak) return pick(weak.i, weak.c, "weak", `כדאי לחזק · ${weak.c.acc}%`);
  // 2. keep going in the station practised last
  const h = stations[here];
  if (h && h.started) {
    const c = h.known.find((x) => x.state !== "solved");
    if (c) return pick(here, c, "go", "ממשיכים מאיפה שעצרת");
  }
  // 3. the next station not started yet
  const anyStarted = stations.some((s) => s.started);
  const after = stations.findIndex((s, i) => i >= here && !s.started);
  const ns = after >= 0 ? after : stations.findIndex((s) => !s.started);
  if (ns >= 0) return pick(ns, stations[ns].known[0], "new", anyStarted ? "התחנה הבאה במסלול" : "התחנה הראשונה במסלול");
  // 4. any chapter not solved yet
  for (let i = 0; i < stations.length; i++) {
    const c = stations[i].known.find((x) => x.state !== "solved");
    if (c) return pick(i, c, "go", "פרק שעוד לא פתרת");
  }
  // 5. level up the lowest station
  const low = stations.map((s, i) => ({ s, i })).filter(({ s }) => s.lv.i < 4).sort((a, b) => a.s.lv.i - b.s.lv.i || a.s.s.win - b.s.s.win)[0];
  return low ? pick(low.i, null, "level", `עוד ${fmt(low.s.lv.toNext)} תרגילים לרמת ${low.s.lv.nextName}`) : null;
}
const VERB = { weak: "לחזק", go: "להמשיך", new: "להתחיל", level: "לתרגל" };

function Ticket({ st, next }) {
  if (!st || !next) {
    return (
      <Link className="jr-tk gold" href="/profile">
        <span className="jr-tk-ic" aria-hidden="true">🏆</span>
        <span className="jr-tk-t"><small>כל המסלול הושלם</small><b>מדהים! כל התחנות בשליטה מלאה</b></span>
        <span className="jr-tk-go"><span>לפרופיל</span><Arrow /></span>
      </Link>
    );
  }
  return (
    <Link className={"jr-tk k-" + next.kind} data-topic={st.color} href={chHref(st.slug, next.ch && next.ch.name)}>
      <span className="jr-tk-ic"><Icon k={st.icon} /></span>
      <span className="jr-tk-t">
        <small>הצעד הבא{next.ch ? <> · {st.name}</> : null}</small>
        <b>{next.ch ? next.ch.title : st.name}</b>
        <em>{next.why}</em>
      </span>
      <span className="jr-tk-go"><span>{VERB[next.kind]}</span><Arrow /></span>
    </Link>
  );
}

/* ── the railway ──────────────────────────────────────────────────────────── */
export function Railway({ topics, progress, account, gradeName }) {
  const [toast, setToast] = useState(null);

  /* stations with their stats, level, chapters and how complete they are */
  const stats = useMemo(() => Object.fromEntries((progress.topics || []).map((t) => [slugOf(t.page), t])), [progress]);
  const stations = useMemo(() => topics.map((t) => {
    const s = stats[t.slug] || { ok: 0, bad: 0, win: 0 };
    const n = s.ok + s.bad;
    const known = chapterStats(t.slug, progress.chapters).filter((c) => c.known);
    const chDone = known.filter((c) => c.state === "solved").length;
    const lv = levelOf(s.win);
    const started = s.ok + s.bad + s.win > 0;
    // complete = every chapter solved (topics with no chapters: the "mastery" level)
    const comp = known.length ? chDone / known.length : Math.min(1, s.win / 15);
    return { ...t, s, n, known, chDone, comp, zk: zoneKey(t.zone), started, lv, acc: n >= 5 ? Math.round((s.ok / n) * 100) : null };
  }), [topics, stats, progress]);

  // "you are here": the station practised most recently (only real answers count); a new student starts at the first
  let here = 0, lastAt = 0;
  stations.forEach((st, i) => { const t = st.started && st.s.last ? new Date(st.s.last).getTime() : 0; if (t > lastAt) { lastAt = t; here = i; } });
  const startedCount = stations.filter((s) => s.started).length;
  const chAll = stations.reduce((a, s) => a + s.known.length, 0);
  const chDoneAll = stations.reduce((a, s) => a + s.chDone, 0);
  const allDone = stations.length > 0 && stations.every((s) => s.comp >= 1);
  const next = useMemo(() => planNext(stations, here), [stations, here]);
  const pct = chAll ? Math.round((chDoneAll / chAll) * 100) : 0;

  /* what is open: by default the station of the next step, with its chapter open */
  const focus = next ? next.i : here;
  const [openSt, setOpenSt] = useState(null);           // null = only the focus station
  const [openCh, setOpenCh] = useState(undefined);      // undefined = the next chapter
  const stOpen = (i) => (openSt ? openSt.includes(i) : i === focus);
  const toggleSt = (i) => setOpenSt((cur) => { const list = cur || [focus]; return list.includes(i) ? list.filter((x) => x !== i) : [...list, i]; });
  const curCh = openCh === undefined ? (next && next.ch ? `${next.i}:${next.ch.name}` : null) : openCh;
  const toggleCh = (key) => setOpenCh(curCh === key ? null : key);

  /* level-up celebration: the first time a new level is seen on this device */
  useEffect(() => {
    if (!account || !stations.length) return;
    const key = "mp:seenlv:" + account.id;
    let seen = null;
    try { seen = JSON.parse(localStorage.getItem(key)); } catch {}
    const now = Object.fromEntries(stations.map((s) => [s.slug, s.lv.i]));
    try { localStorage.setItem(key, JSON.stringify({ ...(seen || {}), ...now })); } catch {}
    if (!seen) return;
    const up = stations.map((s, i) => ({ s, i })).filter(({ s }) => s.lv.i >= 2 && s.lv.i > (seen[s.slug] || 0)).sort((a, b) => b.s.lv.i - a.s.lv.i)[0];
    if (!up) return;
    const t = setTimeout(() => {
      setToast({ name: up.s.name, lv: up.s.lv.name, color: up.s.color });
      const node = document.querySelector(`.jr [data-st="${up.i}"] .jr-node`);
      if (node) { const r = node.getBoundingClientRect(); if (r.top > -40 && r.top < innerHeight) confettiAt(r.left + r.width / 2, r.top + r.height / 2, 46); }
    }, 1200);
    return () => clearTimeout(t);
  }, [stations.length, account && account.id]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(null), 5200); return () => clearTimeout(t); }, [toast]);

  if (!stations.length) return null;
  const first = stations[0];

  return (
    <section className="jr" aria-labelledby="jr-h">
      <header className="jr-head">
        <div className="jr-head-row">
          <div className="jr-head-t">
            <h2 id="jr-h">המסלול שלי · {gradeName}</h2>
            <p>{startedCount
              ? <><b>{fmt(chDoneAll)}</b> מתוך {fmt(chAll)} פרקים נפתרו</>
              : <>{fmt(stations.length)} נושאים ו־{fmt(chAll)} פרקים מחכים לך</>}</p>
          </div>
          <span className="jr-pct" style={{ "--p": pct / 100 }} aria-label={`${pct}% מהמסלול`}><b>{pct}%</b></span>
        </div>
        <Ticket st={next ? stations[next.i] : null} next={next} />
      </header>
      {toast && (
        <div className="jr-toast" data-topic={toast.color} role="status">
          <span aria-hidden="true">🎉</span><div><b>עלית רמה!</b> {toast.name}: <b>{toast.lv}</b></div>
          <button type="button" onClick={() => setToast(null)} aria-label="סגירה">✕</button>
        </div>
      )}

      <ol className="jr-line">
        <li className={"jr-dep" + (first.started ? " on" : "")} data-topic={first.color} aria-hidden="true"><span>יציאה</span></li>
        {stations.map((st, i) => (
          <Station key={st.slug} st={st} i={i} account={account}
            zoneHead={i === 0 || st.zk !== stations[i - 1].zk}
            zoneCount={stations.filter((x) => x.zk === st.zk).length}
            isHere={i === here && st.started} next={next && next.i === i ? next : null}
            open={stOpen(i)} onToggle={() => toggleSt(i)} curCh={curCh} onCh={toggleCh} />
        ))}
        <li className={"jr-end" + (allDone ? " done" : "")}>
          <span className="jr-flag" aria-hidden="true">🏆</span>
          <span className="jr-end-t">{allDone ? `סיימת את כל המסלול של ${gradeName}!` : `קו הסיום של ${gradeName}`}</span>
        </li>
      </ol>
    </section>
  );
}

/* one station: a header row on the line, and its chapters when open */
function Station({ st, i, account, zoneHead, zoneCount, isHere, next, open, onToggle, curCh, onCh }) {
  const state = st.comp >= 1 ? "done" : st.started ? "on" : "off";
  const nCh = st.known.length;
  const sub = !st.started
    ? (nCh ? `${fmt(nCh)} פרקים · עוד לא התחלת` : "עוד לא התחלת")
    : nCh ? `${fmt(st.chDone)} מתוך ${fmt(nCh)} פרקים · ${st.lv.name}` : `${fmt(st.s.win)} נפתרו · ${st.lv.name}`;
  const tag = isHere ? <span className="jr-tag here">את/ה כאן</span>
    : next ? <span className="jr-tag nx">{next.kind === "new" ? "התחנה הבאה" : "הצעד הבא"}</span> : null;
  const bodyId = "jr-b-" + st.slug;
  return (
    <li data-st={i} className={`jr-st ${state}${isHere ? " here" : ""}${next ? " is-next" : ""}${open ? " open" : ""}`} data-topic={st.color} style={{ "--i": i, "--p": st.comp }}>
      {zoneHead && st.zone && (
        <div className="jr-zh" data-topic={st.zone.color || "teal"}>
          <span className="jr-zg" aria-hidden="true">{ZONE[st.zk]}</span>
          <h3 className="t"><b>{st.zone.name}</b>{zoneCount > 0 && <small>{zoneCount === 1 ? "נושא אחד" : `${fmt(zoneCount)} נושאים`}</small>}</h3>
        </div>
      )}
      <button type="button" className="jr-sth" aria-expanded={open} aria-controls={bodyId} onClick={onToggle}>
        <span className="jr-node">
          <Icon k={st.icon} />
          {state === "done" && <span className="jr-badge" aria-hidden="true">{st.lv.i >= 4 ? "💎" : st.lv.i >= 3 ? "👑" : <Check />}</span>}
          {isHere && <span className="jr-me" aria-hidden="true"><Avatar account={account} size={22} /></span>}
        </span>
        <span className="jr-stt">
          {tag}
          <b>{st.name}</b>
          <small>{sub}</small>
          {st.started && nCh > 0 && <span className="jr-mini" aria-hidden="true"><i style={{ width: Math.max(4, st.comp * 100) + "%" }} /></span>}
        </span>
        <Chev />
      </button>

      <div className="jr-stb" id={bodyId} inert={!open}>
        <div className="jr-stb-in">
          <p className="jr-about">{topicInfo(st.slug)}</p>
          {nCh > 0 ? (
            <ol className="jr-chs">
              {st.known.map((c, k) => <Chapter key={c.name} st={st} c={c} k={k} n={nCh} nx={!!(next && next.ch && next.ch.name === c.name)} open={curCh === `${i}:${c.name}`} onToggle={() => onCh(`${i}:${c.name}`)} />)}
            </ol>
          ) : (
            <Link className="jr-go solo" href={chHref(st.slug)}><span>{st.started ? "להמשיך לתרגל" : "להתחיל לתרגל"}</span><Arrow /></Link>
          )}
          {st.started && (
            <div className="jr-stf">
              <span><b>{fmt(st.s.win)}</b> נפתרו</span>
              {st.acc != null && <span><b>{st.acc}%</b> נכון</span>}
              {st.s.last && <span>{ago(st.s.last)}</span>}
              <Link href={`/profile/${st.slug}`}>כל הפרטים</Link>
            </div>
          )}
        </div>
      </div>
    </li>
  );
}

/* one chapter: a numbered stop with its name; opens to say what it is about */
function Chapter({ st, c, k, n, nx, open, onToggle }) {
  const weak = isWeak(c);
  const pill = nx ? <em className="nx">הבא</em>
    : weak ? <em className="weak">כדאי לחזק</em>
    : c.state === "solved" ? <em className="ok">{c.win === 1 ? "נפתר 1" : `${fmt(c.win)} נפתרו`}</em>
    : c.state === "tried" ? <em className="tried">התחלת</em> : null;
  const verb = weak ? "לחזק את הפרק" : c.state === "solved" ? "לתרגל שוב" : c.state === "tried" ? "להמשיך בפרק" : "להתחיל את הפרק";
  const about = chapterInfo(st.slug, c.name);
  return (
    <li className={`jr-ch ${c.state}${weak ? " weak" : ""}${nx ? " nx" : ""}${open ? " open" : ""}`} style={{ "--k": k }}>
      <button type="button" className="jr-chh" aria-expanded={open} onClick={onToggle}>
        <span className="jr-stop" aria-hidden="true">{c.state === "solved" ? <Check /> : <span>{k + 1}</span>}</span>
        <span className="nm">{chapterTitle(c.name)}</span>
        {pill}
        <Chev />
      </button>
      <div className="jr-chb" inert={!open}>
        <div className="jr-chb-in">
          {about && <p>{about}</p>}
          <div className="jr-chips">
            <span>פרק {fmt(k + 1)} מתוך {fmt(n)}</span>
            {c.win > 0 && <span className="ok">✓ {c.win === 1 ? "נפתר תרגיל 1" : `${fmt(c.win)} תרגילים נפתרו`}</span>}
            {c.acc != null && <span className={weak ? "weak" : ""}>{c.acc}% נכון</span>}
            {c.state === "off" && <span>עוד לא התחלת</span>}
          </div>
          <Link className="jr-go" href={chHref(st.slug, c.name)}><span>{verb}</span><Arrow /></Link>
        </div>
      </div>
    </li>
  );
}
