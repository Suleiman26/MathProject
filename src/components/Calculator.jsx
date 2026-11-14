'use client';
/* The side calculator on topic pages (fixes board #55).
   Opened from the top bar (or from the answer keypad's bar on phones); loaded only then.
   Desktop: a panel docked at the left, the page moves over so nothing is covered.
   Phone: a low sheet at the bottom (under half the screen); the page gets room to scroll above it.
   It never types into the exercise and never reads it: the student copies the number themselves.
   It and the answer keypad are never open together: when the keypad opens, this closes
   (what was typed and the history stay for the next time).
   Equation mode (board #55, reopened): where a quadratic is solved (`eqn`), a MODE key works like on a real
   scientific calculator: MODE → 5 (EQN) → 3 (aX²+bX+c=0), then a, b, c with "=" after each, then X1 and X2.
   MODE → 1 (COMP) goes back. Hebrew chips next to MODE do the same in one tap.
   Which topics get it: src/lib/calc-topics.js. The maths: src/lib/calc-core.js (tested). Styles: src/styles/calculator.css. */
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { evaluate, format, errorText, pressKey, closed, insertValue, menuPick, eqnStart, eqnPress, eqnText, EQN_NAMES } from "@/lib/calc-core";

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
const saved = { expr: "", fresh: false, last: null, hist: [], mode: "comp", eq: eqnStart() };

export default function Calculator({ onClose, eqn }) {
  const [expr, setExpr] = useState(saved.expr);
  const [fresh, setFresh] = useState(saved.fresh);   // the text is a result that "=" just showed
  const [last, setLast] = useState(saved.last);      // { e, r } of that result
  const [hist, setHist] = useState(saved.hist);      // newest first
  const [error, setError] = useState("");
  const [mode, setMode] = useState(saved.mode);      // "comp" (the normal calculator) | "eqn" (aX²+bX+c=0)
  const [menu, setMenu] = useState(null);            // the MODE menus: null | "mode" | "eqn"
  const [eq, setEq] = useState(saved.eq);            // the equation being typed / its answer
  const inEqn = !!eqn && mode === "eqn";             // a chapter without the equation mode is always the normal calculator
  const root = useRef(null);
  const line = useRef(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => { saved.expr = expr; saved.fresh = fresh; saved.last = last; saved.hist = hist; }, [expr, fresh, last, hist]);
  useEffect(() => { saved.mode = mode; saved.eq = eq; }, [mode, eq]);
  useEffect(() => { if (!eqn) setMenu(null); }, [eqn]);

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
  useLayoutEffect(() => { const l = line.current; if (l) l.scrollLeft = l.scrollWidth; }, [expr, fresh, eq, menu, mode]);

  const tap = () => { try { window.MP && window.MP.sound && window.MP.sound("tap"); } catch {} };
  const goEqn = () => { tap(); setError(""); setMenu(null); setMode("eqn"); setEq(eqnStart()); };
  const goComp = () => { tap(); setError(""); setMenu(null); setMode("comp"); };

  const press = (key) => {
    tap();
    setError("");
    if (key === "MODE") { if (eqn) setMenu(menu ? null : "mode"); return; }
    if (menu) { // like the real one: the number keys choose from the menu
      const pick = menuPick(menu, key);
      if (!pick) return;
      if ("menu" in pick) setMenu(pick.menu);
      else if (pick.mode === "eqn") goEqn();
      else goComp();
      return;
    }
    if (inEqn) {
      const r = eqnPress(eq, key);
      setEq(r.state);
      if (r.error) setError(errorText(r.error));
      return;
    }
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
    tap();
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
    if (eqn && (k === "m" || k === "M")) { e.preventDefault(); press("MODE"); return; }
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
  let main = fresh && last ? format(last.r) : expr;
  let mainLen = main.length, mainKind = main ? "" : " is-empty", mainDir = "ltr";

  // the MODE menus and the equation mode write on the same screen
  let eqSol = null;
  if (menu) {
    sub = menu === "mode" ? "MODE" : "EQN"; subKind = "";
    main = menu === "mode" ? "1:COMP  5:EQN" : "3:aX²+bX+c=0";
    mainLen = main.length; mainKind = " is-menu";
  } else if (inEqn && eq.step < 3) {
    const name = EQN_NAMES[eq.step];
    const kept = eq.co[eq.step];
    const typed = eq.text || (kept != null ? format(kept) : "0");
    if (!error) {
      sub = EQN_NAMES.map((n, i) => (i !== eq.step && eq.co[i] != null ? n + "=" + format(eq.co[i]) : "")).filter(Boolean).join("   ") || "aX²+bX+c=0";
      subKind = "";
    }
    main = <><span className="calc-var">{name}=</span>{eq.text ? eq.text : <span className="calc-dim">{typed}</span>}</>;
    mainLen = name.length + 1 + typed.length; mainKind = " is-eq";
  } else if (inEqn) {
    eqSol = eq.sol;
    if (!error) { sub = eqnText(eq.co[0], eq.co[1], eq.co[2]); subKind = ""; }
    if (eqSol.kind === "none") { main = "אין פתרון ממשי"; mainLen = 0; mainKind = " is-he"; mainDir = "rtl"; }
    else {
      const name = eqSol.kind === "one" ? "X" : eq.view ? "X2" : "X1";
      const value = format(eqSol.kind === "one" ? eqSol.x : eq.view ? eqSol.x2 : eqSol.x1);
      main = <><span className="calc-var">{name}=</span>{value}</>;
      mainLen = name.length + 1 + value.length; mainKind = " is-eq";
    }
  }

  return (
    <aside
      className="calc" ref={root} dir="rtl" role="group" aria-label="מחשבון" tabIndex={-1}
      onKeyDown={onKeyDown} onMouseDown={onMouseDown} onPointerDown={onPointerDown}
    >
      <div className="calc-top">
        <div className="calc-screen" dir="ltr" role="status" aria-live="polite">
          <div className={"calc-sub" + subKind} dir={subKind === " is-err" ? "rtl" : "ltr"}>{sub || " "}</div>
          <div className={"calc-main" + mainKind + (mainLen > 14 ? " is-long" : "")} dir={mainDir} ref={line}>{main || "0"}</div>
        </div>
        <button type="button" className="calc-c" aria-label="ניקוי" onClick={() => press("C")}>C</button>
        <button type="button" className="calc-x" aria-label="סגירת המחשבון" onClick={onClose}>
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
        </button>
      </div>
      <div className="calc-hist" dir="ltr" aria-label={menu ? "בחירת מצב" : inEqn ? "פתרון משוואה ריבועית" : "תוצאות אחרונות"}>
        {eqn && <button type="button" className="calc-mode" aria-label="MODE: בחירת מצב המחשבון" aria-pressed={!!menu} onClick={() => press("MODE")}>MODE</button>}
        {menu === "mode" ? <>
          <button type="button" className="calc-chip calc-pick" onClick={() => press("1")}><b>1</b><span dir="rtl">מחשבון רגיל</span></button>
          <button type="button" className="calc-chip calc-pick" onClick={() => press("5")}><b>5</b><span dir="rtl">משוואות</span></button>
        </> : menu === "eqn" ? <>
          <button type="button" className="calc-chip calc-pick" onClick={() => press("3")}><b>3</b><span dir="rtl">משוואה ריבועית</span></button>
        </> : inEqn && !eqSol ? <>
          <span className="calc-hint" dir="rtl">מקלידים את {EQN_NAMES[eq.step]} ולוחצים על =</span>
          <button type="button" className="calc-chip calc-exit" aria-label="חזרה למחשבון הרגיל" onClick={goComp}><span dir="rtl">מחשבון רגיל</span></button>
        </> : inEqn ? <>
          {eqSol.kind === "two" && [eqSol.x1, eqSol.x2].map((x, i) => (
            <button key={i} type="button" className="calc-chip calc-root" aria-pressed={eq.view === i} aria-label={"הצגת X" + (i + 1)} onClick={() => { tap(); setEq({ ...eq, view: i }); }}>
              <span className="calc-chip-n">X{i + 1} =</span><span className="calc-chip-r">{format(x)}</span>
            </button>
          ))}
          {eqSol.kind === "one" && <span className="calc-note" dir="rtl">פתרון אחד, כי <span dir="ltr">Δ = 0</span></span>}
          {eqSol.kind === "none" && <span className="calc-note" dir="ltr">Δ = {format(eqSol.d)} &lt; 0</span>}
          <button type="button" className="calc-chip calc-exit" aria-label="חזרה למחשבון הרגיל" onClick={goComp}><span dir="rtl">מחשבון רגיל</span></button>
        </> : <>
          {eqn && <button type="button" className="calc-chip calc-go" onClick={goEqn}><span dir="rtl">פתרון משוואה ריבועית</span></button>}
          {hist.length === 0
            ? (!eqn && <span className="calc-hint" dir="rtl">התוצאות האחרונות יופיעו כאן</span>)
            : hist.map((h) => (
              <button key={h.e + "=" + h.r} type="button" className="calc-chip" aria-label={"שימוש בתוצאה " + format(h.r)} onClick={() => reuse(h)}>
                <span className="calc-chip-e">{h.e}</span><span className="calc-chip-r">{format(h.r)}</span>
              </button>
            ))}
        </>}
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
