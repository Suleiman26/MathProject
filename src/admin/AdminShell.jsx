'use client';
/* Admin frame: PIN gate, navigation, period, shared data. */
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { SquaresFour, ListChecks, Stack, ChartBar, Users, CreditCard, Gear, SignOut, ArrowSquareOut, Backspace, Info } from "@phosphor-icons/react";
import { call, login, isPreview } from "./api";
import { ToastHost } from "./ui";

export const NAV = [
  { href: "/admin", label: "לוח בקרה", short: "לוח", Icon: SquaresFour, sub: "תמונת מצב של הפלטפורמה" },
  { href: "/admin/fixes", label: "תיקונים", short: "תיקונים", Icon: ListChecks, sub: "מה לתקן בכל נושא, מה תוקן ומחכה לבדיקה, ומה אושר" },
  { href: "/admin/content", label: "תוכן", short: "תוכן", Icon: Stack, sub: "כיתות, קטגוריות ונושאים. גררו כדי לשנות סדר." },
  { href: "/admin/analytics", label: "ניתוח", short: "ניתוח", Icon: ChartBar, sub: "איפה התלמידים מצליחים ואיפה נתקעים" },
  { href: "/admin/students", label: "תלמידים", short: "תלמידים", Icon: Users, sub: "פעילות התלמידים (אנונימית עד שתהיה הרשמה)" },
  { href: "/admin/sales", label: "מכירות", short: "מכירות", Icon: CreditCard, sub: "מנויים, הכנסות ותוכניות מחיר" },
  { href: "/admin/settings", label: "הגדרות", short: "הגדרות", Icon: Gear, sub: "קוד כניסה, חיבור ונתונים" },
];
const Mark = ({ className }) => (
  <img className={className} src="/icon.png" alt="" width={64} height={64} style={{ borderRadius: "22%" }} />
);

const Ctx = createContext(null);
export const useAdmin = () => useContext(Ctx);

/** Load what a screen needs; returns { data, loading, error }. */
export function useData(keys) {
  const a = useAdmin();
  const [, force] = useState(0);
  const missing = keys.filter((k) => a.cache.current[k] === undefined);
  useEffect(() => {
    let alive = true;
    a.load(keys).then(() => alive && force((n) => n + 1)).catch(() => alive && force((n) => n + 1));
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keys.join(","), a.days, a.version]);
  const data = Object.fromEntries(keys.map((k) => [k, a.cache.current[k]]));
  return { data, loading: missing.length > 0 && !a.error, error: a.error };
}

export default function AdminShell({ children }) {
  const [session, setSession] = useState(undefined); // undefined = checking, null = signed out
  const [days, setDaysState] = useState(30);
  const [version, setVersion] = useState(0);
  const [error, setError] = useState(null);
  const cache = useRef({});
  const preview = isPreview();
  const path = usePathname();

  useEffect(() => {
    try {
      const s = JSON.parse(localStorage.getItem("mp:admin"));
      if (s && s.tok && new Date(s.exp) > new Date() && !!s.preview === preview) setSession(s); else setSession(null);
      const d = +localStorage.getItem("mp:adm-days"); if ([7, 30, 90].includes(d)) setDaysState(d);
    } catch { setSession(null); }
  }, [preview]);

  const signOut = useCallback((expired) => {
    if (!preview && session && !expired) call("admin_logout", {}, session.tok).catch(() => {});
    try { localStorage.removeItem("mp:admin"); } catch {}
    cache.current = {};
    setSession(expired ? { expired: true, tok: null } : null);
  }, [preview, session]);

  const load = useCallback(async (keys) => {
    const tok = session && session.tok;
    const jobs = keys.filter((k) => cache.current[k] === undefined).map(async (k) => {
      const fn = { catalog: "admin_catalog", stats: "admin_stats", students: "admin_students", sales: "admin_sales" }[k];
      const args = k === "stats" || k === "students" ? { days } : {};
      try { cache.current[k] = await call(fn, args, tok); setError(null); }
      catch (e) { if (e.unauthorized) signOut(true); else setError(e); throw e; }
    });
    await Promise.all(jobs);
  }, [session, days, signOut]);

  const setDays = (d) => {
    setDaysState(d);
    try { localStorage.setItem("mp:adm-days", d); } catch {}
    delete cache.current.stats; delete cache.current.students;
  };
  const refresh = (keys) => { (keys || Object.keys(cache.current)).forEach((k) => delete cache.current[k]); setVersion((v) => v + 1); };
  const run = (fn, args) => call(fn, args, session && session.tok).catch((e) => { if (e.unauthorized) signOut(true); throw e; });

  if (session === undefined) return <div className="mp-boot" style={{ minHeight: "100vh" }}><span /></div>;
  if (!session || !session.tok) return <ToastHost><Pin preview={preview} expired={session && session.expired} onIn={(s) => { cache.current = {}; setSession(s); }} /></ToastHost>;

  const active = NAV.find((n) => (n.href === "/admin" ? path === "/admin" : path.startsWith(n.href))) || NAV[0];
  const ctx = { tok: session.tok, preview, days, setDays, cache, load, refresh, version, run, error, signOut, page: active };
  return (
    <Ctx.Provider value={ctx}>
      <ToastHost>
        <div className="shell">
          <aside className="side">
            <div className="brand"><Mark /><div><b>מתמטיקה חט״ב</b><small>ניהול</small></div></div>
            <nav className="snav" aria-label="ניווט ראשי">
              {NAV.map((n) => <Link key={n.href} href={n.href} aria-current={n === active ? "page" : undefined}><n.Icon size={19} weight={n === active ? "fill" : "regular"} /><span>{n.label}</span></Link>)}
            </nav>
            <div className="side-foot">
              <div className={"status-pill" + (preview ? " demo" : "")}><i /><span>{preview ? "מצב תצוגה · נתוני דוגמה" : "מחובר למסד הנתונים"}</span></div>
              <a className="side-link" href="/" target="_blank" rel="noopener"><ArrowSquareOut size={17} /><span>לאתר התלמידים</span></a>
              <button type="button" className="side-link" onClick={() => signOut(false)}><SignOut size={17} /><span>יציאה</span></button>
            </div>
          </aside>
          <header className="mtop">
            <div className="brand"><Mark /><div><b>ניהול</b><small>מתמטיקה חט״ב</small></div></div>
            <button type="button" className="ibtn" onClick={() => signOut(false)} aria-label="יציאה"><SignOut size={18} /></button>
          </header>
          <div className="main"><div className="main-in" key={path}>
            {preview && <div className="demo-bar"><Info size={18} /><span><b>מצב תצוגה.</b> המספרים כאן הם נתוני דוגמה, לא אמיתיים. הם יתחלפו בנתונים אמיתיים ברגע שנחבר את המסד של הפרויקט (<Link href="/admin/settings">הגדרות</Link>).</span></div>}
            {children}
          </div></div>
          <nav className="bnav" aria-label="ניווט">
            {NAV.map((n) => <Link key={n.href} href={n.href} aria-current={n === active ? "page" : undefined}><n.Icon size={22} weight={n === active ? "fill" : "regular"} /><span>{n.short}</span></Link>)}
          </nav>
        </div>
      </ToastHost>
    </Ctx.Provider>
  );
}

/** Page title row with optional tools (period switch, refresh…). */
export function PageHead({ tools }) {
  const a = useAdmin();
  return <div className="page-head"><div><h1>{a.page.label}</h1><p>{a.page.sub}</p></div><div className="head-tools">{tools}</div></div>;
}

function Pin({ preview, expired, onIn }) {
  const [digits, setDigits] = useState("");
  const [msg, setMsg] = useState(expired ? "פג תוקף הכניסה. הקלידו את הקוד שוב." : "");
  const [busy, setBusy] = useState(false);
  const [lockUntil, setLockUntil] = useState(null);
  const [ok, setOk] = useState(false);
  const [, tick] = useState(0);
  const dots = useRef(null);
  const left = lockUntil ? Math.max(0, Math.round((new Date(lockUntil) - Date.now()) / 1000)) : 0;

  useEffect(() => {
    if (!lockUntil) return;
    const t = setInterval(() => { tick((n) => n + 1); if (new Date(lockUntil) <= new Date()) { setLockUntil(null); setMsg(""); } }, 1000);
    return () => clearInterval(t);
  }, [lockUntil]);

  async function submit(code) {
    setBusy(true); setMsg("בודק…");
    try {
      const r = await login(code);
      if (r && r.token) {
        setOk(true);
        const s = { tok: r.token, exp: r.expires_at, preview };
        try { localStorage.setItem("mp:admin", JSON.stringify(s)); } catch {}
        setTimeout(() => onIn(s), 240);
        return;
      }
      setDigits("");
      if (dots.current && dots.current.animate) dots.current.animate([{ transform: "translateX(0)" }, { transform: "translateX(-8px)" }, { transform: "translateX(7px)" }, { transform: "translateX(-5px)" }, { transform: "translateX(0)" }], { duration: 380, easing: "cubic-bezier(.36,.07,.19,.97)" });
      if (navigator.vibrate) navigator.vibrate(40);
      if (r && r.error === "locked") { setLockUntil(r.retry_at); setMsg(""); }
      else setMsg("קוד שגוי" + (r && r.left != null ? " · נותרו " + r.left + " ניסיונות" : ""));
    } catch { setDigits(""); setMsg("אין חיבור לשרת. נסו שוב."); }
    finally { setBusy(false); }
  }
  function press(k) {
    if (busy || lockUntil) return;
    if (k === "del") { setDigits((d) => d.slice(0, -1)); return; }
    if (digits.length >= 4) return;
    const next = digits + k;
    setDigits(next); setMsg("");
    if (next.length === 4) setTimeout(() => submit(next), 120);
  }
  useEffect(() => {
    const onKey = (e) => { if (/^[0-9]$/.test(e.key)) press(e.key); else if (e.key === "Backspace") press("del"); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  });
  return (
    <main className="pin-wrap">
      <div className="pin-card">
        <Mark className="mark" />
        <h1>כניסה לניהול</h1><p>הקלידו את קוד הכניסה</p>
        <div ref={dots} className={"pin-dots" + (ok ? " ok" : "")} aria-hidden="true">{[0, 1, 2, 3].map((i) => <i key={i} className={i < digits.length ? "on" : ""} />)}</div>
        <div className={"pin-msg" + (msg === "בודק…" ? " quiet" : "")} role="alert">{lockUntil ? `נעול אחרי 5 ניסיונות שגויים · נסו שוב בעוד ${Math.floor(left / 60)}:${String(left % 60).padStart(2, "0")}` : msg}</div>
        <div className="keypad">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((k) => <button key={k} type="button" className="key" disabled={!!lockUntil} onClick={() => press(String(k))}>{k}</button>)}
          <span />
          <button type="button" className="key" disabled={!!lockUntil} onClick={() => press("0")}>0</button>
          <button type="button" className="key ghost" aria-label="מחיקה" onClick={() => press("del")}><Backspace size={22} /></button>
        </div>
        {preview && <p className="pin-note">מצב תצוגה · המסד עוד לא מחובר</p>}
      </div>
    </main>
  );
}
