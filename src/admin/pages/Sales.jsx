'use client';
import { useEffect, useState } from "react";
import { CreditCard, Users, Target, Info, Plus, PencilSimple, ArrowsClockwise, Calculator, Warning } from "@phosphor-icons/react";
import { useAdmin, useData, PageHead } from "../AdminShell";
import { Card, Kpi, Badge, Empty, Seg, Switch, Sheet, Sortable, Handle, useToast, fmt, money, ago } from "../ui";
import { Bars, CountUp, Funnel } from "../charts";

export default function Sales() {
  const a = useAdmin();
  const toast = useToast();
  const { data, loading, error } = useData(["catalog", "stats", "sales"]);
  const [edit, setEdit] = useState(null);
  const [calc, setCalc] = useState({ price: 39, conv: 5, base: null });
  useEffect(() => { try { const s = JSON.parse(localStorage.getItem("mp:calc")); if (s) setCalc((c) => ({ ...c, ...s })); } catch {} }, []);
  const tools = <button type="button" className="ibtn" onClick={() => a.refresh(["sales", "stats"])} aria-label="רענון"><ArrowsClockwise size={18} /></button>;
  if (error) return <><PageHead tools={tools} /><Card><Empty icon={<Warning size={30} />} title="לא הצלחנו לטעון את הנתונים">{error.message}</Empty></Card></>;
  if (loading || !data.sales || !data.catalog) return <><PageHead tools={tools} /><div className="mp-boot" style={{ minHeight: 300 }}><span /></div></>;

  const s = data.sales, k = data.stats.kpi, plans = data.catalog.plans.slice().sort((x, y) => x.position - y.position);
  const arpu = s.active ? s.mrr / s.active : 0;
  const base = calc.base ?? k.active ?? 0, subsN = Math.round((base * calc.conv) / 100);
  const setC = (patch) => { const next = { ...calc, ...patch }; setCalc(next); try { localStorage.setItem("mp:calc", JSON.stringify({ price: next.price, conv: next.conv })); } catch {} };

  async function savePlan(item, close) {
    if (!item.name.trim()) return;
    try {
      const saved = await a.run("admin_save", { kind: "plan", item });
      const arr = data.catalog.plans, i = arr.findIndex((x) => x.id === saved.id);
      if (i >= 0) arr[i] = saved; else arr.push(saved);
      toast("נשמר"); close(); a.refresh([]);
    } catch (e) { toast("השמירה נכשלה: " + e.message, true); }
  }
  async function toggle(p) {
    try { const saved = await a.run("admin_save", { kind: "plan", item: { id: p.id, active: !p.active } }); Object.assign(p, saved); toast(saved.active ? "התוכנית פעילה" : "התוכנית כבויה"); a.refresh([]); }
    catch (e) { toast("לא נשמר: " + e.message, true); }
  }
  async function reorder(ids) {
    ids.forEach((id, i) => { const p = data.catalog.plans.find((x) => x.id === id); if (p) p.position = i; });
    try { await a.run("admin_reorder", { kind: "plan", ids }); toast("הסדר נשמר"); } catch (e) { toast("הסדר לא נשמר: " + e.message, true); }
  }
  async function remove(p, close) {
    if (!confirm(`למחוק את "${p.name}"?`)) return;
    try { await a.run("admin_delete", { kind: "plan", rid: p.id }); data.catalog.plans = data.catalog.plans.filter((x) => x.id !== p.id); toast("נמחק"); close(); a.refresh([]); }
    catch (e) { toast("המחיקה נכשלה: " + e.message, true); }
  }

  return (
    <>
      <PageHead tools={tools} />
      {!s.active && !s.trial && !s.recent.length && (
        <div className="demo-bar info"><Info size={18} /><span><b>התשלומים עוד לא מחוברים.</b> כשנחבר ספק תשלום (למשל Stripe), המנויים, ההכנסות והביטולים יופיעו כאן אוטומטית. בינתיים אפשר להגדיר תוכניות מחיר ולהעריך הכנסה.</span></div>
      )}
      <div className="kpis">
        <Kpi tone="ink" icon={<CreditCard size={17} />} label="הכנסה חודשית (MRR)" value={<CountUp value={s.mrr} format={money} />} sub="מנויים פעילים בלבד" />
        <Kpi tone="blue" icon={<Users size={17} />} label="מנויים פעילים" value={<CountUp value={s.active} />} sub={`${fmt(s.trial)} בתקופת ניסיון`} />
        <Kpi icon={<Target size={17} />} label="הכנסה למנוי" value={money(arpu)} sub="ממוצע חודשי" />
        <Kpi icon={<Info size={17} />} label="ביטולים" value={<CountUp value={s.canceled_30d} />} sub={"ב-30 הימים האחרונים" + (s.past_due ? ` · ${s.past_due} בפיגור` : "")} />
      </div>
      <div className="bento mt">
        <Card title="הכנסה חודשית לאורך השנה" sub="₪ לחודש" className="span-8">
          <Bars label="הכנסה חודשית" format={money} data={s.monthly.map((m) => { const d = new Date(m.month + "-01"); return { label: d.toLocaleDateString("he-IL", { month: "short" }), v: +m.mrr, tipTitle: d.toLocaleDateString("he-IL", { month: "long", year: "numeric" }), tip: `${fmt(m.subscribers)} מנויים` }; })} />
        </Card>
        <Card title="משפך" sub="מבקר → תלמיד פעיל → מנוי" className="span-4">
          <Funnel steps={[{ key: "מבקרים", value: k.all_time_devices || 0 }, { key: "תלמידים פעילים", value: k.active || 0 }, { key: "מנויים", value: s.active }]} />
        </Card>
      </div>
      <div className="bento mt">
        <Card title="תוכניות מחיר" className="span-6" action={<button type="button" className="abtn sm" onClick={() => setEdit({ name: "", price_ils: 39, period: "month", active: true })}><Plus size={16} />תוכנית</button>}>
          {plans.length ? (
            <Sortable items={plans} onOrder={reorder} render={(p) => (
              <><Handle /><div className="item-main"><div className="item-t"><b>{p.name}</b><small>{money(p.price_ils)} {p.period === "year" ? "לשנה" : "לחודש"}{p.active ? "" : " · כבויה"}</small></div></div>
                <div className="item-act"><Switch on={p.active} onChange={() => toggle(p)} label="תוכנית פעילה" /><button type="button" className="ibtn" onClick={() => setEdit({ ...p })} aria-label="עריכה"><PencilSimple size={17} /></button></div></>
            )} />
          ) : <Empty icon={<CreditCard size={28} />} title="עוד אין תוכניות">הוסיפו תוכנית, למשל: חודשי · ₪39</Empty>}
        </Card>
        <Card title="מחשבון הכנסה" sub="הערכה בלבד" className="span-6" action={<Calculator size={18} className="muted" />}>
          <div className="calc">
            <label className="field"><span>מחיר לחודש (₪)</span><input type="number" min="0" value={calc.price} onChange={(e) => setC({ price: +e.target.value || 0 })} /></label>
            <label className="field"><span>אחוז שירשמו</span><input type="number" min="0" max="100" step="0.5" value={calc.conv} onChange={(e) => setC({ conv: +e.target.value || 0 })} /></label>
            <label className="field"><span>תלמידים פעילים</span><input type="number" min="0" value={base} onChange={(e) => setC({ base: +e.target.value || 0 })} /></label>
          </div>
          <div className="calc-out">
            <div><small>הכנסה חודשית משוערת</small><b>{money(subsN * calc.price)}</b></div>
            <div><small>הכנסה שנתית משוערת</small><b>{money(subsN * calc.price * 12)}</b></div>
          </div>
          <p className="note">{fmt(subsN)} מנויים × {money(calc.price)} לחודש. לא כולל עמלות סליקה ומע״מ.</p>
        </Card>
      </div>
      <Card className="mt" title="מנויים אחרונים">
        {s.recent.length ? <div className="tbl-wrap"><table className="tbl"><thead><tr><th>לקוח</th><th>תוכנית</th><th>סטטוס</th><th className="n">סכום</th><th>התחיל</th></tr></thead><tbody>
          {s.recent.map((r, i) => <tr key={i}><td>{r.customer}</td><td>{r.plan || "—"}</td><td><Badge tone={r.status === "active" ? "ready" : r.status === "trial" ? "in_progress" : "planned"}>{{ active: "פעיל", trial: "ניסיון", past_due: "בפיגור", canceled: "בוטל" }[r.status] || r.status}</Badge></td><td className="n">{money(r.amount_ils)} {r.period === "year" ? "לשנה" : "לחודש"}</td><td>{ago(r.started_at)}</td></tr>)}
        </tbody></table></div> : <Empty icon={<Users size={28} />} title="עוד אין מנויים" />}
      </Card>
      {edit && (
        <Sheet title={edit.id ? "עריכת תוכנית" : "תוכנית חדשה"} onClose={() => setEdit(null)} onSave={(close) => savePlan(edit, close)} onDelete={edit.id ? (close) => remove(edit, close) : null}>
          <label className="field"><span>שם התוכנית</span><input type="text" maxLength={60} value={edit.name} placeholder="למשל: חודשי" onChange={(e) => setEdit({ ...edit, name: e.target.value })} autoFocus /></label>
          <label className="field"><span>מחיר (₪)</span><input type="number" min="0" value={edit.price_ils} onChange={(e) => setEdit({ ...edit, price_ils: +e.target.value || 0 })} /></label>
          <div className="field"><span>חיוב</span><Seg value={edit.period} onChange={(v) => setEdit({ ...edit, period: v })} options={[["month", "חודשי"], ["year", "שנתי"]]} /></div>
        </Sheet>
      )}
    </>
  );
}
