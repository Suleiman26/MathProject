// Pure helpers for fix-files (no Deno APIs, so `node --test` can check them).

// mathix, local dev, and mathix's Vercel previews; nobody else.
const ORIGINS = new Set(["https://mathix-sooty.vercel.app", "http://localhost:5180"]);
const PREVIEW = /^https:\/\/mathix-[a-z0-9-]+\.vercel\.app$/;

export function corsHeaders(origin) {
  const h = {
    "access-control-allow-methods": "POST, OPTIONS",
    "access-control-allow-headers": "apikey, content-type, authorization, x-client-info",
    "access-control-max-age": "86400",
    vary: "Origin",
  };
  if (typeof origin === "string" && (ORIGINS.has(origin) || PREVIEW.test(origin))) h["access-control-allow-origin"] = origin;
  return h;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ID = (v) => Number.isSafeInteger(v) && v > 0;
export const MIMES = ["image/png", "image/jpeg", "image/webp", "image/gif", "application/pdf"];

/** Checks the request body. Returns the cleaned request, or null when it's malformed. */
export function parseRequest(b) {
  if (!b || typeof b !== "object" || typeof b.tok !== "string" || !UUID.test(b.tok)) return null;
  const tok = b.tok;
  switch (b.action) {
    case "upload": {
      if (!ID(b.item_id) || !(b.comment_id == null || ID(b.comment_id))) return null;
      if (!MIMES.includes(b.mime) || !Number.isSafeInteger(b.size) || b.size <= 0) return null;
      return { action: "upload", tok, item_id: b.item_id, comment_id: b.comment_id ?? null,
        name: String(b.name || "").slice(0, 200), mime: b.mime, size: b.size, author: String(b.author || "").slice(0, 60) };
    }
    case "urls": {
      if (!Array.isArray(b.ids) || b.ids.length === 0 || b.ids.length > 200 || !b.ids.every(ID)) return null;
      return { action: "urls", tok, ids: b.ids };
    }
    case "delete":
      return ID(b.id) ? { action: "delete", tok, id: b.id } : null;
    case "delete_item":
      return ID(b.item_id) ? { action: "delete_item", tok, item_id: b.item_id } : null;
    default:
      return null;
  }
}

/** Only paths this board made: "<item id>/<uuid>.<ext>". Anything else is never signed or removed. */
export function safePath(p) {
  return typeof p === "string" && /^\d+\/[0-9a-f-]{36}\.(png|jpg|webp|gif|pdf)$/.test(p);
}
