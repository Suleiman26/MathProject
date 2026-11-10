'use client';
/* Duels: the keypad for a typed answer. Digits, "−" (toggles the sign), "⌫",
   and — only when the question can have such an answer (arena-core keypadFor)
   — "/" for a fraction and "." for a decimal. Rules: ./arena-core.js (typeKey,
   typedOk, keypadKeyTarget). Classes are .dkp* — never .kp*: the topic pages'
   keypad.css (which stays loaded after client-side navigation) owns .kp and
   pins it to the bottom of the screen.

   Question UI (2026-11-10): keys only. What was typed is shown IN the question card
   (Arena's answer slot, drawn with <Typed>), so the value is lifted: value / onChange.
   The grid has ONE shape for every question (no jump between questions):
     1 2 3 ⌫ / 4 5 6 − / 7 8 9 [/ or .] / [.] 0 0 [ ] / send (full width)
   an extra key that this question doesn't have is an empty cell.
   disabled = no input (request on its way / feedback / lock); dim = also look it;
   sending = the send label turns into three pulsing dots; lock = { until, offset }: the keys fade
   and the send button's place shows the lock countdown (LockBar). */
import { useEffect, useRef, useState } from "react";
import { typeKey, typedOk, typedParts, keypadKeyTarget, lockLeft } from "./arena-core";
import { serverNow } from "./clock";

/** The 2-second lock after a wrong answer (lock_until, server time), shown where the student's next
    action is: "ממשיכים · 2" with a fill draining over the time that is left (transform only; none
    under reduced motion — just the number). Typed: it takes the send button's place; choices: a slim
    pill under them (Arena). */
export function LockBar({ until, offset, slim }) {
  const [left, setLeft] = useState(() => lockLeft(until, serverNow(offset)));
  const [total] = useState(() => Math.max(1, lockLeft(until, serverNow(offset))));
  useEffect(() => {
    const tick = () => setLeft(lockLeft(until, serverNow(offset)));
    tick();
    const t = setInterval(tick, 100);
    return () => clearInterval(t);
  }, [until, offset]);
  const n = Math.max(1, Math.ceil(left / 1000));
  return (
    <div className={"dar-lockbar" + (slim ? " slim" : "")} dir="rtl" role="alert" aria-label={"טעות — נעילה קצרה, ממשיכים בעוד " + n}>
      <i className="dar-lockbar-fill" style={{ animationDuration: total + "ms" }} aria-hidden="true" />
      <span aria-hidden="true">ממשיכים · <b key={n}>{n}</b></span>
    </div>
  );
}

/** what was typed, for the answer slot: "−3", a stacked "3/8"; the caret sits after it while typing */
export function Typed({ value, caret }) {
  const { neg, num, den } = typedParts(value);
  const c = caret ? <i className="dar-caret" aria-hidden="true" /> : null;
  if (!value) return c;
  return (
    <>
      {neg && <span className="dkp-neg">−</span>}
      {den == null ? <span>{num}</span> : (
        <span className="dmx-frac dkp-frac"><span className="dmx-num">{num || " "}</span><span className="dmx-den">{den || " "}{den != null && c}</span></span>
      )}
      {den == null && c}
    </>
  );
}

// a tap must not move focus onto the key: Enter on a hardware keyboard then still sends
const keepFocus = (e) => e.preventDefault();

const LABEL = { "⌫": "מחיקה", "−": "מינוס", "/": "קו שבר", ".": "נקודה עשרונית" };

export function Keypad({ value: v = "", onChange, onSend, disabled, dim, sending, keys = { fraction: false, decimal: false }, lock = null }) {
  const root = useRef(null);
  const press = (k) => { if (disabled) return; onChange(typeKey(v, k)); };
  const ok = typedOk(v) && !disabled;
  const send = () => { if (!ok) return; onSend(v.replace("−", "-"), v); };

  // hardware / Bluetooth keyboards too — but never keys meant for something else
  // (a sheet / dialog, a button or link outside the keypad, a text field)
  useEffect(() => {
    const h = (e) => {
      if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey) return;
      const where = keypadKeyTarget(e.target, root.current, document.documentElement.classList.contains("dl-locked"), e.key);
      if (where === "ignore") return;
      if (e.key === "Enter") {
        if (where === "key") return;                 // a focused keypad button: Enter presses that button
        if (typedOk(v) && !disabled) onSend(v.replace("−", "-"), v);
        e.preventDefault();
        return;
      }
      if (/^\d$/.test(e.key)) { press(e.key); e.preventDefault(); }
      else if (e.key === "Backspace") { press("⌫"); e.preventDefault(); }
      else if (e.key === "-" || e.key === "−") { press("−"); e.preventDefault(); }
      else if ((e.key === "." || e.key === ",") && keys.decimal) { press("."); e.preventDefault(); }
      else if (e.key === "/" && keys.fraction) { press("/"); e.preventDefault(); }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  });

  const extra = keys.fraction && keys.decimal ? ["/", "."] : keys.fraction ? ["/"] : keys.decimal ? ["."] : [];
  const K = (k, cls = "") => (
    <button key={k} type="button" className={"dkp-k" + (/\d/.test(k) ? "" : " dkp-fn") + cls} onMouseDown={keepFocus} onClick={() => press(k)} disabled={disabled}
      aria-label={LABEL[k] || k}>{k}</button>
  );
  const gap = (n) => <span key={"gap" + n} className="dkp-gap" aria-hidden="true" />;
  return (
    <div className={"dkp" + (dim ? " dkp-dim" : "") + (lock ? " dkp-locked" : "")} dir="ltr" ref={root}>
      <div className="dkp-grid">
        {["1", "2", "3", "⌫", "4", "5", "6", "−", "7", "8", "9"].map((k) => K(k))}
        {extra[0] ? K(extra[0]) : gap(1)}
        {extra[1] ? K(extra[1]) : gap(2)}
        {K("0", " dkp-zero")}
        {gap(3)}
      </div>
      {lock ? <LockBar until={lock.until} offset={lock.offset} /> : <button type="button" className={"dkp-go" + (!typedOk(v) || (dim && !sending) ? " dkp-off" : "") + (sending ? " sending" : "")}
        onMouseDown={keepFocus} onClick={send} disabled={!ok} aria-busy={sending || undefined}>
        <span className="dkp-go-t">שליחה</span>
        <span className="dkp-dots" aria-hidden="true"><i /><i /><i /></span>
      </button>}
    </div>
  );
}
