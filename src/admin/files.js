/* Fixes board attachments: images, PDFs and links on an item or a comment.
   Files go to the private Supabase bucket "fix-files" through the edge function fix-files
   (supabase/functions/fix-files), which only hands out one-time upload links and 1-hour view
   links to a valid admin PIN session. Links are plain rows (admin_fix_link_add).
   Database side: supabase/migrations/20261114120000_fix_files.sql. */
import { getConfig } from "@/lib/config";
import { mpData } from "@/lib/mp-data";

export const MAX_MB = 20;
const KEEP = ["image/png", "image/jpeg", "image/webp", "image/gif", "application/pdf"];
const SHRINK_OVER = 1.5 * 1024 * 1024;   // bigger photos are re-encoded (phone photos are 3–8 MB)
const MAX_SIDE = 2400;                    // still sharp enough to read a screenshot of the site

const ERR = {
  type: "אפשר לצרף רק תמונות (PNG, JPG, WEBP, GIF) או PDF",
  size: `הקובץ גדול מדי (עד \u2066${MAX_MB} MB\u2069)`,
  too_many: "יש כבר הרבה קבצים בתיקון הזה (עד 40)",
  missing: "התיקון לא נמצא — אולי נמחק",
  signed_out: "פג תוקף הכניסה. היכנסו שוב עם הקוד",
  not_uploaded: "ההעלאה לא הושלמה, נסו שוב",
  url: "הקישור לא תקין. הדביקו כתובת מלאה (https://…)",
  storage: "שמירת הקובץ נכשלה, נסו שוב",
  db: "אין חיבור כרגע, נסו שוב",
  bad_request: "הבקשה לא תקינה",
  decode: "לא הצלחנו לקרוא את התמונה. נסו צילום מסך או JPG",
  offline: "קבצים זמינים רק כשהאתר מחובר למסד",
};
export const fileError = (code) => ERR[code] || ERR.db;
class FileErr extends Error { constructor(code) { super(fileError(code)); this.code = code; } }

export const isImage = (f) => !!f && /^image\//.test(f.mime || f.type || "");
export const isPdf = (f) => !!f && (f.mime || f.type) === "application/pdf";
export function fmtSize(n) {
  if (!n && n !== 0) return "";
  return n < 1024 * 1024 ? Math.max(1, Math.round(n / 1024)) + " KB" : (n / 1024 / 1024).toFixed(n < 10 * 1024 * 1024 ? 1 : 0) + " MB";
}

/* ── links ─────────────────────────────────────────────────────────────────── */
/** "youtube.com/x" → "https://youtube.com/x"; null when it can't be a web link */
export function normalizeUrl(raw) {
  let u = String(raw || "").trim();
  if (!u) return null;
  if (!/^https?:\/\//i.test(u)) { if (/^[a-z]+:/i.test(u) || !/^[^\s/]+\.[^\s]{2,}/.test(u)) return null; u = "https://" + u; }
  try { const x = new URL(u); return /^https?:$/.test(x.protocol) && x.hostname.includes(".") ? x.href : null; } catch { return null; }
}
export const hostOf = (u) => { try { return new URL(u).hostname.replace(/^www\./, ""); } catch { return u; } };

/** splits plain text into text and link pieces, so links in a note are tappable */
export function linkify(text) {
  const out = [];
  const re = /\bhttps?:\/\/[^\s<>"')\]]+[^\s<>"')\].,;:!?]/gi;
  let last = 0, m;
  while ((m = re.exec(text || ""))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    out.push({ href: m[0] });
    last = m.index + m[0].length;
  }
  if (last < (text || "").length) out.push(text.slice(last));
  return out;
}

/* ── preparing a file ──────────────────────────────────────────────────────── */
function loadImage(file) {
  return new Promise((res, rej) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => res({ img, url });
    img.onerror = () => { URL.revokeObjectURL(url); rej(new FileErr("decode")); };
    img.src = url;
  });
}
/** checks the type and size; big or odd images (HEIC, huge phone photos) become a JPEG ≤ 2400 px */
export async function prepare(file) {
  const type = file.type || (/\.pdf$/i.test(file.name) ? "application/pdf" : "");
  const isImg = /^image\//.test(type) || /\.(heic|heif)$/i.test(file.name);
  if (!isImg && type !== "application/pdf") throw new FileErr("type");
  if (type === "image/gif" || type === "application/pdf" || (KEEP.includes(type) && file.size <= SHRINK_OVER)) {
    if (file.size > MAX_MB * 1024 * 1024) throw new FileErr("size");
    return { blob: file, mime: type, name: file.name || "קובץ" };
  }
  const { img, url } = await loadImage(file);
  try {
    const k = Math.min(1, MAX_SIDE / Math.max(img.naturalWidth, img.naturalHeight));
    const w = Math.max(1, Math.round(img.naturalWidth * k)), h = Math.max(1, Math.round(img.naturalHeight * k));
    const c = document.createElement("canvas");
    c.width = w; c.height = h;
    const g = c.getContext("2d");
    g.fillStyle = "#fff"; g.fillRect(0, 0, w, h);   // transparent PNGs get a white page, not black
    g.drawImage(img, 0, 0, w, h);
    const blob = await new Promise((r) => c.toBlob(r, "image/jpeg", 0.86));
    if (!blob) throw new FileErr("decode");
    if (blob.size > MAX_MB * 1024 * 1024) throw new FileErr("size");
    const base = (file.name || "תמונה").replace(/\.[a-z0-9]+$/i, "");
    return { blob, mime: "image/jpeg", name: base + ".jpg" };
  } finally { URL.revokeObjectURL(url); }
}

/* ── server calls ──────────────────────────────────────────────────────────── */
async function fn(body) {
  const c = getConfig();
  if (!mpData.ready || !c.functionsUrl) throw new FileErr("offline");
  let res;
  try {
    res = await fetch(c.functionsUrl + "/fix-files", {
      method: "POST",
      headers: { apikey: c.supabaseKey, Authorization: "Bearer " + c.supabaseKey, "content-type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch { throw new FileErr("db"); }
  let out = null;
  try { out = await res.json(); } catch { /* not json */ }
  if (!res.ok || !out || out.error) throw new FileErr((out && out.error) || "db");
  return out;
}
async function rpc(name, args) {
  let out;
  try { out = await mpData.rpc(name, args); }
  catch (e) { throw new FileErr(/unauthorized/i.test(e.message) ? "signed_out" : "db"); }
  if (out && out.error) throw new FileErr(out.error);
  return out;
}

/** the function answers with "/storage/v1/…" paths; this project's URL goes in front */
const abs = (p) => (/^https?:/.test(p) ? p : mpData.url + p);

/** PUT with progress (fetch has no upload progress) */
function put(url, blob, mime, onProgress) {
  return new Promise((resolve, reject) => {
    const x = new XMLHttpRequest();
    x.open("PUT", url);
    x.setRequestHeader("content-type", mime);
    x.setRequestHeader("x-upsert", "false");
    x.upload.onprogress = (e) => { if (e.lengthComputable && onProgress) onProgress(e.loaded / e.total); };
    x.onload = () => (x.status >= 200 && x.status < 300 ? resolve() : reject(new FileErr("storage")));
    x.onerror = () => reject(new FileErr("db"));
    x.send(blob);
  });
}

/** uploads one prepared file to an item (or one of its comments); returns the file as the board lists it */
export async function uploadFile({ tok, itemId, commentId = null, prepared, author, onProgress }) {
  const { blob, mime, name } = prepared;
  const up = await fn({ tok, action: "upload", item_id: itemId, comment_id: commentId, name, mime, size: blob.size, author });
  await put(abs(up.upload_url), blob, mime, onProgress);
  return rpc("admin_fix_file_ready", { tok, file_id: up.id });
}
export function addLink({ tok, itemId, commentId = null, url, title = "", author }) {
  return rpc("admin_fix_link_add", { tok, item_id: itemId, comment_id: commentId, url, title, author });
}
/** {id: url} view links for stored files, valid for an hour */
export async function viewUrls(tok, ids) {
  if (!ids.length) return {};
  const out = {};
  for (let i = 0; i < ids.length; i += 200) {
    const u = (await fn({ tok, action: "urls", ids: ids.slice(i, i + 200) })).urls || {};
    for (const k in u) out[k] = abs(u[k]);
  }
  return out;
}
export function deleteFile(tok, file) {
  return file.kind === "link" ? rpc("admin_fix_file_delete", { tok, file_id: file.id }) : fn({ tok, action: "delete", id: file.id });
}
export const deleteItemFiles = (tok, itemId) => fn({ tok, action: "delete_item", item_id: itemId });
