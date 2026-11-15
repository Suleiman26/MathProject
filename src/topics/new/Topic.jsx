'use client';
/* The "חדש" module (fixes board #84, Sulaiman): everything the Ministry of Education
   teaching plans for grades 7–9 (תשפ"ז) ask for that the site did not have yet.
   One chapter per missing subject; each chapter shows where it is recommended to live
   among the existing topics. Chapters: ./chapters/ · screen: ./Engine.jsx · maths: ./core.js */
import React, { useEffect, useRef, useState } from 'react';
import CHAPTERS from './chapters/index';
import Chapter from './Engine';

export default function App() {
  const [ch, setCh] = useState(0);
  // phones: the chapters are one swipe row, so the open chapter is brought into view
  const row = useRef(null);
  useEffect(() => {
    const el = row.current && row.current.querySelector('.ch-btn.active');
    if (!el || row.current.scrollWidth <= row.current.clientWidth) return;
    // measured on screen, so it is right in a right-to-left row too
    const a = el.getBoundingClientRect(), b = row.current.getBoundingClientRect();
    row.current.scrollBy({ left: (a.left + a.width / 2) - (b.left + b.width / 2), behavior: 'smooth' });
  }, [ch]);
  return (
    <div>
      <div className="hdr">
        <h1>חדש</h1>
        <span className="hdr-sub">נושאים מתוכנית הלימודים · כיתות ז׳–ט׳</span>
        <div className="ch-btns" ref={row}>
          {CHAPTERS.map((c, i) => (
            <button key={c.id} className={`ch-btn ${ch === i ? 'active' : ''}`} onClick={() => { setCh(i); try { window.scrollTo({ top: 0, behavior: 'instant' }); } catch (e) {} }}>{i + 1}. {c.name}</button>
          ))}
        </div>
      </div>
      <Chapter ch={CHAPTERS[ch]} key={CHAPTERS[ch].id} />
    </div>
  );
}
