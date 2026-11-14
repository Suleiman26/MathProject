'use client';
/* Fixes board attachments UI: the attach row under a text box (pick / photo / paste / drop /
   link), the attachments of an item or comment (thumbnails, PDF and link chips), and a
   full-screen image viewer. Data + upload: src/admin/files.js. Styles: admin.css "fa-". */
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Paperclip, LinkSimple, FilePdf, X, ArrowSquareOut, CaretLeft, CaretRight, Trash, Plus, WarningCircle } from "@phosphor-icons/react";
import { prepare, normalizeUrl, hostOf, isImage, isPdf, fmtSize, linkify, uploadFile, addLink, MAX_MB } from "../files";

let seq = 0;
/** "https://www.youtube.com/watch?v=abc" → "youtube.com/watch?v=abc" (the chip's second line) */
const shortUrl = (u) => String(u || "").replace(/^https?:\/\/(www\.)?/i, "").replace(/\/$/, "");
const key = () => "p" + ++seq;

/* ── text with tappable links ─────────────────────────────────────────────── */
export function Linked({ text }) {
  return linkify(text).map((p, i) => (typeof p === "string" ? p
    : <a key={i} href={p.href} target="_blank" rel="noopener noreferrer" dir="ltr" className="fa-inl">{hostOf(p.href)}{p.href.length > hostOf(p.href).length + 9 ? "/…" : ""}</a>));
}

/* ── pending attachments (before sending) ─────────────────────────────────── */
export function usePending() {
  const [list, setList] = useState([]);
  const ref = useRef(list); ref.current = list;
  useEffect(() => () => ref.current.forEach((p) => p.preview && URL.revokeObjectURL(p.preview)), []);
  async function addFiles(files) {
    const arr = [...files].slice(0, 12);
    for (const f of arr) {
      const k = key();
      const looksImg = /^image\//.test(f.type) || /\.(heic|heif)$/i.test(f.name);
      setList((l) => [...l, { key: k, kind: "file", name: f.name || "קובץ", size: f.size, mime: f.type, busy: true, preview: looksImg && /^image\/(png|jpeg|webp|gif)$/.test(f.type) ? URL.createObjectURL(f) : null }]);
      try {
        const prepared = await prepare(f);
        setList((l) => l.map((p) => (p.key === k ? { ...p, prepared, busy: false, size: prepared.blob.size, mime: prepared.mime, name: prepared.name, preview: p.preview || (isImage(prepared) ? URL.createObjectURL(prepared.blob) : null) } : p)));
      } catch (e) {
        setList((l) => l.map((p) => (p.key === k ? { ...p, busy: false, error: e.message } : p)));
      }
    }
  }
  const addUrl = (url) => setList((l) => [...l, { key: key(), kind: "link", url, name: hostOf(url) }]);
  const remove = (k) => setList((l) => { const p = l.find((x) => x.key === k); if (p && p.preview) URL.revokeObjectURL(p.preview); return l.filter((x) => x.key !== k); });
  const clear = () => { ref.current.forEach((p) => p.preview && URL.revokeObjectURL(p.preview)); setList([]); };
  const patch = (k, v) => setList((l) => l.map((p) => (p.key === k ? { ...p, ...v } : p)));
  const ready = list.filter((p) => !p.error && !p.busy);
  return { list, ready, busy: list.some((p) => p.busy), addFiles, addUrl, remove, clear, patch };
}

/** sends the pending attachments to an item / comment; returns how many failed */
export async function sendPending({ tok, itemId, commentId = null, pending, author }) {
  let failed = 0;
  for (const p of pending.ready) {
    pending.patch(p.key, { sending: true, progress: 0 });
    try {
      if (p.kind === "link") await addLink({ tok, itemId, commentId, url: p.url, author });
      else await uploadFile({ tok, itemId, commentId, prepared: p.prepared, author, onProgress: (x) => pending.patch(p.key, { progress: x }) });
      pending.patch(p.key, { sent: true, sending: false });
    } catch (e) { failed++; pending.patch(p.key, { error: e.message, sending: false }); }
  }
  return failed;
}

/** wires paste (screenshots) and drag-and-drop onto a box */
export function useDropPaste(ref, pending, enabled = true) {
  const [over, setOver] = useState(false);
  const pend = useRef(pending); pend.current = pending;
  useEffect(() => {
    const el = ref.current;
    if (!el || !enabled) return;
    const files = (dt) => [...(dt && dt.files ? dt.files : [])];
    const onPaste = (e) => {
      const fs = files(e.clipboardData).filter((f) => /^image\/|application\/pdf/.test(f.type));
      if (fs.length) { e.preventDefault(); pend.current.addFiles(fs); }
    };
    const onOver = (e) => { if ([...(e.dataTransfer?.types || [])].includes("Files")) { e.preventDefault(); setOver(true); } };
    const onLeave = (e) => { if (!el.contains(e.relatedTarget)) setOver(false); };
    const onDrop = (e) => { const fs = files(e.dataTransfer); if (fs.length) { e.preventDefault(); pend.current.addFiles(fs); } setOver(false); };
    el.addEventListener("paste", onPaste);
    el.addEventListener("dragover", onOver);
    el.addEventListener("dragleave", onLeave);
    el.addEventListener("drop", onDrop);
    return () => { el.removeEventListener("paste", onPaste); el.removeEventListener("dragover", onOver); el.removeEventListener("dragleave", onLeave); el.removeEventListener("drop", onDrop); };
  }, [ref, enabled]);
  return over;
}

/** the attach row: buttons + pending chips (+ the link field when open) */
export function AttachBar({ pending, disabled, offline }) {
  const input = useRef(null);
  const [linkOpen, setLinkOpen] = useState(false);
  const [link, setLink] = useState("");
  const [linkErr, setLinkErr] = useState("");
  const linkRef = useRef(null);
  useEffect(() => { if (linkOpen && linkRef.current) linkRef.current.focus(); }, [linkOpen]);
  function addTheLink() {
    const u = normalizeUrl(link);
    if (!u) { setLinkErr("הקישור לא תקין. הדביקו כתובת מלאה (https://…)"); return; }
    pending.addUrl(u); setLink(""); setLinkErr(""); setLinkOpen(false);
  }
  if (offline) return <p className="fa-off">צירוף קבצים זמין רק כשהאתר מחובר למסד.</p>;
  return (
    <div className="fa-bar">
      <div className="fa-btns">
        <button type="button" className="fa-btn" disabled={disabled} onClick={() => input.current && input.current.click()}>
          <Paperclip size={17} weight="bold" /><span>תמונה או PDF</span>
        </button>
        <button type="button" className={"fa-btn" + (linkOpen ? " on" : "")} disabled={disabled} aria-expanded={linkOpen} onClick={() => { setLinkOpen(!linkOpen); setLinkErr(""); }}>
          <LinkSimple size={17} weight="bold" /><span>קישור</span>
        </button>
        <span className="fa-hint">אפשר גם להדביק צילום מסך או לגרור קובץ לכאן</span>
        <input ref={input} type="file" hidden multiple accept="image/*,application/pdf,.pdf,.heic,.heif"
          onChange={(e) => { pending.addFiles(e.target.files || []); e.target.value = ""; }} />
      </div>
      {linkOpen && (
        <div className="fa-link">
          <input ref={linkRef} type="url" dir="ltr" inputMode="url" placeholder="https://…" value={link} aria-label="כתובת הקישור"
            onChange={(e) => { setLink(e.target.value); setLinkErr(""); }}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); e.stopPropagation(); addTheLink(); } if (e.key === "Escape") { e.stopPropagation(); setLinkOpen(false); } }} />
          <button type="button" className="abtn sm pri" disabled={!link.trim()} onClick={addTheLink}><Plus size={15} weight="bold" />הוספה</button>
        </div>
      )}
      {linkErr && <p className="fa-err" role="alert">{linkErr}</p>}
      {pending.list.length > 0 && (
        <ul className="fa-pend" aria-label="קבצים לצירוף">
          {pending.list.map((p) => (
            <li key={p.key} className={"fa-p" + (p.error ? " err" : "") + (p.sent ? " sent" : "")}>
              {p.kind === "link" ? <span className="fa-ic"><LinkSimple size={18} /></span>
                : p.preview ? <img src={p.preview} alt="" /> : <span className="fa-ic">{isPdf(p) ? <FilePdf size={18} /> : <Paperclip size={18} />}</span>}
              <span className="fa-pt">
                <b dir="auto">{p.kind === "link" ? p.name : p.name}</b>
                <small>{p.error ? <><WarningCircle size={13} weight="fill" />{p.error}</> : p.busy ? "מכין…" : p.sending ? `מעלה… ${Math.round((p.progress || 0) * 100)}%` : <span dir="ltr">{p.kind === "link" ? shortUrl(p.url) : fmtSize(p.size)}</span>}</small>
              </span>
              {p.sending && <i className="fa-prog" style={{ "--fa-p": (p.progress || 0) * 100 + "%" }} aria-hidden="true" />}
              {!p.sending && <button type="button" className="fa-x" aria-label={"הסרה: " + p.name} onClick={() => pending.remove(p.key)}><X size={14} weight="bold" /></button>}
            </li>
          ))}
        </ul>
      )}
      <span className="fa-sr" role="status" aria-live="polite">{pending.list.length ? `${pending.list.length} קבצים מוכנים לצירוף` : ""}</span>
    </div>
  );
}

/* ── stored attachments ───────────────────────────────────────────────────── */
export function Attachments({ files, urls, onView, onDelete }) {
  if (!files || !files.length) return null;
  const imgs = files.filter((f) => f.kind === "file" && isImage(f));
  const rest = files.filter((f) => !(f.kind === "file" && isImage(f)));
  return (
    <div className="fa-list">
      {imgs.length > 0 && (
        <div className="fa-thumbs">
          {imgs.map((f, i) => (
            <button key={f.id} type="button" className="fa-thumb" onClick={() => onView(imgs, i)} aria-label={"תמונה: " + f.name}>
              {urls[f.id] ? <img src={urls[f.id]} alt="" loading="lazy" decoding="async" /> : <span className="fa-ph" />}
            </button>
          ))}
        </div>
      )}
      {rest.map((f) => {
        const href = f.kind === "link" ? f.url : urls[f.id];
        return (
          <span key={f.id} className={"fa-chip " + (f.kind === "link" ? "lnk" : "pdf")}>
            <a href={href || undefined} target="_blank" rel="noopener noreferrer" aria-disabled={!href}>
              <span className="fa-ic">{f.kind === "link" ? <LinkSimple size={18} /> : <FilePdf size={18} />}</span>
              <span className="fa-pt"><b dir="auto">{f.name}</b><small dir="ltr">{f.kind === "link" ? shortUrl(f.url) : "PDF · " + fmtSize(f.size)}</small></span>
              <ArrowSquareOut size={15} className="fa-go" />
            </a>
            {onDelete && <button type="button" className="fa-x" aria-label={"מחיקה: " + f.name} onClick={() => onDelete(f)}><X size={14} weight="bold" /></button>}
          </span>
        );
      })}
    </div>
  );
}

/** full-screen image viewer: ← → keys / buttons, swipe on phones, Esc to close */
export function Viewer({ list, index, urls, onClose, onDelete }) {
  const [i, setI] = useState(index);
  const f = list[i];
  const touch = useRef(null);
  useEffect(() => {
    const k = (e) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") setI((x) => Math.min(list.length - 1, x + 1));   // RTL: left = next
      if (e.key === "ArrowRight") setI((x) => Math.max(0, x - 1));
    };
    document.addEventListener("keydown", k);
    const html = document.documentElement; const prev = html.style.overflow; html.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", k); html.style.overflow = prev; };
  }, [list.length, onClose]);
  if (!f) return null;
  return createPortal(
    <div className="fa-view" role="dialog" aria-modal="true" aria-label={f.name}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      onTouchStart={(e) => { touch.current = e.touches[0].clientX; }}
      onTouchEnd={(e) => { const d = e.changedTouches[0].clientX - (touch.current ?? 0); if (Math.abs(d) > 50) setI((x) => Math.max(0, Math.min(list.length - 1, x + (d > 0 ? 1 : -1)))); }}>
      <div className="fa-vbar">
        <button type="button" className="fa-vb" onClick={onClose} aria-label="סגירה"><X size={20} weight="bold" /></button>
        <span className="fa-vn" dir="auto">{f.name}{list.length > 1 ? <small> · {i + 1}/{list.length}</small> : null}</span>
        {urls[f.id] && <a className="fa-vb" href={urls[f.id]} target="_blank" rel="noopener noreferrer" aria-label="פתיחה בכרטיסייה חדשה"><ArrowSquareOut size={19} /></a>}
        {onDelete && <button type="button" className="fa-vb" aria-label="מחיקת התמונה" onClick={() => onDelete(f)}><Trash size={19} /></button>}
      </div>
      {urls[f.id] ? <img key={f.id} src={urls[f.id]} alt={f.name} className="fa-vimg" onClick={(e) => e.stopPropagation()} /> : <span className="fa-ph big" />}
      {list.length > 1 && <>
        <button type="button" className="fa-vnav prev" disabled={i === 0} onClick={() => setI(i - 1)} aria-label="הקודמת"><CaretRight size={22} weight="bold" /></button>
        <button type="button" className="fa-vnav next" disabled={i === list.length - 1} onClick={() => setI(i + 1)} aria-label="הבאה"><CaretLeft size={22} weight="bold" /></button>
      </>}
    </div>,
    document.querySelector(".adm-root") || document.body
  );
}

// \u2066…\u2069 keep "20 MB" left-to-right inside the Hebrew sentence
export const ATTACH_NOTE = `תמונות ו-PDF עד \u2066${MAX_MB} MB\u2069. תמונות גדולות מוקטנות אוטומטית.`;
