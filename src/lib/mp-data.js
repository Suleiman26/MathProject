/* Tiny client for the Supabase REST API (no library needed).
   Used by the home page (content order), the runtime (answer stats), the admin. */
import { getConfig } from "./config";

function conn() {
  const c = getConfig();
  const base = (c.supabaseUrl || "").replace(/\/+$/, "");
  return { base, key: c.supabaseKey || "", ready: !!(base && c.supabaseKey) };
}
function headers(key, extra) {
  return { apikey: key, Authorization: "Bearer " + key, "Content-Type": "application/json", ...(extra || {}) };
}
async function fail(res) {
  const t = await res.text();
  let msg = t;
  try { msg = JSON.parse(t).message || t; } catch {}
  const err = new Error(msg || "HTTP " + res.status);
  err.status = res.status;
  throw err;
}

export const mpData = {
  get ready() { return conn().ready; },
  get url() { return conn().base; },
  /** call a database function: mpData.rpc("admin_stats", { tok, days }) */
  async rpc(fn, args, opts) {
    const { base, key, ready } = conn();
    if (!ready) throw new Error("not-connected");
    const res = await fetch(base + "/rest/v1/rpc/" + fn, { method: "POST", headers: headers(key), body: JSON.stringify(args || {}), signal: opts && opts.signal, keepalive: !!(opts && opts.keepalive) });
    if (!res.ok) return fail(res);
    const text = await res.text();               // functions that return nothing answer 204 with no body
    return text ? JSON.parse(text) : null;
  },
  /** read a table: mpData.select("topics", "select=*&order=position") */
  async select(table, query) {
    const { base, key, ready } = conn();
    if (!ready) throw new Error("not-connected");
    const res = await fetch(base + "/rest/v1/" + table + "?" + (query || "select=*"), { headers: headers(key) });
    return res.ok ? res.json() : fail(res);
  },
  /** add rows; keepalive lets it finish while the page closes */
  async insert(table, rows, opts) {
    const { base, key, ready } = conn();
    if (!ready) return false;
    try {
      const res = await fetch(base + "/rest/v1/" + table, { method: "POST", keepalive: !!(opts && opts.keepalive), headers: headers(key, { Prefer: "return=minimal" }), body: JSON.stringify(rows) });
      return res.ok;
    } catch { return false; }
  },
};
