'use client';
/* Duels: my friend code (tap to copy, share the link, QR) and the "add a friend"
   form (type a code). Both talk only through the actions the hub hands them;
   every action resolves to the database's JSON, with `message` (Hebrew) on error. */
import { useEffect, useRef, useState } from "react";
import { QRSheet, fmtCode } from "./QR";

export const addLink = (code) => {
  const origin = typeof window !== "undefined" && /^https?:/.test(window.location.origin) ? window.location.origin : "https://mathproject-gamma.vercel.app";
  return `${origin}/duel/add/${String(code || "").toUpperCase()}`;
};

async function copyText(text) {
  try { if (navigator.clipboard && window.isSecureContext) { await navigator.clipboard.writeText(text); return true; } } catch {}
  try {
    const ta = document.createElement("textarea");
    ta.value = text; ta.setAttribute("readonly", ""); ta.style.position = "fixed"; ta.style.opacity = "0";
    document.body.appendChild(ta); ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch { return false; }
}

const MI = {
  copy: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="9" y="9" width="12" height="12" rx="3" /><path d="M5 15V6a2 2 0 012-2h9" /></svg>,
  check: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>,
  share: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 3v13" /><path d="M7.5 7.5L12 3l4.5 4.5" /><path d="M5 12v6a3 3 0 003 3h8a3 3 0 003-3v-6" /></svg>,
  qr: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><path d="M14 14h3v3h-3zM20 14v1M20 18v3h-3M14 20v1" /></svg>,
  plus: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>,
};

/** The white card with my code */
export function MyCode({ code, compact }) {
  const [copied, setCopied] = useState("");     // '' | 'code' | 'link'
  const [qr, setQr] = useState(false);
  const [canShare, setCanShare] = useState(false);
  const t = useRef(null);
  useEffect(() => { setCanShare(typeof navigator !== "undefined" && typeof navigator.share === "function"); }, []);
  useEffect(() => () => clearTimeout(t.current), []);
  const link = addLink(code);
  const flash = (what) => { setCopied(what); clearTimeout(t.current); t.current = setTimeout(() => setCopied(""), 1800); };

  async function copyCode() { if (await copyText(String(code || "").toUpperCase())) flash("code"); }
  async function share() {
    const text = `בואו לדו-קרב במתמטיקה! הקוד שלי: ${fmtCode(code)}`;
    if (canShare) {
      try { await navigator.share({ title: "דו-קרב במתמטיקה", text, url: link }); return; }
      catch (e) { if (e && e.name === "AbortError") return; }
    }
    if (await copyText(link)) flash("link");
  }

  return (
    <section className={"dl-card dl-code" + (compact ? " compact" : "")} aria-labelledby="dl-code-h">
      <div className="dl-code-h">
        <h2 id="dl-code-h">הקוד שלי</h2>
        <p>חבר/ה מקליד/ה אותו — ואתם מחוברים</p>
      </div>
      <button type="button" className={"dl-code-big" + (copied === "code" ? " ok" : "")} onClick={copyCode} aria-label={`הקוד שלי ${fmtCode(code)}. לחיצה מעתיקה`}>
        <span className="dl-code-txt" dir="ltr">{fmtCode(code) || "······"}</span>
        <span className="dl-code-ic" aria-hidden="true">{copied === "code" ? MI.check : MI.copy}</span>
      </button>
      <p className="dl-live" role="status" aria-live="polite">{copied === "code" ? "הקוד הועתק" : copied === "link" ? "הקישור הועתק" : " "}</p>
      <div className="dl-code-acts">
        <button type="button" className="dl-pill" onClick={share}>{MI.share}<span>{canShare ? "שיתוף הקישור" : "העתקת קישור"}</span></button>
        <button type="button" className="dl-pill" onClick={() => setQr(true)}>{MI.qr}<span>קוד QR</span></button>
      </div>
      <QRSheet open={qr} onClose={() => setQr(false)} link={link} code={code} />
    </section>
  );
}

const CODE_RE = /^[A-Z2-9]{6}$/;
export const cleanCode = (v) => String(v || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);

export function AddFriendForm({ onAdd, initial = "", autoSend = false, title = "הוספת חבר/ה" }) {
  const [v, setV] = useState(cleanCode(initial));
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);     // { kind: 'ok'|'err', text }
  const sentOnce = useRef(false);
  const ok = CODE_RE.test(v);

  async function send(e) {
    e?.preventDefault?.();
    if (!ok || busy) return;
    setBusy(true); setMsg(null);
    const r = await onAdd(v);
    setBusy(false);
    if (r && r.error) { setMsg({ kind: "err", text: r.message }); return; }
    const st = r && r.state;
    setMsg({ kind: "ok", text: st === "accepted" ? "אתם חברים עכשיו" : st === "already" ? "כבר חברים" : "הבקשה נשלחה. כשיאשרו — תופיעו זה אצל זה" });
    setV("");
  }
  useEffect(() => {
    if (autoSend && ok && !sentOnce.current) { sentOnce.current = true; send(); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoSend, ok]);

  return (
    <section className="dl-card dl-add" aria-labelledby="dl-add-h">
      <div className="dl-code-h"><h2 id="dl-add-h">{title}</h2><p>יש לכם קוד של חבר/ה? מקלידים כאן</p></div>
      <form className="dl-add-f" onSubmit={send}>
        <label className="sr" htmlFor="dl-add-in">קוד החבר</label>
        <input id="dl-add-in" className="dl-add-in" dir="ltr" inputMode="text" autoCapitalize="characters" autoCorrect="off" spellCheck={false}
          placeholder="XK4 7PM" maxLength={7} value={fmtCode(v)} onChange={(e) => { setV(cleanCode(e.target.value)); setMsg(null); }}
          aria-invalid={msg && msg.kind === "err" ? true : undefined} aria-describedby="dl-add-msg" />
        <button type="submit" className="dl-btn accent" disabled={!ok || busy}>{busy ? "שולחים…" : <>{MI.plus}<span>שליחת בקשה</span></>}</button>
      </form>
      <p id="dl-add-msg" className={"dl-msg" + (msg ? " " + msg.kind : "")} role="status" aria-live="polite">{msg ? msg.text : " "}</p>
    </section>
  );
}
