'use client';
/* Duels: the bottom sheet (phone) / centred card (desktop) every duel dialog uses:
   challenge sheet, QR, the friend menu. Backdrop, drag handle (pull down to
   close), focus trap, Esc, body scroll lock; focus goes back to the opener.
   Styles: src/styles/duel.css (.dl-sheet*). transform/opacity only. */
import { useEffect, useLayoutEffect, useRef, useState } from "react";

const FOCUS = 'a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])';

/** Arrow keys inside a role="radiogroup" of buttons (RTL: → previous, ← next; ↓ next, ↑ previous).
    radioKeys(event, ids, currentId, select) — selects and focuses the neighbour. */
export function radioKeys(e, ids, current, select) {
  const d = { ArrowDown: 1, ArrowLeft: 1, ArrowUp: -1, ArrowRight: -1 }[e.key];
  if (!d) return;
  e.preventDefault();
  const i = Math.max(0, ids.indexOf(current));
  const next = ids[(i + d + ids.length) % ids.length];
  select(next);
  const group = e.currentTarget.closest('[role="radiogroup"]');
  const btn = group && [...group.querySelectorAll('[role="radio"]')].find((b) => b.dataset.id === next);
  if (btn) btn.focus();
}
let locks = 0;
function lockBody(on) {
  locks += on ? 1 : -1;
  document.documentElement.classList.toggle("dl-locked", locks > 0);
}

export function Sheet({ open, onClose, label, children, wide, className = "" }) {
  const box = useRef(null);
  const opener = useRef(null);
  const [drag, setDrag] = useState(0);        // px pulled down
  const [shown, setShown] = useState(false);  // the open animation runs one frame after mount
  const start = useRef(null);

  useLayoutEffect(() => {
    if (!open) { setShown(false); return; }
    opener.current = document.activeElement;
    // one painted frame at translateY(100%) first, then the slide (a timer, not rAF: rAF stalls in a background tab)
    const id = setTimeout(() => setShown(true), 20);
    return () => clearTimeout(id);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    lockBody(true);
    const el = box.current;
    // first control inside (or the sheet itself)
    const t = setTimeout(() => {
      const f = el && el.querySelector("[data-autofocus]");
      const first = f || (el && el.querySelector(FOCUS));
      (first || el)?.focus({ preventScroll: true });
    }, 60);
    const key = (e) => {
      if (e.key === "Escape") { e.stopPropagation(); onClose?.(); return; }
      if (e.key !== "Tab" || !el) return;
      // only what the browser itself would tab to (a roving radio at tabindex -1 is not), so native Tab never escapes
      const list = [...el.querySelectorAll(FOCUS)].filter((n) => n.tabIndex >= 0 && (n.offsetParent !== null || n === document.activeElement));
      if (!list.length) { e.preventDefault(); el.focus(); return; }
      const i = list.indexOf(document.activeElement);
      if (e.shiftKey && (i <= 0)) { e.preventDefault(); list[list.length - 1].focus(); }
      else if (!e.shiftKey && (i === -1 || i === list.length - 1)) { e.preventDefault(); list[0].focus(); }
    };
    document.addEventListener("keydown", key, true);
    return () => {
      clearTimeout(t);
      document.removeEventListener("keydown", key, true);
      lockBody(false);
      const o = opener.current;
      if (o && typeof o.focus === "function" && document.contains(o)) o.focus({ preventScroll: true });
    };
  }, [open, onClose]);

  if (!open) return null;

  const onDown = (e) => { start.current = { y: e.clientY, id: e.pointerId }; e.currentTarget.setPointerCapture?.(e.pointerId); };
  const onMove = (e) => { if (start.current) setDrag(Math.max(0, e.clientY - start.current.y)); };
  const onUp = () => {
    if (!start.current) return;
    const d = drag; start.current = null; setDrag(0);
    if (d > 90) onClose?.();
  };

  return (
    <div className={"dl-sheet-wrap" + (shown && !drag ? " on" : shown ? " on dragging" : "") + (wide ? " wide" : "")} role="presentation">
      <div className="dl-backdrop" onClick={onClose} aria-hidden="true" />
      <div ref={box} className={"dl-sheet " + className} role="dialog" aria-modal="true" aria-label={label} tabIndex={-1}
        style={drag ? { transform: `translateY(${drag}px)` } : undefined}>
        <div className="dl-handle" onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp} aria-hidden="true"><i /></div>
        <button type="button" className="dl-x" onClick={onClose} aria-label="סגירה">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
        </button>
        {children}
      </div>
    </div>
  );
}
