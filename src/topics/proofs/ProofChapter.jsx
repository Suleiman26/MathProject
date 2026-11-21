'use client';
/* The proofs section: one proof type. Landing (screen A), the level tabs, the proof flow, mastery
   (saved on the device), the rescue cards (screen F), and the open proof that survives a refresh.
   Mastery does not depend on the answer tracker: record() is called here with the decision states. */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { seeded, makeR } from '../new/core.js';
import { useAccount, accountApi } from '@/lib/account';
import { present, decisionsOf, targets } from './core.js';
import { snapshot, restore } from './session.js';
import { RULES, OPEN_KEY, load, save, typeState, whoKey, adoptGuest, seedFromServer, record, variantFor, walked, useForce as clearForce, dots, lessHelp, leftRecord } from './mastery.js';
import { TYPES, TABS } from './types/index.js';
import { T, fill } from './texts.js';
import ProofScreen from './ProofScreen.jsx';
import ProofFigure from './ProofFigure.jsx';
import { IcLock, IcCheck } from './signs.jsx';

const store = () => { try { return window.localStorage; } catch { return null; } };
const today = () => Math.floor(Date.now() / 86400000);
const newSeed = () => { try { const a = new Uint32Array(1); window.crypto.getRandomValues(a); return (a[0] % 2147483646) + 1; } catch { return Math.floor(Math.random() * 2147483646) + 1; } };
const firstWho = () => { try { const s = JSON.parse(window.localStorage.getItem('mp:account')); return whoKey(s && s.tok ? s.account : null); } catch { return 'g'; } };
/** The open proof saved for a refresh: { who, type, level, counted, walk, snap } or null. */
export function readOpen() { try { const o = JSON.parse(window.sessionStorage.getItem(OPEN_KEY)); return o && typeof o === 'object' && typeof o.snap === 'string' ? o : null; } catch { return null; } }
const dropOpen = () => { try { window.sessionStorage.removeItem(OPEN_KEY); } catch { /* private mode */ } };

export default function ProofChapter({ type, onOpen, onGoType, devRescue }) {
  const { account } = useAccount();
  const [who, setWho] = useState(firstWho);
  const [state, setState] = useState(() => load(store(), firstWho()));
  const stateRef = useRef(state), whoRef = useRef(who);
  const ts = typeState(state, type.id);
  const [tab, setTab] = useState(() => Math.max(1, Math.min(3, ts.level)));
  const [open, setOpen] = useState(null);      // { key, problem, view, level, variant, counted, walk, restored }
  const [end, setEnd] = useState(null);
  const [rescue, setRescue] = useState(devRescue || null);
  const live = useRef(null), last = useRef(null), sitting = useRef(0), nextRescue = useRef(null), alive = useRef(true), n = useRef(0);

  const commit = (next) => { stateRef.current = next; setState(next); save(store(), whoRef.current, next); };
  const putType = (t) => commit({ ...stateRef.current, types: { ...stateRef.current.types, [type.id]: t } });

  /* ── the open proof: back after a refresh; another type's, another student's or a broken one is dropped ── */
  useEffect(() => {
    const o = readOpen();
    if (!o) { dropOpen(); return; }
    const s = o.type === type.id && o.who === whoRef.current ? restore(o.snap, (x) => (x.type === type.id ? type.remake(x) : null)) : null;
    if (!s || s.ended) { dropOpen(); return; }
    const level = [1, 2, 3].includes(o.level) ? o.level : 1;
    setTab(level);
    setOpen({ key: ++n.current, problem: s.problem, view: s.view, level, variant: s.problem.variant, counted: o.counted !== false, walk: !!o.walk, restored: s });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── the account: adopt the guest progress on sign-in, reload when the student changes, seed levels from the server once ── */
  const id = account && account.id;
  useEffect(() => {
    const w = whoKey(account);
    if (w === whoRef.current) return;
    if (live.current) leaveNow();
    if (id) adoptGuest(store(), id);
    whoRef.current = w; setWho(w);
    const next = load(store(), w);
    stateRef.current = next; setState(next); setOpen(null); setEnd(null);
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!id) return undefined;
    let on = true;
    accountApi.progress().then((d) => {
      if (!on || !d || whoRef.current !== `u:${id}`) return;
      const next = seedFromServer(stateRef.current, d.chapters, TYPES);
      if (next !== stateRef.current) commit(next);
    }).catch(() => {});
    return () => { on = false; };
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { if (onOpen) onOpen(!!open); }, [open, onOpen]);

  /* ── start a proof ── */
  function startProof(level, opts = {}) {
    const t = typeState(stateRef.current, type.id);
    let { variant, counted } = variantFor(t, level);
    let lv = level;
    if (opts.walk) { variant = 'A'; counted = false; lv = 1; }
    const seed = newSeed(), R = makeR(seeded(seed));
    // type 4: the first Level-1 proof re-uses a variant the student already proved in type 3 (§6.5)
    const t3 = typeState(stateRef.current, 'prove-congruence'), proved = [1, 2, 3].flatMap((l) => t3.hist[l]).map((r) => r.tpl).filter((x) => /^3-[XKZT]-/.test(x));
    const prefer = type.id === 'then-conclusion' && lv === 1 && !t.count[1] && proved.length ? proved[proved.length - 1] : undefined;
    const problem = type.make(R, lv, variant, { recent: t.recent, last: last.current }, { counted: t.count[lv], want: t.retry, words: [], prefer });
    let view = present(problem, lv, variant, { counted: t.count[lv], R });
    if (opts.walk) view = { ...view, ties: false, steps: view.steps.map((s) => ({ ...s, ask: [] })) };   // a fully worked example
    if (t.force === 'A' && !opts.walk) putType(clearForce(t));
    last.current = { family: problem.family, theorem: problem.theorem };
    nextRescue.current = null;
    setEnd(null); setRescue(null); setTab(level);
    setOpen({ key: ++n.current, problem, view, level, variant, counted, walk: !!opts.walk, restored: null });
  }

  /* ── every action: keep the proof for a refresh ── */
  function onState(s) {
    const o = openRef.current;
    if (!o) return;
    live.current = { s, o };
    try { window.sessionStorage.setItem(OPEN_KEY, JSON.stringify({ who: whoRef.current, type: type.id, level: o.level, counted: o.counted, walk: o.walk, snap: snapshot(s) })); } catch { /* private mode */ }
  }
  const openRef = useRef(null);
  openRef.current = open;

  /* ── left in the middle (back arrow, swap, another type, sign-out, leaving the page's component) ── */
  function leaveNow() {
    const cur = live.current;
    live.current = null; dropOpen();
    if (!cur || cur.s.ended || !cur.o.counted) return;
    const s = cur.s, decided = [...s.decisions, ...(s.cur && s.cur.tainted ? [{ state: 'missed' }] : [])];
    const rec = leftRecord({ n: decisionsOf(s.view), decided, variant: cur.o.variant, tpl: s.problem.template, day: today() });
    if (!rec) return;
    const out = record(typeState(stateRef.current, type.id), cur.o.level, rec, { counted: true, errs: s.errs });
    out.ts.done = Math.max(0, out.ts.done - 1);                       // left, not completed
    const next = { ...stateRef.current, types: { ...stateRef.current.types, [type.id]: out.ts } };
    stateRef.current = next; save(store(), whoRef.current, next);
    if (alive.current) setState(next);
  }
  useEffect(() => {
    alive.current = true;
    return () => { alive.current = false; setTimeout(() => { if (!alive.current) leaveNow(); }, 0); };   // (a dev double-mount is not a leave)
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function onLeave() { leaveNow(); setOpen(null); setEnd(null); }
  function onSwap() { const lv = open.level, walk = open.walk; leaveNow(); startProof(lv, { walk }); }

  /* ── the end of a proof ── */
  function onEnd(r) {
    const o = openRef.current, t = typeState(stateRef.current, type.id);
    const rec = { ...r.summary, variant: o.variant, tpl: o.problem.template, day: today() };
    const less = !o.walk && lessHelp(t, rec);
    let out;
    if (o.walk) out = { ts: t, event: null, rescue: null };
    else if (!o.counted) { out = record(t, o.level, rec, { counted: false }); if (o.level === 1 && o.variant === 'A') out.ts = walked(out.ts); }
    else out = record(t, o.level, rec, { counted: true, errs: r.errs, filledReason: r.filledReason });
    putType(out.ts);
    live.current = null; dropOpen();
    sitting.current += 1;
    nextRescue.current = out.rescue;
    setEnd({
      clean: r.clean, counted: o.counted && !o.walk, dots: dots(out.ts, o.level), done: out.ts.done, lessHelp: less, event: out.event, newLevel: out.ts.level,
      round: sitting.current % RULES.ROUND === 0, typeName: type.name, levelName: TABS[o.level],
      onMore: () => {
        if (nextRescue.current) { const rs = nextRescue.current; nextRescue.current = null; setOpen(null); setEnd(null); setRescue(rs); return; }
        startProof(Math.max(1, Math.min(3, out.event ? out.ts.level : o.level)));
      },
      onFinish: () => { setOpen(null); setEnd(null); setTab(Math.max(1, Math.min(3, typeState(stateRef.current, type.id).level))); },
    });
  }

  /* ── what is on screen ── */
  const level = Math.min(3, ts.level), passed = ts.level >= 4;
  const sample = useMemo(() => { try { return type.remake({ template: type.templates[0].id, seed: 20261121, level: 1, variant: 'A', meta: null }); } catch { return null; } }, [type]);
  const sampleMarks = useMemo(() => (sample ? [...sample.canon.filter((f) => f !== 'cong' && !targets(sample).includes(f)).map((fact, i) => ({ fact, style: 'on', delay: 500 + i * 420 })), ...targets(sample).map((fact) => ({ fact, style: 'goal' }))] : []), [sample]);
  const began = ts.done > 0 || ts.walked;
  const lockedNext = level < 3 ? level + 1 : null;
  const idx = TYPES.findIndex((x) => x.id === type.id), prev = idx > 0 ? TYPES[idx - 1] : null;

  const tabs = (
    <div className="sub-tabs">
      {TABS.map((name, i) => {
        const locked = i > level;
        return <button type="button" key={name} className={`sub-tab${i === tab ? ' active' : ''}`} disabled={locked} onClick={() => setTab(i)}>{name}</button>;
      })}
    </div>
  );

  if (open) {
    return (
      <div className="content pf-ch pf-ch-open">
        {tabs}
        <ProofScreen key={open.key} type={type} problem={open.problem} view={open.view} level={open.level} levelName={TABS[open.level]} dots={dots(ts, open.level)}
          restored={open.restored} end={end} onEnd={onEnd} onLeave={onLeave} onSwap={end ? null : onSwap} onState={onState} />
      </div>
    );
  }

  if (rescue) {
    const go = () => (rescue.step === 2 ? startProof(level, { walk: true }) : startProof(level));
    return (
      <div className="content pf-ch">
        {tabs}
        <div className="pf-rescue">
          {rescue.step !== 1 && <span className="pf-rescue-k">{T['lbl.rescueCard']}</span>}
          <p className="pf-rescue-t">
            {rescue.step === 1 && fill('ui.rescue1', { skill: T[`skill.${rescue.warm || 'W1'}`] })}
            {rescue.step === 2 && T['ui.rescue2']}
            {rescue.step === 3 && fill('ui.rescue3', { prev: prev ? prev.name : T['tab.warm'] })}
          </p>
          <div className="pf-rescue-b">
            {rescue.step === 3 && prev
              ? <button type="button" className="pf-go" onClick={() => onGoType && onGoType(prev.id)}>{prev.button}</button>
              : <button type="button" className="pf-go" onClick={go}>{rescue.step === 2 ? T['ui.rescue2Btn'] : T['btn.go']}</button>}
            {rescue.step === 3 && prev && <button type="button" className="pf-go is-quiet" onClick={go}>{T['btn.continue']}</button>}
          </div>
        </div>
      </div>
    );
  }

  const tabLevel = Math.max(1, tab);
  return (
    <div className="content pf-ch">
      {tabs}
      {lockedNext && <p className="pf-locked"><IcLock /><span>{TABS[lockedNext]}: {fill('ui.locked', { n: level })}</span></p>}
      <section className="pf-land">
        <h2 className="pf-land-h">{type.name}</h2>
        <p className="pf-land-a">{T[`about.${type.id}`]}</p>
        {sample && <div className="pf-stage pf-land-fig"><ProofFigure problem={sample} marks={sampleMarks} label={T['lbl.sample']} /></div>}
        <ol className="pf-steps" aria-label={T['lbl.order']}>
          {TABS.map((name, i) => {
            const done = (i === 0 ? began || ts.warm.done : i < level) || passed, here = !passed && i === level;
            return (
              <li key={name} className={`pf-st${done ? ' is-done' : ''}${here ? ' is-here' : ''}`}>
                <span className="pf-st-bar" style={{ height: `${14 + i * 9}px` }}>{done && <IcCheck />}</span>
                <span className="pf-st-n">{name}</span>
                {here && <span className="pf-st-here">{T['lbl.here']}</span>}
              </li>
            );
          })}
        </ol>
        {began && <div className="pf-land-stats">
          <span className="pf-dots is-big" aria-hidden="true">{dots(ts, level).map((d, i) => <i key={i} className={d === true ? 'is-on' : d === false ? 'is-off' : ''} />)}</span>
          <span>{fill('lbl.cleanN', { k: dots(ts, level).filter((d) => d === true).length })}</span>
          <span className="pf-end-sep" aria-hidden="true" />
          <span>{fill('lbl.done', { n: ts.done })}</span>
        </div>}
      </section>
      <div className="pf-land-go">
        <button type="button" className="pf-go" onClick={() => startProof(Math.min(tabLevel, level))}>{began ? T['btn.continue'] : T['btn.start']}{tab >= 1 && began ? ` · ${TABS[Math.min(tabLevel, level)]}` : ''}</button>
      </div>
    </div>
  );
}
