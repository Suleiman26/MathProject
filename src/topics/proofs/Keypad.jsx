'use client';
/* The proofs section: the number keypad of a length row (spec 2026-11-23 §7.5; ביחד and לבד). A left-to-right
   number box inside the right-to-left sheet ("DE = 7.5"), the keys 0–9 · "." · ⌫ in two rows under the thumb, and one
   button, "זו התשובה". It only edits a short text and hands it over: session.js judges it (a format slip such as "06" or
   a lone "." is a note there, never a try).

   The box is an <output>, never an <input>: the phone's own keyboard stays closed, and the site-wide answer keypad
   (src/components/Keypad.jsx, which adopts every usable `#root input`) has nothing to attach to. On a computer the
   real keyboard types into it too (digits, ".", Backspace, Enter). A key never takes the focus on a click, and Enter
   on a focused key submits (never presses that key again). While a modal sheet is open (המשפטים) the keyboard is its. */
import React, { useEffect, useRef } from 'react';
import { T, fill } from './texts.js';

const ROWS = [['1', '2', '3', '4', '5', '6'], ['7', '8', '9', '0', '.', 'del']];
export const KP_MAX = 6;
/** One key on the text: a digit, "." (once) or "del". `stale` = the text is a wrong try: the next key starts over. */
export function typeKey(text, key, stale = false) {
  const t = stale ? '' : String(text || '');
  if (key === 'del') return t.slice(0, -1);
  if (t.length >= KP_MAX) return t;
  if (key === '.') return t.includes('.') ? t : `${t}.`;
  return /^\d$/.test(key) ? t + key : t;
}
const IcDel = () => (
  <svg className="prf-ic" viewBox="0 0 24 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
    <path d="M8.2 3.5h11.3a2 2 0 012 2v9a2 2 0 01-2 2H8.2L2.5 10z" /><path d="M11.5 7.5l5 5M16.5 7.5l-5 5" />
  </svg>
);

export default function Keypad({ name, text = '', stale = false, onKey, onSubmit }) {
  const live = useRef({ onKey, onSubmit });
  live.current = { onKey, onSubmit };
  useEffect(() => {
    const down = (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey || e.defaultPrevented) return;
      const el = e.target, tag = el && el.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (el && el.isContentEditable)) return;
      if (document.querySelector('[aria-modal="true"]')) return;           // a sheet (המשפטים) is open: its keys are its own
      const k = /^\d$/.test(e.key) ? e.key : e.key === '.' || e.key === ',' ? '.' : e.key === 'Backspace' ? 'del' : null;
      if (k) { e.preventDefault(); live.current.onKey(k); return; }
      // Enter submits, also on a keypad key (Space still presses that key); other buttons and links keep their Enter
      const onKp = !!(el && el.closest && el.closest('.prf-kp-k'));
      if (e.key === 'Enter' && (onKp || (tag !== 'BUTTON' && tag !== 'A'))) { e.preventDefault(); live.current.onSubmit(); }
    };
    window.addEventListener('keydown', down);
    return () => window.removeEventListener('keydown', down);
  }, []);
  const full = !stale && text.length >= KP_MAX;
  return (
    <div className="prf-kp" role="group" aria-label={T['lbl.kp']}>
      <div className="prf-kp-top">
        <output className={`prf-kp-box${stale ? ' is-stale' : ''}${text ? '' : ' is-empty'}`} dir="ltr" aria-live="polite" aria-label={text ? fill('say.numBox', { v: text }) : fill('say.askVal', { x: name })}>
          <span className="prf-kp-name" aria-hidden="true">{name} =</span>
          <span className="prf-kp-val" aria-hidden="true">{text}</span>
          <i className="prf-kp-caret" aria-hidden="true" />
        </output>
        <button type="button" className="prf-go prf-kp-go" onClick={onSubmit}>{T['btn.answer']}</button>
      </div>
      <div className="prf-kp-keys" dir="ltr">
        {ROWS.flat().map((k) => (
          <button type="button" key={k} className={`prf-kp-k${k === 'del' ? ' is-del' : ''}`} data-kp={k}
            disabled={k === 'del' ? !text : full || (k === '.' && !stale && text.includes('.'))}
            aria-label={k === 'del' ? T['lbl.kpDel'] : k === '.' ? T['lbl.kpDot'] : undefined}
            onMouseDown={(e) => e.preventDefault()} onClick={() => onKey(k)}>
            {k === 'del' ? <IcDel /> : k}
          </button>
        ))}
      </div>
    </div>
  );
}
