'use client';
/* The side calculator on topic pages (fixes board #55).
   Opened from the top bar (or from the answer keypad's bar on phones); loaded only then.
   Desktop: a panel docked at the left, the page moves over so nothing is covered.
   Phone: a low sheet at the bottom (under half the screen); the page gets room to scroll above it.
   It never types into the exercise and never reads it: the student copies the number themselves.
   It and the answer keypad are never open together: when the keypad opens, this closes
   (what was typed and the history stay for the next time).
   Which topics get it: src/lib/calc-topics.js. The maths: src/lib/calc-core.js (tested). Styles: src/styles/calculator.css. */
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { evaluate, format, errorText, pressKey, closed, insertValue } from "@/lib/calc-core";
import { RootText } from "@/components/Root";   // "√(9+16)" is drawn as a real root sign over 9+16 (board #65); the keys still type "√("

const KEYS = [
  "7", "8", "9", "÷", "(", ")",
  "4", "5", "6", "×", "²", "√",
  "1", "2", "3", "−", "π", "%",
  "±", "0", ".", "+", "⌫", "=",
];
const LABEL = {
  "÷": "חילוק", "×": "כפל", "−": "פחות", "+": "ועוד", "(": "פתיחת סוגריים", ")": "סגירת סוגריים",
  "²": "בריבוע", "√": "שורש ריבועי", "π": "פאי", "%": "אחוז", "±": "החלפת סימן",
  ".": "נקודה עשרונית", "⌫": "מחיקה", "=": "שווה",
};
// the real keyboard → our keys
const FROM_KEYBOARD = { "-": "−", "*": "×", "/": "÷", ",": ".", "x": "×", "X": "×", "Enter": "=", "Backspace": "⌫", "Delete": "C" };
const HISTORY = 5;

// kept while the page is open, so closing the calculator loses nothing
const saved = { expr: "", fresh: false, last: null, hist: [] };

export default function Calculator({ onClose }) {
  const [expr, setExpr] = useState(saved.expr);
  const [fresh, setFresh] = useState(saved.fresh);   // the text is a result that "=" just showed
  const [last, setLast] = useState(saved.last);      // { e, r } of that result
  const [hist, setHist] = useState(saved.hist);      // newest first
  const [error, setError] = useState("");
  const root = useRef(null);
  const line = useRef(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => { saved.expr = expr; saved.fresh = fresh; saved.last = last; saved.hist = hist; }, [expr, fresh, last, hist]);

  // the page makes room (calculator.css); the keypad opening closes the calculator
  useLayoutEffect(() => {
    const html = document.documentElement;
    const el = root.current;
    const measure = () => html.style.setProperty("--calc-h", el.offsetHeight + "px");
    measure();
    html.classList.add("calc-open");
    const ro = typeof ResizeObserver === "function" ? new ResizeObserver(measure) : null;
    if (ro) ro.observe(el);
    const mo = new MutationObserver(() => { if (html.classList.contains("kp-open")) closeRef.current(); });
    mo.observe(html, { attributes: true, attributeFilter: ["class"] });
    // with a real keyboard: ready for typing straight away (a phone keeps its focus where it is)
    if (matchMedia("(hover: hover) and (pointer: fine)").matches) { try { el.focus({ preventScroll: true }); } catch {} }
    return () => {
      if (ro) ro.disconnect();
      mo.disconnect();
      html.classList.remove("calc-open");
      html.style.removeProperty("--calc-h");
    };
  }, []);

  // a long sum: keep its end (what is being typed) in view
  useLayoutEffect(() => { const l = line.current; if (l) l.scrollLeft = l.scrollWidth; }, [expr, fresh]);

  const press = (key) => {
    try { window.MP && window.MP.sound && window.MP.sound("tap"); } catch {}
    setError("");
    if (key === "=") {
      const text = closed(expr);
      const res = evaluate(text);
      if (!res.ok) { setError(errorText(res.error)); return; }
      if (fresh || /^−?[0-9.]+$/.test(text)) return; // nothing was computed
      const item = { e: text, r: res.value };
      setHist((h) => [item, ...h.filter((x) => !(x.e === item.e && x.r === item.r))].slice(0, HISTORY));
      setLast(item); setExpr(insertValue("", res.value, true)); setFresh(true);
      return;
    }
    setExpr(pressKey(expr, key, fresh));
    setFresh(false);
  };
  const reuse = (item) => {
    try { window.MP && window.MP.sound && window.MP.sound("tap"); } catch {}
    setError("");
    setExpr(insertValue(expr, item.r, fresh));
    setFresh(false);
  };

  const onKeyDown = (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key === "Escape") { e.preventDefault(); onClose(); return; }
    // a key chosen with Tab is pressed by Enter / Space the normal way
    if ((e.key === "Enter" || e.key === " ") && e.target.closest && e.target.closest("button")) return;
    const k = FROM_KEYBOARD[e.key] || e.key;
    if (k === "C" || k === "=" || KEYS.includes(k)) { e.preventDefault(); press(k); }
  };
  // clicks never leave the focus on a key (so Enter always means "="), and typing goes to the calculator
  const onMouseDown = (e) => { e.preventDefault(); };
  const onPointerDown = () => {
    const el = root.current;
    if (el && !el.contains(document.activeElement)) { try { el.focus({ preventScroll: true }); } catch {} }
  };

  // small line: what was computed / a live "= …" while typing / the error
  let sub = "", subKind = "";
  if (error) { sub = error; subKind = " is-err"; }
  else if (fresh && last) sub = last.e + " =";
  else if (expr && !/^−?[0-9.]*$/.test(expr)) {
    const res = evaluate(closed(expr));
    if (res.ok) { sub = "= " + format(res.value); subKind = " is-live"; } // errors wait for "=" ("5÷0" may become "5÷0.5")
  }
  const main = fresh && last ? format(last.r) : expr;

  return (
    <aside
      className="calc" ref={root} dir="rtl" role="group" aria-label="מחשבון" tabIndex={-1}
      onKeyDown={onKeyDown} onMouseDown={onMouseDown} onPointerDown={onPointerDown}
    >
      <div className="calc-top">
        <div className="calc-screen" dir="ltr" role="status" aria-live="polite">
          <div className={"calc-sub" + subKind} dir={subKind === " is-err" ? "rtl" : "ltr"}>{sub ? (error ? sub : <RootText s={sub} flat />) : " "}</div>
          <div className={"calc-main" + (main ? "" : " is-empty") + (main.length > 14 ? " is-long" : "")} ref={line}>{main ? <RootText s={main} flat /> : "0"}</div>
        </div>
        <button type="button" className="calc-c" aria-label="ניקוי" onClick={() => press("C")}>C</button>
        <button type="button" className="calc-x" aria-label="סגירת המחשבון" onClick={onClose}>
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
        </button>
      </div>
      <div className="calc-hist" dir="ltr" aria-label="תוצאות אחרונות">
        {hist.length === 0
          ? <span className="calc-hint" dir="rtl">התוצאות האחרונות יופיעו כאן</span>
          : hist.map((h) => (
            <button key={h.e + "=" + h.r} type="button" className="calc-chip" aria-label={"שימוש בתוצאה " + format(h.r)} onClick={() => reuse(h)}>
              <span className="calc-chip-e"><RootText s={h.e} flat /></span><span className="calc-chip-r">{format(h.r)}</span>
            </button>
          ))}
      </div>
      <div className="calc-keys" dir="ltr">
        {KEYS.map((k) => (
          <button
            key={k} type="button" data-k={k}
            className={"calc-key" + (/^[0-9.]$/.test(k) ? " calc-d" : "") + ("+−×÷".includes(k) ? " calc-op" : "") + (k === "=" ? " calc-eq" : "")}
            aria-label={LABEL[k] || k}
            onClick={() => press(k)}
          >{k === "⌫"
            ? <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 5H9l-6 7 6 7h12a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1z" /><path d="M17 9l-5 6M12 9l5 6" /></svg>
            : k === "²" ? <span className="calc-sq" aria-hidden="true"><i>x</i>²</span>
            : k}</button>
        ))}
      </div>
    </aside>
  );
}
