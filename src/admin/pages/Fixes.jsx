'use client';
/* Fixes board: what to fix in each topic, what was fixed and waits for review,
   what was approved. Replaces sending PDF lists back and forth.
   Items and comments can carry images, PDFs and links (FixAttach.jsx, ../files.js). */
import { useEffect, useMemo, useRef, useState } from "react";
import { Plus, ChatCircle, Check, ArrowCounterClockwise, ArrowSquareOut, PencilSimple, ListChecks } from "@phosphor-icons/react";
import { useAdmin, PageHead } from "../AdminShell";
import { Sheet, Empty, useToast, ago } from "../ui";
import { TOPICS } from "@/topics/registry";
import { viewUrls, deleteFile, deleteItemFiles } from "../files";
import { AttachBar, Attachments, Viewer, Linked, usePending, sendPending, useDropPaste, ATTACH_NOTE } from "./FixAttach";

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
  const [urls, setUrls] = useState({});     // file id → 1-hour view link
  const [view, setView] = useState(null);   // {list, index}: the image viewer
  const sheetPending = usePending();
  const sheetBox = useRef(null);
  const sheetOver = useDropPaste(sheetBox, sheetPending, !!edit && !a.preview);
  const urlsAt = useRef(0);

  async function loadUrls(list, force) {
    if (a.preview) return;
    const ids = (list || []).flatMap((i) => (i.files || []).filter((f) => f.kind === "file").map((f) => f.id));
    const missing = force ? ids : ids.filter((id) => !urls[id]);
    if (!missing.length) return;
    try { const u = await viewUrls(a.tok, missing); setUrls((o) => ({ ...(force ? {} : o), ...u })); urlsAt.current = Date.now(); }
    catch (e) { toast("הקבצים לא נטענו: " + e.message, true); }
  }
  async function reload() {
    try {
      const r = await a.run("admin_fixes", {});
      const list = Array.isArray(r) ? r : [];
      setItems(list);
      loadUrls(list, Date.now() - urlsAt.current > 50 * 60 * 1000);   // view links last an hour
    }
    catch (e) { setItems([]); toast("לא נטען: " + e.message, true); }
  }
  // a tab left open for long: refresh the view links when it comes back
  useEffect(() => {
    const v = () => { if (document.visibilityState === "visible" && items && Date.now() - urlsAt.current > 50 * 60 * 1000) loadUrls(items, true); };
    document.addEventListener("visibilitychange", v);
    return () => document.removeEventListener("visibilitychange", v);
  }); // eslint-disable-line react-hooks/exhaustive-deps
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

  async function act(item, body, status, pending) {
    if (!name) return toast("קודם בחרו מי אתם (למעלה)", true);
    const withFiles = !!(pending && pending.ready.length);
    setBusy(true);
    try {
      const r = await a.run("admin_fix_comment", { item_id: item.id, author: name, body, new_status: status || null, has_files: withFiles });
      if (r && r.error) throw new Error(r.error);
      if (withFiles) {
        const failed = await sendPending({ tok: a.tok, itemId: item.id, commentId: r.id || null, pending, author: name });
        if (failed) { await reload(); toast(`${failed} קבצים לא הועלו — אפשר לנסות שוב`, true); return false; }
      }
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
      const itemId = it.id || (r && r.id);
      if (itemId && sheetPending.ready.length) {
        const failed = await sendPending({ tok: a.tok, itemId, pending: sheetPending, author: name || "צוות" });
        if (failed) { await reload(); setEdit((e) => (e && !e.id ? { ...e, id: itemId } : e)); toast(`${failed} קבצים לא הועלו — אפשר לנסות שוב`, true); return; }
      }
      sheetPending.clear();
      await reload(); close(); toast(it.id ? "נשמר" : "נוסף לרשימה");
    } catch (e) { toast("לא נשמר: " + e.message, true); }
    finally { setBusy(false); }
  }
  async function removeItem(close) {
    if (!confirm("למחוק את התיקון הזה?")) return;
    try {
      if (!a.preview && (edit.files || []).some((f) => f.kind === "file")) await deleteItemFiles(a.tok, edit.id);   // the stored files go first
      await a.run("admin_fix_delete", { item_id: edit.id }); sheetPending.clear(); await reload(); close(); toast("נמחק");
    }
    catch (e) { toast("לא נמחק: " + e.message, true); }
  }

  async function removeFile(f) {
    if (!confirm(f.kind === "link" ? "למחוק את הקישור?" : "למחוק את הקובץ?")) return;
    try {
      await deleteFile(a.tok, f);
      setView(null);
      setEdit((e) => (e && e.files ? { ...e, files: e.files.filter((x) => x.id !== f.id) } : e));
      await reload(); toast("נמחק");
    } catch (e) { toast("לא נמחק: " + e.message, true); }
  }
  const openView = (list, index) => setView({ list, index });
  const editFiles = edit && edit.id ? (edit.files || []).filter((f) => !f.comment_id) : [];

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
            <ul className="fx-list">{list.map((it) => <Item key={it.id} it={it} busy={busy} onAct={act} onEdit={() => { sheetPending.clear(); setEdit({ ...it }); }}
              urls={urls} onView={openView} onDeleteFile={removeFile} preview={a.preview} />)}</ul>
          </section>
        ))}

      {edit && (
        <Sheet title={edit.id ? "עריכת תיקון" : "תיקון חדש"} saving={busy || sheetPending.busy} onClose={() => { sheetPending.clear(); setEdit(null); }} onSave={saveItem} onDelete={edit.id ? removeItem : null}>
          <label className="field"><span>נושא</span>
            <select value={edit.topic} onChange={(e) => setEdit({ ...edit, topic: e.target.value })}>{TOPIC_OPTIONS.map((t) => <option key={t} value={t}>{topicName(t)}</option>)}</select>
          </label>
          <label className="field"><span>תת־פרק (לא חובה)</span>
            <input type="text" value={edit.section || ""} placeholder="למשל: חוקי חזקות" onChange={(e) => setEdit({ ...edit, section: e.target.value })} />
          </label>
          <div ref={sheetBox} className={"fa-drop" + (sheetOver ? " over" : "")}>
            <label className="field"><span>מה צריך לתקן?</span>
              <textarea className="fx-ta" rows={5} value={edit.body} placeholder="תארו מה לא תקין או מה להוסיף. אפשר כמה שורות." onChange={(e) => setEdit({ ...edit, body: e.target.value })} />
            </label>
            <div className="field"><span>קבצים וקישורים (לא חובה)</span>
              {editFiles.length > 0 && <Attachments files={editFiles} urls={urls} onView={openView} onDelete={removeFile} />}
              <AttachBar pending={sheetPending} disabled={busy} offline={a.preview} />
              <small className="fa-note">{ATTACH_NOTE}</small>
            </div>
          </div>
          {!edit.id && <p className="note">התיקון יופיע כ״חדש״. אחרי שאתקן אותו הוא יעבור ל״תוקן · לבדיקה״, ואז תאשרו או תחזירו לתיקון.</p>}
        </Sheet>
      )}
      {view && <Viewer list={view.list} index={view.index} urls={urls} onClose={() => setView(null)} onDelete={removeFile} />}
    </>
  );
}

function Item({ it, busy, onAct, onEdit, urls, onView, onDeleteFile, preview }) {
  const [mode, setMode] = useState(null); // null | "comment" | "reopen"
  const [text, setText] = useState("");
  const [all, setAll] = useState(false);
  const ta = useRef(null);
  const box = useRef(null);
  const pending = usePending();
  const over = useDropPaste(box, pending, !!mode && !preview);
  const files = it.files || [];
  const filesOf = (cid) => files.filter((f) => (f.comment_id || null) === cid);
  useEffect(() => { if (mode && ta.current) ta.current.focus(); }, [mode]);
  const st = STATUS[it.status] || STATUS.new;
  const thread = it.comments || [];
  const visible = all ? thread : thread.slice(-2);

  const canSend = !!text.trim() || pending.ready.length > 0;
  async function send() {
    if (pending.busy) return;
    if (mode === "reopen" && !text.trim()) return ta.current && ta.current.focus();
    if (!canSend) return;
    const ok = await onAct(it, text, mode === "reopen" ? "reopened" : null, pending);
    if (ok) { setMode(null); setText(""); pending.clear(); }
  }
  const cancel = () => { setMode(null); setText(""); pending.clear(); };

  return (
    <li className={"fx-item " + st.tone}>
      <div className="fx-ih">
        <span className={"fx-st " + st.tone}>{st.label}</span>
        {it.section && <span className="fx-sec">{it.section}</span>}
        <span className="grow" />
        <button type="button" className="ibtn fx-edit" onClick={onEdit} aria-label="עריכה"><PencilSimple size={16} /></button>
      </div>
      <p className="fx-body"><Linked text={it.body} /></p>
      <Attachments files={filesOf(null)} urls={urls} onView={onView} onDelete={onDeleteFile} />
      <div className="fx-meta">{it.author} · {ago(it.created_at)}</div>

      {thread.length > 0 && (
        <ol className="fx-thread">
          {thread.length > 2 && !all && <li className="fx-more"><button type="button" onClick={() => setAll(true)}>עוד {thread.length - 2} הודעות קודמות</button></li>}
          {visible.map((c) => (
            <li key={c.id} className={c.author === "Claude" ? "bot" : ""}>
              <div className="fx-ch"><b>{c.author}</b>{c.status && <span className={"fx-st sm " + (STATUS[c.status] || STATUS.new).tone}>{(STATUS[c.status] || STATUS.new).label}</span>}<time>{ago(c.created_at)}</time></div>
              {c.body && <p><Linked text={c.body} /></p>}
              <Attachments files={filesOf(c.id)} urls={urls} onView={onView} onDelete={onDeleteFile} />
            </li>
          ))}
        </ol>
      )}

      {mode ? (
        <div ref={box} className={"fx-reply fa-drop" + (over ? " over" : "")}>
          <textarea ref={ta} className="fx-ta" rows={3} value={text} onChange={(e) => setText(e.target.value)}
            placeholder={mode === "reopen" ? "מה עדיין לא תקין? (חובה, כדי שאדע מה לתקן)" : "כתבו תגובה…"}
            onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) send(); }} />
          <AttachBar pending={pending} disabled={busy} offline={preview} />
          <div className="fx-actions">
            <button type="button" className={"abtn sm " + (mode === "reopen" ? "warn" : "pri")} disabled={busy || pending.busy || (mode === "reopen" ? !text.trim() : !canSend)} onClick={send}>{busy && pending.ready.length ? "שולח…" : mode === "reopen" ? "החזרה לתיקון" : "שליחה"}</button>
            <button type="button" className="abtn sm ghost" disabled={busy} onClick={cancel}>ביטול</button>
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
