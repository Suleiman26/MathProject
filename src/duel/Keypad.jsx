'use client';
/* Duels: the keypad for a typed answer. Digits, "−" (toggles the sign), "⌫",
   and — only when the question can have such an answer (arena-core keypadFor)
   — "/" for a fraction and "." for a decimal. A typed fraction shows stacked.
   The send button sits under the thumb. Rules: ./arena-core.js (typeKey, typedOk). */
import { useEffect, useState } from "react";
import { typeKey, typedOk, typedParts } from "./arena-core";

export function Typed({ value, placeholder }) {
  const { neg, num, den } = typedParts(value);
  if (!value) return <span className="kp-ph">{placeholder}</span>;
  return (
    <>
      {neg && <span className="kp-neg">−</span>}
      {den == null ? <span>{num}</span> : (
        <span className="mt-frac kp-frac"><span className="mt-num">{num || " "}</span><span className="mt-den">{den || " "}</span></span>
      )}
    </>
  );
}

export function Keypad({ onSend, disabled, keys = { fraction: false, decimal: false }, resetKey, meColor }) {
  const [v, setV] = useState("");
  useEffect(() => { setV(""); }, [resetKey]);
  const press = (k) => { if (disabled) return; setV((s) => typeKey(s, k)); };
  const ok = typedOk(v) && !disabled;
  const send = () => { if (!ok) return; const given = v.replace("−", "-"); onSend(given, v); };

  // hardware / Bluetooth keyboards too
  useEffect(() => {
    const h = (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (/^\d$/.test(e.key)) { press(e.key); e.preventDefault(); }
      else if (e.key === "Backspace") { press("⌫"); e.preventDefault(); }
      else if (e.key === "-" || e.key === "−") { press("−"); e.preventDefault(); }
      else if ((e.key === "." || e.key === ",") && keys.decimal) { press("."); e.preventDefault(); }
      else if (e.key === "/" && keys.fraction) { press("/"); e.preventDefault(); }
      else if (e.key === "Enter") { if (typedOk(v) && !disabled) { onSend(v.replace("−", "-"), v); } e.preventDefault(); }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  });

  const extra = keys.fraction && keys.decimal ? ["/", "."] : keys.fraction ? ["/"] : keys.decimal ? ["."] : [];
  // 4 columns: 1 2 3 ⌫ / 4 5 6 − / 7 8 9 (extra or 0) / … send
  const row3 = extra.length ? ["7", "8", "9", extra[0]] : ["7", "8", "9", "0"];
  const row4 = extra.length === 2 ? ["0", extra[1]] : extra.length === 1 ? ["0"] : [];
  const K = (k) => (
    <button key={k} type="button" className={"kp-k" + (/\d/.test(k) ? "" : " fn")} onClick={() => press(k)} disabled={disabled}
      aria-label={k === "⌫" ? "מחיקה" : k === "−" ? "מינוס" : k === "/" ? "קו שבר" : k === "." ? "נקודה עשרונית" : k}>{k}</button>
  );
  return (
    <div className="kp" dir="ltr">
      <div className="kp-in" aria-live="polite" aria-label={v ? "התשובה שהוקלדה: " + v : "עוד לא הוקלדה תשובה"}>
        <Typed value={v} placeholder="?" />
      </div>
      <div className="kp-grid">
        {["1", "2", "3", "⌫", "4", "5", "6", "−", ...row3].map(K)}
        {row4.map(K)}
        <button type="button" className="kp-go" style={{ gridColumn: `span ${4 - row4.length}` }} onClick={send} disabled={!ok}>
          {disabled ? "…" : "שליחה"}
        </button>
      </div>
    </div>
  );
}
