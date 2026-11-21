'use client';
/* The proofs section: Level 3, "build it yourself" (spec §7.2). Tap two parts of the same kind in
   the drawing → a preview chip → "להוסיף שורה". Only the confirmed statement is judged: a mis-tap is
   never a mistake. Near two parts → a small chooser. "רשימת חלקים" is the same thing without
   pointing (keyboard, screen reader). A congruence: two triangles, then the vertices of the second
   in matching order. Reasons: the two-step pick "מאיפה יודעים?". */
import React, { useMemo, useState } from 'react';
import { partsIndex } from './ProofFigure.jsx';
import { GROUPS, REASONS } from './reasons.js';
import { T } from './texts.js';
import { St, Mx, IcList, IcClose } from './signs.jsx';

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
  return { shared: shared && !self, setSelf, list, index, selected, parts, kind, preview, chooser, order, setOrder, open, setOpen, pick, tap, clear, pickFromChooser: pick, closeChooser: () => setChooser(null) };
}

/** The tray while a Level-3 statement is being built. */
export function TapStatement({ sel, onAdd, onMatching }) {
  const { parts, kind, preview, chooser, order } = sel;
  if (chooser) {
    return (
      <div className="pf-tap">
        <p className="pf-tap-q">{T['lbl.chooser']}</p>
        <div className="pf-chips pf-cols-2">
          {chooser.map((id) => sel.index[id] && <button type="button" key={id} className="pf-chip" onClick={() => sel.pickFromChooser(id)}>{sel.index[id].he}</button>)}
        </div>
        <div className="pf-tap-foot"><button type="button" className="pf-x" onClick={sel.closeChooser}><IcClose /><span>{T['btn.cancel']}</span></button></div>
      </div>
    );
  }
  const twoTris = kind === 'tri' && parts.length === 2;
  const t1 = twoTris ? parts[0].part : null, t2 = twoTris ? parts[1].part : null;
  const left = twoTris ? t2.filter((v) => !order.includes(v)) : [];
  return (
    <div className="pf-tap">
      {parts.length > 0 && (
        <div className="pf-prev">
          {preview && <St st={preview} className="pf-prev-st" />}
          {!preview && !twoTris && <span className="pf-prev-st pf-m" dir="ltr"><Mx s={kind === 'tri' ? `△${parts[0].part.join('')}` : kind === 'ang' ? `∢${parts[0].part.r[0]}${parts[0].part.v}${parts[0].part.r[1]}` : parts[0].part} /> <span className="pf-prev-eq">{kind === 'tri' ? <Mx s="≅" /> : '='}</span> <i className="pf-slot is-wide" /></span>}
          {twoTris && (
            <span className="pf-prev-st pf-m" dir="ltr" aria-label={`${parts[0].he}, ${parts[1].he}`}>
              <Mx s={`△${t1.join('')} ≅ △`} />{[0, 1, 2].map((i) => <i key={i} className={`pf-slot${order[i] ? ' is-set' : i === order.length ? ' is-next' : ''}`}>{order[i] || ''}</i>)}
            </span>
          )}
          {(preview || (twoTris && order.length === 3)) && (
            <button type="button" className="pf-go pf-add" onClick={() => (preview ? onAdd(preview) : onMatching(t1, order))}>{T['btn.add']}</button>
          )}
        </div>
      )}
      {sel.shared && (
        <button type="button" className="pf-chip pf-self" onClick={() => sel.setSelf(true)}><St st={{ kind: 'seg', x: parts[0].part, y: parts[0].part }} /><span>{T['lbl.sameSeg']}</span></button>
      )}
      {twoTris && order.length < 3 && (
        <div className="pf-chips pf-cols-3 pf-verts">
          {t2.map((v) => <button type="button" key={v} className="pf-chip pf-vert" disabled={!left.includes(v)} onClick={() => sel.setOrder([...order, v])}><span className="pf-m" dir="ltr">{v}</span></button>)}
        </div>
      )}
      <div className="pf-tap-foot">
        <button type="button" className={`pf-listb${sel.open ? ' is-open' : ''}`} aria-expanded={sel.open} onClick={() => sel.setOpen(!sel.open)}><IcList /><span>{T['btn.parts']}</span></button>
        {parts.length > 0 && <button type="button" className="pf-x" onClick={sel.clear}><IcClose /><span>{T['btn.cancel']}</span></button>}
      </div>
      {sel.open && (
        <div className="pf-parts">
          {KINDS.map(([k, key]) => {
            const items = sel.list.filter((x) => x.kind === k);
            return items.length > 0 && (
              <div key={k} className="pf-parts-g" role="group" aria-label={T[key]}>
                <span className="pf-parts-t">{T[key]}</span>
                <div className="pf-parts-c">
                  {items.map((x) => <button type="button" key={x.id} className={`pf-chip pf-partc${sel.selected.includes(x.id) ? ' is-on' : ''}`} aria-pressed={sel.selected.includes(x.id)} aria-label={x.he} data-part={x.id} onClick={() => sel.pick(x.id)}><Mx s={k === 'seg' ? x.part : k === 'tri' ? `△${x.part.join('')}` : `∢${x.part.r[0]}${x.part.v}${x.part.r[1]}`} /></button>)}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/** The two-step reason pick: where do we know it from → which reason. */
export function GroupPick({ wrong = [], onPick }) {
  const [g, setG] = useState(null);
  const group = GROUPS.find((x) => x.id === g);
  if (!group) {
    return (
      <div className="pf-chips pf-cols-2 pf-groups">
        {GROUPS.map((x) => <button type="button" key={x.id} className="pf-chip pf-group" onClick={() => setG(x.id)}>{x.he}</button>)}
      </div>
    );
  }
  return (
    <div className="pf-groupin">
      <div className="pf-group-h"><span className="pf-group-t">{group.he}</span><button type="button" className="pf-x" onClick={() => setG(null)}><span>{T['btn.back']}</span></button></div>
      <div className={`pf-chips ${group.reasons.every((r) => [...REASONS[r].short].length <= 7) ? 'pf-cols-3' : 'pf-cols-2'}`}>
        {group.reasons.map((r) => <button type="button" key={r} className="pf-chip" disabled={wrong.includes(r)} onClick={() => onPick(r)}>{REASONS[r].short}</button>)}
      </div>
    </div>
  );
}
