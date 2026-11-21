'use client';
/* Local-only lab for the proofs section: /dev/proofs?view=figures (more views are added as the
   screens are built). Sets the coral topic colour and the section's own CSS while mounted. */
import React, { useEffect, useState } from 'react';
import css from '@/topics/proofs/styles';
import ProofFigure from '@/topics/proofs/ProofFigure';
import { St } from '@/topics/proofs/signs';
import { typeById } from '@/topics/proofs/types/index';
import { partId } from '@/topics/proofs/figure-core';
import { partsOf, present } from '@/topics/proofs/core';
import ProofScreen from '@/topics/proofs/ProofScreen';
import TopBar from '@/components/TopBar';
import Topic from '@/topics/proofs/Topic';
import { emptyType, KEY } from '@/topics/proofs/mastery';
import { initRuntime } from '@/lib/mp-runtime';
import { seeded, makeR } from '@/topics/new/core';
import { start, act, ready } from '@/topics/proofs/session';

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

/* ?view=proof&l=1|2|3&v=A|B&tpl=<id>&seed=<n>&c=<counted proofs so far>&words=1 */
function Proof({ q }) {
  const level = +(q.get('l') || 1), variant = q.get('v') || 'B', seed = +(q.get('seed') || 7);
  const [made] = useState(() => {
    const problem = problemOf(q.get('tpl') || '3-X-SAS', seed, level, variant, q.get('words') ? true : false);
    return { problem, view: present(problem, level, variant, { counted: +(q.get('c') || 0), R: makeR(seeded(seed)) }) };
  });
  const [end, setEnd] = useState(null);
  return (
    <div className="pf">
      <ProofScreen type={T3} problem={made.problem} view={made.view} level={level} levelName={`רמה ${level}`} dots={[true, true, false, null]}
        onEnd={(r) => setEnd({ clean: r.clean, dots: [true, true, false, r.clean], done: 4, typeName: T3.name, levelName: `רמה ${level}`, onMore: () => window.location.reload(), onFinish: () => {} })}
        onLeave={() => {}} onSwap={() => window.location.reload()} end={end} />
    </div>
  );
}

/* a finished session: every row written by its canon reason; `help` fills the first step with hint 3 */
function solved(problem, view, help) {
  let s = start(problem, view);
  const go = (a) => { s = act(s, a).s; };
  if (help) { go({ t: 'hint' }); go({ t: 'hint' }); go({ t: 'hint' }); }
  for (let i = 0; i < 40 && !ready(s); i++) {
    if (!s.cur) { go({ t: 'next' }); continue; }
    const fact = s.cur.fact || s.cur.expect;
    if (s.cur.kind === 'statement') go({ t: 'statement', st: problem.facts[fact] }); else go({ t: 'reason', id: problem.just[fact][0].reasons[0] });
  }
  go({ t: 'qed' });
  return s;
}
/* ?view=end&state=clean|helped|levelup|typedone|round */
function End({ q }) {
  const state = q.get('state') || 'clean';
  const [made] = useState(() => {
    const problem = problemOf(q.get('tpl') || '3-X-SAS', 7, 2, 'B'), view = present(problem, 2, 'B', { R: makeR(seeded(7)) });
    return { problem, view, s: solved(problem, view, state === 'helped') };
  });
  const clean = state !== 'helped';
  const end = { clean, dots: clean ? [true, false, true, true] : [true, true, false, false], done: 7, typeName: T3.name, levelName: 'רמה 2', lessHelp: state === 'clean', round: state === 'round',
    event: state === 'levelup' ? 'level-up' : state === 'typedone' ? 'type-done' : null, newLevel: 3, onMore: () => {}, onFinish: () => {} };
  return <div className="pf"><ProofScreen type={T3} problem={made.problem} view={made.view} level={2} levelName="רמה 2" dots={end.dots} restored={made.s} end={end} onEnd={() => {}} onLeave={() => {}} /></div>;
}

/* sample progress for ?view=topic&s=new|mid|pro (written to this device's guest progress before the topic mounts) */
const REC = (solo, n = 4) => ({ n, solo, helped: 0, missed: n - solo, filled: 0, variant: 'B', tpl: '3-X-SAS', day: 1 });
function preload(name) {
  const t = emptyType();
  if (name === 'mid') Object.assign(t, { level: 2, walked: true, done: 7, hist: { 1: [REC(4), REC(4)], 2: [REC(6, 6), REC(3, 6), REC(6, 6)], 3: [] }, count: { 1: 2, 2: 3, 3: 0 }, lastHelp: 2 });
  if (name === 'pro') Object.assign(t, { level: 3, walked: true, done: 15, hist: { 1: [REC(4), REC(4)], 2: [REC(6, 6), REC(6, 6)], 3: [REC(9, 9), REC(9, 9)] }, count: { 1: 2, 2: 2, 3: 2 }, lastHelp: 0 });
  if (name === 'l1') Object.assign(t, { level: 1, walked: true, done: 1 });
  if (name === 'l1b') Object.assign(t, { level: 1, walked: true, done: 3, hist: { 1: [REC(3, 3), REC(2, 3)], 2: [], 3: [] }, count: { 1: 2, 2: 0, 3: 0 } });
  if (name === 'up') Object.assign(t, { level: 1, walked: true, done: 3, hist: { 1: [REC(3, 3), REC(1, 3), REC(3, 3)], 2: [], 3: [] }, count: { 1: 3, 2: 0, 3: 0 }, lastHelp: 2 });
  if (name === 'l2') Object.assign(t, { level: 2, walked: true, done: 4, hist: { 1: [REC(4), REC(4), REC(4)], 2: [], 3: [] }, count: { 1: 3, 2: 0, 3: 0 } });
  if (name === 'l3') Object.assign(t, { level: 3, walked: true, done: 9, hist: { 1: [REC(4), REC(4)], 2: [REC(6, 6), REC(6, 6), REC(6, 6)], 3: [] }, count: { 1: 2, 2: 3, 3: 0 } });
  try { sessionStorage.removeItem('mp:proofs:open'); if (name === 'new') localStorage.removeItem(KEY + 'g'); else localStorage.setItem(KEY + 'g', JSON.stringify({ v: 1, types: { 'prove-congruence': t } })); } catch (e) { /* private mode */ }
}

export default function ProofsLab() {
  const [q, setQ] = useState(null);
  useEffect(() => {
    document.documentElement.dataset.topic = 'orange';
    const qs = new URLSearchParams(window.location.search);
    if (qs.get('s')) preload(qs.get('s'));
    setQ(qs);
    initRuntime();
    return () => { delete document.documentElement.dataset.topic; };
  }, []);
  const view = q ? q.get('view') || 'figures' : null;
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: css }} />
      {view && view !== 'figures' && <TopBar title="הוכחות" />}
      <div id="root" dir="rtl">
        {view === 'figures' && <Figures />}
        {view === 'proof' && <Proof q={q} />}
        {view === 'end' && <End q={q} />}
        {view === 'topic' && <Topic devRescue={q.get('rescue') ? { step: +q.get('rescue'), warm: 'W4' } : null} />}
      </div>
    </>
  );
}
