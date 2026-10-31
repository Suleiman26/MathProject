'use client';
/* Home page. Built-in list first (instant, works offline); when the database
   is connected, grades/categories/topics follow the order set in the admin. */
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { mpData } from "@/lib/mp-data";
import { iconSvg } from "@/lib/icons";
import { HERO, GRADES, TOPICS, CATEGORIES } from "./catalog";
import { AccountButton, LegalFooter, Avatar } from "@/account/ui";
import { useAccount, accountApi } from "@/lib/account";
import { Railway, Insights } from "./Journey";

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

/* Signed-in students: a greeting, the streak, and one tap back to the last topic. */
function Resume({ account, p, first }) {
  const last = p && p.topics && p.topics.find((t) => TOPICS.some((x) => x.slug === t.page.replace(/\.html$/, "") && (t.ok + t.bad + t.win) > 0));
  const resumed = last && TOPICS.find((x) => x.slug === last.page.replace(/\.html$/, ""));
  const topic = resumed || (p && first) || null;
  return (
    <section className="resume" data-topic={account.avatar} aria-label="ההתקדמות שלי">
      <Link href="/profile" className="resume-me" aria-label="לפרופיל שלי">
        <Avatar account={account} size={44} />
        <span className="resume-hi"><b>שלום, <bdi>{account.username}</bdi></b><small>{p && p.streak > 0 ? `🔥 ${p.streak} ${p.streak === 1 ? "יום" : "ימים"} ברצף` : p && !account.grade ? "עוד צעד אחד והמסלול שלך מוכן" : p && !resumed ? "המסלול שלך מוכן" : p ? "בוא/י נתרגל היום" : "\u00a0"}</small></span>
      </Link>
      {topic ? (
        <Link href={`/topics/${topic.slug}`} className="resume-go" data-topic={topic.color}>
          <span className="resume-go-l"><small>{resumed ? "להמשיך מאיפה שעצרת" : "התחנה הראשונה"}</small><b>{topic.name}</b></span>
          <Go />
        </Link>
      ) : null}
    </section>
  );
}

/* Signed-in student: only their grade, as a railway, with strengths and what to strengthen. */
function SignedIn({ account, data, myGrade }) {
  const [p, setP] = useState(null);
  const [others, setOthers] = useState(false);
  const [saving, setSaving] = useState(false);
  useEffect(() => { accountApi.progress().then(setP).catch(() => setP(false)); }, [account.id]);
  const gradeObj = data.grades.find((x) => x.id === myGrade);
  const all = data.sections.flatMap((s) => s.topics.filter((t) => t.slug));
  const mine = myGrade ? all.filter((t) => t.g.includes(myGrade)) : [];
  const rest = myGrade ? all.filter((t) => !t.g.includes(myGrade)) : [];

  if (!account.grade) {
    return (
      <>
        <Resume account={account} p={p} />
        <section className="jr-pick">
          <h2>באיזו כיתה את/ה?</h2>
          <p>נבנה לך מסלול עם הנושאים של הכיתה שלך.</p>
          <div className="acct-seg" role="radiogroup" aria-label="כיתה">
            {[["7", "ז׳"], ["8", "ח׳"], ["9", "ט׳"]].map(([v, l]) => (
              <button key={v} type="button" role="radio" aria-checked={false} disabled={saving}
                onClick={async () => { setSaving(true); try { await accountApi.update(v, account.avatar); } finally { setSaving(false); } }}>כיתה {l}</button>
            ))}
          </div>
        </section>
      </>
    );
  }
  return (
    <>
      <Resume account={account} p={p} first={mine[0]} />
      {p === null && <div className="jr-loading" aria-hidden="true"><span /><span /></div>}
      {p === false && <p className="jr-err">לא הצלחנו לטעון את ההתקדמות. רעננו את הדף.</p>}
      {p && <>
        <Insights progress={p} topics={all} />
        <Railway topics={mine} progress={p} account={account} gradeName={gradeObj ? gradeObj.name : "הכיתה שלי"} />
      </>}
      {rest.length > 0 && (
        <div className="jr-more">
          <button type="button" onClick={() => setOthers(!others)} aria-expanded={others}>{others ? "הסתרת נושאים מכיתות אחרות" : `נושאים מכיתות אחרות (${rest.length})`}</button>
        </div>
      )}
      {others && <div className="g jr-others">{rest.map((t, i) => (
        <Link key={t.slug} className="topic" style={{ "--i": i }} data-topic={t.color} href={`/topics/${t.slug}`}><Icon k={t.icon} /><span className="tx"><span className="nm">{t.name}</span><small>{t.grades}</small></span><Go /></Link>
      ))}</div>}
    </>
  );
}

export default function Home() {
  const [data, setData] = useState({ grades: GRADES, sections: CATEGORIES.map((c) => ({ ...c, topics: TOPICS.filter((t) => t.cat === c.id) })) });
  const [grade, setGrade] = useState("all");
  const [note, setNote] = useState("");
  const { ready, account } = useAccount();

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

  // the student's grade ('7'/'8'/'9') → the grade in the list (built-in ids, or database ids matched by the letter)
  const myGrade = useMemo(() => {
    const k = account && account.grade;
    if (!k) return null;
    const letter = { 7: "ז", 8: "ח", 9: "ט" }[k];
    const hit = data.grades.find((x) => x.id === k) || data.grades.find((x) => x.name.includes(letter));
    return hit ? hit.id : null;
  }, [account, data]);
  // a signed-in student with a grade starts on that grade (they can still switch for this visit)
  const [switched, setSwitched] = useState(false);
  useEffect(() => { if (myGrade && !switched) setGrade(myGrade); }, [myGrade, switched]);
  const g = data.grades.some((x) => x.id === grade) ? grade : "all";
  const pick = (id) => { setGrade(id); setSwitched(true); try { localStorage.setItem(KEY, id); } catch {} };
  const show = (t) => g === "all" || t.g.includes(g);
  let i = 0;
  const grouped = useMemo(() => data.sections.length > 1 || data.sections[0].name, [data]);

  return (
    <div className="home">
      <header className="home-top"><span className="home-top-s" /><AccountButton /></header>
      <main>
      {account ? <SignedIn account={account} data={data} myGrade={myGrade} /> : <>
      <header className="hero">
        <img className="mark" src="/icon.png" alt="" width={64} height={64} />
        <h1>{HERO.title}</h1><p className="s">{HERO.sub}</p>
      </header>
      {ready && !account && <p className="join"><Link href="/signup">פתחו חשבון</Link> כדי לשמור את ההתקדמות, הרצף והרמות שלכם. בחינם, בלי מייל.</p>}

      {note && <div className="home-note" role="status">{note}<button type="button" onClick={() => setNote("")} aria-label="סגירה">✕</button></div>}
      <div id="catalog">
        <nav className="filters" aria-label="סינון לפי כיתה">
          <button type="button" aria-pressed={g === "all"} onClick={() => pick("all")}>הכל</button>
          {data.grades.map((x) => <button key={x.id} type="button" aria-pressed={g === x.id} onClick={() => pick(x.id)}>{x.name}{myGrade === x.id && <span className="mine" title="הכיתה שלי" aria-label="(הכיתה שלי)" />}</button>)}
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

      </>}
      {!account && <p className="foot"><a href="/classic/project-hub.html">{HERO.hub}</a></p>}
    </main><LegalFooter /></div>
  );
}
