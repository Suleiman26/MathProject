'use client';
/* Fixes board: what to fix in each topic, what was fixed and waits for review,
   what was approved. Replaces sending PDF lists back and forth. */
import { useEffect, useMemo, useRef, useState } from "react";
import { Plus, ChatCircle, Check, ArrowCounterClockwise, ArrowSquareOut, PencilSimple, ListChecks } from "@phosphor-icons/react";
import { useAdmin, PageHead } from "../AdminShell";
import { Sheet, Empty, useToast, ago } from "../ui";
import { TOPICS } from "@/topics/registry";

export const STATUS = {
  new: { label: "חדש", tone: "st-new" },
  working: { label: "בעבודה", tone: "st-working" },
  review: { label: "תוקן · לבדיקה", tone: "st-review" },
  reopened: { label: "צריך עוד תיקון", tone: "st-reopened" },
  done: { label: "אושר", tone: "st-done" },
  later: { label: "לאחר כך", tone: "st-later" },
};
const FILTERS = [
  { id: "review", label: "מחכה לבדיקה שלכם", has: (s) => s === "review" },
  { id: "open", label: "פתוח", has: (s) => s === "new" || s === "working" || s === "reopened" },
  { id: "later", label: "לאחר כך", has: (s) => s === "later" },
  { id: "done", label: "אושר", has: (s) => s === "done" },
  { id: "all", label: "הכל", has: () => true },
];
const PEOPLE = ["סולימאן", "עבד"];
const topicName = (slug) => (slug === "general" ? "כללי · כל האתר" : ((TOPICS[slug] && TOPICS[slug].title) || slug).split(" — ")[0]);
const TOPIC_OPTIONS = ["general", ...Object.keys(TOPICS).sort((a, b) => topicName(a).localeCompare(topicName(b), "he"))];

function useName() {
  const [name, setName] = useState(null);
  useEffect(() => { try { setName(localStorage.getItem("mp:fix-name") || ""); } catch { setName(""); } }, []);
  const set = (n) => { setName(n); try { localStorage.setItem("mp:fix-name", n); } catch {} };
  return [name, set];
}

export default function Fixes() {
  const a = useAdmin();
  const toast = useToast();
  const [items, setItems] = useState(null);
  const [filter, setFilter] = useState(null);
  const [topic, setTopic] = useState("");
  const [name, setName] = useName();
  const [edit, setEdit] = useState(null); // {} = new, item = edit
  const [busy, setBusy] = useState(false);

  async function reload() {
    try { const r = await a.run("admin_fixes", {}); setItems(Array.isArray(r) ? r : []); }
    catch (e) { setItems([]); toast("לא נטען: " + e.message, true); }
  }
  useEffect(() => { reload(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const counts = useMemo(() => Object.fromEntries(FILTERS.map((f) => [f.id, (items || []).filter((i) => f.has(i.status)).length])), [items]);
  const active = filter || (counts.review ? "review" : "open");
  const f = FILTERS.find((x) => x.id === active);
  const shown = (items || []).filter((i) => f.has(i.status) && (!topic || i.topic === topic));
  const groups = useMemo(() => {
    const m = new Map();
    shown.forEach((i) => { if (!m.has(i.topic)) m.set(i.topic, []); m.get(i.topic).push(i); });
    return [...m.entries()].sort((x, y) => topicName(x[0]).localeCompare(topicName(y[0]), "he"));
  }, [shown]);
  const total = (items || []).filter((i) => i.status !== "later").length;
  const done = counts.done || 0;

  async function act(item, body, status) {
    if (!name) return toast("קודם בחרו מי אתם (למעלה)", true);
    setBusy(true);
    try {
      const r = await a.run("admin_fix_comment", { item_id: item.id, author: name, body, new_status: status || null });
      if (r && r.error) throw new Error(r.error);
      await reload();
      if (status === "done") toast("אושר ✓");
      else if (status === "reopened") toast("נשלח לתיקון נוסף");
      else toast(status ? "הסטטוס עודכן" : "התגובה נוספה");
      return true;
    } catch (e) { toast("לא נשמר: " + e.message, true); return false; }
    finally { setBusy(false); }
  }

  async function saveItem(close) {
    const it = edit;
    if (!String(it.body || "").trim()) return toast("כתבו מה צריך לתקן", true);
    if (!it.id && !name) return toast("קודם בחרו מי אתם (למעלה)", true);
    setBusy(true);
    try {
      const r = it.id
        ? await a.run("admin_fix_edit", { item_id: it.id, topic: it.topic, section: it.section || "", body: it.body })
        : await a.run("admin_fix_add", { topic: it.topic, section: it.section || "", body: it.body, author: name });
      if (r && r.error) throw new Error(r.error);
      await reload(); close(); toast(it.id ? "נשמר" : "נוסף לרשימה");
    } catch (e) { toast("לא נשמר: " + e.message, true); }
    finally { setBusy(false); }
  }
  async function removeItem(close) {
    if (!confirm("למחוק את התיקון הזה?")) return;
    try { await a.run("admin_fix_delete", { item_id: edit.id }); await reload(); close(); toast("נמחק"); }
    catch (e) { toast("לא נמחק: " + e.message, true); }
  }

  return (
    <>
      <PageHead tools={<button type="button" className="abtn pri" onClick={() => setEdit({ topic: topic || "general", section: "", body: "" })}><Plus size={17} weight="bold" />תיקון חדש</button>} />

      {name === "" && (
        <div className="fx-who card-in">
          <b>מי אתם?</b><span>כדי שנדע מי כתב כל הערה.</span>
          <div className="fx-who-b">{PEOPLE.map((p) => <button key={p} type="button" className="abtn" onClick={() => setName(p)}>{p}</button>)}</div>
        </div>
      )}

      <section className="fx-top card-in">
        <div className="fx-prog">
          <div><b>{done}</b> מתוך {total} תיקונים אושרו{counts.review ? <> · <span className="fx-hl">{counts.review} מחכים לבדיקה שלכם</span></> : null}</div>
          <span className="fx-bar" aria-hidden="true"><i style={{ width: (total ? (done / total) * 100 : 0) + "%" }} /><i className="rv" style={{ width: (total ? (counts.review / total) * 100 : 0) + "%" }} /></span>
        </div>
        <div className="fx-tools">
          <div className="fx-filters" role="tablist" aria-label="סינון לפי מצב">
            {FILTERS.map((x) => (
              <button key={x.id} type="button" role="tab" aria-selected={active === x.id} className={"fx-f" + (x.id === "review" && counts.review ? " hot" : "")} onClick={() => setFilter(x.id)}>
                {x.label}<span>{counts[x.id] || 0}</span>
              </button>
            ))}
          </div>
          <label className="fx-topic"><span className="sr">נושא</span>
            <select value={topic} onChange={(e) => setTopic(e.target.value)}>
              <option value="">כל הנושאים</option>
              {TOPIC_OPTIONS.filter((t) => (items || []).some((i) => i.topic === t)).map((t) => <option key={t} value={t}>{topicName(t)}</option>)}
            </select>
          </label>
          {name ? <button type="button" className="fx-me" onClick={() => setName("")} title="החלפת שם">{name} · החלפה</button> : null}
        </div>
      </section>

      {items === null ? <div className="fx-loading"><span /><span /><span /></div>
        : groups.length === 0 ? <Empty icon={<ListChecks size={28} />} title={active === "review" ? "אין כרגע מה לבדוק" : "אין כאן תיקונים"}>{active === "open" ? "הכל טופל. אפשר להוסיף תיקון חדש בכפתור למעלה." : "בחרו סינון אחר למעלה."}</Empty>
        : groups.map(([slug, list]) => (
          <section key={slug} className="fx-group card-in">
            <header className="fx-gh">
              <h2>{topicName(slug)}</h2><span className="fx-n">{list.length}</span>
              {slug !== "general" && <a className="fx-open" href={"/topics/" + slug} target="_blank" rel="noopener"><ArrowSquareOut size={15} />פתיחת הנושא</a>}
            </header>
            <ul className="fx-list">{list.map((it) => <Item key={it.id} it={it} busy={busy} onAct={act} onEdit={() => setEdit({ ...it })} />)}</ul>
          </section>
        ))}

      {edit && (
        <Sheet title={edit.id ? "עריכת תיקון" : "תיקון חדש"} saving={busy} onClose={() => setEdit(null)} onSave={saveItem} onDelete={edit.id ? removeItem : null}>
          <label className="field"><span>נושא</span>
            <select value={edit.topic} onChange={(e) => setEdit({ ...edit, topic: e.target.value })}>{TOPIC_OPTIONS.map((t) => <option key={t} value={t}>{topicName(t)}</option>)}</select>
          </label>
          <label className="field"><span>תת־פרק (לא חובה)</span>
            <input type="text" value={edit.section || ""} placeholder="למשל: חוקי חזקות" onChange={(e) => setEdit({ ...edit, section: e.target.value })} />
          </label>
          <label className="field"><span>מה צריך לתקן?</span>
            <textarea className="fx-ta" rows={5} value={edit.body} placeholder="תארו מה לא תקין או מה להוסיף. אפשר כמה שורות." onChange={(e) => setEdit({ ...edit, body: e.target.value })} />
          </label>
          {!edit.id && <p className="note">התיקון יופיע כ״חדש״. אחרי שאתקן אותו הוא יעבור ל״תוקן · לבדיקה״, ואז תאשרו או תחזירו לתיקון.</p>}
        </Sheet>
      )}
    </>
  );
}

function Item({ it, busy, onAct, onEdit }) {
  const [mode, setMode] = useState(null); // null | "comment" | "reopen"
  const [text, setText] = useState("");
  const [all, setAll] = useState(false);
  const ta = useRef(null);
  useEffect(() => { if (mode && ta.current) ta.current.focus(); }, [mode]);
  const st = STATUS[it.status] || STATUS.new;
  const thread = it.comments || [];
  const visible = all ? thread : thread.slice(-2);

  async function send() {
    if (mode === "reopen" && !text.trim()) return ta.current && ta.current.focus();
    if (!text.trim()) return;
    const ok = await onAct(it, text, mode === "reopen" ? "reopened" : null);
    if (ok) { setMode(null); setText(""); }
  }

  return (
    <li className={"fx-item " + st.tone}>
      <div className="fx-ih">
        <span className={"fx-st " + st.tone}>{st.label}</span>
        {it.section && <span className="fx-sec">{it.section}</span>}
        <span className="grow" />
        <button type="button" className="ibtn fx-edit" onClick={onEdit} aria-label="עריכה"><PencilSimple size={16} /></button>
      </div>
      <p className="fx-body">{it.body}</p>
      <div className="fx-meta">{it.author} · {ago(it.created_at)}</div>

      {thread.length > 0 && (
        <ol className="fx-thread">
          {thread.length > 2 && !all && <li className="fx-more"><button type="button" onClick={() => setAll(true)}>עוד {thread.length - 2} הודעות קודמות</button></li>}
          {visible.map((c) => (
            <li key={c.id} className={c.author === "Claude" ? "bot" : ""}>
              <div className="fx-ch"><b>{c.author}</b>{c.status && <span className={"fx-st sm " + (STATUS[c.status] || STATUS.new).tone}>{(STATUS[c.status] || STATUS.new).label}</span>}<time>{ago(c.created_at)}</time></div>
              {c.body && <p>{c.body}</p>}
            </li>
          ))}
        </ol>
      )}

      {mode ? (
        <div className="fx-reply">
          <textarea ref={ta} className="fx-ta" rows={3} value={text} onChange={(e) => setText(e.target.value)}
            placeholder={mode === "reopen" ? "מה עדיין לא תקין? (חובה, כדי שאדע מה לתקן)" : "כתבו תגובה…"}
            onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) send(); }} />
          <div className="fx-actions">
            <button type="button" className={"abtn sm " + (mode === "reopen" ? "warn" : "pri")} disabled={busy || !text.trim()} onClick={send}>{mode === "reopen" ? "החזרה לתיקון" : "שליחה"}</button>
            <button type="button" className="abtn sm ghost" onClick={() => { setMode(null); setText(""); }}>ביטול</button>
          </div>
        </div>
      ) : (
        <div className="fx-actions">
          {it.status === "review" && <>
            <button type="button" className="abtn sm ok" disabled={busy} onClick={() => onAct(it, "", "done")}><Check size={16} weight="bold" />תקין, לאשר</button>
            <button type="button" className="abtn sm" disabled={busy} onClick={() => setMode("reopen")}><ArrowCounterClockwise size={16} />עדיין לא תקין</button>
          </>}
          {it.status === "done" && <button type="button" className="abtn sm" disabled={busy} onClick={() => setMode("reopen")}><ArrowCounterClockwise size={16} />לפתוח מחדש</button>}
          {it.status === "later" && <button type="button" className="abtn sm" disabled={busy} onClick={() => onAct(it, "", "new")}>להעביר לטיפול עכשיו</button>}
          {(it.status === "new" || it.status === "reopened") && <button type="button" className="abtn sm ghost" disabled={busy} onClick={() => onAct(it, "", "later")}>לדחות לאחר כך</button>}
          <button type="button" className="abtn sm ghost" onClick={() => setMode("comment")}><ChatCircle size={16} />תגובה</button>
        </div>
      )}
    </li>
  );
}
