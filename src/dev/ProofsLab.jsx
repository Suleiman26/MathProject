'use client';
/* Local-only lab for the proofs section: /dev/proofs?view=figures (more views are added as the
   screens are built). Sets the coral topic colour and the section's own CSS while mounted. */
import React, { useEffect, useState } from 'react';
import css from '@/topics/proofs/styles';
import ProofFigure from '@/topics/proofs/ProofFigure';
import { St } from '@/topics/proofs/signs';
import { typeById } from '@/topics/proofs/types/index';
import { partId } from '@/topics/proofs/figure-core';
import { partsOf } from '@/topics/proofs/core';

const T3 = typeById('prove-congruence');
export const problemOf = (tpl, seed = 7, level = 2, variant = 'B', words = false) => T3.remake({ template: tpl, seed, level, variant, meta: { words } });

function Figures() {
  const [end, setEnd] = useState({});
  return (
    <div className="pf" style={{ maxWidth: 1180, margin: '0 auto', padding: 16 }}>
      <h1 style={{ fontSize: 20, margin: '4px 0 12px' }}>הציורים: 14 תבניות × 3 מצבים</h1>
      {T3.templates.map((t, i) => {
        const p = problemOf(t.id, 11 + i);
        const given = p.given.map((fact) => ({ fact, style: 'on' }));
        const all = p.canon.map((fact) => ({ fact, style: 'on' }));
        const goal = [{ fact: 'cong', style: 'goal' }];
        const c = p.consequences[0], cParts = partsOf(p.facts[c]).map((x) => partId(x, p.figure));
        return (
          <section key={t.id} style={{ margin: '18px 0', borderTop: '1px solid var(--line)', paddingTop: 10 }}>
            <p style={{ font: '600 14px var(--font)', color: 'var(--ink-2)', marginBottom: 6 }}>{t.id} · {p.canon.map((f) => <span key={f} style={{ marginInlineEnd: 12 }}><St st={p.facts[f]} /></span>)}</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: 12 }}>
              <div className="pf-stage" data-shot={`${t.id}-0`}><ProofFigure problem={p} /></div>
              <div className="pf-stage" data-shot={`${t.id}-1`}><ProofFigure problem={p} marks={[...given, ...goal]} /></div>
              <div className="pf-stage" data-shot={`${t.id}-2`}>
                <ProofFigure problem={p} marks={[...all, { fact: c, style: 'goal' }]} selected={[partId(p.figure.segs[0])]} question={cParts} tappable={['seg', 'ang', 'tri']} onPart={() => {}} ending={end[t.id] || null} />
              </div>
            </div>
            <button type="button" style={{ minHeight: 40, padding: '0 14px', marginTop: 6 }} onClick={() => setEnd((e) => ({ ...e, [t.id]: e[t.id] ? null : 'move' }))}>תנועת הסיום</button>
          </section>
        );
      })}
    </div>
  );
}

export default function ProofsLab() {
  const [q, setQ] = useState(null);
  useEffect(() => {
    document.documentElement.dataset.topic = 'orange';
    setQ(new URLSearchParams(window.location.search));
    return () => { delete document.documentElement.dataset.topic; };
  }, []);
  const view = q ? q.get('view') || 'figures' : null;
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: css }} />
      <div id="root" dir="rtl">
        {view === 'figures' && <Figures />}
      </div>
    </>
  );
}
