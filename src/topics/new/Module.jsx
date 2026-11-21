'use client';
/* A topic page built only from engine chapters (board #84): the "חדש" module, "סטטיסטיקה
   והסתברות" and "מערכת משוואות". Header + one chapter button per chapter (none when the topic is a
   single chapter) + the open chapter. Chapters: ./chapters/ · screen: ./Engine.jsx */
import React, { useEffect, useRef, useState } from 'react';
import Chapter from './Engine';

export default function ModuleApp({ title, sub, chapters, staff = false }) {
  const [ch, setCh] = useState(0);
  // phones: the chapters are one swipe row, so the open chapter is brought into view
  const row = useRef(null);
  useEffect(() => {
    const el = row.current && row.current.querySelector('.ch-btn.active');
    if (!el || row.current.scrollWidth <= row.current.clientWidth) return;
    try { el.scrollIntoView({ behavior: 'instant', inline: 'center', block: 'nearest' }); } catch (e) {}
  }, [ch]);
  return (
    <div>
      <div className="hdr">
        <h1>{title}</h1>
        {sub && <span className="hdr-sub">{sub}</span>}
        {chapters.length > 1 && (
          <div className="ch-btns" ref={row}>
            {chapters.map((c, i) => (
              <button key={c.id} className={`ch-btn ${ch === i ? 'active' : ''}`} onClick={() => { setCh(i); try { window.scrollTo({ top: 0, behavior: 'instant' }); } catch (e) {} }}>{i + 1}. {c.name}</button>
            ))}
          </div>
        )}
      </div>
      <Chapter ch={chapters[ch]} staff={staff} key={chapters[ch].id} />
    </div>
  );
}
