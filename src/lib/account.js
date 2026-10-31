'use client';
/* Student accounts in the browser: the session, calls to the database
   functions (supabase/migrations/20261031100000_accounts.sql), and a tiny
   shared state so every page knows who is signed in.
   The session token lives in localStorage on this device only. */
import { useEffect, useState } from "react";
import { mpData } from "./mp-data";

export const TERMS_VERSION = "2026-10-31"; // must match account_terms_version() in the database
const KEY = "mp:account";

let state = { ready: false, account: null, tok: null };
const subs = new Set();
function emit() { subs.forEach((f) => f(state)); }
function set(next) { state = { ...state, ...next }; emit(); }

function load() {
  try { const s = JSON.parse(localStorage.getItem(KEY)); if (s && s.tok) return s; } catch {}
  return null;
}
function save(tok, account) {
  try { if (tok) localStorage.setItem(KEY, JSON.stringify({ tok, account })); else localStorage.removeItem(KEY); } catch {}
}

/** The current session token (used by the answer tracker). */
export function sessionToken() { const s = load(); return s ? s.tok : null; }

let started = false;
function start() {
  if (started || typeof window === "undefined") return;
  started = true;
  const s = load();
  set({ ready: true, account: s ? s.account : null, tok: s ? s.tok : null });
  if (s && mpData.ready) {
    // refresh from the server; a dead session signs out quietly
    mpData.rpc("account_me", { tok: s.tok }).then((a) => {
      if (a) { save(s.tok, a); set({ account: a }); }
    }).catch((e) => { if (e.status === 401 || e.status === 403 || /unauthorized/i.test(e.message)) { save(null); set({ account: null, tok: null }); } });
  }
  window.addEventListener("storage", (e) => { if (e.key === KEY) { const n = load(); set({ account: n ? n.account : null, tok: n ? n.tok : null }); } });
}

/** React hook: { ready, account, tok } */
export function useAccount() {
  const [s, setS] = useState(state);
  useEffect(() => { subs.add(setS); start(); setS(state); return () => { subs.delete(setS); }; }, []);
  return s;
}

function device() {
  try {
    let d = localStorage.getItem("mp:device");
    if (!d || d.length < 8) { d = crypto.randomUUID ? crypto.randomUUID() : "d" + Math.random().toString(36).slice(2) + Date.now().toString(36); localStorage.setItem("mp:device", d); }
    return d;
  } catch { return null; }
}

async function rpc(fn, args) {
  if (!mpData.ready) throw new Error("not-connected");
  return mpData.rpc(fn, args);
}
function signedIn(r) {
  if (r && r.token) { save(r.token, r.account); set({ account: r.account, tok: r.token }); }
  return r;
}

export const accountApi = {
  nameFree: (username) => rpc("account_name_free", { username }),
  signup: ({ username, password, grade, accept, parentOk }) =>
    rpc("account_signup", { username, password, grade: grade || null, terms_version: TERMS_VERSION, accept, parent_ok: parentOk, device: device() }).then(signedIn),
  login: ({ username, password }) => rpc("account_login", { username, password }).then(signedIn),
  async logout() {
    const tok = state.tok || sessionToken();
    save(null); set({ account: null, tok: null });
    if (tok) { try { await rpc("account_logout", { tok }); } catch {} }
  },
  acceptTerms: () => rpc("account_accept_terms", { tok: state.tok, terms_version: TERMS_VERSION, parent_ok: true }).then((a) => { if (a && a.id) { save(state.tok, a); set({ account: a }); } return a; }),
  update: (grade, avatar) => rpc("account_update", { tok: state.tok, grade, avatar }).then((a) => { if (a && a.id) { save(state.tok, a); set({ account: a }); } return a; }),
  password: (oldPw, newPw) => rpc("account_password", { tok: state.tok, old_password: oldPw, new_password: newPw }),
  async remove(password) {
    const r = await rpc("account_delete", { tok: state.tok, password });
    if (r && r.ok) { save(null); set({ account: null, tok: null }); }
    return r;
  },
  progress: () => rpc("account_progress", { tok: state.tok }),
  contact: ({ name, replyTo, body }) => rpc("contact_send", { name, reply_to: replyTo, body, device: device() }),
};

/* Hebrew messages for every error the database can return */
export const NAME_PROBLEM = {
  short: "לפחות 3 תווים",
  long: "עד 20 תווים",
  chars: "רק אותיות, ספרות, נקודה, מקף או קו תחתון (בלי רווחים)",
  reserved: "השם הזה שמור. בחרו שם אחר",
};
export const PASS_PROBLEM = {
  short: "לפחות 8 תווים",
  long: "עד 72 תווים",
  mix: "צריך גם אותיות וגם ספרות",
};
export function passChecks(p) {
  return [
    { ok: p.length >= 8, label: "8 תווים לפחות" },
    { ok: /[A-Za-zא-ת]/.test(p), label: "אות אחת לפחות" },
    { ok: /[0-9]/.test(p), label: "ספרה אחת לפחות" },
  ];
}
export function nameProblem(u) {
  const v = (u || "").trim();
  if (v.length < 3) return "short";
  if (v.length > 20) return "long";
  if (!/^[A-Za-z0-9א-ת_.-]+$/.test(v)) return "chars";
  if (["admin", "administrator", "root", "mathix", "support", "system", "moderator", "מנהל", "ניהול"].includes(v.toLowerCase())) return "reserved";
  return null;
}

/* Avatar colours (the same palette as the topics) */
export const AVATARS = ["teal", "sky", "blue", "indigo", "violet", "pink", "orange", "cyan"];
