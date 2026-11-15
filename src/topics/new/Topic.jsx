'use client';
/* The "חדש" module (fixes board #84, Sulaiman): everything the Ministry of Education
   teaching plans for grades 7–9 (תשפ"ז) ask for that the site did not have yet.
   One chapter per missing subject; each chapter shows where it is recommended to live
   among the existing topics. Chapters: ./chapters/ · screen: ./Engine.jsx · maths: ./core.js */
import React, { useState } from 'react';
import CHAPTERS from './chapters/index';
import Chapter from './Engine';

export default function App() {
  const [ch, setCh] = useState(0);
  return (
    <div>
      <div className="hdr">
        <h1>חדש</h1>
        <span className="hdr-sub">נושאים מתוכנית הלימודים · כיתות ז׳–ט׳</span>
        <div className="ch-btns">
          {CHAPTERS.map((c, i) => (
            <button key={c.id} className={`ch-btn ${ch === i ? 'active' : ''}`} onClick={() => { setCh(i); try { window.scrollTo({ top: 0, behavior: 'instant' }); } catch (e) {} }}>{i + 1}. {c.name}</button>
          ))}
        </div>
      </div>
      <Chapter ch={CHAPTERS[ch]} key={CHAPTERS[ch].id} />
    </div>
  );
}
