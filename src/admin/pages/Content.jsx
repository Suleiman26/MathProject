'use client';
import { useState } from "react";
import { Plus, PencilSimple, ArrowSquareOut, DotsSixVertical, Warning } from "@phosphor-icons/react";
import { useAdmin, useData, PageHead } from "../AdminShell";
import { Card, Badge, Empty, Seg, Switch, Sheet, Sortable, Handle, TopicIcon, useToast } from "../ui";
import { ICONS, iconSvg } from "@/lib/icons";

const PAGES = ["equation-solver.html", "equations-advanced.html", "inequalities.html", "quadratic-solver.html", "linear-function.html", "parabola-practice.html", "intersection.html", "directed-numbers.html", "ratio-percent.html", "powers-roots.html", "angles-parallel.html", "triangles.html", "quadrilaterals.html", "pythagoras.html", "similar-triangles.html", "circle.html", "solids3d.html"];
const COLORS = ["teal", "sky", "blue", "indigo", "violet", "pink", "cyan", "orange"];
const STATUS = { ready: "מוכן", in_progress: "בעבודה", planned: "מתוכנן" };
const byPos = (x, y) => x.position - y.position || String(x.created_at || "").localeCompare(String(y.created_at || ""));
const LIST = { grade: "grades", category: "categories", topic: "topics" };

export default function Content() {
  const a = useAdmin();
  const toast = useToast();
  const { data, loading, error } = useData(["catalog"]);
  const [edit, setEdit] = useState(null); // { kind, item, original }
  if (error) return <><PageHead /><Card><Empty icon={<Warning size={30} />} title="לא הצלחנו לטעון את הנתונים">{error.message}</Empty></Card></>;
  if (loading || !data.catalog) return <><PageHead /><div className="mp-boot" style={{ minHeight: 300 }}><span /></div></>;
  const c = data.catalog;
  const grades = c.grades.slice().sort(byPos), cats = c.categories.slice().sort(byPos);
  const gname = (id) => { const g = c.grades.find((x) => x.id === id); return g ? g.name.replace("כיתה ", "") : ""; };
  const catIds = cats.map((x) => x.id);
  const orphans = c.topics.filter((t) => !catIds.includes(t.category_id)).sort(byPos);

  async function save(kind, item, close) {
    try {
      const saved = await a.run("admin_save", { kind, item });
      const arr = c[LIST[kind]], i = arr.findIndex((x) => x.id === saved.id);
      if (i >= 0) arr[i] = saved; else arr.push(saved);
      toast("נשמר"); close && close(); a.refresh([]);
    } catch (e) { toast("השמירה נכשלה: " + e.message, true); }
  }
  async function toggle(kind, it) {
    try {
      const saved = await a.run("admin_save", { kind, item: { id: it.id, visible: !it.visible } });
      Object.assign(it, saved); toast(saved.visible ? "מוצג לתלמידים" : "הוסתר מהתלמידים"); a.refresh([]);
    } catch (e) { toast("לא נשמר: " + e.message, true); }
  }
  async function reorder(kind, ids) {
    ids.forEach((id, i) => { const o = c[LIST[kind]].find((x) => x.id === id); if (o) o.position = i; });
    try { await a.run("admin_reorder", { kind, ids }); toast("הסדר נשמר"); } catch (e) { toast("הסדר לא נשמר: " + e.message, true); a.refresh(["catalog"]); }
  }
  async function remove(kind, it, warn, close) {
    if (!confirm(`למחוק את "${it.name}"?` + (warn ? "\n" + warn : ""))) return;
    try { await a.run("admin_delete", { kind, rid: it.id }); toast("נמחק"); close(); a.refresh(["catalog"]); }
    catch (e) { toast("המחיקה נכשלה: " + e.message, true); }
  }

  const topicRow = (t) => {
    const gr = (t.grade_ids || []).map(gname).filter(Boolean).join("·");
    return (
      <><Handle />
        <div className="item-main"><TopicIcon t={t} size="lg" /><div className="item-t"><b>{t.name}</b><small>{gr && <span>{gr}</span>}<Badge tone={t.status}>{STATUS[t.status]}</Badge>{!t.page && <Badge tone="planned">בלי עמוד</Badge>}{!t.visible && <Badge tone="hidden">מוסתר</Badge>}</small></div></div>
        <div className="item-act"><Switch on={t.visible} onChange={() => toggle("topic", t)} label="מוצג לתלמידים" /><button type="button" className="ibtn" onClick={() => setEdit({ kind: "topic", item: structuredClone(t), original: t })} aria-label="עריכה"><PencilSimple size={17} /></button></div></>
    );
  };

  return (
    <>
      <PageHead tools={<a className="abtn" href="/" target="_blank" rel="noopener"><ArrowSquareOut size={17} />צפייה בדף הבית</a>} />
      <div className="bento" style={{ alignItems: "start" }}>
        <Card title="קטגוריות ונושאים" className="span-8" action={<button type="button" className="abtn sm" onClick={() => setEdit({ kind: "category", item: { name: "", color: "teal", visible: true } })}><Plus size={16} />קטגוריה</button>}>
          <Sortable items={cats} itemClass="cat" onOrder={(ids) => reorder("category", ids)} render={(k) => {
            const topics = c.topics.filter((t) => t.category_id === k.id).sort(byPos);
            return (
              <div data-topic={k.color}>
                <div className="item cat-h"><Handle /><div className="item-main"><span className="cat-dot" /><div className="item-t"><b>{k.name}</b><small>{topics.length} נושאים{k.visible ? "" : " · מוסתרת"}</small></div></div>
                  <div className="item-act"><Switch on={k.visible} onChange={() => toggle("category", k)} label="מוצגת לתלמידים" /><button type="button" className="ibtn" onClick={() => setEdit({ kind: "category", item: { ...k }, original: k })} aria-label="עריכה"><PencilSimple size={17} /></button></div></div>
                {topics.length > 0 && <Sortable items={topics} onOrder={(ids) => reorder("topic", ids)} render={topicRow} />}
                <button type="button" className="add-row" onClick={() => setEdit({ kind: "topic", item: { name: "", page: "", grade_ids: [], icon: "book", color: k.color || "teal", status: "planned", visible: true, category_id: k.id } })}><Plus size={16} />נושא חדש ב{k.name}</button>
              </div>
            );
          }} />
          {orphans.length > 0 && (
            <div className="cat orphan mt-s"><div className="item cat-h"><div className="item-main"><div className="item-t"><b>ללא קטגוריה</b><small>{orphans.length} נושאים · לא מוצגים בדף הבית עד שמשייכים לקטגוריה</small></div></div></div>
              <Sortable items={orphans} onOrder={(ids) => reorder("topic", ids)} render={topicRow} /></div>
          )}
        </Card>
        <div className="span-4 stack">
          <Card title="כיתות" action={<button type="button" className="abtn sm" onClick={() => setEdit({ kind: "grade", item: { name: "", visible: true } })}><Plus size={16} />כיתה</button>}>
            <Sortable items={grades} onOrder={(ids) => reorder("grade", ids)} render={(g) => (
              <><Handle /><div className="item-main"><div className="item-t"><b>{g.name}</b><small>{c.topics.filter((t) => (t.grade_ids || []).includes(g.id)).length} נושאים</small></div></div>
                <div className="item-act"><Switch on={g.visible} onChange={() => toggle("grade", g)} label="מוצגת לתלמידים" /><button type="button" className="ibtn" onClick={() => setEdit({ kind: "grade", item: { ...g }, original: g })} aria-label="עריכה"><PencilSimple size={17} /></button></div></>
            )} />
            <p className="note mt-s">הסדר כאן הוא סדר כפתורי הסינון בדף הבית.</p>
          </Card>
          <Card title="איך זה עובד">
            <p className="note">גוררים בעזרת הידית <DotsSixVertical size={14} weight="bold" style={{ verticalAlign: -2 }} /> כדי לשנות סדר. הסדר נשמר מיד ומופיע בדף הבית.<br /><br />נושא בלי עמוד מופיע לתלמידים כ״בקרוב״. נושא מוסתר לא מופיע בכלל.<br /><br />הפרקים שבתוך כל נושא כתובים בקוד של הנושא עצמו, ולכן הם לא נערכים מכאן.</p>
          </Card>
        </div>
      </div>

      {edit && edit.kind === "grade" && (
        <Sheet title={edit.item.id ? "עריכת כיתה" : "כיתה חדשה"} onClose={() => setEdit(null)} onSave={(close) => edit.item.name.trim() && save("grade", edit.item, close)}
          onDelete={edit.item.id ? (close) => remove("grade", edit.original, "הכיתה תוסר גם מכל הנושאים שמשויכים אליה.", close) : null}>
          <label className="field"><span>שם הכיתה</span><input type="text" maxLength={40} autoFocus value={edit.item.name} placeholder="למשל: כיתה י׳" onChange={(e) => setEdit({ ...edit, item: { ...edit.item, name: e.target.value } })} /></label>
        </Sheet>
      )}
      {edit && edit.kind === "category" && (
        <Sheet title={edit.item.id ? "עריכת קטגוריה" : "קטגוריה חדשה"} onClose={() => setEdit(null)} onSave={(close) => edit.item.name.trim() && save("category", edit.item, close)}
          onDelete={edit.item.id ? (close) => remove("category", edit.original, "הנושאים שבה לא יימחקו. הם יעברו ל״ללא קטגוריה״.", close) : null}>
          <label className="field"><span>שם הקטגוריה</span><input type="text" maxLength={60} autoFocus value={edit.item.name} placeholder="למשל: סטטיסטיקה" onChange={(e) => setEdit({ ...edit, item: { ...edit.item, name: e.target.value } })} /></label>
          <div className="field"><span>צבע</span><Swatches value={edit.item.color} onChange={(v) => setEdit({ ...edit, item: { ...edit.item, color: v } })} /></div>
        </Sheet>
      )}
      {edit && edit.kind === "topic" && (() => {
        const it = edit.item, set = (p) => setEdit({ ...edit, item: { ...it, ...p } });
        const used = c.topics.filter((x) => x.page && x.id !== it.id).map((x) => x.page);
        return (
          <Sheet title={it.id ? "עריכת נושא" : "נושא חדש"} onClose={() => setEdit(null)} onSave={(close) => it.name.trim() && save("topic", it, close)}
            onDelete={it.id ? (close) => remove("topic", edit.original, "רק הכרטיס בדף הבית יוסר. קובץ התרגול עצמו נשאר בפרויקט.", close) : null}>
            <label className="field"><span>שם הנושא (כפי שהתלמיד רואה)</span><input type="text" maxLength={80} autoFocus value={it.name} onChange={(e) => set({ name: e.target.value })} /></label>
            <label className="field"><span>קטגוריה</span><select value={it.category_id || ""} onChange={(e) => set({ category_id: e.target.value })}>{cats.map((k) => <option key={k.id} value={k.id}>{k.name}</option>)}</select></label>
            <div className="field"><span>כיתות</span><div className="chips">{grades.map((g) => { const on = (it.grade_ids || []).includes(g.id); return <button key={g.id} type="button" className="chip-t" aria-pressed={on} onClick={() => set({ grade_ids: on ? it.grade_ids.filter((x) => x !== g.id) : [...(it.grade_ids || []), g.id] })}>{g.name}</button>; })}</div></div>
            <label className="field"><span>עמוד התרגול</span><select value={it.page || ""} onChange={(e) => set({ page: e.target.value })}><option value="">בלי עמוד (יוצג כ״בקרוב״)</option>{PAGES.map((p) => <option key={p} value={p} disabled={used.includes(p)}>{p.replace(".html", "")}{used.includes(p) ? " (בשימוש)" : ""}</option>)}</select><small>נושא חדש עם עמוד: מוסיפים את הקוד לפרויקט ואז בוחרים אותו כאן.</small></label>
            <div className="field"><span>סטטוס</span><Seg value={it.status} onChange={(v) => set({ status: v })} options={Object.entries(STATUS)} /></div>
            <div className="field"><span>צבע</span><Swatches value={it.color} onChange={(v) => set({ color: v })} /></div>
            <div className="field"><span>סמל</span><div className="icon-pick" data-topic={it.color}>{Object.keys(ICONS).map((k) => <button key={k} type="button" aria-pressed={it.icon === k} title={ICONS[k].label} onClick={() => set({ icon: k })} dangerouslySetInnerHTML={{ __html: iconSvg(k) }} />)}</div></div>
          </Sheet>
        );
      })()}
    </>
  );
}

function Swatches({ value, onChange }) {
  return <div className="swatches">{COLORS.map((k) => <button key={k} type="button" data-topic={k} aria-pressed={k === value} aria-label={k} onClick={() => onChange(k)} />)}</div>;
}
