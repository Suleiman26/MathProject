'use client';
/* The student's profile: who they are, how they're doing, and their settings. */
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { accountApi, AVATARS, passChecks, PASS_PROBLEM, useAccount } from "@/lib/account";
import { iconSvg } from "@/lib/icons";
import { CATEGORIES, TOPICS } from "@/home/catalog";
import { AcctShell, Avatar, PasswordInput, Spinner } from "./ui";

const LEVELS = [
  { min: 0, name: "עוד לא התחלת" },
  { min: 1, name: "התחלה" },
  { min: 5, name: "התקדמות" },
  { min: 15, name: "שליטה" },
  { min: 30, name: "מומחיות" },
];
const GRADE_NAME = { 7: "כיתה ז׳", 8: "כיתה ח׳", 9: "כיתה ט׳" };
const DAY = ["א׳", "ב׳", "ג׳", "ד׳", "ה׳", "ו׳", "ש׳"];
const MONTH = ["ינו׳", "פבר׳", "מרץ", "אפר׳", "מאי", "יוני", "יולי", "אוג׳", "ספט׳", "אוק׳", "נוב׳", "דצמ׳"];
const fmt = (n) => Number(n || 0).toLocaleString("he-IL");
const slugOf = (page) => (page || "").replace(/\.html$/, "");
const byslug = Object.fromEntries(TOPICS.map((t) => [t.slug, t]));

function levelOf(win) {
  let i = 0;
  LEVELS.forEach((l, k) => { if (win >= l.min) i = k; });
  const next = LEVELS[i + 1];
  const pct = next ? Math.round(((win - LEVELS[i].min) / (next.min - LEVELS[i].min)) * 100) : 100;
  return { i, name: LEVELS[i].name, next, pct };
}
function ago(t) {
  const s = (Date.now() - new Date(t).getTime()) / 1000;
  if (s < 90) return "עכשיו";
  if (s < 3600) return `לפני ${Math.round(s / 60)} דק׳`;
  if (s < 86400) return `לפני ${Math.round(s / 3600)} שע׳`;
  const d = Math.round(s / 86400);
  return d === 1 ? "אתמול" : d < 7 ? `לפני ${d} ימים` : new Date(t).toLocaleDateString("he-IL", { day: "numeric", month: "short" });
}
// long usernames may wrap only after "_" "." "-" (never in the middle of a word)
function breakable(name) { return name.split(/(?<=[_.-])/).flatMap((part, i) => (i ? [<wbr key={i} />, part] : [part])); }
function TopicIcon({ k }) { return <span className="pf-ic" dangerouslySetInnerHTML={{ __html: iconSvg(k) }} />; }

export default function Profile() {
  const router = useRouter();
  const { ready, account } = useAccount();
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");
  const [welcome, setWelcome] = useState(false);
  const leaving = useRef(false);

  // signed out elsewhere (or session expired) → sign-in page; leaving on purpose (sign-out / delete) goes home instead
  useEffect(() => {
    if (!ready || leaving.current) return;
    if (!account || account.needs_terms) router.replace("/login");
  }, [ready, account, router]);
  useEffect(() => { try { setWelcome(new URLSearchParams(location.search).has("welcome")); } catch {} }, []);
  useEffect(() => {
    if (!ready || !account) return;
    accountApi.progress().then(setData).catch((e) => setErr(e.message === "not-connected" ? "אין חיבור למסד." : "לא הצלחנו לטעון את ההתקדמות. נסו לרענן."));
  }, [ready, account && account.id]);

  if (!ready || !account) return <AcctShell wide><div className="pf-loading"><Spinner /></div></AcctShell>;

  return (
    <AcctShell wide>
      <div className="pf">
        <ProfileHero account={account} data={data} />
        {welcome && <Welcome claimed={data && (data.totals.ok + data.totals.bad + data.totals.win) > 0} onClose={() => { setWelcome(false); history.replaceState(null, "", "/profile"); }} />}
        {err && <div className="acct-alert" role="alert">{err}</div>}
        {!data && !err ? <Skeleton /> : data && <>
          {(data.totals.ok + data.totals.bad + data.totals.win) === 0
            ? <EmptyStart grade={account.grade} />
            : <>
              <Kpis data={data} />
              <Calendar days={data.days} today={data.today} />
              <div className="pf-cols">
                <TopicProgress topics={data.topics} grade={account.grade} />
                <Recent recent={data.recent} />
              </div>
            </>}
        </>}
        <Settings account={account} leaving={leaving} />
      </div>
    </AcctShell>
  );
}

function ProfileHero({ account, data }) {
  const since = new Date(account.created_at).toLocaleDateString("he-IL", { month: "long", year: "numeric" });
  return (
    <section className="pf-hero" data-topic={account.avatar}>
      <div className="pf-hero-bg" aria-hidden="true" />
      <Avatar account={account} size={76} />
      <div className="pf-id">
        <h1 className={account.username.length > 12 ? "long" : ""}>{breakable(account.username)}</h1>
        <p>{account.grade ? GRADE_NAME[account.grade] + " · " : ""}איתנו מאז {since}</p>
      </div>
      {data && data.streak > 0 && <div className="pf-streak" title="ימים ברצף"><span aria-hidden="true">🔥</span><b>{data.streak}</b><small>{data.streak === 1 ? "יום ברצף" : "ימים ברצף"}</small></div>}
    </section>
  );
}

function Welcome({ claimed, onClose }) {
  return (
    <div className="pf-welcome card-in" role="status">
      <span aria-hidden="true">🎉</span>
      <div><b>החשבון נפתח!</b> {claimed ? "מה שתרגלת במכשיר הזה לפני ההרשמה כבר נשמר כאן." : "מעכשיו כל תרגיל שתפתור/י נשמר כאן."}</div>
      <button type="button" className="pf-x" onClick={onClose} aria-label="סגירה">✕</button>
    </div>
  );
}

function Skeleton() {
  return <div className="pf-skel" aria-hidden="true"><span /><span /><span /><span /><div /></div>;
}

function Kpis({ data }) {
  const t = data.totals;
  const tries = t.ok + t.bad;
  const acc = tries >= 5 ? Math.round((t.ok / tries) * 100) : null;
  const items = [
    { k: "win", icon: "✓", label: "תרגילים שפתרת", value: fmt(t.win), sub: `${fmt(t.ok)} תשובות נכונות` },
    { k: "acc", icon: "◎", label: "דיוק", value: acc == null ? "—" : acc + "%", sub: acc == null ? "יופיע אחרי 5 תשובות" : "מכל הניסיונות", ring: acc },
    { k: "streak", icon: "🔥", label: "רצף", value: fmt(data.streak), sub: `השיא שלך: ${fmt(data.best_streak)} ${data.best_streak === 1 ? "יום" : "ימים"}` },
    { k: "days", icon: "▦", label: "ימי תרגול", value: fmt(t.days), sub: `ב-${fmt(t.topics)} ${t.topics === 1 ? "נושא" : "נושאים"}` },
  ];
  return (
    <section className="pf-kpis" aria-label="סיכום">
      {items.map((x, i) => (
        <div key={x.k} className={"pf-kpi " + x.k} style={{ "--i": i }}>
          <div className="pf-kpi-t"><span className="pf-kpi-i" aria-hidden="true">{x.icon}</span>{x.label}</div>
          <div className="pf-kpi-v">{x.value}</div>
          <div className="pf-kpi-s">{x.sub}</div>
          {x.ring != null && <svg className="pf-ring" viewBox="0 0 36 36" aria-hidden="true"><circle cx="18" cy="18" r="15.5" /><circle cx="18" cy="18" r="15.5" className="v" style={{ strokeDasharray: `${(x.ring / 100) * 97.4} 97.4` }} /></svg>}
        </div>
      ))}
    </section>
  );
}

/* Practice calendar: as many weeks as fit the width (up to a year), oldest on the
   right (reading direction), today at the far left. */
function Calendar({ days, today }) {
  const [tip, setTip] = useState(null);
  const [WEEKS, setWeeks] = useState(18);
  const [cell, setCell] = useState(13);
  const box = useRef(null);
  useEffect(() => {
    const el = box.current;
    if (!el || !window.ResizeObserver) return;
    // phones: as many weeks as fit with small squares; wider screens: half a year, squares grow to fill
    const ro = new ResizeObserver(([e]) => {
      const w = e.contentRect.width - 30;
      if (w < 640) { setCell(13); setWeeks(Math.max(12, Math.min(26, Math.floor(w / 16)))); }
      else { setWeeks(26); setCell(Math.max(14, Math.min(26, Math.floor(w / 26) - 4))); }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const { weeks, months, total, active } = useMemo(() => {
    const map = Object.fromEntries((days || []).map((d) => [d.day, d]));
    const end = new Date(today + "T12:00:00");
    const start = new Date(end); start.setDate(start.getDate() - end.getDay() - (WEEKS - 1) * 7);
    const weeks = [], months = [];
    let total = 0, active = 0;
    for (let w = 0; w < WEEKS; w++) {
      const col = [];
      for (let d = 0; d < 7; d++) {
        const dt = new Date(start); dt.setDate(start.getDate() + w * 7 + d);
        const key = dt.toISOString().slice(0, 10);
        const rec = map[key];
        const n = rec ? rec.ok + rec.bad + rec.win : 0;
        if (dt <= end) { total += n; if (n) active++; }
        col.push({ key, dt, n, rec, future: dt > end });
      }
      const first = col[0].dt;
      if (w === 0 || first.getDate() <= 7) months.push({ w, label: MONTH[first.getMonth()] });
      weeks.push(col);
    }
    return { weeks, months, total, active };
  }, [days, today, WEEKS]);
  const lvl = (n) => (n === 0 ? 0 : n < 4 ? 1 : n < 10 ? 2 : n < 20 ? 3 : 4);
  function show(e, c) {
    if (c.future) return;
    const r = e.currentTarget.getBoundingClientRect(), b = box.current.getBoundingClientRect();
    const date = c.dt.toLocaleDateString("he-IL", { weekday: "long", day: "numeric", month: "long" });
    const text = c.n ? `${fmt(c.n)} תשובות${c.rec.win ? ` · ${fmt(c.rec.win)} תרגילים נפתרו` : ""}` : "לא תרגלת";
    setTip({ x: r.left - b.left + r.width / 2, y: r.top - b.top, date, text });
  }
  return (
    <section className="pf-card pf-cal" aria-labelledby="cal-h">
      <div className="pf-card-h">
        <h2 id="cal-h">יומן תרגול</h2>
        <p>{fmt(active)} ימי תרגול {WEEKS === 26 ? "בחצי השנה האחרונה" : `ב-${WEEKS} השבועות האחרונים`} · {fmt(total)} תשובות</p>
      </div>
      <div className="pf-cal-box" ref={box} onMouseLeave={() => setTip(null)}>
        <div className="pf-cal-scroll">
          <div className="pf-cal-grid" style={{ "--w": WEEKS, "--c": cell + "px" }}>
            <div className="pf-cal-months" aria-hidden="true">{months.map((m) => <span key={m.w} style={{ gridColumn: m.w + 2 }}>{m.label}</span>)}</div>
            <div className="pf-cal-days" aria-hidden="true">{DAY.map((d, i) => <span key={d} style={{ gridRow: i + 2 }}>{i % 2 === 0 ? d : ""}</span>)}</div>
            {weeks.map((col, w) => col.map((c, d) => (
              <button key={c.key} type="button" className={"pf-cell l" + lvl(c.n) + (c.future ? " fut" : "") + (c.key === today ? " today" : "")}
                style={{ gridColumn: w + 2, gridRow: d + 2 }} disabled={c.future} tabIndex={c.key === today ? 0 : -1}
                aria-label={c.future ? undefined : `${c.dt.toLocaleDateString("he-IL", { day: "numeric", month: "long" })}: ${c.n ? fmt(c.n) + " תשובות" : "לא תרגלת"}`}
                onMouseEnter={(e) => show(e, c)} onFocus={(e) => show(e, c)} onClick={(e) => show(e, c)} onBlur={() => setTip(null)} />
            )))}
          </div>
        </div>
        {tip && <div className="pf-tip" style={{ left: tip.x, top: tip.y }} role="tooltip"><b>{tip.date}</b><span>{tip.text}</span></div>}
      </div>
      <div className="pf-cal-legend" aria-hidden="true"><span>פחות</span>{[0, 1, 2, 3, 4].map((l) => <i key={l} className={"pf-cell l" + l} />)}<span>יותר</span></div>
    </section>
  );
}

function TopicProgress({ topics, grade }) {
  const [showAll, setShowAll] = useState(false);
  const stats = Object.fromEntries((topics || []).map((t) => [slugOf(t.page), t]));
  const started = TOPICS.filter((t) => stats[t.slug] && (stats[t.slug].ok + stats[t.slug].bad + stats[t.slug].win) > 0)
    .sort((a, b) => new Date(stats[b.slug].last) - new Date(stats[a.slug].last));
  const rest = TOPICS.filter((t) => !started.includes(t) && (!grade || t.g.includes(grade)));
  const others = TOPICS.filter((t) => !started.includes(t) && grade && !t.g.includes(grade));
  return (
    <section className="pf-card pf-topics" aria-labelledby="tp-h">
      <div className="pf-card-h"><h2 id="tp-h">ההתקדמות שלי בנושאים</h2><p>הרמה עולה עם כל תרגיל שפותרים עד הסוף.</p></div>
      <ul className="pf-tlist">
        {started.map((t, i) => {
          const s = stats[t.slug];
          const lv = levelOf(s.win);
          const tries = s.ok + s.bad;
          const acc = tries >= 5 ? Math.round((s.ok / tries) * 100) : null;
          return (
            <li key={t.slug} className="pf-trow" data-topic={t.color} style={{ "--i": i }}>
              <TopicIcon k={t.icon} />
              <div className="pf-tmain">
                <div className="pf-tname"><b>{t.name}</b><span className={"pf-lv l" + lv.i}>{lv.name}</span></div>
                <div className="pf-bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={lv.pct}
                  aria-label={lv.next ? `עד הרמה הבאה (${lv.next.name}): ${lv.pct}%` : "הרמה הגבוהה ביותר"}><i style={{ width: lv.pct + "%" }} /></div>
                <div className="pf-tmeta">
                  <span>{fmt(s.win)} נפתרו</span>
                  {acc != null && <span>{acc}% דיוק</span>}
                  <span>{ago(s.last)}</span>
                  {lv.next && <span className="pf-next">עוד {fmt(lv.next.min - s.win)} ל{lv.next.name}</span>}
                </div>
              </div>
              <Link className="pf-go" href={`/topics/${t.slug}`} aria-label={`להמשיך לתרגל ${t.name}`}>
                <span>להמשיך</span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 6l-6 6 6 6" /></svg>
              </Link>
            </li>
          );
        })}
      </ul>
      {(rest.length > 0 || others.length > 0) && <div className="pf-todo">
        <h3>{grade ? `עוד לא התחלת (${GRADE_NAME[grade]})` : "עוד לא התחלת"}</h3>
        <div className="pf-chips">
          {(showAll ? [...rest, ...others] : rest).map((t) => (
            <Link key={t.slug} href={`/topics/${t.slug}`} className="pf-chip" data-topic={t.color}><TopicIcon k={t.icon} />{t.name}</Link>
          ))}
          {others.length > 0 && <button type="button" className="pf-chip more" onClick={() => setShowAll(!showAll)}>{showAll ? "רק הכיתה שלי" : `+ ${others.length} מכיתות אחרות`}</button>}
        </div>
      </div>}
    </section>
  );
}

function Recent({ recent }) {
  const [all, setAll] = useState(false);
  if (!recent || !recent.length) return null;
  const list = all ? recent : recent.slice(0, 5);
  return (
    <section className="pf-card pf-recent" aria-labelledby="rc-h">
      <div className="pf-card-h"><h2 id="rc-h">פעילות אחרונה</h2></div>
      <ol className="pf-feed">
        {list.map((r, i) => {
          const t = byslug[slugOf(r.page)];
          const ch = (r.chapter || "").split(" › ").pop();
          return (
            <li key={i} data-topic={t ? t.color : "teal"}>
              <i className="dot" aria-hidden="true" />
              <div>
                <b>{t ? t.name : slugOf(r.page)}</b>{ch && <span className="ch">{ch}</span>}
                <div className="pf-feed-m">
                  {r.win > 0 && <span className="w">{fmt(r.win)} נפתרו</span>}
                  {r.ok > 0 && <span className="o">{fmt(r.ok)} ✓</span>}
                  {r.bad > 0 && <span className="x">{fmt(r.bad)} ✗</span>}
                  <time>{ago(r.last)}</time>
                </div>
              </div>
            </li>
          );
        })}
      </ol>
      {recent.length > 5 && <button type="button" className="pf-more" onClick={() => setAll(!all)}>{all ? "פחות" : `עוד ${recent.length - 5}`}</button>}
    </section>
  );
}

function EmptyStart({ grade }) {
  const list = TOPICS.filter((t) => !grade || t.g.includes(grade)).slice(0, 6);
  return (
    <section className="pf-card pf-empty">
      <div className="pf-empty-art" aria-hidden="true">x²</div>
      <h2>עוד לא תרגלת</h2>
      <p>בחר/י נושא ופתור/י תרגיל ראשון. ההתקדמות, הרצף והרמות יופיעו כאן.</p>
      <div className="pf-chips center">
        {list.map((t) => <Link key={t.slug} href={`/topics/${t.slug}`} className="pf-chip" data-topic={t.color}><TopicIcon k={t.icon} />{t.name}</Link>)}
      </div>
    </section>
  );
}

function Settings({ account, leaving }) {
  const router = useRouter();
  const [msg, setMsg] = useState("");
  const [pw, setPw] = useState({ old: "", n1: "", n2: "" });
  const [pwMsg, setPwMsg] = useState(null);
  const [del, setDel] = useState({ open: false, pw: "" });
  const [delMsg, setDelMsg] = useState("");
  const [busy, setBusy] = useState("");

  async function update(grade, avatar) {
    setBusy("prefs");
    try { await accountApi.update(grade, avatar); setMsg("נשמר ✓"); setTimeout(() => setMsg(""), 1800); }
    catch { setMsg("לא נשמר. נסו שוב."); }
    finally { setBusy(""); }
  }
  async function changePw(e) {
    e.preventDefault();
    if (pw.n1 !== pw.n2) return setPwMsg({ k: "bad", t: "הסיסמאות החדשות לא זהות." });
    if (!passChecks(pw.n1).every((c) => c.ok)) return setPwMsg({ k: "bad", t: "הסיסמה החדשה: 8 תווים לפחות, עם אותיות וספרות." });
    setBusy("pw");
    try {
      const r = await accountApi.password(pw.old, pw.n1);
      if (r && r.ok) { setPw({ old: "", n1: "", n2: "" }); setPwMsg({ k: "ok", t: "הסיסמה הוחלפה. מכשירים אחרים נותקו." }); }
      else setPwMsg({ k: "bad", t: r && r.error === "wrong" ? "הסיסמה הנוכחית לא נכונה." : "הסיסמה החדשה: " + (PASS_PROBLEM[r && r.problem] || "לא תקינה") });
    } catch { setPwMsg({ k: "bad", t: "אין חיבור. נסו שוב." }); }
    finally { setBusy(""); }
  }
  async function remove(e) {
    e.preventDefault();
    setBusy("del");
    try {
      leaving.current = true;
      const r = await accountApi.remove(del.pw);
      if (r && r.ok) { router.replace("/?deleted=1"); return; }
      leaving.current = false;
      setDelMsg("הסיסמה לא נכונה.");
    } catch { leaving.current = false; setDelMsg("אין חיבור. נסו שוב."); }
    finally { setBusy(""); }
  }

  return (
    <section className="pf-card pf-settings" id="settings" aria-labelledby="st-h">
      <div className="pf-card-h"><h2 id="st-h">הגדרות</h2>{msg && <span className="pf-saved" role="status">{msg}</span>}</div>

      <div className="pf-set-row">
        <div className="pf-set-l"><b>כיתה</b><small>כדי להציע לך נושאים מתאימים</small></div>
        <div className="acct-seg sm" role="radiogroup" aria-label="כיתה">
          {["7", "8", "9"].map((g) => <button key={g} type="button" role="radio" aria-checked={account.grade === g} className={account.grade === g ? "on" : ""}
            disabled={busy === "prefs"} onClick={() => update(account.grade === g ? null : g, account.avatar)}>{GRADE_NAME[g]}</button>)}
        </div>
      </div>

      <div className="pf-set-row">
        <div className="pf-set-l"><b>צבע</b><small>הצבע של התמונה שלך</small></div>
        <div className="pf-swatches" role="radiogroup" aria-label="צבע">
          {AVATARS.map((c) => <button key={c} type="button" role="radio" aria-checked={account.avatar === c} aria-label={c} data-topic={c}
            className={"pf-sw" + (account.avatar === c ? " on" : "")} disabled={busy === "prefs"} onClick={() => update(account.grade, c)} />)}
        </div>
      </div>

      <details className="pf-set-more">
        <summary>החלפת סיסמה</summary>
        <form className="acct-form" onSubmit={changePw}>
          <div className="acct-field"><label htmlFor="pw-old">הסיסמה הנוכחית</label><PasswordInput id="pw-old" value={pw.old} onChange={(e) => setPw({ ...pw, old: e.target.value })} autoComplete="current-password" /></div>
          <div className="acct-field"><label htmlFor="pw-n1">סיסמה חדשה</label><PasswordInput id="pw-n1" value={pw.n1} onChange={(e) => setPw({ ...pw, n1: e.target.value })} autoComplete="new-password" /></div>
          <div className="acct-field"><label htmlFor="pw-n2">הסיסמה החדשה שוב</label><PasswordInput id="pw-n2" value={pw.n2} onChange={(e) => setPw({ ...pw, n2: e.target.value })} autoComplete="new-password" /></div>
          {pwMsg && <div className={pwMsg.k === "ok" ? "acct-ok" : "acct-alert"} role="status">{pwMsg.t}</div>}
          <button type="submit" className="acct-cta sm" disabled={busy === "pw" || !pw.old || !pw.n1 || !pw.n2}>{busy === "pw" ? <Spinner /> : null}החלפת סיסמה</button>
        </form>
      </details>

      <div className="pf-set-actions">
        <button type="button" className="pf-btn" onClick={async () => { leaving.current = true; await accountApi.logout(); router.replace("/"); }}>יציאה מהחשבון</button>
        <button type="button" className="pf-btn danger" onClick={() => setDel({ open: !del.open, pw: "" })}>מחיקת החשבון</button>
      </div>
      {del.open && (
        <form className="pf-danger" onSubmit={remove}>
          <p><b>מחיקה היא סופית.</b> החשבון וכל ההתקדמות שלך יימחקו ולא יהיה אפשר לשחזר אותם. כדי לאשר, הקלידו את הסיסמה.</p>
          <PasswordInput id="del-pw" value={del.pw} onChange={(e) => { setDel({ ...del, pw: e.target.value }); setDelMsg(""); }} autoComplete="current-password" placeholder="הסיסמה שלך" />
          {delMsg && <div className="acct-alert" role="alert">{delMsg}</div>}
          <div className="pf-set-actions">
            <button type="submit" className="pf-btn danger solid" disabled={!del.pw || busy === "del"}>{busy === "del" ? <Spinner /> : null}מחיקה לצמיתות</button>
            <button type="button" className="pf-btn" onClick={() => setDel({ open: false, pw: "" })}>ביטול</button>
          </div>
        </form>
      )}
    </section>
  );
}
