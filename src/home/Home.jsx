'use client';
/* Home page. Built-in list first (instant, works offline); when the database
   is connected, grades/categories/topics follow the order set in the admin. */
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { mpData } from "@/lib/mp-data";
import { iconSvg } from "@/lib/icons";
import { HERO, GRADES, TOPICS, CATEGORIES } from "./catalog";
import { AccountButton, LegalFooter } from "@/account/ui";

const KEY = "mp:grade";
const Go = () => (
  <svg className="go" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 6l-6 6 6 6" /></svg>
);
const Icon = ({ k }) => <span className="ic" dangerouslySetInnerHTML={{ __html: iconSvg(k) }} />;

function fromDb(d) {
  const name = Object.fromEntries(d.grades.map((g) => [g.id, g.name.replace(/^כיתה\s*/, "")]));
  const order = d.grades.map((g) => g.id);
  const label = (ids) => {
    const l = order.filter((id) => ids.includes(id));
    if (!l.length) return "";
    return "כיתה " + (l.length > 2 ? name[l[0]] + "–" + name[l[l.length - 1]] : l.map((id) => name[id]).join("–"));
  };
  return {
    grades: d.grades.map((g) => ({ id: g.id, name: g.name })),
    sections: d.categories.map((c) => ({
      id: c.id, name: c.name, color: c.color,
      topics: d.topics.filter((t) => t.category_id === c.id).map((t) => ({
        slug: t.page ? t.page.replace(/\.html$/, "") : null, name: t.name, grades: label(t.grade_ids || []),
        g: t.grade_ids || [], icon: t.icon, color: t.color,
      })),
    })).filter((s) => s.topics.length),
  };
}

export default function Home() {
  const [data, setData] = useState({ grades: GRADES, sections: CATEGORIES.map((c) => ({ ...c, topics: TOPICS.filter((t) => t.cat === c.id) })) });
  const [grade, setGrade] = useState("all");
  const [note, setNote] = useState("");

  useEffect(() => {
    try { setGrade(localStorage.getItem(KEY) || "all"); } catch {}
    try {
      if (new URLSearchParams(location.search).has("deleted")) {
        setNote("החשבון וכל ההתקדמות נמחקו. אפשר להמשיך לתרגל גם בלי חשבון.");
        history.replaceState(null, "", "/");
      }
    } catch {}
    if (!mpData.ready) return;
    try { const c = JSON.parse(localStorage.getItem("mp:catalog2")); if (c) setData(c); } catch {}
    Promise.all([
      mpData.select("grades", "select=id,name&order=position"),
      mpData.select("categories", "select=id,name,color&order=position"),
      mpData.select("topics", "select=id,name,page,grade_ids,icon,color,category_id,status&order=position"),
    ]).then(([grades, categories, topics]) => {
      if (!topics.length) return;
      const next = fromDb({ grades, categories, topics });
      setData(next);
      try { localStorage.setItem("mp:catalog2", JSON.stringify(next)); } catch {}
    }).catch(() => {});
  }, []);

  const g = data.grades.some((x) => x.id === grade) ? grade : "all";
  const pick = (id) => { setGrade(id); try { localStorage.setItem(KEY, id); } catch {} };
  const show = (t) => g === "all" || t.g.includes(g);
  let i = 0;
  const grouped = useMemo(() => data.sections.length > 1 || data.sections[0].name, [data]);

  return (
    <div className="home"><div className="home-acct"><AccountButton /></div><main>
      <header className="hero">
        <img className="mark" src="/icon.png" alt="" width={64} height={64} />
        <h1>{HERO.title}</h1><p className="s">{HERO.sub}</p>
      </header>

      {note && <div className="home-note" role="status">{note}<button type="button" onClick={() => setNote("")} aria-label="סגירה">✕</button></div>}
      <div id="catalog">
        <nav className="filters" aria-label="סינון לפי כיתה">
          <button type="button" aria-pressed={g === "all"} onClick={() => pick("all")}>הכל</button>
          {data.grades.map((x) => <button key={x.id} type="button" aria-pressed={g === x.id} onClick={() => pick(x.id)}>{x.name}</button>)}
        </nav>
        {data.sections.map((s) => {
          const list = s.topics.filter(show);
          if (!list.length) return null;
          const grid = (
            <div className="g">
              {list.map((t) => {
                const style = { "--i": i++ };
                const inner = <><Icon k={t.icon} /><span className="tx"><span className="nm">{t.name}</span><small>{t.grades}</small></span></>;
                return t.slug
                  ? <Link key={t.name} className="topic" style={style} data-topic={t.color} href={`/topics/${t.slug}`}>{inner}<Go /></Link>
                  : <div key={t.name} className="topic soon" style={style} data-topic={t.color} aria-disabled="true">{inner}<span className="soon-b">בקרוב</span></div>;
              })}
            </div>
          );
          return grouped
            ? <section key={s.id} className="sec" data-topic={s.color}><h2 className="sec-h"><i />{s.name}<span>· {s.topics.length}</span></h2>{grid}</section>
            : <div key={s.id}>{grid}</div>;
        })}
      </div>

      <p className="foot"><a href="/classic/project-hub.html">{HERO.hub}</a></p>
    </main><LegalFooter /></div>
  );
}
