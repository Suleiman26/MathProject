'use client';
/* Admin → דו-קרב → שאלות דו-קרב (spec §10): 3 samples of every duel question
   generator, so Sulaiman can check the math any time — the question exactly as
   the student sees it (the duel's own MathText), the 4 choices with the right one
   marked (or the typed answer), and where it comes from (topic, chapter, grade).
   Built here in the browser from the same engine the server uses
   (src/duel/samples.js → supabase/functions/_shared/duel/registry.js), so it never
   drifts from what students get. Seeded: the same "set number" always shows the
   same samples (?set=1234 in the address can be sent to someone); "רענון" draws a new set. */
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowsClockwise, CheckCircle, Keyboard, ListBullets, Warning, ArrowSquareOut, Copy } from "@phosphor-icons/react";
import { PageHead } from "../AdminShell";
import { Card, Seg, useToast, fmt, GRADE } from "../ui";
import { DuelTabs } from "./Duels";
import { GENERATORS, SUBJECTS, SUBJECT_LABEL } from "@/duel/samples";
import { MathText, MathSpan } from "@/duel/MathText";
import { withUnit } from "@/duel/math-core";
import { TOPICS } from "@/home/catalog";

const PER = 3;

/* mulberry32 — same PRNG as the engine (supabase/functions/_shared/duel/rng.js) */
function rng(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const hash = (s) => { let h = 2166136261; for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0; };
const newSet = () => 1000 + Math.floor(Math.random() * 9000);

/** 3 samples of one generator: 4-choice ones first, then a typed one when it can type */
export function samplesOf(g, set) {
  const r = rng((set ^ hash(g.id)) >>> 0);
  const both = g.kinds.includes("choice") && g.kinds.includes("number");
  const wants = Array.from({ length: PER }, (_, i) => (both ? (i === PER - 1 ? "number" : "choice") : g.kinds[0]));
  const seen = new Set();
  return wants.map((want) => {
    try {
      let q = null;
      for (let t = 0; t < 25 && (!q || seen.has(q.prompt)); t++) q = g.make(r, want);
      seen.add(q.prompt);
      return q;
    } catch (e) { return { error: String((e && e.message) || e) }; }
  });
}

const topicName = (slug) => (TOPICS.find((t) => t.slug === slug) || { name: slug }).name;
const typed = (s) => String(s).replace(/^-/, "−");

export default function DuelQuestions() {
  const router = useRouter();
  const params = useSearchParams();
  const toast = useToast();
  const fromUrl = parseInt(params.get("set"), 10);
  const [set, setSet] = useState(fromUrl > 0 ? fromUrl : null);
  const [world, setWorld] = useState("all");
  useEffect(() => { if (!set) setSet(newSet()); }, [set]);
  useEffect(() => {
    if (set && String(set) !== params.get("set")) router.replace("/admin/duels/questions?set=" + set, { scroll: false });
  }, [set]); // eslint-disable-line react-hooks/exhaustive-deps

  const groups = useMemo(() => {
    if (!set) return [];
    const order = [];
    for (const g of GENERATORS) if (!order.includes(g.topic)) order.push(g.topic);
    return order.map((topic) => {
      const gens = GENERATORS.filter((g) => g.topic === topic);
      return { topic, name: topicName(topic), world: gens[0].world, grade: gens[0].grade, gens: gens.map((g) => ({ g, qs: samplesOf(g, set) })) };
    });
  }, [set]);

  const shown = groups.filter((t) => world === "all" || t.world === world);
  const worlds = SUBJECTS.filter((s) => groups.some((t) => t.world === s.key));
  const nGen = shown.reduce((n, t) => n + t.gens.length, 0);

  function copyLink() {
    const url = location.origin + "/admin/duels/questions?set=" + set;
    (navigator.clipboard ? navigator.clipboard.writeText(url) : Promise.reject()).then(() => toast("הקישור לסדרה הועתק"), () => toast(url));
  }

  return (
    <>
      <PageHead />
      <DuelTabs />
      <Card className="dq-intro">
        <p className="dq-lead">
          {fmt(PER)} דוגמאות מכל סוג שאלה בדו-קרב, בדיוק כמו שהתלמיד/ה רואה אותן. התשובה הנכונה מסומנת בירוק.
          השאלות נבנות מהמחוללים של הנושאים (עם תשובות שגויות חדשות לבחירה), אז כדאי לבדוק שהמתמטיקה נכונה ושהתשובות השגויות הגיוניות.
          טעות? כותבים אותה ב<a href="/admin/fixes">תיקונים</a> עם מספר הסדרה.
        </p>
        <div className="dq-tools">
          <span className="dq-set">סדרה <b className="ltr">#{set || "…"}</b></span>
          <button type="button" className="abtn pri sm" onClick={() => setSet(newSet())}><ArrowsClockwise size={16} />רענון</button>
          <button type="button" className="abtn sm" onClick={copyLink} disabled={!set}><Copy size={16} />קישור לסדרה</button>
          <span className="dq-gap" />
          <Seg value={world} onChange={setWorld} label="תחום" options={[["all", "הכל"], ...worlds.map((s) => [s.key, s.label])]} />
        </div>
        <nav className="dq-jump" aria-label="מעבר לנושא">
          {shown.map((t) => <a key={t.topic} href={"#dq-" + t.topic}>{t.name} <small>{t.gens.length}</small></a>)}
        </nav>
        <p className="note">{fmt(nGen)} סוגי שאלות · {fmt(shown.length)} נושאים. פרקים שעוד לא הועברו לדו-קרבים לא מופיעים.</p>
      </Card>

      {shown.map((t) => (
        <section key={t.topic} id={"dq-" + t.topic} className="dq-topic">
          <header className="dq-topic-h">
            <div>
              <h2>{t.name}</h2>
              <small>{SUBJECT_LABEL[t.world]} · {GRADE[t.grade] ? "מ" + GRADE[t.grade] : ""} · {fmt(t.gens.length)} סוגי שאלות</small>
            </div>
            <a className="abtn sm ghost" href={"/topics/" + t.topic} target="_blank" rel="noopener"><ArrowSquareOut size={16} />לנושא באתר</a>
          </header>
          {t.gens.map(({ g, qs }) => (
            <div key={g.id} className="dq-gen">
              <div className="dq-gen-h">
                <b>{g.chapter || "בלי פרקים"}</b>
                <span className="dq-kinds">
                  {g.kinds.includes("choice") && <span className="dq-k"><ListBullets size={14} />4 תשובות</span>}
                  {g.kinds.includes("number") && <span className="dq-k typed"><Keyboard size={14} />הקלדה</span>}
                </span>
                <code className="ltr">{g.id}</code>
              </div>
              <ol className="dq-qs">
                {qs.map((q, i) => <Sample key={i} q={q} n={i + 1} />)}
              </ol>
            </div>
          ))}
        </section>
      ))}
    </>
  );
}

function Sample({ q, n }) {
  if (q.error) {
    return <li className="dq-q err"><span className="dq-q-n">דוגמה {n}</span><p><Warning size={16} /> המחולל נכשל: <span className="ltr">{q.error}</span></p></li>;
  }
  const choice = q.kind === "choice" && Array.isArray(q.choices);
  return (
    <li className="dq-q">
      <span className="dq-q-n">דוגמה {n} · {choice ? "4 תשובות" : "הקלדה"}</span>
      <MathText as="p" className="dq-prompt" text={q.prompt} />
      {choice ? (
        <ul className="dq-ch">
          {q.choices.map((c, i) => {
            const ok = String(i) === String(q.answer);
            return (
              <li key={i} className={ok ? "ok" : ""}>
                <MathSpan src={withUnit(c, q.display && q.display.unit)} />
                {ok && <span className="dq-ok"><CheckCircle size={15} weight="fill" />נכונה</span>}
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="dq-typed">
          <span>תשובה נכונה</span>
          <b className="ltr">{withUnit(typed(q.answer), q.display && q.display.unit)}</b>
          {q.tol ? <small>(מתקבל עד ±{q.tol})</small> : null}
        </p>
      )}
      {q.meta && <details className="dq-meta"><summary>המספרים שמהם נבנתה</summary><code className="ltr">{JSON.stringify(q.meta)}</code></details>}
    </li>
  );
}
