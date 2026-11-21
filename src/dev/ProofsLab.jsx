'use client';
/* Local-only lab for the proofs section: /dev/proofs lists every view (figures, one proof, the
   warm-up tasks, the end cards, the whole topic with sample progress, and the printable review
   sheet for the maths owner). Sets the coral topic colour and the section's own CSS while mounted. */
import React, { useEffect, useState } from 'react';
import css from '@/topics/proofs/styles';
import ProofFigure from '@/topics/proofs/ProofFigure';
import { St } from '@/topics/proofs/signs';
import { typeById, TYPES } from '@/topics/proofs/types/index';
import { partId } from '@/topics/proofs/figure-core';
import { partsOf, present, classify, canonRows, targets } from '@/topics/proofs/core';
import Warmup from '@/topics/proofs/Warmup';
import { KINDS } from '@/topics/proofs/warmup-core';
import { REASONS } from '@/topics/proofs/reasons';
import { T as TXT, NEW_DRAFTS } from '@/topics/proofs/texts';
import { Tx } from '@/topics/proofs/signs';
import ProofScreen from '@/topics/proofs/ProofScreen';
import TopBar from '@/components/TopBar';
import Topic from '@/topics/proofs/Topic';
import { emptyType, KEY } from '@/topics/proofs/mastery';
import { initRuntime } from '@/lib/mp-runtime';
import { seeded, makeR } from '@/topics/new/core';
import { start, act, ready } from '@/topics/proofs/session';

const T3 = typeById('prove-congruence');
/* the type of a template id: '1-a' → type 1, '2-d' → type 2, '3-X-SAS' → type 3, '4-K-SAS-2' → type 4 */
export const typeOfTpl = (tpl) => TYPES.find((t) => t.templates.some((x) => x.id === tpl)) || T3;
export const problemOf = (tpl, seed = 7, level = 2, variant = 'B', words = false) => typeOfTpl(tpl).remake({ template: tpl, seed, level, variant, meta: { words } });

function Figures() {
  const [end, setEnd] = useState({});
  return (
    <div className="prf" style={{ maxWidth: 1180, margin: '0 auto', padding: 16 }}>
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
              <div className="prf-stage" data-shot={`${t.id}-0`}><ProofFigure problem={p} /></div>
              <div className="prf-stage" data-shot={`${t.id}-1`}><ProofFigure problem={p} marks={[...given, ...goal]} /></div>
              <div className="prf-stage" data-shot={`${t.id}-2`}>
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
    const tpl = q.get('tpl') || '3-X-SAS', problem = problemOf(tpl, seed, level, variant, q.get('words') ? true : false);
    return { type: typeOfTpl(tpl), problem, view: present(problem, level, variant, { counted: +(q.get('c') || 0), R: makeR(seeded(seed)) }) };
  });
  const [end, setEnd] = useState(null);
  return (
    <div className="prf">
      <ProofScreen type={made.type} problem={made.problem} view={made.view} level={level} levelName={`רמה ${level}`} dots={[true, true, false, null]}
        onEnd={(r) => setEnd({ clean: r.clean, dots: [true, true, false, r.clean], done: 4, typeName: made.type.name, levelName: `רמה ${level}`, onMore: () => window.location.reload(), onFinish: () => {} })}
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
  const end = { clean, dots: clean ? [true, false, true, true] : [true, true, false, false], done: 7, typeName: typeOfTpl(q.get('tpl') || '3-X-SAS').name, levelName: 'רמה 2', lessHelp: state === 'clean', round: state === 'round',
    event: state === 'levelup' ? 'level-up' : state === 'typedone' ? 'type-done' : null, newLevel: 3, onMore: () => {}, onFinish: () => {} };
  return <div className="prf"><ProofScreen type={typeOfTpl(q.get('tpl') || '3-X-SAS')} problem={made.problem} view={made.view} level={2} levelName="רמה 2" dots={end.dots} restored={made.s} end={end} onEnd={() => {}} onLeave={() => {}} /></div>;
}

/* sample progress for ?view=topic&s=new|mid|pro (written to this device's guest progress before the topic mounts) */
const REC = (solo, n = 4) => ({ n, solo, helped: 0, missed: n - solo, filled: 0, variant: 'B', tpl: '3-X-SAS', day: 1 });
function preload(name, typeId = 'prove-congruence') {
  const t = emptyType();
  if (name === 'mid') Object.assign(t, { level: 2, walked: true, done: 7, hist: { 1: [REC(4), REC(4)], 2: [REC(6, 6), REC(3, 6), REC(6, 6)], 3: [] }, count: { 1: 2, 2: 3, 3: 0 }, lastHelp: 2 });
  if (name === 'pro' || name === 'gold') Object.assign(t, { level: 3, walked: true, done: 15, hist: { 1: [REC(4), REC(4)], 2: [REC(6, 6), REC(6, 6)], 3: [REC(9, 9), REC(9, 9)] }, count: { 1: 2, 2: 2, 3: 2 }, lastHelp: 0 });
  if (name === 'l1') Object.assign(t, { level: 1, walked: true, done: 1 });
  if (name === 'l1b') Object.assign(t, { level: 1, walked: true, done: 3, hist: { 1: [REC(3, 3), REC(2, 3)], 2: [], 3: [] }, count: { 1: 2, 2: 0, 3: 0 } });
  if (name === 'up') Object.assign(t, { level: 1, walked: true, done: 3, hist: { 1: [REC(3, 3), REC(1, 3), REC(3, 3)], 2: [], 3: [] }, count: { 1: 3, 2: 0, 3: 0 }, lastHelp: 2 });
  if (name === 'l2') Object.assign(t, { level: 2, walked: true, done: 4, hist: { 1: [REC(4), REC(4), REC(4)], 2: [], 3: [] }, count: { 1: 3, 2: 0, 3: 0 } });
  if (name === 'l3') Object.assign(t, { level: 3, walked: true, done: 9, hist: { 1: [REC(4), REC(4)], 2: [REC(6, 6), REC(6, 6), REC(6, 6)], 3: [] }, count: { 1: 2, 2: 3, 3: 0 } });
  try { sessionStorage.removeItem('mp:proofs:open'); if (name === 'new') localStorage.removeItem(KEY + 'g'); else localStorage.setItem(KEY + 'g', JSON.stringify({ v: 1, types: name === 'gold' ? Object.fromEntries(TYPES.map((x, i) => [x.id, { ...t, level: i < 2 ? 4 : i === 2 ? 3 : 1, done: i < 3 ? t.done : 0, walked: i < 3, hist: i < 3 ? t.hist : { 1: [], 2: [], 3: [] }, count: i < 3 ? t.count : { 1: 0, 2: 0, 3: 0 } }])) : { [typeId]: t } })); } catch (e) { /* private mode */ }
}

/* ?view=warm&k=W1…W7&seed=<n> : four tasks of one kind */
function Warm({ q }) {
  const k = KINDS.includes(q.get('k')) ? q.get('k') : 'W1', type = TYPES.find((t) => t.warm.includes(k)) || T3;
  const [done, setDone] = useState(null);
  return <div className="prf">{done ? <pre style={{ padding: 20, direction: 'ltr' }}>{JSON.stringify(done)}</pre> : <Warmup type={type} kinds={[k]} seed={+(q.get('seed') || 7)} onDone={setDone} onLeave={() => setDone({ left: true })} />}</div>;
}

/* the lab's front page: every view */
function Index() {
  const L = ({ href, children }) => <a href={href} style={{ display: 'inline-flex', alignItems: 'center', minHeight: 40, padding: '0 14px', margin: '0 0 8px 8px', borderRadius: 999, background: 'var(--surface)', boxShadow: 'inset 0 0 0 1.5px var(--line-strong)', color: 'var(--ink)', textDecoration: 'none', font: '500 14px var(--font)' }}>{children}</a>;
  const H = ({ children }) => <h2 style={{ font: '700 16px var(--font)', margin: '18px 0 8px' }}>{children}</h2>;
  return (
    <div className="prf" style={{ maxWidth: 900, margin: '0 auto', padding: 16 }} dir="ltr">
      <h1 style={{ font: '800 22px var(--font)' }}>Proofs lab</h1>
      <H>The topic (sample progress on this device)</H>
      {['new', 'l1', 'l1b', 'up', 'l2', 'mid', 'l3', 'pro', 'gold'].map((n) => <L key={n} href={`?view=topic&s=${n}`}>topic · {n}</L>)}
      {[1, 2, 3].map((n) => <L key={n} href={`?view=topic&s=mid&rescue=${n}`}>rescue card {n}</L>)}
      <H>One proof: type × level × variant</H>
      {TYPES.map((t) => [1, 2, 3].map((l) => ['A', 'B'].map((v) => <L key={t.id + l + v} href={`?view=proof&tpl=${t.templates[0].id}&l=${l}&v=${v}`}>{t.n} · L{l}-{v}</L>)))}
      <H>Every template (Level 2-B)</H>
      {TYPES.flatMap((t) => t.templates).map((t) => <L key={t.id} href={`?view=proof&tpl=${t.id}&l=2&v=B`}>{t.id}</L>)}
      <H>Warm-up tasks</H>
      {KINDS.map((k) => <L key={k} href={`?view=warm&k=${k}`}>{k}</L>)}
      <H>End cards</H>
      {['clean', 'helped', 'levelup', 'typedone', 'round'].map((n) => <L key={n} href={`?view=end&state=${n}`}>end · {n}</L>)}
      <H>Figures and the review sheet</H>
      <L href="?view=figures">figures (type 3)</L>
      {TYPES.map((t) => <L key={t.id} href={`?view=sheet&t=${t.n}`}>review sheet · type {t.n} ({t.templates.length})</L>)}
      <L href="?view=sheet&t=0">review sheet · new texts</L>
    </div>
  );
}

/* ?view=sheet&t=1…4 : one card per template for the maths owner (spec §6.5); t=0 : the texts written by the builder.
   Maths runs left to right, text right to left; it prints (cards do not break across pages). */
function Sheet({ q }) {
  const n = +(q.get('t') || 3), type = TYPES[n - 1];
  const nav = (
    <p className="prf-lab-nav">{TYPES.map((t) => <a key={t.id} href={`?view=sheet&t=${t.n}`}>{t.button}</a>)}<a href="?view=sheet&t=0">ניסוחים חדשים</a><button type="button" onClick={() => window.print()}>הדפסה</button></p>
  );
  if (!type) {
    return (
      <div className="prf prf-lab-sheet">
        {nav}
        <h1 className="prf-lab-h">דף בדיקה · ניסוחים שנכתבו בבנייה ({NEW_DRAFTS.length})</h1>
        <p className="prf-lab-p">הטקסטים האלה לא מנוסחים במפרט. כל אחד מהם מחכה לאישור או לתיקון.</p>
        <table className="prf-table prf-lab-texts"><tbody>{NEW_DRAFTS.map((k) => <tr key={k} className="prf-lab-card"><td dir="ltr">{k}</td><td>{TXT[k]}</td></tr>)}</tbody></table>
        <h1 className="prf-lab-h">הנימוקים (מפרט 6.3) · ניסוח שעוד לא אושר</h1>
        <table className="prf-table prf-lab-texts"><tbody>{Object.values(REASONS).map((r) => <tr key={r.id} className="prf-lab-card"><td>{r.short}</td><td>{r.full || '(רק כתשובה שגויה)'}</td></tr>)}</tbody></table>
      </div>
    );
  }
  return (
    <div className="prf prf-lab-sheet">
      {nav}
      <h1 className="prf-lab-h">דף בדיקה · {type.button} · {type.templates.length} תבניות</h1>
      <p className="prf-lab-p">{TXT[`about.${type.id}`]} לכל תבנית: הציור עם כל הסימונים, הנתון, מה שצריך להוכיח, ההוכחה כפי שנכתבת במחברת, והטענות השגויות עם ההסבר שהתלמיד מקבל.</p>
      <div className="prf-lab-grid">
        {type.templates.map((t, i) => {
          const p = problemOf(t.id, 31 + i, 2, 'B', true), goal = targets(p);
          const marks = Object.keys(p.facts).filter((f) => p.canon.includes(f)).map((fact) => ({ fact, style: 'on' }));
          return (
            <section key={t.id} className="prf-lab-card">
              <h2 className="prf-lab-id" dir="ltr">{t.id}</h2>
              <div className="prf-stage prf-lab-fig"><ProofFigure problem={p} marks={marks} /></div>
              {(p.text || []).map((x, k) => <p key={k} className="prf-page-l"><Tx k={x.key} vars={x.vars} /></p>)}
              <p className="prf-page-l"><b>{TXT['lbl.given']}</b>{' '}{(p.givenText || []).map((g, k) => <React.Fragment key={k}>{k > 0 && ', '}{g.form === 'eq' ? <St st={p.facts[g.facts[0]]} /> : <Tx k={g.key} vars={g.vars} />}{g.byOrder && ` ${TXT['lbl.byOrder']}`}</React.Fragment>)}</p>
              {type.n !== 1 && <p className="prf-page-l"><b>{TXT['lbl.toProve']}</b>{' '}{goal.map((f, k) => <React.Fragment key={f}>{k > 0 && ', '}<St st={p.facts[f]} /></React.Fragment>)}</p>}
              <table className="prf-table">
                <thead><tr><th scope="col">{TXT['lbl.claim']}</th><th scope="col">{TXT['lbl.reason']}</th></tr></thead>
                <tbody>{canonRows(p).map((r, k) => <tr key={r.fact}><td><span className="prf-table-n">{k + 1}.</span> <St st={r.st} /></td><td>{(p.just[r.fact][0].reasons || []).map((id) => REASONS[id].full || REASONS[id].short).join(' / ')}</td></tr>)}</tbody>
              </table>
              {p.tiles.wrong.length > 0 && <p className="prf-lab-k">טענות שגויות וההסבר</p>}
              {p.tiles.wrong.map((w, k) => { const c = classify(p, p.given, w.st); return <p key={k} className="prf-lab-w"><St st={w.st} /> <span>{c.textKey ? <Tx k={c.textKey} vars={c.vars || {}} /> : c.c}</span></p>; })}
            </section>
          );
        })}
      </div>
    </div>
  );
}

export default function ProofsLab() {
  const [q, setQ] = useState(null);
  useEffect(() => {
    document.documentElement.dataset.topic = 'orange';
    const qs = new URLSearchParams(window.location.search);
    if (qs.get('s')) preload(qs.get('s'), (TYPES[+(qs.get('t') || 3) - 1] || T3).id);
    setQ(qs);
    initRuntime();
    return () => { delete document.documentElement.dataset.topic; };
  }, []);
  const view = q ? q.get('view') || 'index' : null;
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: css }} />
      {view && !['figures', 'index', 'sheet'].includes(view) && <TopBar title="הוכחות" />}
      <div id="root" dir="rtl">
        {view === 'figures' && <Figures />}
        {view === 'proof' && <Proof q={q} />}
        {view === 'end' && <End q={q} />}
        {view === 'index' && <Index />}
        {view === 'warm' && <Warm q={q} />}
        {view === 'sheet' && <Sheet q={q} />}
        {view === 'topic' && <Topic devRescue={q.get('rescue') ? { step: +q.get('rescue'), warm: 'W4' } : null} />}
      </div>
    </>
  );
}
