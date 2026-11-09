'use client';
/* "Turn on duel notifications" — a calm card in the hub's side column (spec §7.4).
   Shown only after the student's first finished duel (played ≥ 1), only on a device that can
   get notifications, never after "not now" on this device. Permission is asked only on the tap.
   iPhone/iPad in the browser: one line saying it works after "Add to Home Screen".
   Mounted in src/duel/Hub.jsx; the Result screen can mount it too (same props). */
import { useEffect, useState } from "react";
import { pushMode, shouldOffer, IOS_HINT } from "./push-core";
import { pushEnv, pushStatus, enablePush, disablePush, syncPush, isDismissed, dismiss, PUSH_ERRORS } from "./push";

const BELL = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M6 9a6 6 0 1112 0c0 5 2 6.5 2 6.5H4S6 14 6 9z" /><path d="M10 19.5a2 2 0 004 0" />
  </svg>
);
// "no pushes at night" — the time range never breaks across lines
const QUIET = <>לא בין 21:00 <span style={{ whiteSpace: "nowrap" }}>ל-07:00</span>.</>;
const X = <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>;

export default function EnablePush({ account, played }) {
  const id = account && account.id;
  const [mode, setMode] = useState("none");
  const [status, setStatus] = useState(null);       // 'on' | 'off' | 'denied' (null = still looking)
  const [hidden, setHidden] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    let live = true;
    const m = pushMode(pushEnv());
    setMode(m);
    setHidden(isDismissed());
    if (m !== "ok" || !id) { setStatus("off"); return; }
    // sync first (it may turn off a subscription made with an old key), then read the state
    syncPush(id).catch(() => {}).then(() => pushStatus(id)).then((s) => { if (live) setStatus(s); }, () => { if (live) setStatus("off"); });
    return () => { live = false; };
  }, [id]);

  if (!id || status === null || !shouldOffer({ played, mode, dismissed: hidden, status })) return null;

  function onEnable() {
    setBusy(true); setMsg(null);
    enablePush(id).then((r) => {
      setBusy(false);
      if (r.ok) { setStatus("on"); setMsg({ ok: true, text: "מעולה! נודיע לך כשמאתגרים אותך" }); }
      else { if (r.error === "denied") setStatus("denied"); setMsg({ ok: false, text: PUSH_ERRORS[r.error] || PUSH_ERRORS.failed }); }
    });
  }
  async function onOff() {
    setBusy(true); setMsg(null);
    await disablePush();
    setBusy(false); setStatus("off"); setMsg({ ok: true, text: "ההתראות כבויות במכשיר הזה" });
  }
  function onLater() { dismiss(); setHidden(true); }

  const on = status === "on";
  return (
    <section className={"dl-card dl-push" + (on ? " on" : "")} aria-labelledby="dl-push-h">
      <div className="dl-push-top">
        <span className="dl-push-ic">{BELL}</span>
        <div className="dl-push-t">
          <h2 id="dl-push-h">{on ? "התראות לדו-קרב פועלות" : "לדעת כשמאתגרים אותך"}</h2>
          <p>{mode === "ios-hint" ? IOS_HINT
            : on ? <>כשחבר/ה מאתגר/ת ואת/ה לא באתר — תגיע התראה. {QUIET}</>
            : status === "denied" ? PUSH_ERRORS.denied
            : <>התראה קטנה כשחבר/ה מאתגר/ת ואת/ה לא באתר. {QUIET}</>}</p>
        </div>
        {!on && <button type="button" className="dl-more" aria-label="לא עכשיו" onClick={onLater}>{X}</button>}
      </div>
      {mode === "ok" && status !== "denied" && (
        on
          ? <button type="button" className="dl-pill sm" disabled={busy} onClick={onOff}>כיבוי ההתראות</button>
          : <button type="button" className="dl-btn accent sm wide" disabled={busy} onClick={onEnable}>{busy ? "…" : "הפעלת התראות לדו-קרב"}</button>
      )}
      <p className={"dl-msg" + (msg ? (msg.ok ? " ok" : " err") : "")} role="status" aria-live="polite">{msg ? msg.text : ""}</p>
    </section>
  );
}
