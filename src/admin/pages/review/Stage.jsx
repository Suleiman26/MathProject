'use client';
/* בקרת תוכן: the middle pane. The REAL topic page in a same-origin iframe: a 375px phone frame on a
   desktop, edge to edge on a phone (between a slim header and the one bottom bar). Nothing floats over it. */
import { Flag, Shuffle, CaretRight, CaretLeft, ArrowSquareOut, Warning, ArrowCounterClockwise } from "@phosphor-icons/react";
import { chaptersOf, topicProg, countsIn } from "./model";

/* read from the frame (MP.adminFrame), never assumed; compact = the phone's slim header */
function Iso({ guard, compact }) {
  if (guard === false) return <span className="cpl-iso bad" role="alert"><Warning weight="fill" />{compact ? "נספר!" : "זהירות: התשובות כאן נספרות"}</span>;
  if (guard === true) return <span className="cpl-iso" title="התשובות כאן לא נספרות לאף תלמיד"><i />{compact ? "לא נספר" : "תצוגת בקרה · התשובות כאן לא נספרות לאף תלמיד"}</span>;
  return <span className="cpl-iso wait"><i />{compact ? "בודק…" : "בודק שהתשובות לא נספרות…"}</span>;
}

/** grade / site selected: the topics to pick from (admin UI, not a student page) */
function Topics({ sel, grades, names, colors, ctx, onPick }) {
  const g = sel.lvl === "grade" ? grades.find((x) => x.id === sel.gradeId) : null;
  const list = g ? g.topics : null;
  return (
    <div className="cpl-pick">
      <h3>{g ? g.name : "כל האתר"}</h3>
      <p>{g ? "בחרו נושא כדי לראות את הדף שלו כאן, כמו שתלמיד רואה אותו." : "בחרו כיתה, ואז נושא."}</p>
      <div className="cpl-pick-l">
        {list ? list.map((t) => {
          const tp = topicProg(t, ctx), tc = countsIn({ lvl: "topic", slug: t }, ctx);
          return (
            <button key={t} type="button" className="cpl-pick-r" onClick={() => onPick({ lvl: "topic", gradeId: g.id, slug: t })}>
              <span className="cpl-tdot big" data-c={colors(t)} />
              <span className="grow"><b>{names(t)}</b><small>{chaptersOf(t).length} פרקים · {tp.ok} נבדקו{tc.o ? ` · ${tc.o} בקשות פתוחות` : ""}</small></span>
              <CaretLeft />
            </button>
          );
        }) : grades.map((x) => (
          <button key={x.id} type="button" className="cpl-pick-r" onClick={() => onPick({ lvl: "grade", gradeId: x.id })}>
            <span className="grow"><b>{x.name}</b><small>{x.topics.length} נושאים</small></span><CaretLeft />
          </button>
        ))}
      </div>
    </div>
  );
}

export function Stage({ frame, sel, grades, names, colors, ctx, crumbs, seen, onNewQ, onReport, onPick, onBack, left, onReturn, place }) {
  const st = frame.st;
  const topic = !!sel.slug;
  const showFrame = topic && st.url;
  const current = (place.subs && place.subs.length ? place.subs[place.subs.length - 1] : "") || place.chapter || sel.chapter || "";
  return (
    <section className="cpl-stage" aria-label="תצוגה חיה">
      {/* phone: one slim row above the page */}
      <div className="cpl-pvh">
        <button type="button" className="cpl-ib" onClick={onBack} aria-label="חזרה לרשימה"><CaretRight weight="bold" /></button>
        <div className="cpl-crumbs">{topic ? <><span>{names(sel.slug)}</span><span className="sep">›</span><b>{current || "…"}</b></> : <b>{crumbs[crumbs.length - 1]}</b>}</div>
        {topic && <Iso compact guard={st.loaded ? st.guard : null} />}
        {topic && <button type="button" className="cpl-b sm" onClick={onNewQ} aria-label="שאלה חדשה"><Shuffle /><span>שאלה חדשה</span></button>}
      </div>
      {/* desktop: where we are, the guard pill, the page's own actions */}
      <div className="cpl-pvbar">
        <div className="cpl-pvr">
          <div className="cpl-crumbs">{crumbs.map((c, i) => i === crumbs.length - 1 ? <b key={i}>{c}</b> : <span key={i}><span>{c}</span><span className="sep">›</span></span>)}</div>
          {topic && <Iso guard={st.loaded ? st.guard : null} />}
        </div>
        <div className="cpl-pvr">
          {topic ? <>
            <span className="cpl-qn" title="כמה שאלות ראיתם בפרק הזה בביקור הזה (לא מספר של שאלה)">ראיתם {seen}</span>
            <button type="button" className="cpl-b sm" onClick={onNewQ}><Shuffle />שאלה חדשה</button>
            <a className="cpl-b sm ghost" href={"/topics/" + sel.slug} target="_blank" rel="noopener"><ArrowSquareOut />בלשונית</a>
          </> : null}
          <span className="grow" />
          <button type="button" className="cpl-b sm pri" onClick={onReport}><Flag weight="fill" />דווח</button>
        </div>
      </div>
      <div className={"cpl-canvas" + (topic ? " has-frame" : "")}>
        <div className="cpl-phone" hidden={!showFrame}>
          <span className="cpl-island" aria-hidden="true" />
          <div className="cpl-scr">
            {!st.loaded && <div className="cpl-shim" aria-hidden="true"><span /><span /><span /><span /></div>}
            {st.url && <iframe ref={frame.ref} src={st.url} title={"תצוגה חיה: " + (topic ? names(sel.slug) : "")} onLoad={frame.onLoad} />}
            {left && (
              <div className="cpl-left"><span>יצאתם מהנושא</span><button type="button" className="cpl-b sm" onClick={onReturn}><ArrowCounterClockwise />חזרה ל־{sel.chapter || names(sel.slug)}</button></div>
            )}
            {st.failed && (
              <div className="cpl-fail">
                <Warning size={28} />
                <b>הדף לא נטען</b>
                <span>זו תקלה ששווה לדווח עליה.</span>
                <div className="cpl-fail-a">
                  <a className="cpl-b sm" href={"/topics/" + sel.slug} target="_blank" rel="noopener"><ArrowSquareOut />לפתוח בלשונית</a>
                  <button type="button" className="cpl-b sm pri" onClick={() => onReport("topic")}><Flag weight="fill" />דווח על הנושא</button>
                </div>
              </div>
            )}
          </div>
        </div>
        {!topic && <Topics sel={sel} grades={grades} names={names} colors={colors} ctx={ctx} onPick={onPick} />}
      </div>
    </section>
  );
}
