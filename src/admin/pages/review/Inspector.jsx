'use client';
/* בקרת תוכן: the requests pane (design §7). For the selected node, top to bottom: what it is and its ✓ line,
   then "בקשות כאן" = ONE list of the board's own Item cards (everything here and below; each card says where),
   approved/postponed folded, the open levels above it in one folded line, and the way to the full board. */
import Link from "next/link";
import { Check, Flag, ArrowCounterClockwise, Info, X, ArrowSquareOut } from "@phosphor-icons/react";
import { Item, STATUS } from "../Fixes";
import { ago } from "../../ui";
import { ST } from "./Tree";
import { inNode, aboveNode, whereRel, chapterMark, topicProg, gradeProg, gradesOf, isOpen } from "./model";

const LVL = { site: "כל האתר", grade: "כיתה", topic: "נושא", chapter: "פרק" };
export const LVL_ON = { site: "על כל האתר", grade: "על הכיתה", topic: "על הנושא", chapter: "על הפרק" };
const ORDER = { review: 0, reopened: 1, new: 2, working: 3, later: 4, done: 5 };
const ord = (l) => l.slice().sort((a, b) => (ORDER[a.it.status] ?? 9) - (ORDER[b.it.status] ?? 9) || b.it.id - a.it.id);

export function Inspector({ sel, ctx, grades, names, seen, onCheck, onReport, onGoto, onClose, flash, itemProps, busyCheck, statusOf = () => null, onStatus, busyStatus }) {
  const n = sel;
  const g = n.gradeId ? grades.find((x) => x.id === n.gradeId) : null;
  const title = n.lvl === "site" ? "כל האתר" : n.lvl === "grade" ? (g ? g.name : "") : n.lvl === "topic" ? names(n.slug) : n.chapter;
  const path = [];
  if (g && n.lvl !== "grade" && !g.hidden) path.push(g.name);
  if (n.lvl === "chapter") path.push(names(n.slug));

  let head = null;
  if (ctx && n.lvl === "chapter") {
    const m = chapterMark(n.slug, n.chapter, ctx);
    const line = m.r
      ? <div className="cpl-ck chg"><ArrowCounterClockwise weight="bold" /><span>יש כאן תיקון שמחכה לאישור שלך<small>פתחו את השאלה בדף, ואז ״תקין, לאשר״ או ״עדיין לא תקין״</small></span></div>
      : m.valid ? <div className="cpl-ck ok"><Check weight="bold" /><span>הפרק נבדק<small>{m.ck.author} · {ago(m.ck.created_at)}{m.o ? " · אבל יש בו בקשות פתוחות" : ""}</small></span></div>
      : m.ck ? <div className="cpl-ck"><span className="cpl-mk none" /><span>לבדוק שוב: הפרק השתנה מאז שנבדק<small>השתנה מאז ש־{m.ck.author} בדק ({ago(m.ck.created_at)}). הסימון ירד לבד כדי שלא יטעה.</small></span></div>
      : <div className="cpl-ck"><span className="cpl-mk none" /><span>הפרק עוד לא נבדק<small>ראיתם כאן {seen} {seen === 1 ? "שאלה" : "שאלות"}. כדאי לראות לפחות 3 לפני סימון.</small></span></div>;
    const checked = m.valid && !m.r;
    head = <>{line}<div className="cpl-acts">
      {m.r
        ? <button type="button" className="cpl-b" onClick={() => onGoto("review")}><ArrowCounterClockwise weight="bold" />לאשר את התיקון למטה</button>
        : <button type="button" className={"cpl-b" + (checked ? "" : " ok")} disabled={busyCheck} onClick={onCheck}><Check weight="bold" />{checked ? "לבטל את הסימון" : m.ck ? "בדקתי שוב · תקין" : "הפרק תקין · נבדק"}</button>}
      <button type="button" className="cpl-b pri" onClick={() => onReport("chapter")}><Flag weight="fill" />דווח {LVL_ON.chapter}</button>
    </div></>;
  } else if (ctx) {
    let pr = null;
    if (n.lvl === "topic") { const p = topicProg(n.slug, ctx); pr = <div className={"cpl-ck" + (p.n && p.ok === p.n ? " ok" : "")}><span className="cpl-mini w"><i style={{ width: (p.n ? (p.ok / p.n) * 100 : 0) + "%" }} /></span><span>{p.ok} מתוך {p.n} פרקים נבדקו<small>מסמנים ✓ בכל פרק בנפרד</small></span></div>; }
    if (n.lvl === "grade" && g && !g.hidden) {
      const p = gradeProg(g, ctx), rd = g.topics.filter((t) => (statusOf(t) || {}).status === "ready").length, ms = g.topics.filter((t) => (statusOf(t) || {}).status === "missing").length;
      pr = <div className="cpl-ck"><span className="cpl-mini w"><i style={{ width: (p.n ? (p.ok / p.n) * 100 : 0) + "%" }} /></span><span>{p.ok} מתוך {p.n} פרקים נבדקו בכיתה<small>{rd} מתוך {g.topics.length} נושאים מוכנים{ms ? " · " + ms + " חסר עוד" : ""}</small></span></div>;
    }
    if (n.lvl === "grade" && g && g.hidden) pr = <div className="cpl-ck"><Info /><span>נושאים שעוד לא מופיעים לתלמידים<small>סולימאן משבץ כל פרק בנושא אמיתי</small></span></div>;
    let stRow = null;
    if (n.lvl === "topic") {
      const st = statusOf(n.slug);
      stRow = <div className="cpl-stset">
        <div className="cpl-stset-h"><b>מצב הנושא</b><small>{st ? ST[st.status].label + " · " + st.author + " · " + ago(st.updated_at) : "עוד לא סומן"}</small></div>
        <div className="cpl-seg" role="group" aria-label="מצב הנושא">
          {["ready", "missing"].map((k) => (
            <button key={k} type="button" className={ST[k].cls} aria-pressed={!!st && st.status === k} disabled={busyStatus} onClick={() => onStatus && onStatus(n.slug, k)}>
              {k === "ready" ? <Check weight="bold" /> : <span className="cpl-seg-dot" />}{ST[k].label}
            </button>
          ))}
        </div>
        {st && st.status === "missing" ? <small className="cpl-stset-tip">מה חסר? ״דווח על הנושא״ ומשפט אחד, וזה יגיע ללוח התיקונים.</small> : null}
      </div>;
    }
    head = <>{pr}{stRow}<div className="cpl-acts">
      <button type="button" className="cpl-b pri" onClick={() => onReport(n.lvl)}><Flag weight="fill" />דווח {LVL_ON[n.lvl]}</button>
      {n.slug ? <a className="cpl-b" href={"/topics/" + n.slug} target="_blank" rel="noopener"><ArrowSquareOut />פתיחה באתר</a> : null}
    </div></>;
  }
  const multi = n.slug ? gradesOf(grades, n.slug) : [];

  const here = ctx ? ctx.placed.filter((x) => inNode(x.p, n, grades)) : [];
  const openHere = ord(here.filter((x) => x.it.status !== "done" && x.it.status !== "later"));
  const closedHere = ord(here.filter((x) => x.it.status === "done" || x.it.status === "later"));
  const above = ctx ? ctx.placed.filter((x) => aboveNode(x.p, n) && (isOpen(x.it) || x.it.status === "review")) : [];
  const aboveName = (p) => (p.lvl === "site" ? "כל האתר" : p.lvl === "grade" ? p.grade : names(p.slug));
  const card = (x) => (
    <Item key={x.it.id} it={{ ...x.it, body: String(x.it.body || "").replace(/^איפה:[^\n]*\n/, "") }} {...itemProps} clamp className={flash === x.it.id ? "cpl-flash" : ""}
      where={whereRel(x.p, n, names)} head={<span className="cpl-id">#{x.it.id}</span>} />
  );

  return (
    <div className="cpl-panel">
      <div className="cpl-ins">
        <button type="button" className="cpl-ib cpl-sheet-x" onClick={onClose} aria-label="סגירה"><X weight="bold" /></button>
        <div className="cpl-eyebrow">{LVL[n.lvl]}</div>
        <h2>{title}</h2>
        {path.length ? <div className="cpl-ins-path">{path.join(" › ")}</div> : null}
        {head}
        {multi.length > 1 && <div className="cpl-note"><Info /><span>הנושא מופיע ב{multi.map((x) => x.name).join(" וב")}. הסימונים והבקשות משותפים.</span></div>}
      </div>
      <div className="cpl-sec">
        <div className="cpl-sec-h"><h3>בקשות כאן</h3><span className="cnt">{openHere.length}</span></div>
        {!ctx ? <div className="cpl-items-sk"><span /><span /></div>
          : openHere.length ? <ul className="fx-list cpl-items">{openHere.map(card)}</ul>
          : <div className="cpl-empty"><b>אין כאן בקשות פתוחות</b>{n.lvl === "chapter" ? "אם הכל תקין, ״✓ תקין״. אם משהו לא בסדר, ״דווח״." : "משהו לא בסדר? ״דווח״ ושלחו משפט אחד."}</div>}
        {closedHere.length > 0 && (
          <details className="cpl-fold"><summary>{closedHere.length} שאושרו או נדחו ›</summary><ul className="fx-list cpl-items">{closedHere.map(card)}</ul></details>
        )}
        {above.length > 0 && (
          <details className="cpl-fold"><summary>ועוד {above.length} {above.length === 1 ? "בקשה פתוחה" : "בקשות פתוחות"} על {[...new Set(above.map((x) => aboveName(x.p)))].join(" / ")} ›</summary>
            <div className="cpl-above-l">{above.map((x) => (
              <button key={x.it.id} type="button" className="cpl-above" onClick={() => onGoto(x)}>
                <span className={"fx-st sm " + (STATUS[x.it.status] || STATUS.new).tone}>{(STATUS[x.it.status] || STATUS.new).label}</span>
                <span className="cpl-above-w">{aboveName(x.p)}</span>
                <span className="t">{String(x.it.body || "").split("\n").find((l) => !/^איפה:|^סוג:/.test(l)) || x.it.body}</span>
              </button>
            ))}</div>
          </details>
        )}
      </div>
      <div className="cpl-foot"><span className="grow">כל הבקשות נשמרות בלוח התיקונים ונקראות כל בוקר.</span><Link href="/admin/fixes">ללוח המלא</Link></div>
    </div>
  );
}
