'use client';
/* בקרת תוכן: one report form for every level (design §8). "על מה?" in plain words (nearest first, the rest
   behind "רמה אחרת"), 5 optional reasons, one sentence, the question frozen at the tap, the attach kit,
   a duplicate warning, and for עבד the exact topic / section / body it will write. */
import { useEffect, useMemo, useRef, useState } from "react";
import { Flag, X } from "@phosphor-icons/react";
import { AttachBar, usePending, useDropPaste, ATTACH_NOTE } from "../FixAttach";
import { buildRequest, deviceLine, siteVersion } from "@/admin/review/data";
import { isOpen } from "./model";
import { PEOPLE } from "../../people";

/* one line each, with its own direction: maths lines ("2⁴ · 2³ = 2^?") read left-to-right */
const HEB = /[\u0590-\u05FF]/;
const Lines = ({ text }) => String(text || "").split("\n").map((l, i) => <span key={i} className="cpl-ln" dir={HEB.test(l) ? "rtl" : "ltr"}>{l || "\u00a0"}</span>);

const REASONS_Q = ["טעות במתמטיקה", "בדיקת התשובה לא נכונה", "תצוגה / ציור", "ניסוח בעברית", "אחר / להוסיף"];
const REASONS_W = ["חסר / להוסיף", "סדר / מבנה", "תצוגה / ציור", "ניסוח בעברית", "אחר"];

/** the scope choices for where the form was opened (nearest first; `more` = behind "רמה אחרת") */
function scopes({ slug, topicName, grade, place, hasFrame }) {
  const L = [];
  const ch = place.chapter;
  const sub = place.subs && place.subs.length ? place.subs[place.subs.length - 1] : "";
  if (slug) {
    if (hasFrame) L.push({ lvl: "question", label: "השאלה שעל המסך", d: "רק השאלה הזאת. נשמרת כמו שהיא, עם מה שהוקלד ומה שהאתר ענה" });
    if (sub) L.push({ lvl: "sub", label: "כל ״" + sub + "״", d: "בעיה שחוזרת בכל השאלות של החלק הזה" });
    if (ch) L.push({ lvl: "chapter", label: "כל הפרק ״" + ch + "״", d: "בעיה שחוזרת בכל הפרק" });
    L.push({ lvl: "topic", label: "כל הנושא ״" + topicName + "״", d: "פרק חסר, סדר הפרקים, משהו בכל הנושא", more: !!ch });
  }
  if (grade && !grade.hidden) L.push({ lvl: "grade", label: "כל " + grade.name, d: "נושא חסר, סדר הנושאים", more: !!slug });
  L.push({ lvl: "site", label: "כל האתר", d: "משהו שחל על כל הנושאים", more: !!slug || !!(grade && !grade.hidden) });
  return L;
}

export function ReportForm({ rep, setRep, slug, topicName, grade, ctx, name, setName, preview, busy, onClose, onSend, onDup, phone }) {
  const pending = usePending();
  const box = useRef(null);
  const ta = useRef(null);
  const over = useDropPaste(box, pending, !preview);
  const [on, setOn] = useState(false);
  useEffect(() => { const r = requestAnimationFrame(() => setOn(true)); if (!phone) setTimeout(() => ta.current && ta.current.focus({ preventScroll: true }), 60); return () => cancelAnimationFrame(r); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const k = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", k);
    return () => document.removeEventListener("keydown", k);
  }, [onClose]);

  const place = rep.place || { chapter: "", subs: [] };
  const all = scopes({ slug, topicName, grade, place, hasFrame: !!rep.frameReady });
  const vis = all.filter((x) => !x.more || x.lvl === rep.level || rep.more);
  const hid = all.filter((x) => !vis.includes(x));
  const atWide = ["site", "grade", "topic"].includes(rep.level);
  const reasons = atWide ? REASONS_W : REASONS_Q;
  const subs = rep.level === "sub" || rep.level === "question" ? place.subs || [] : [];

  const built = useMemo(() => buildRequest({
    level: rep.level, grade: grade && !grade.hidden ? grade.name : "", slug, topicName,
    chapter: place.chapter, subs, reason: rep.reason || "", text: rep.text || "",
    snapshot: rep.level === "question" ? rep.snap : null,
    device: typeof window !== "undefined" ? deviceLine(window) : "", version: siteVersion(),
  }), [rep.level, rep.reason, rep.text, rep.snap, grade, slug, topicName, place.chapter, subs.join("›")]); // eslint-disable-line react-hooks/exhaustive-deps
  const canSend = !built.error && !busy && !pending.busy;

  // an open request at the same place: offer to comment on it instead
  const dup = useMemo(() => {
    if (!ctx) return null;
    const same = (p) => {
      if (rep.level === "site") return p.lvl === "site";
      if (rep.level === "grade") return p.lvl === "grade" && grade && p.gradeId === grade.id;
      if (p.slug !== slug) return false;
      if (rep.level === "topic") return p.lvl === "topic";
      if (p.chapter !== place.chapter) return false;
      if (rep.level === "chapter") return !p.subs.length && !p.question;
      return p.subs.join("›") === (place.subs || []).join("›") && (rep.level === "question" || !p.question);
    };
    const x = ctx.placed.find((y) => isOpen(y.it) && same(y.p));
    return x ? x.it : null;
  }, [ctx, rep.level, slug, grade, place.chapter, (place.subs || []).join("›")]); // eslint-disable-line react-hooks/exhaustive-deps

  const send = async () => {
    if (!canSend) return;
    if (!name) { setRep({ ...rep, needName: true }); return; }
    const ok = await onSend(built, pending, rep);
    if (ok) pending.clear();
  };
  const dupText = dup ? String(dup.body || "").split("\n").find((l) => l.startsWith("מה לתקן:"))?.replace(/^מה לתקן:\s*/, "") || String(dup.body || "").split("\n").filter((l) => !/^איפה:|^סוג:/.test(l)).join(" ") : "";
  const snapLine = rep.snap && rep.snap.text;

  return (
    <section className={"cpl-rep" + (on ? " on" : "")} role="dialog" aria-modal={phone ? "true" : "false"} aria-labelledby="cpl-rep-t"
      onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); send(); } }}>
      <div className="cpl-rep-h"><h2 id="cpl-rep-t">בקשת תיקון</h2><button type="button" className="cpl-ib" onClick={onClose} aria-label="סגירה"><X weight="bold" /></button></div>
      <div className="cpl-rep-b" ref={box}>
        <span className="cpl-lbl">על מה?</span>
        <div className="cpl-scope" role="radiogroup" aria-label="על מה הבקשה">
          {vis.map((x) => (
            <button key={x.lvl} type="button" className="cpl-sc" role="radio" aria-checked={x.lvl === rep.level}
              onClick={() => setRep({ ...rep, level: x.lvl, reason: (["site", "grade", "topic"].includes(x.lvl) ? REASONS_W : REASONS_Q).includes(rep.reason) ? rep.reason : null })}>
              <span className="cpl-sc-dot" /><span><b>{x.label}</b><small>{x.d}</small></span>
            </button>
          ))}
          {hid.length > 0 && <button type="button" className="cpl-b sm ghost cpl-more" onClick={() => setRep({ ...rep, more: true })}>רמה אחרת: {hid.map((x) => x.lvl === "site" ? "כל האתר" : x.lvl === "grade" ? grade.name : "כל הנושא").join(" · ")}</button>}
        </div>

        <span className="cpl-lbl">מה הבעיה? <span className="cpl-opt">(לא חובה)</span></span>
        <div className="cpl-rsn">{reasons.map((x) => <button key={x} type="button" className="cpl-chip" aria-pressed={rep.reason === x} onClick={() => setRep({ ...rep, reason: rep.reason === x ? null : x })}>{x}</button>)}</div>

        <label className="cpl-lbl" htmlFor="cpl-rep-ta">במשפט אחד</label>
        <textarea id="cpl-rep-ta" ref={ta} className={"cpl-ta" + (over ? " over" : "")} rows={3} value={rep.text || ""}
          placeholder={rep.level === "question" ? "למשל: הקלדתי 8 והאתר אמר שזה לא נכון" : "מה לתקן או מה להוסיף?"}
          onChange={(e) => setRep({ ...rep, text: e.target.value })} />

        {rep.level === "question" && (
          <div className="cpl-snap">
            <b>יצורף אוטומטית (נשמר ברגע שלחצתם ״דווח״)</b>
            {snapLine ? <div className="cpl-snap-t"><Lines text={snapLine} /></div> : <div className="cpl-snap-t muted">לא הצלחנו לקרוא את השאלה מהדף. כתבו במשפט מה רואים, או צרפו צילום מסך.</div>}
          </div>
        )}

        <div className="cpl-attach">
          <AttachBar pending={pending} disabled={busy} offline={preview} />
          {!preview && <small className="fa-note">{ATTACH_NOTE} בציור או בתצוגה, צילום עוזר מאוד.</small>}
        </div>

        {dup && (
          <div className="cpl-dup">
            <b>כבר פתוחה כאן בקשה #{dup.id}</b>
            <span>{dupText.slice(0, 90)}{dupText.length > 90 ? "…" : ""}</span>
            <button type="button" className="cpl-b sm" onClick={() => onDup(dup)}>להוסיף לה תגובה במקום</button>
          </div>
        )}

        {name === "עבד" && !built.error && (
          <details className="cpl-how"><summary>איך זה יגיע ללוח התיקונים</summary>
            <div className="cpl-map">
              <div><span>topic</span><code>{built.topic}</code></div>
              <div><span>section</span><code>{built.section || "(ריק)"}</code></div>
              <div><span>body</span><code><Lines text={built.body} /></code></div>
              <div><span>status</span><code>new · author: {name}</code></div>
            </div>
          </details>
        )}
      </div>
      <div className="cpl-rep-f">
        {rep.needName && !name
          ? <div className="cpl-who-pick"><span>מי שולח?</span>{PEOPLE.map((p) => <button key={p} type="button" className="cpl-b sm" onClick={() => { setName(p); setRep({ ...rep, needName: false }); }}>{p}</button>)}</div>
          : <>
            <button type="button" className="cpl-b pri" disabled={!canSend} onClick={send}><Flag weight="fill" />{busy ? "שולח…" : "שליחה"}</button>
            <span className="cpl-by">שולח: <button type="button" onClick={() => setName(PEOPLE[(PEOPLE.indexOf(name) + 1) % PEOPLE.length])}>{name || "בחרו"}</button></span>
          </>}
      </div>
    </section>
  );
}
