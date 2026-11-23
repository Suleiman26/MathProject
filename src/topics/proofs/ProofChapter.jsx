'use client';
/* The proofs section: one level of a subject (a proof type). Its part of the landing (screen A: what the
   level is about, the help-stage tabs חימום · מודרך · ביחד · לבד and the start button; the subject's ladder
   around it comes from Topic.jsx as `path`), the warm-up (screen B), the proof flow, mastery (saved on the device), the rescue cards
   (screen F), and the open proof that survives a refresh.
   Mastery does not depend on the answer tracker: record() is called here with the decision states. */
import React, { useEffect, useRef, useState } from 'react';
import { seeded, makeR } from '../new/core.js';
import { useAccount, accountApi } from '@/lib/account';
import { present, decisionsOf } from './core.js';
import { snapshot, restore } from './session.js';
import { RULES, OPEN_KEY, load, save, typeState, whoKey, adoptGuest, seedFromServer, record, variantFor, walked, warmed, useForce as clearForce, dots, lessHelp, leftRecord, takeRescue } from './mastery.js';
import { TYPES, TABS, STAGES } from './types/index.js';
import { typesOf, levelNo, prevInSubject } from './subjects.js';
import { T, fill } from './texts.js';
import ProofScreen from './ProofScreen.jsx';
import Warmup from './Warmup.jsx';
import { IcLock, IcCheck } from './signs.jsx';
import { isAdminFrame } from '@/lib/admin-frame';

/* Inside the admin's content-review frame (src/lib/admin-frame.js) the device's progress is READ as usual but
   never written: every write goes to a copy in memory that is gone when the frame closes. */
const shadow = (real) => {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : real ? real.getItem(k) : null), setItem: (k, v) => { m.set(k, String(v)); }, removeItem: (k) => { m.set(k, null); } };
};
let framed;
const inFrame = () => {
  if (framed === undefined) {
    framed = isAdminFrame() ? { l: shadow((() => { try { return window.localStorage; } catch { return null; } })()), s: shadow((() => { try { return window.sessionStorage; } catch { return null; } })()) } : null;
  }
  return framed;
};
const store = () => { const f = inFrame(); if (f) return f.l; try { return window.localStorage; } catch { return null; } };
const sess = () => { const f = inFrame(); if (f) return f.s; return window.sessionStorage; };
const today = () => Math.floor(Date.now() / 86400000);
const newSeed = () => { try { const a = new Uint32Array(1); window.crypto.getRandomValues(a); return (a[0] % 2147483646) + 1; } catch { return Math.floor(Math.random() * 2147483646) + 1; } };
const firstWho = () => { try { const s = JSON.parse(store().getItem('mp:account')); return whoKey(s && s.tok ? s.account : null); } catch { return 'g'; } };
/** The open proof saved for a refresh: { who, type, level, counted, walk, snap } or null. */
export function readOpen() { try { const o = JSON.parse(sess().getItem(OPEN_KEY)); return o && typeof o === 'object' && typeof o.snap === 'string' ? o : null; } catch { return null; } }
/** The device's storage for the proofs landing (a copy in memory inside the admin review frame), or null. */
export const deviceStore = () => { try { return store(); } catch { return null; } };
/** The saved progress of whoever uses this device now (read only: where the landing opens). */
export function peekState() { try { return load(store(), firstWho()); } catch { return null; } }
const dropOpen = () => { try { sess().removeItem(OPEN_KEY); } catch { /* private mode */ } };

export default function ProofChapter({ type, path, onOpen, onGoType, devRescue, devWarm }) {
  const { ready, account } = useAccount();
  const [who, setWho] = useState(firstWho);
  const [state, setState] = useState(() => load(store(), firstWho()));
  const stateRef = useRef(state), whoRef = useRef(who);
  const ts = typeState(state, type.id);
  // a level without warm-up kinds yet (the similarity levels until their warm-up is built) has no חימום tab
  const hasWarm = (type.warm || []).length > 0;
  // a first visit opens on the warm-up tab (it never blocks: the student can tap מודרך and start there)
  const [tab, setTab] = useState(() => (ts.done > 0 || ts.walked || ts.warm.done || !hasWarm ? Math.max(1, Math.min(3, ts.level)) : 0));
  const [open, setOpen] = useState(null);      // { key, problem, view, level, variant, counted, walk, restored }
  const [end, setEnd] = useState(null);
  const [rescue, setRescue] = useState(devRescue || null);
  const [warm, setWarm] = useState(devWarm ? { key: 1, only: devWarm === true ? null : devWarm, then: 'land' } : null);   // { key, only, then:'proof'|'land' }
  const live = useRef(null), last = useRef(null), sitting = useRef(0), alive = useRef(true), n = useRef(0);

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

  /* ── the account: adopt the guest progress on sign-in, reload when the student changes, seed levels from the server once.
     Nothing happens before the account state is ready (review M10): until then useAccount() says "no account" even
     for a signed-in student, and switching to the guest key would drop a restored proof. ── */
  const id = account && account.id;
  useEffect(() => {
    if (!ready) return;
    const w = whoKey(account);
    if (w === whoRef.current) return;
    if (live.current) leaveNow();
    if (id) adoptGuest(store(), id);
    whoRef.current = w; setWho(w);
    const next = load(store(), w);
    stateRef.current = next; setState(next); setOpen(null); setEnd(null);
  }, [id, ready]); // eslint-disable-line react-hooks/exhaustive-deps
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

  useEffect(() => { if (onOpen) onOpen(!!open || !!warm || !!rescue); }, [open, warm, rescue, onOpen]);

  /* ── start a proof (a rescue card waiting on the type comes first: it is shown once, then taken off) ── */
  function startProof(level, opts = {}) {
    const t = typeState(stateRef.current, type.id);
    if (t.queued && !opts.walk) {
      const out = takeRescue(t);
      putType(out.ts);
      setEnd(null); setOpen(null); setWarm(null); setRescue(out.rescue);
      return;
    }
    let { variant, counted } = variantFor(t, level);
    let lv = level;
    if (opts.walk) { variant = 'A'; counted = false; lv = 1; }
    const seed = newSeed(), R = makeR(seeded(seed));
    // a "prove, then conclude" level: its first מודרך proof re-uses a drawing the student already proved in the
    // "prove" level of the same subject (§6.5), when this level has that drawing's family
    let prefer;
    const before = type.shape === 'then' && lv === 1 && !t.count[1] ? typesOf(type.subject).find((x) => x.shape === 'prove') : null;
    if (before) {
      const fams = new Set(type.templates.map((x) => x.family)), ps = typeState(stateRef.current, before.id);
      const proved = [1, 2, 3].flatMap((l) => ps.hist[l]).map((r) => r.tpl).filter((id) => before.templates.some((x) => x.id === id && fams.has(x.family)));
      if (proved.length) prefer = proved[proved.length - 1];
    }
    const problem = type.make(R, lv, variant, { recent: t.recent, last: last.current }, { counted: t.count[lv], want: t.retry, words: [], prefer });
    let view = present(problem, lv, variant, { counted: t.count[lv], R });
    if (opts.walk) view = { ...view, ties: false, steps: view.steps.map((s) => ({ ...s, ask: [] })) };   // a fully worked example
    if (t.force === 'A' && !opts.walk) putType(clearForce(t));
    last.current = { family: problem.family, theorem: problem.theorem };
    setEnd(null); setRescue(null); setTab(level);
    setOpen({ key: ++n.current, problem, view, level, variant, counted, walk: !!opts.walk, restored: null });
  }

  /* ── the warm-up (§7.1): never blocks, never counts; `only` = one kind, two tasks (rescue step 1) ── */
  function startWarm(opts = {}) {
    setEnd(null); setRescue(null); setOpen(null); setTab(0);
    setWarm({ key: ++n.current, only: opts.only || null, then: opts.then || 'land' });
  }
  function onWarmDone(res) {
    const w = warm, t = typeState(stateRef.current, type.id);
    putType(warmed(t, res));
    setWarm(null);
    if (w && w.then === 'proof') startProof(Math.max(1, Math.min(3, t.level)));
    else setTab(Math.max(1, Math.min(3, t.level)));
  }
  function onWarmLeave() { setWarm(null); setTab(Math.max(1, Math.min(3, typeState(stateRef.current, type.id).level))); }

  /* ── every action: keep the proof for a refresh ── */
  function onState(s) {
    const o = openRef.current;
    if (!o) return;
    live.current = { s, o };
    try { sess().setItem(OPEN_KEY, JSON.stringify({ who: whoRef.current, type: type.id, level: o.level, counted: o.counted, walk: o.walk, snap: snapshot(s) })); } catch { /* private mode */ }
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
    setEnd({
      clean: r.clean, filled: r.summary.filled > 0, counted: o.counted && !o.walk, dots: dots(out.ts, o.level), done: out.ts.done, lessHelp: less, event: out.event, newLevel: out.ts.level,
      round: sitting.current % RULES.ROUND === 0, typeName: type.label, levelName: STAGES[o.level],
      onMore: () => startProof(Math.max(1, Math.min(3, out.event ? out.ts.level : o.level))),   // a queued rescue card comes first
      onFinish: () => { setOpen(null); setEnd(null); setTab(Math.max(1, Math.min(3, typeState(stateRef.current, type.id).level))); },
    });
  }

  /* ── what is on screen ── */
  const level = Math.min(3, ts.level), passed = ts.level >= 4;
  const began = ts.done > 0 || ts.walked || ts.warm.done;
  const lockedNext = level < 3 ? level + 1 : null;
  const prev = prevInSubject(type.id);                              // rescue step 3 stays inside the subject

  const tabs = (
    <div className="sub-tabs prf-tabs">
      {TABS.map((name, i) => {
        if (i === 0 && !hasWarm) return null;
        const locked = i > level, done = !locked && ((i === 0 ? began : i < level) || passed);
        return (
          <button type="button" key={name} data-mp-key={name} className={`sub-tab${i === tab ? ' active' : ''}${done ? ' prf-is-done' : ''}`} disabled={locked} onClick={() => setTab(i)}>
            {locked ? <IcLock /> : done ? <IcCheck /> : null}{STAGES[i]}
          </button>
        );
      })}
    </div>
  );
  const frame = (inner, body) => <>{path ? path({ state, inner }) : inner}{body}</>;

  if (warm) {
    return frame(tabs, (
      <div className="content prf-ch prf-ch-open">
        <Warmup key={warm.key} type={type} kinds={type.warm} only={warm.only} onDone={onWarmDone} onLeave={onWarmLeave} />
      </div>
    ));
  }

  if (open) {
    return frame(tabs, (
      <div className="content prf-ch prf-ch-open">
        <ProofScreen key={open.key} type={type} problem={open.problem} view={open.view} level={open.level} levelName={STAGES[open.level]} dots={dots(ts, open.level)}
          restored={open.restored} end={end} onEnd={onEnd} onLeave={onLeave} onSwap={end ? null : onSwap} onState={onState} />
      </div>
    ));
  }

  if (rescue) {
    // no warm-up kinds on this level: the warm-up step of the rescue ladder becomes the worked example
    const step = rescue.step === 1 && !hasWarm ? 2 : rescue.step;
    const go = () => (step === 1 ? startWarm({ only: rescue.warm || 'W1', then: 'proof' }) : step === 2 ? startProof(level, { walk: true }) : startProof(level));
    return frame(tabs, (
      <div className="content prf-ch prf-ch-card">
        <div className="prf-rescue">
          {step !== 1 && <span className="prf-rescue-k">{T['lbl.rescueCard']}</span>}
          <p className="prf-rescue-t">
            {step === 1 && fill('ui.rescue1', { skill: T[`skill.${rescue.warm || 'W1'}`] })}
            {step === 2 && T['ui.rescue2']}
            {step === 3 && fill('ui.rescue3', { prev: prev ? prev.label : STAGES[0] })}
          </p>
          <div className="prf-rescue-b">
            {step === 3 && prev
              ? <button type="button" className="prf-go" onClick={() => onGoType && onGoType(prev.id)}>{fill('lbl.levelN', { n: levelNo(prev.id) })} · {prev.label}</button>
              : <button type="button" className="prf-go" onClick={go}>{step === 2 ? T['ui.rescue2Btn'] : T['btn.go']}</button>}
            {step === 3 && prev && <button type="button" className="prf-go is-quiet" onClick={go}>{T['btn.continue']}</button>}
          </div>
        </div>
      </div>
    ));
  }

  // the main button starts what the open tab says: the warm-up (a first visit), or a proof at that level
  const viaWarm = tab === 0 && hasWarm;
  const goLevel = Math.min(Math.max(1, tab), level);
  const k = dots(ts, level).filter((d) => d === true).length;
  const inner = (
    <>
      <p className="prf-pt-about">{T[`about.${type.id}`]}</p>
      {tabs}
      {lockedNext && <p className="prf-locked"><IcLock /><span>{STAGES[lockedNext]}: {fill('ui.locked', { stage: STAGES[level] })}</span></p>}
      {ts.done > 0 && <p className="prf-land-stats">
        <span className="prf-dots is-big" role="img" aria-label={fill('lbl.cleanN', { k })}>{dots(ts, level).map((d, i) => <i key={i} className={d === true ? 'is-on' : d === false ? 'is-off' : ''} />)}</span>
        <span>{fill('lbl.done', { n: ts.done })}</span>
      </p>}
    </>
  );
  return frame(inner, (
    <div className="content prf-ch prf-land-go">
      <p className="prf-land-what"><span>{type.label}</span><span aria-hidden="true"> · </span><span>{STAGES[viaWarm ? 0 : goLevel]}</span></p>
      <button type="button" className="prf-go" onClick={() => (viaWarm ? startWarm({ then: began ? 'land' : 'proof' }) : startProof(goLevel))}>{began ? T['btn.continue'] : T['btn.start']}</button>
    </div>
  ));
}
