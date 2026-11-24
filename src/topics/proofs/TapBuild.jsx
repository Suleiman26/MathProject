'use client';
/* The proofs section: Level 3, "build it yourself" (spec §7.2). Tap two parts of the same kind in
   the drawing → a preview chip → "להוסיף שורה". Only the confirmed statement is judged: a mis-tap is
   never a mistake. Near two parts → a small chooser. "רשימת חלקים" is the same thing without
   pointing (keyboard, screen reader). A congruence: two triangles, then the vertices of the second
   in matching order. Reasons: the two-step pick "מאיפה יודעים?".
   A similarity (spec 2026-11-23 §7.6): two triangles build "△… ∼ △…"; two SIDES are one fraction of a ratio (the side
   tapped first over its partner). The fractions pile up in the preview ("AD/AB = AE/▢"); the last one waits for
   "להוסיף שורה", and only then is the whole ratio judged. "למחוק את השבר האחרון" takes one back. */
import React, { useMemo, useState } from 'react';
import { partsIndex } from './ProofFigure.jsx';
import { groupsFor, REASONS } from './reasons.js';
import { T, fill } from './texts.js';
import { angKey } from './core.js';
import { St, Mx, Sign, Frac, Fracs, IcList, IcClose, hasLaw } from './signs.jsx';

const KINDS = [['seg', 'lbl.segs'], ['ang', 'lbl.angs'], ['tri', 'lbl.tris']];

/** The selection in the drawing: at most two parts of one kind. */
export function useSelection(problem, onNote, kinds = null) {
  const list = useMemo(() => partsIndex(problem.figure).filter((x) => !kinds || kinds.includes(x.kind)), [problem]); // eslint-disable-line react-hooks/exhaustive-deps
  const index = useMemo(() => Object.fromEntries(list.map((x) => [x.id, x])), [list]);
  const [selected, setSelected] = useState([]);
  const [chooser, setChooser] = useState(null);
  const [order, setOrder] = useState([]);
  const [open, setOpen] = useState(false);
  const [self, setSelf] = useState(false);            // a shared side stated as equal to itself
  function pick(id) {
    setChooser(null);
    if (!index[id]) return;
    setOrder([]); setSelf(false);
    setSelected((cur) => {
      if (cur.includes(id)) return cur.filter((x) => x !== id);
      if (cur.length && index[cur[0]].kind !== index[id].kind) { if (onNote) onNote('st.kinds'); return [id]; }
      if (cur.length >= 2) return [id];
      return [...cur, id];
    });
  }
  const tap = (id, near) => { if (near && near.length >= 2) setChooser(near); else pick(id); };
  const clear = () => { setSelected([]); setChooser(null); setOrder([]); setSelf(false); };
  const parts = selected.map((id) => index[id]).filter(Boolean);
  const kind = parts.length ? parts[0].kind : null;
  let preview = null;
  if (parts.length === 2 && kind !== 'tri') preview = { kind, x: parts[0].part, y: parts[1].part };
  const tris = problem.figure.tris || [];
  const shared = parts.length === 1 && kind === 'seg' && tris.length > 1 && tris.every((t) => [...parts[0].part].every((q) => t.includes(q)));
  if (shared && self) preview = { kind: 'seg', x: parts[0].part, y: parts[0].part };
  // an angle that belongs to both triangles (a common angle: ∢KRM = ∢SRT is one angle with two names): stated as equal to itself
  let both = null;
  if (parts.length === 1 && kind === 'ang' && tris.length > 1) {
    const fig = problem.figure, v = parts[0].part.v, k = angKey(fig, parts[0].part);
    const names = tris.map((t) => (t.includes(v) ? { v, r: t.filter((q) => q !== v) } : null));
    if (names.every((a) => a && angKey(fig, a) === k)) both = { kind: 'ang', x: names[0], y: names[1] };
  }
  if (both && self) preview = both;
  return { sharedAng: both && !self ? both : null, shared: shared && !self, setSelf, list, index, selected, parts, kind, preview, chooser, order, setOrder, open, setOpen, pick, tap, clear, pickFromChooser: pick, closeChooser: () => setChooser(null) };
}

/** The tray while a Level-3 statement is being built. */
export function TapStatement({ sel, onAdd, onMatching, sim = false, ratio = null, onPair, onUnpair }) {
  const { parts, kind, chooser, order } = sel;
  // a similarity: two sides are a fraction, never an equality
  const built = ratio ? ratio.pairs : [], fracOn = !!ratio && (kind === 'seg' || (!parts.length && built.length > 0));
  const preview = ratio && kind === 'seg' ? null : sel.preview;
  const last = fracOn && parts.length === 2 && built.length + 1 >= ratio.need;      // the fraction that completes the ratio: it waits for the button
  const eq = sim ? 'sim' : 'cong';
  if (chooser) {
    return (
      <div className="prf-tap">
        <p className="prf-tap-q">{T['lbl.chooser']}</p>
        <div className="prf-chips prf-cols-2">
          {chooser.map((id) => sel.index[id] && <button type="button" key={id} className="prf-chip" onClick={() => sel.pickFromChooser(id)}>{sel.index[id].he}</button>)}
        </div>
        <div className="prf-tap-foot"><button type="button" className="prf-x" onClick={sel.closeChooser}><IcClose /><span>{T['btn.cancel']}</span></button></div>
      </div>
    );
  }
  const twoTris = kind === 'tri' && parts.length === 2;
  const t1 = twoTris ? parts[0].part : null, t2 = twoTris ? parts[1].part : null;
  const left = twoTris ? t2.filter((v) => !order.includes(v)) : [];
  return (
    <div className="prf-tap">
      {fracOn && (
        <div className="prf-prev prf-prev-frac">
          <Fracs className="prf-prev-st" pairs={[...built, ...(parts.length === 2 ? [[parts[0].part, parts[1].part]] : [])]}
            label={[...built, ...(parts.length === 2 ? [[parts[0].part, parts[1].part]] : [])].map(([a, b]) => fill('say.frac', { x: a, y: b })).join(' = ')}
            tail={parts.length === 2 ? null : <>{built.length > 0 && <span className="prf-frac-eq" aria-hidden="true">=</span>}<Frac className="is-open" top={parts.length ? parts[0].part : <i className="prf-slot is-next" />} bottom={<i className={`prf-slot${parts.length ? ' is-next' : ''}`} />} /></>} />
          {last && <button type="button" className="prf-go prf-add" onClick={() => onPair(parts[0].part, parts[1].part)}>{T['btn.add']}</button>}
        </div>
      )}
      {!fracOn && parts.length > 0 && (
        <div className="prf-prev">
          {preview && <St st={preview} className="prf-prev-st" />}
          {!preview && !twoTris && <span className="prf-prev-st prf-m" dir="ltr"><Mx s={kind === 'tri' ? `△${parts[0].part.join('')}` : kind === 'ang' ? `∢${parts[0].part.r[0]}${parts[0].part.v}${parts[0].part.r[1]}` : parts[0].part} /> <span className="prf-prev-eq">{kind === 'tri' ? <Sign name={eq} /> : '='}</span> <i className="prf-slot is-wide" /></span>}
          {twoTris && (
            <span className="prf-prev-st prf-m" dir="ltr" aria-label={`${parts[0].he}, ${parts[1].he}`}>
              <Mx s={`△${t1.join('')} ${sim ? '∼' : '≅'} △`} />{[0, 1, 2].map((i) => <i key={i} className={`prf-slot${order[i] ? ' is-set' : i === order.length ? ' is-next' : ''}`}>{order[i] || ''}</i>)}
            </span>
          )}
          {(preview || (twoTris && order.length === 3)) && (
            <button type="button" className="prf-go prf-add" onClick={() => (preview ? onAdd(preview) : onMatching(t1, order))}>{T['btn.add']}</button>
          )}
        </div>
      )}
      {sel.shared && !ratio && (
        <button type="button" className="prf-chip prf-self" onClick={() => sel.setSelf(true)}><St st={{ kind: 'seg', x: parts[0].part, y: parts[0].part }} /><span>{T['lbl.sameSeg']}</span></button>
      )}
      {sel.sharedAng && (
        <button type="button" className="prf-chip prf-self" onClick={() => sel.setSelf(true)}><St st={sel.sharedAng} /><span>{T['lbl.sameAng']}</span></button>
      )}
      {twoTris && order.length < 3 && (
        <div className="prf-chips prf-cols-3 prf-verts">
          {t2.map((v) => <button type="button" key={v} className="prf-chip prf-vert" disabled={!left.includes(v)} onClick={() => sel.setOrder([...order, v])}><span className="prf-m" dir="ltr">{v}</span></button>)}
        </div>
      )}
      <div className="prf-tap-foot">
        <button type="button" className={`prf-listb${sel.open ? ' is-open' : ''}`} aria-expanded={sel.open} onClick={() => sel.setOpen(!sel.open)}><IcList /><span>{T['btn.parts']}</span></button>
        {parts.length > 0 ? <button type="button" className="prf-x" onClick={sel.clear}><IcClose /><span>{T['btn.cancel']}</span></button>
          : built.length > 0 && <button type="button" className="prf-x prf-unpair" onClick={onUnpair}><IcClose /><span>{T['btn.unpair']}</span></button>}
      </div>
      {sel.open && (
        <div className="prf-parts">
          {KINDS.map(([k, key]) => {
            const items = sel.list.filter((x) => x.kind === k);
            return items.length > 0 && (
              <div key={k} className="prf-parts-g" role="group" aria-label={T[key]}>
                <span className="prf-parts-t">{T[key]}</span>
                <div className="prf-parts-c">
                  {items.map((x) => <button type="button" key={x.id} className={`prf-chip prf-partc${sel.selected.includes(x.id) ? ' is-on' : ''}`} aria-pressed={sel.selected.includes(x.id)} aria-label={x.he} data-part={x.id} onClick={() => sel.pick(x.id)}><Mx s={k === 'seg' ? x.part : k === 'tri' ? `△${x.part.join('')}` : `∢${x.part.r[0]}${x.part.v}${x.part.r[1]}`} /></button>)}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/** The two-step reason pick: where do we know it from → which reason. In the second step every theorem and
    definition is listed with its full sentence under its name (spec 2026-11-23 §6.2.2): one tap chooses. */
export function GroupPick({ subject, wrong = [], onPick, onGroup }) {
  const GROUPS = groupsFor(subject);
  const [g, setG0] = useState(null);
  // the parent hears which list is open: a list of theorems is long, so the sheet makes room for it
  const setG = (id) => { setG0(id); if (onGroup) { const x = GROUPS.find((y) => y.id === id); onGroup(x && x.reasons.some(hasLaw) ? id : null); } };
  const group = GROUPS.find((x) => x.id === g);
  if (!group) {
    return (
      <div className="prf-chips prf-cols-2 prf-groups">
        {GROUPS.map((x) => <button type="button" key={x.id} className="prf-chip prf-group" onClick={() => setG(x.id)}>{x.he}</button>)}
      </div>
    );
  }
  return (
    <div className="prf-groupin">
      <div className="prf-group-h"><span className="prf-group-t">{group.he}</span><button type="button" className="prf-x" onClick={() => setG(null)}><span>{T['btn.back']}</span></button></div>
      <div className={`prf-chips ${group.reasons.some(hasLaw) ? 'prf-cols-1 prf-laws' : group.reasons.every((r) => [...REASONS[r].short].length <= 7) ? 'prf-cols-3' : 'prf-cols-2'}`}>
        {group.reasons.map((r) => (
          <button type="button" key={r} className={`prf-chip${hasLaw(r) ? ' prf-lawc' : ''}`} disabled={wrong.includes(r)} onClick={() => onPick(r)}>
            {hasLaw(r) ? <><span className="prf-lawc-n">{REASONS[r].short}</span><small className="prf-lawc-t">{REASONS[r].full}</small></> : REASONS[r].short}
          </button>
        ))}
      </div>
    </div>
  );
}
