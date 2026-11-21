'use client';
/* בקרת תוכן (admin → תיקונים, first tab): walk through everything a student sees, mark what was checked,
   and report a problem in about 10 seconds without typing "where". Design: design/admin-review/design.md
   (binding, phase 1), look: design/admin-review/mockup.html.

   Desktop: tree · the real page in a 375px phone frame · requests. Phone: the list, then the real page
   edge to edge with ONE bottom bar (דווח · ✓ תקין · בקשות); requests and the report form are sheets.
   Data: src/admin/review/data.js. Tree and marks: ./review/model.js. The frame: ./review/frame.js. */
import "../review.css";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CaretRight, Check, Flag, ArrowCounterClockwise, ChatCircle, Eye, Warning } from "@phosphor-icons/react";
import { useAdmin, useData } from "../AdminShell";
import { TOPICS as REGISTRY } from "@/topics/registry";
import { useName, PEOPLE } from "../people";
import { viewUrls, deleteFile } from "../files";
import { Viewer, sendPending } from "./FixAttach";
import { FixTabs } from "./review/FixTabs";
import { Tree, TreeControls } from "./review/Tree";
import { Stage } from "./review/Stage";
import { Inspector, LVL_ON } from "./review/Inspector";
import { ReportForm } from "./review/ReportForm";
import { useFrame, topicUrl } from "./review/frame";
import {
  buildGrades, buildIndex, topicName as nameOf, chaptersOf, chapterMark, countsIn, nextInQueue, WHY, isOpen, HIDDEN_ID, ckKey,
} from "./review/model";
import { listFixes, addFix, commentFix, listChecks, markChecked, unmarkChecked, takeSnapshot, readPlace, checksShared, listTopicStatus, setTopicStatus, statusShared } from "@/admin/review/data";

const LS_SEL = "mp:cpl-sel", LS_HINT = "mp:cpl-hint", LS_DEV = "mp:cpl-dev";
const lsGet = (k) => { try { return localStorage.getItem(k); } catch { return null; } };
const lsSet = (k, v) => { try { localStorage.setItem(k, v); } catch {} };

function useMedia(q) {
  const [m, setM] = useState(false);
  useEffect(() => { const mm = matchMedia(q); const f = () => setM(mm.matches); f(); mm.addEventListener("change", f); return () => mm.removeEventListener("change", f); }, [q]);
  return m;
}
/* a frozen question is "the same question" when only the typed answers and the verdicts changed */
const qShape = (t) => String(t || "").split("\n").filter((l) => !/^(הוקלד|נבחר|האתר ענה)/.test(l.trim())).join("\n").replace(/\[[^\]]*\]/g, "[]").replace(/ · נבחר/g, "");

export default function Review() {
  const a = useAdmin();
  const { data, error: dataErr } = useData(["catalog"]);
  const catalog = data.catalog;
  const [items, setItems] = useState(null);
  const [checks, setChecks] = useState(null);
  const [localChecks, setLocalChecks] = useState(false);
  const [statuses, setStatuses] = useState(null);   // topic → { status: "ready" | "missing", author, updated_at }
  const [busyStatus, setBusyStatus] = useState(false);
  const [name, setName] = useName();
  const phone = useMedia("(max-width: 1099px)");
  const [sel, setSel] = useState({ lvl: "site", n: 0 });
  const [open, setOpen] = useState(() => new Set());
  const [q, setQ] = useState("");
  const [onlyOpen, setOnlyOpen] = useState(false);
  const [onlyNew, setOnlyNew] = useState(false);
  const [hint, setHint] = useState(false);
  const [step, setStep] = useState("tree");     // phone: "tree" (the list) | "pv" (the page)
  const [sheet, setSheet] = useState(false);    // phone: the requests sheet
  const [rep, setRep] = useState(null);         // the report form
  const [busy, setBusy] = useState(false);
  const [busyCheck, setBusyCheck] = useState(false);
  const [flash, setFlash] = useState(null);
  const [toast, setToast] = useState(null);
  const [seen, setSeen] = useState({});
  const [left, setLeft] = useState(false);
  const [urls, setUrls] = useState({});
  const [view, setView] = useState(null);
  const [dev, setDevState] = useState("phone");  // the preview: "phone" (375, default) | "desk" (1280, scaled)
  useEffect(() => { if (lsGet(LS_DEV) === "desk") setDevState("desk"); }, []);
  const setDev = useCallback((d) => { setDevState(d); lsSet(LS_DEV, d); }, []);
  const urlsAt = useRef(0);
  const toastT = useRef(0);

  /* ── data ── */
  const grades = useMemo(() => (catalog !== undefined || dataErr ? buildGrades(catalog || null) : null), [catalog, dataErr]);
  const ctx = useMemo(() => (grades && items && checks ? buildIndex(items, grades, checks) : null), [grades, items, checks]);
  const names = useCallback((slug) => nameOf(slug, catalog && catalog.topics), [catalog]);
  const colors = useCallback((slug) => {
    const t = catalog && (catalog.topics || []).find((x) => (x.page || "").replace(/\.html$/, "") === slug);
    return (t && t.color) || (REGISTRY[slug] && REGISTRY[slug].topic) || "teal";
  }, [catalog]);

  const say = useCallback((msg, act, err) => {
    clearTimeout(toastT.current);
    setToast({ msg, act, err, k: Date.now() });
    toastT.current = setTimeout(() => setToast(null), act ? 4600 : 2600);
  }, []);

  async function loadUrls(list, force) {
    if (a.preview) return;
    const ids = (list || []).flatMap((i) => (i.files || []).filter((f) => f.kind === "file").map((f) => f.id));
    const missing = force ? ids : ids.filter((id) => !urls[id]);
    if (!missing.length) return;
    try { const u = await viewUrls(a.tok, missing); setUrls((o) => ({ ...(force ? {} : o), ...u })); urlsAt.current = Date.now(); }
    catch (e) { say("הקבצים לא נטענו: " + e.message, null, true); }
  }
  const reloadItems = useCallback(async () => {
    try { const l = await listFixes(a.run); setItems(l); loadUrls(l, Date.now() - urlsAt.current > 50 * 60 * 1000); }
    catch (e) { setItems((x) => x || []); say("הבקשות לא נטענו: " + e.message, null, true); }
  }, [a.run]); // eslint-disable-line react-hooks/exhaustive-deps
  const reloadChecks = useCallback(async () => {
    try { const l = await listChecks(a.run); setChecks(l); setLocalChecks(!checksShared); }
    catch (e) { setChecks((x) => x || []); say("הסימונים לא נטענו: " + e.message, null, true); }
  }, [a.run, say]);
  const reloadStatuses = useCallback(async () => {
    try { const l = await listTopicStatus(a.run); setStatuses(new Map(l.map((r) => [r.topic, r]))); }
    catch (e) { setStatuses((x) => x || new Map()); say("מצב הנושאים לא נטען: " + e.message, null, true); }
  }, [a.run, say]);
  useEffect(() => { reloadItems(); reloadChecks(); reloadStatuses(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const statusOf = useCallback((slug) => (statuses && statuses.get(slug)) || null, [statuses]);

  /* ── remembered on this device: the last place and the dismissed hint ── */
  const restored = useRef(false);
  useEffect(() => {
    if (!grades || restored.current) return;
    restored.current = true;
    setHint(lsGet(LS_HINT) !== "1");
    let s = null; try { s = JSON.parse(lsGet(LS_SEL)); } catch {}
    const okGrade = (id) => grades.some((g) => g.id === id);
    if (s && s.lvl && (s.lvl === "site" || okGrade(s.gradeId)) && (!s.slug || REGISTRY[s.slug]) && (!s.chapter || chaptersOf(s.slug).includes(s.chapter))) {
      choose(s, { restore: true });
    } else {
      const g = grades.find((x) => !x.hidden);
      if (g) setOpen(new Set(["g|" + g.id]));
    }
  }, [grades]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (restored.current) lsSet(LS_SEL, JSON.stringify({ lvl: sel.lvl, gradeId: sel.gradeId, slug: sel.slug, chapter: sel.chapter })); }, [sel.lvl, sel.gradeId, sel.slug, sel.chapter]);

  const gradeFor = (slug, prefer) => {
    if (!grades) return HIDDEN_ID;
    const g = grades.find((x) => x.id === prefer && x.topics.includes(slug)) || grades.find((x) => x.topics.includes(slug));
    return g ? g.id : HIDDEN_ID;
  };

  // the selected row stays in view (after the tree re-rendered with its parents open)
  useEffect(() => {
    if (phone && step !== "tree") return;
    const r = requestAnimationFrame(() => { const el = document.querySelector('.cpl-tree [aria-selected="true"]'); if (el) el.scrollIntoView({ block: "nearest" }); });
    return () => cancelAnimationFrame(r);
  }, [sel.n, step]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── selection: tree → frame ── */
  const selRef = useRef(sel); selRef.current = sel;
  const frameSlug = useRef(null);
  const lastCh = useRef(null);
  const baseline = useRef(false);

  function choose(node, opts = {}) {
    const next = { lvl: node.lvl, gradeId: node.gradeId, slug: node.slug || null, chapter: node.chapter || null, subs: node.subs || null, via: opts.via || "tree", n: Date.now() };
    setSel(next);
    setOpen((o) => {
      const s = new Set(o);
      if (next.gradeId) s.add("g|" + next.gradeId);
      if (next.slug && next.gradeId) s.add("t|" + next.gradeId + "|" + next.slug);
      return s;
    });
    if (!opts.keepForm) setRep(null);
    setSheet(false);
    if (phone && next.lvl === "chapter" && opts.go !== false && !opts.restore) setStep("pv");
  }

  const onPlace = useCallback((place, path) => {
    if (!path) return;
    const m = /^\/topics\/([^/?#]+)/.exec(path);
    if (!m) { setLeft(true); return; }
    setLeft(false);
    const slug = decodeURIComponent(m[1]);
    const cur = selRef.current;
    if (slug !== frameSlug.current) {
      // the page went to another topic by itself (a link inside it): follow it in the tree
      frameSlug.current = slug; lastCh.current = place.chapter || null; baseline.current = false;
      if (REGISTRY[slug] && chaptersOf(slug).length) {
        const ch = chaptersOf(slug).includes(place.chapter) ? place.chapter : null;
        choose({ lvl: ch ? "chapter" : "topic", gradeId: gradeFor(slug, cur.gradeId), slug, chapter: ch }, { via: "frame", go: false, keepForm: true });
      }
      return;
    }
    if (!place.chapter || lastCh.current === place.chapter) return;
    const first = lastCh.current === null;
    lastCh.current = place.chapter;
    const k = ckKey(slug, place.chapter);
    setSeen((s) => ({ ...s, [k]: (s[k] || 0) + 1 }));
    if (first && baseline.current) { baseline.current = false; if (!cur.chapter || cur.chapter === place.chapter) return; }
    if (cur.slug === slug && cur.chapter !== place.chapter && chaptersOf(slug).includes(place.chapter)) {
      choose({ lvl: "chapter", gradeId: cur.gradeId, slug, chapter: place.chapter }, { via: "frame", go: false, keepForm: true });
    }
  }, [grades, phone]); // eslint-disable-line react-hooks/exhaustive-deps

  const onFrameClick = useCallback(() => {
    // the frozen question follows only a check of the SAME question (design §0.10)
    setRep((r) => {
      if (!r || r.level !== "question" || !r.snap) return r;
      const d = frame.doc(); if (!d) return r;
      let s2 = null; try { s2 = takeSnapshot(d, { focused: frame.focused.current }); } catch {}
      if (!s2 || s2.chapter !== r.snap.chapter || s2.title !== r.snap.title || qShape(s2.text) !== qShape(r.snap.text)) return r;
      return s2.text === r.snap.text ? r : { ...r, snap: s2 };
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const frame = useFrame(onPlace, onFrameClick);

  useEffect(() => {
    if (!sel.slug || sel.via === "frame") return;
    setLeft(false);
    const st = frame.st;
    if (st.url && st.loaded && frameSlug.current === sel.slug) {
      if (!sel.chapter) return;
      if (st.place.chapter === sel.chapter && !(sel.subs && sel.subs.length)) return;
      if (frame.openChapter(sel.chapter, sel.subs || [])) return;
    }
    frameSlug.current = sel.slug; lastCh.current = null; baseline.current = true;
    frame.go(topicUrl(sel.slug, sel.chapter, sel.subs || []));
  }, [sel.slug, sel.chapter, sel.n]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── actions ── */
  const node = sel;
  const selGrade = grades && sel.gradeId ? grades.find((g) => g.id === sel.gradeId) : null;
  const place = frame.st.loaded && sel.slug && frameSlug.current === sel.slug ? frame.st.place : { chapter: sel.chapter || "", subs: [] };
  const seenHere = sel.slug && (place.chapter || sel.chapter) ? seen[ckKey(sel.slug, place.chapter || sel.chapter)] || 0 : 0;

  function openReport(level) {
    const d = frame.doc();
    const ready = !!(sel.slug && frame.st.loaded && d && d.getElementById("root") && frameSlug.current === sel.slug && !left);
    const pl = ready ? readPlace(d) : { chapter: sel.chapter || "", subs: [] };
    if (sel.slug && !pl.chapter) pl.chapter = sel.chapter || "";
    let lvl = level || (sel.slug ? "question" : sel.lvl);
    if (lvl === "question" && !ready) lvl = pl.chapter ? "chapter" : "topic";
    if (lvl === "chapter" && !pl.chapter) lvl = "topic";
    let snap = null;
    if (ready) { try { snap = takeSnapshot(d, { focused: frame.focused.current }); } catch { snap = null; } }
    setSheet(false);
    setRep({ level: lvl, place: pl, snap, frameReady: ready, reason: null, text: "", more: false });
  }

  async function sendReport(built, pending, _rep, who) {
    const author = who || name; // the name picked a moment ago in the form ("מי שולח?") is not in state yet
    setBusy(true);
    try {
      const { id } = await addFix(a.run, { topic: built.topic, section: built.section, body: built.body, author });
      let failed = 0;
      if (id && pending.ready.length && !a.preview) failed = await sendPending({ tok: a.tok, itemId: id, pending, author });
      await reloadItems();
      setRep(null);
      if (id) { setFlash(id); setTimeout(() => setFlash(null), 1800); }
      if (failed) say(`נשלח (#${id}), אבל ${failed} קבצים לא הועלו`, null, true);
      else say("נשלח ללוח התיקונים · בקשה #" + id, phone ? { label: "לראות", fn: () => setSheet(true) } : null);
      return true;
    } catch (e) { say("לא נשלח: " + e.message, null, true); return false; }
    finally { setBusy(false); }
  }

  async function act(item, body, status, pending) {
    if (!name) { say("קודם בחרו מי אתם (למעלה)", null, true); return false; }
    const withFiles = !!(pending && pending.ready.length);
    setBusy(true);
    try {
      const r = await commentFix(a.run, { itemId: item.id, author: name, body, status, hasFiles: withFiles });
      if (withFiles) {
        const failed = await sendPending({ tok: a.tok, itemId: item.id, commentId: r.id, pending, author: name });
        if (failed) { await reloadItems(); say(`${failed} קבצים לא הועלו — אפשר לנסות שוב`, null, true); return false; }
      }
      // approving a fix in the panel = the approver just looked at that chapter: a fresh ✓ (design §5)
      const x = ctx && ctx.placed.find((y) => y.it.id === item.id);
      let checked = false;
      if (status === "done" && x && x.p.lvl === "chapter") {
        try { await markChecked(a.run, { topic: x.p.slug, section: x.p.chapter, author: name }); checked = true; } catch {}
      }
      await Promise.all([reloadItems(), checked ? reloadChecks() : null]);
      if (status === "done") say("אושר · #" + item.id + (checked ? " נסגר והפרק סומן כנבדק" : " נסגר"), { label: "הבא ›", fn: goNext });
      else if (status === "reopened") say("הוחזר לתיקון · #" + item.id);
      else say(status ? "הסטטוס עודכן" : "התגובה נשמרה");
      return true;
    } catch (e) { say("לא נשמר: " + e.message, null, true); return false; }
    finally { setBusy(false); }
  }

  /* the topic's status: "ready" | "missing"; choosing the current one again clears it */
  async function changeStatus(slug, status) {
    if (!slug) return;
    if (!name) { say("קודם בחרו מי אתם (למעלה)", null, true); return; }
    const cur = statusOf(slug), next = cur && cur.status === status ? null : status;
    setBusyStatus(true);
    try {
      await setTopicStatus(a.run, { topic: slug, status: next, author: name });
      await reloadStatuses();
      say(next === "ready" ? "✓ " + names(slug) + " מסומן כמוכן" : next === "missing" ? names(slug) + " מסומן: חסר עוד" : "הסימון של הנושא בוטל",
        next === "missing" ? { label: "לכתוב מה חסר ›", fn: () => openReport("topic") } : null);
      if (!statusShared) say("מצב הנושא נשמר כרגע רק במכשיר הזה", null, true);
    } catch (e) { say("לא נשמר: " + e.message, null, true); }
    finally { setBusyStatus(false); }
  }

  async function toggleCheck() {
    if (!sel.slug || !sel.chapter) return;
    if (!name) { say("קודם בחרו מי אתם (למעלה)", null, true); return; }
    const m = chapterMark(sel.slug, sel.chapter, ctx);
    setBusyCheck(true);
    try {
      if (m.valid && !m.r) { await unmarkChecked(a.run, { topic: sel.slug, section: sel.chapter }); await reloadChecks(); say("הסימון בוטל"); }
      else { await markChecked(a.run, { topic: sel.slug, section: sel.chapter, author: name }); await reloadChecks(); say("✓ " + sel.chapter + " נבדק" + (checksShared ? " · כולם רואים את זה" : ""), { label: "הבא ›", fn: goNext }); }
    } catch (e) { say("לא נשמר: " + e.message, null, true); }
    finally { setBusyCheck(false); }
  }

  const ctxRef = useRef(ctx); ctxRef.current = ctx;
  function goNext() {
    const c = ctxRef.current; if (!c) return;
    const cur = selRef.current;
    const x = nextInQueue(c, cur.slug && cur.chapter ? { slug: cur.slug, chapter: cur.chapter } : null);
    if (!x) { say("הכל נבדק!"); return; }
    if (x.last) { say("זה האחרון שנשאר"); return; }
    const rv = x.p === 0 ? (c.byChapter.get(ckKey(x.slug, x.chapter)) || []).find((y) => y.it.status === "review") : null;
    choose({ lvl: "chapter", gradeId: x.gradeId, slug: x.slug, chapter: x.chapter, subs: rv && rv.p.subs.length ? rv.p.subs : null });
    if (phone) setStep("pv");
    say("הבא: " + names(x.slug) + " › " + x.chapter + " · " + WHY[x.p]);
  }

  function goto(target) {
    if (target === "review") {
      const x = ctx && (ctx.byChapter.get(ckKey(sel.slug, sel.chapter)) || []).find((y) => y.it.status === "review");
      if (!x) return;
      if (x.p.subs.length && frameSlug.current === sel.slug) frame.openChapter(sel.chapter, x.p.subs);
      if (phone) setSheet(true);
      setTimeout(() => { const el = document.querySelector(`.cpl-items [data-id="${x.it.id}"]`); if (el) el.scrollIntoView({ block: "center", behavior: "smooth" }); }, 60);
      return;
    }
    const p = target.p;
    if (p.lvl === "site") choose({ lvl: "site" }, { go: false });
    else if (p.lvl === "grade") choose({ lvl: "grade", gradeId: p.gradeId }, { go: false });
    else if (p.lvl === "topic") choose({ lvl: "topic", gradeId: gradeFor(p.slug, sel.gradeId), slug: p.slug }, { go: false });
    else choose({ lvl: "chapter", gradeId: gradeFor(p.slug, sel.gradeId), slug: p.slug, chapter: p.chapter, subs: p.subs.length ? p.subs : null }, { go: false });
    if (phone) setSheet(true);
    setTimeout(() => { const el = document.querySelector(`.cpl-items [data-id="${target.it.id}"]`); if (el) el.scrollIntoView({ block: "center", behavior: "smooth" }); }, 120);
  }

  function searchEnter() {
    const m = /^#?(\d{1,4})$/.exec(q.trim());
    if (!m || !ctx) return;
    const x = ctx.placed.find((y) => y.it.id === +m[1]);
    if (!x) { say("אין בקשה #" + m[1], null, true); return; }
    setQ(""); goto(x);
  }

  function onDup(it) {
    setRep(null);
    if (phone) setSheet(true);
    setTimeout(() => {
      const el = document.querySelector(`.cpl-items [data-id="${it.id}"]`);
      if (!el) return;
      el.scrollIntoView({ block: "center", behavior: "smooth" });
      const b = [...el.querySelectorAll("button")].find((x) => x.textContent.includes("תגובה"));
      if (b) b.click();
    }, 80);
  }

  const onNewQ = () => {
    if (!sel.slug) return;
    const how = frame.newQuestion(sel.slug);
    const ch = place.chapter || sel.chapter;
    if (ch && how === "button") { const k = ckKey(sel.slug, ch); setSeen((s) => ({ ...s, [k]: (s[k] || 0) + 1 })); }
  };

  useEffect(() => {
    const k = (e) => { if (e.key === "Escape" && !rep && sheet) setSheet(false); };
    document.addEventListener("keydown", k);
    return () => document.removeEventListener("keydown", k);
  }, [rep, sheet]);

  /* ── render ── */
  const crumbs = [];
  if (sel.lvl === "site") crumbs.push("כל האתר");
  else {
    if (selGrade && !selGrade.hidden) crumbs.push(selGrade.name);
    else if (selGrade) crumbs.push("מוסתרים");
    if (sel.slug) crumbs.push(names(sel.slug));
    const ch = place.chapter || sel.chapter;
    if (sel.slug && ch) crumbs.push(ch);
    if (sel.slug && ch && place.chapter === ch) place.subs.forEach((s) => crumbs.push(s));
  }
  const loading = !ctx;
  const k = ctx ? countsIn(sel.lvl === "site" ? { lvl: "site" } : sel, ctx) : { o: 0, r: 0 };
  const mk = ctx && sel.slug && sel.chapter ? chapterMark(sel.slug, sel.chapter, ctx) : null;
  const openAll = ctx ? ctx.placed.filter((x) => isOpen(x.it) || x.it.status === "review").length : 0;
  const who = (
    <button type="button" className="cpl-who" onClick={() => setName(name ? PEOPLE[(PEOPLE.indexOf(name) + 1) % PEOPLE.length] : PEOPLE[0])} title="מי בודק עכשיו (הקשה מחליפה)">
      {name || "מי בודק?"}<i>{(name || "?")[0]}</i>
    </button>
  );
  const reqBtn = (
    <button type="button" className="cpl-b cpl-pb-req" onClick={() => setSheet(true)} aria-label="בקשות כאן">
      <ChatCircle /><span>בקשות</span>{k.o + k.r ? <span className="cpl-bd">{k.o + k.r}</span> : null}
    </button>
  );
  let bar;
  if (step === "tree") {
    bar = sel.lvl === "chapter"
      ? <><button type="button" className="cpl-b pri cpl-pb-main" onClick={() => setStep("pv")}><Eye /><span>חזרה ל־{sel.chapter}</span></button>{reqBtn}</>
      : <><button type="button" className="cpl-b pri cpl-pb-main" disabled={loading} onClick={() => openReport(sel.lvl)}><Flag weight="fill" /><span>דווח {LVL_ON[sel.lvl]}</span></button>{reqBtn}</>;
  } else {
    const ok = !sel.chapter || !mk ? null : mk.r
      ? <button type="button" className="cpl-b cpl-pb-rv" onClick={() => goto("review")}><ArrowCounterClockwise weight="bold" /><span>לאשר</span></button>
      : <button type="button" className="cpl-b ok cpl-pb-ok" aria-pressed={mk.valid} disabled={busyCheck} onClick={toggleCheck}><Check weight="bold" /><span>{mk.valid ? "נבדק" : "תקין"}</span></button>;
    bar = <><button type="button" className="cpl-b pri cpl-pb-main" onClick={() => openReport(sel.slug ? "question" : sel.lvl)}><Flag weight="fill" /><span>דווח</span></button>{ok}{reqBtn}</>;
  }

  return (
    <div className="cpl" dir="rtl" data-step={step} data-sheet={sheet ? "1" : "0"} data-rep={rep ? "1" : "0"}>
      <header className="cpl-top">
        <Link className="cpl-back" href="/admin"><CaretRight weight="bold" />ניהול</Link>
        <div className="cpl-ttl"><h1>בקרת תוכן</h1><p>לבדוק כל כיתה, נושא, פרק ושאלה, ולבקש תיקון במקום</p></div>
        <FixTabs open={openAll} className="cpl-top-tabs" />
        <span className="grow" />
        {who}
      </header>

      <section className="cpl-tree" aria-label="כיתות, נושאים ופרקים">
        <FixTabs open={openAll} className="cpl-list-tabs" />
        <TreeControls ctx={ctx} loading={loading} hint={hint} onHint={() => { setHint(false); lsSet(LS_HINT, "1"); }} onNext={goNext}
          q={q} setQ={setQ} onSearchEnter={searchEnter} onlyOpen={onlyOpen} setOnlyOpen={setOnlyOpen} onlyNew={onlyNew} setOnlyNew={setOnlyNew} localChecks={localChecks} />
        <Tree ctx={ctx} grades={grades || []} names={names} colors={colors} sel={sel} loading={loading}
          onSelect={(n) => choose(n)} open={open} onToggle={(key) => setOpen((o) => { const s = new Set(o); s.has(key) ? s.delete(key) : s.add(key); return s; })}
          q={q} onlyOpen={onlyOpen} onlyNew={onlyNew} statusOf={statusOf} />
      </section>

      <Stage frame={frame} sel={sel} grades={grades || []} names={names} colors={colors} ctx={ctx} crumbs={crumbs} seen={seenHere}
        onNewQ={onNewQ} onReport={(lvl) => openReport(typeof lvl === "string" ? lvl : sel.slug ? "question" : sel.lvl)} onPick={(n) => choose(n, { go: false })}
        onBack={() => setStep("tree")} left={left} onReturn={() => { setLeft(false); frameSlug.current = null; choose({ ...sel }); }} place={place} dev={dev} setDev={setDev} />

      <aside className="cpl-insp" aria-label="בקשות והערות">
        <Inspector sel={node} ctx={ctx} grades={grades || []} names={names} seen={seenHere} flash={flash} busyCheck={busyCheck}
          statusOf={statusOf} onStatus={changeStatus} busyStatus={busyStatus}
          onCheck={toggleCheck} onReport={(lvl) => openReport(lvl)} onGoto={goto} onClose={() => setSheet(false)}
          itemProps={{ busy, onAct: act, urls, onView: (list, index) => setView({ list, index }), preview: a.preview,
            onDeleteFile: async (f) => { if (!confirm(f.kind === "link" ? "למחוק את הקישור?" : "למחוק את הקובץ?")) return; try { await deleteFile(a.tok, f); setView(null); await reloadItems(); say("נמחק"); } catch (e) { say("לא נמחק: " + e.message, null, true); } } }} />
      </aside>

      {rep && (
        <ReportForm rep={rep} setRep={setRep} slug={sel.slug} topicName={sel.slug ? names(sel.slug) : ""} grade={selGrade} ctx={ctx}
          name={name} setName={setName} preview={a.preview} busy={busy} phone={phone} onClose={() => setRep(null)} onSend={sendReport} onDup={onDup} />
      )}

      <nav className="cpl-pbar" aria-label="פעולות">{bar}</nav>
      <div className={"cpl-scrim" + ((phone && (sheet || rep)) ? " on" : "")} onClick={() => { setSheet(false); setRep(null); }} aria-hidden="true" />
      <div className={"cpl-toast" + (toast ? " on" : "") + (toast && toast.err ? " err" : "")} role="status" aria-live="polite">
        {toast && <>{toast.err ? <Warning weight="fill" /> : <Check weight="bold" />}<span>{toast.msg}</span>
          {toast.act && <button type="button" onClick={() => { setToast(null); toast.act.fn(); }}>{toast.act.label}</button>}</>}
      </div>
      {view && <Viewer list={view.list} index={view.index} urls={urls} onClose={() => setView(null)} onDelete={async (f) => { try { await deleteFile(a.tok, f); setView(null); await reloadItems(); } catch (e) { say("לא נמחק: " + e.message, null, true); } }} />}
    </div>
  );
}
