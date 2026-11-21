'use client';
/* בקרת תוכן: the navigator. כל האתר → grade → topic → chapter, with one mark per chapter (design §5):
   ○ to do · ✓ checked · coral N open requests · ↻ a fix waits for your approval. */
import { CaretLeft, Check, ArrowCounterClockwise, MagnifyingGlass, SkipBack, X } from "@phosphor-icons/react";
import { chaptersOf, chapterMark, countsIn, topicProg, gradeProg, allProg, matches, isOpen } from "./model";

export function Mark({ m, small }) {
  const cls = "cpl-mk" + (small ? " sm" : "");
  if (m.kind === "open") return <span className={cls + " open"} title={m.o + " בקשות פתוחות"}>{m.o}</span>;
  if (m.kind === "chg") return <span className={cls + " chg"} title="תוקן, מחכה לאישור שלך"><ArrowCounterClockwise weight="bold" /></span>;
  if (m.kind === "ok") return <span className={cls + " ok"} title="נבדק"><Check weight="bold" /></span>;
  return <span className={cls + " none"} title="עוד לא נבדק" />;
}

function hl(s, q) {
  if (!q) return s;
  const i = s.indexOf(q);
  return i < 0 ? s : <>{s.slice(0, i)}<mark>{s.slice(i, i + q.length)}</mark>{s.slice(i + q.length)}</>;
}

/** the sticky block above the tree: first-time hint, progress + "הבא", search, filters */
export function TreeControls({ ctx, hint, onHint, onNext, q, setQ, onSearchEnter, onlyOpen, setOnlyOpen, onlyNew, setOnlyNew, localChecks, loading }) {
  const p = ctx ? allProg(ctx) : { ok: 0, chg: 0, n: 0 };
  const openN = ctx ? ctx.placed.filter((x) => isOpen(x.it)).length : 0;
  return (
    <div className="cpl-tctl">
      {hint && (
        <div className="cpl-hint">
          <span><span className="cpl-nw">בוחרים פרק</span> <span className="cpl-nw">← פותרים כמה שאלות</span> <span className="cpl-nw">← <b>✓ תקין</b> או <b>דווח</b></span> עם משפט אחד.</span>
          <button type="button" onClick={onHint}>הבנתי</button>
        </div>
      )}
      <div className="cpl-prog">
        <div className="cpl-prog-t">
          <span className="cpl-prog-l">{loading ? "טוען…" : <><span className="cpl-nw"><b>{p.ok}</b> מתוך {p.n} פרקים נבדקו</span>{p.chg ? <span className="cpl-rv">{p.chg} {p.chg === 1 ? "מחכה" : "מחכים"} לאישור שלך</span> : null}</>}</span>
          <span className="cpl-bar" aria-hidden="true"><i style={{ width: (p.n ? (p.ok / p.n) * 100 : 0) + "%" }} /><i className="c" style={{ width: (p.n ? (p.chg / p.n) * 100 : 0) + "%" }} /></span>
          {localChecks && <small className="cpl-local">הסימונים ✓ נשמרים כרגע רק במכשיר הזה</small>}
        </div>
        <button type="button" className="cpl-b pri sm" disabled={loading} onClick={onNext} title="קודם תיקונים לאישור, אחר כך פרקים שלא נבדקו">
          <SkipBack weight="fill" />{p.chg ? "לאשר תיקון" : "הבא לבדיקה"}
        </button>
      </div>
      <label className="cpl-srch">
        <MagnifyingGlass />
        <span className="sr">חיפוש</span>
        <input type="search" value={q} placeholder="חיפוש נושא, פרק או #מספר" autoComplete="off" enterKeyHint="search"
          onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") onSearchEnter(); if (e.key === "Escape") setQ(""); }} />
        {q && <button type="button" className="cpl-srch-x" aria-label="ניקוי החיפוש" onClick={() => setQ("")}><X /></button>}
      </label>
      <div className="cpl-filters">
        <button type="button" className="cpl-chip" aria-pressed={onlyOpen} onClick={() => setOnlyOpen(!onlyOpen)}>עם בקשות פתוחות <span className="n">{openN}</span></button>
        <button type="button" className="cpl-chip" aria-pressed={onlyNew} onClick={() => setOnlyNew(!onlyNew)}>לא נבדקו</button>
      </div>
    </div>
  );
}

export function Tree({ ctx, grades, names, colors, sel, onSelect, open, onToggle, q, onlyOpen, onlyNew, loading }) {
  if (loading || !ctx) {
    return <div className="cpl-tree-sk" aria-label="טוען">{[70, 52, 64, 48, 58, 44, 66, 50].map((w, i) => <span key={i} style={{ width: w + "%", marginInlineStart: (i % 3) * 14 }} />)}</div>;
  }
  const query = q.trim().replace(/^#\d+$/, "");
  const filtering = !!(query || onlyOpen || onlyNew);
  const chapterVisible = (t, c) => {
    const m = chapterMark(t, c, ctx);
    if (onlyOpen && !(m.o || m.r)) return false;
    if (onlyNew && !(m.kind === "none" || m.kind === "chg")) return false;
    if (query && !(matches(query, c) || matches(query, names(t)))) return false;
    return true;
  };
  const rows = [];
  const row = (o) => (
    <div key={o.k} className={"cpl-tr l" + o.l} role="treeitem" aria-level={o.l} aria-expanded={o.exp == null ? undefined : o.exp}
      aria-selected={!!o.on} tabIndex={o.on ? 0 : -1} data-k={o.k}
      onClick={o.onClick} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); o.onClick(); } }}>
      {o.inner}
    </div>
  );
  const car = (k, isOpenNow) => (
    <span className={"cpl-car" + (isOpenNow ? " o" : "")} role="button" aria-label={isOpenNow ? "סגירה" : "פתיחה"}
      onClick={(e) => { e.stopPropagation(); onToggle(k); }}><CaretLeft weight="bold" /></span>
  );

  // whole site: only the requests that are about the whole site itself
  const siteOwn = ctx.placed.filter((x) => x.p.lvl === "site" && isOpen(x.it)).length;
  if (!filtering || (onlyOpen && siteOwn)) {
    rows.push(row({ l: 1, k: "site", on: sel.lvl === "site", onClick: () => onSelect({ lvl: "site" }),
      inner: <><span className="cpl-car x" /><span className="cpl-tr-n">כל האתר</span><span className="cpl-tr-c">{siteOwn ? <span className="cpl-mk open">{siteOwn}</span> : null}</span></> }));
  }
  grades.forEach((g) => {
    const topics = g.topics.filter((t) => chaptersOf(t).some((c) => chapterVisible(t, c))
      || (!onlyNew && matches(query, names(t)) && (!onlyOpen || (() => { const k = countsIn({ lvl: "topic", slug: t }, ctx); return k.o + k.r; })())));
    const gOwn = ctx.placed.filter((x) => x.p.lvl === "grade" && x.p.gradeId === g.id && isOpen(x.it)).length;
    if (filtering && !topics.length && !(onlyOpen && gOwn)) return;
    const gk = "g|" + g.id, gOpen = filtering || open.has(gk);
    const gp = gradeProg(g, ctx), gc = countsIn({ lvl: "grade", gradeId: g.id }, ctx);
    rows.push(row({ l: 1, k: gk, exp: gOpen, on: sel.lvl === "grade" && sel.gradeId === g.id,
      onClick: () => onSelect({ lvl: "grade", gradeId: g.id }),
      inner: <>{car(gk, gOpen)}<span className="cpl-tr-n">{g.name}</span><span className="cpl-tr-c">
        {gc.o ? <span className="cpl-mk open" title="בקשות פתוחות בכיתה">{gc.o}</span> : null}
        {g.hidden ? null : <><span className="num">{gp.ok}/{gp.n}</span><span className="cpl-mini"><i style={{ width: (gp.n ? (gp.ok / gp.n) * 100 : 0) + "%" }} /></span></>}
      </span></> }));
    if (!gOpen) return;
    topics.forEach((t) => {
      const tk = "t|" + g.id + "|" + t, tOpen = filtering || open.has(tk);
      const tc = countsIn({ lvl: "topic", slug: t }, ctx), tp = topicProg(t, ctx);
      rows.push(row({ l: 2, k: tk, exp: tOpen, on: sel.lvl === "topic" && sel.slug === t && sel.gradeId === g.id,
        onClick: () => onSelect({ lvl: "topic", gradeId: g.id, slug: t }),
        inner: <>{car(tk, tOpen)}<span className="cpl-tdot" data-c={colors(t)} /><span className="cpl-tr-n">{hl(names(t), query)}</span><span className="cpl-tr-c">
          {tc.r ? <span className="cpl-rv" title="תוקן, מחכה לאישור שלך"><ArrowCounterClockwise weight="bold" />{tc.r}</span> : null}
          {tc.o ? <span className="cpl-mk open">{tc.o}</span> : null}
          <span className="num">{tp.ok}/{tp.n}</span>
        </span></> }));
      if (!tOpen) return;
      chaptersOf(t).forEach((c) => {
        if (!chapterVisible(t, c)) return;
        const m = chapterMark(t, c, ctx);
        rows.push(row({ l: 3, k: "c|" + g.id + "|" + t + "|" + c, on: sel.lvl === "chapter" && sel.slug === t && sel.chapter === c && sel.gradeId === g.id,
          onClick: () => onSelect({ lvl: "chapter", gradeId: g.id, slug: t, chapter: c }),
          inner: <><Mark m={m} /><span className="cpl-tr-n">{hl(c, query)}</span><span className="cpl-tr-c">{m.kind === "open" && m.r ? <span className="cpl-rv" title="תוקן, מחכה לאישור שלך"><ArrowCounterClockwise weight="bold" /></span> : null}</span></> }));
      });
    });
  });
  return (
    <>
      <div className="cpl-tree-h"><span>כיתות ונושאים</span><span className="grow" />{filtering ? <span>מסונן</span> : null}</div>
      <div role="tree" aria-label="תוכן האתר">
        {rows.length ? rows : <div className="cpl-tree-empty">לא נמצא כלום. נסו מילה אחרת או הסירו סינון.</div>}
      </div>
      <div className="cpl-legend" aria-label="מקרא">
        <span><Mark small m={{ kind: "none" }} />לא נבדק</span>
        <span><Mark small m={{ kind: "ok" }} />נבדק</span>
        <span><Mark small m={{ kind: "open", o: 2 }} />בקשות פתוחות</span>
        <span><Mark small m={{ kind: "chg" }} />תוקן, מחכה לאישור שלך</span>
      </div>
    </>
  );
}
