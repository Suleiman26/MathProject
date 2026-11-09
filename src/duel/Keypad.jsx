'use client';
/* Duels: the keypad for a typed answer. Digits, "−" (toggles the sign), "⌫",
   and — only when the question can have such an answer (arena-core keypadFor)
   — "/" for a fraction and "." for a decimal. A typed fraction shows stacked.
   The send button sits under the thumb. Rules: ./arena-core.js (typeKey, typedOk,
   keypadKeyTarget). Classes are .dkp* — never .kp*: the topic pages' keypad.css
   (which stays loaded after client-side navigation) owns .kp and pins it to
   the bottom of the screen.
   disabled = no input (request on its way / feedback / lock); dim = also look
   it (only the lock dims — no flicker between questions). */
import { useEffect, useRef, useState } from "react";
import { typeKey, typedOk, typedParts, keypadKeyTarget } from "./arena-core";

export function Typed({ value, placeholder }) {
  const { neg, num, den } = typedParts(value);
  if (!value) return <span className="dkp-ph">{placeholder}</span>;
  return (
    <>
      {neg && <span className="dkp-neg">−</span>}
      {den == null ? <span>{num}</span> : (
        <span className="dmx-frac dkp-frac"><span className="dmx-num">{num || " "}</span><span className="dmx-den">{den || " "}</span></span>
      )}
    </>
  );
}

// a tap must not move focus onto the key: Enter on a hardware keyboard then still sends
const keepFocus = (e) => e.preventDefault();

export function Keypad({ onSend, disabled, dim, sending, keys = { fraction: false, decimal: false }, resetKey }) {
  const [v, setV] = useState("");
  const root = useRef(null);
  useEffect(() => { setV(""); }, [resetKey]);
  const press = (k) => { if (disabled) return; setV((s) => typeKey(s, k)); };
  const ok = typedOk(v) && !disabled;
  const send = () => { if (!ok) return; const given = v.replace("−", "-"); onSend(given, v); };

  // hardware / Bluetooth keyboards too — but never keys meant for something else
  // (a sheet / dialog, a button or link outside the keypad, a text field)
  useEffect(() => {
    const h = (e) => {
      if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey) return;
      const where = keypadKeyTarget(e.target, root.current, document.documentElement.classList.contains("dl-locked"));
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
  // 4 columns: 1 2 3 ⌫ / 4 5 6 − / 7 8 9 (extra or 0) / … send
  const row3 = extra.length ? ["7", "8", "9", extra[0]] : ["7", "8", "9", "0"];
  const row4 = extra.length === 2 ? ["0", extra[1]] : extra.length === 1 ? ["0"] : [];
  const K = (k) => (
    <button key={k} type="button" className={"dkp-k" + (/\d/.test(k) ? "" : " dkp-fn")} onMouseDown={keepFocus} onClick={() => press(k)} disabled={disabled}
      aria-label={k === "⌫" ? "מחיקה" : k === "−" ? "מינוס" : k === "/" ? "קו שבר" : k === "." ? "נקודה עשרונית" : k}>{k}</button>
  );
  return (
    <div className={"dkp" + (dim ? " dkp-dim" : "")} dir="ltr" ref={root}>
      <div className="dkp-in" aria-live="polite" aria-label={v ? "התשובה שהוקלדה: " + v : "עוד לא הוקלדה תשובה"}>
        <Typed value={v} placeholder="?" />
      </div>
      <div className="dkp-grid">
        {["1", "2", "3", "⌫", "4", "5", "6", "−", ...row3].map(K)}
        {row4.map(K)}
        <button type="button" className={"dkp-go" + (!typedOk(v) || dim ? " dkp-off" : "")} style={{ gridColumn: `span ${4 - row4.length}` }}
          onMouseDown={keepFocus} onClick={send} disabled={!ok}>
          {sending ? "…" : "שליחה"}
        </button>
      </div>
    </div>
  );
}
