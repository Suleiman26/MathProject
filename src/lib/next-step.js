/* The student's "next step" (the home railway's ticket), remembered on this device so the
   bottom bar's middle button can go there from any page. Written by Railway (src/home/Journey.jsx),
   read by src/components/BottomNav.jsx. */
import { CATEGORIES, TOPICS } from "@/home/catalog";

const key = (uid) => "mp:next:" + uid;

export function saveNext(uid, v) {
  try { localStorage.setItem(key(uid), JSON.stringify({ ...v, at: Date.now() })); } catch {}
  try { window.dispatchEvent(new CustomEvent("mp:next", { detail: { uid } })); } catch {}
}


/** {href, verb, name} or null. Falls back to the last topic opened on this device, then to the
    first topic of the student's grade (a new student's first station, as on the home railway). */
export function loadNext(uid, grade) {
  try {
    const v = JSON.parse(localStorage.getItem(key(uid)) || "null");
    if (v && v.href) return v;
  } catch {}
  try {
    const l = JSON.parse(localStorage.getItem("mp:last") || "null");
    const t = l && l.slug && TOPICS.find((x) => x.slug === l.slug);
    if (t) return { href: `/topics/${t.slug}`, verb: "להמשיך", name: t.name };
  } catch {}
  const g = grade ? String(grade) : null;
  for (const c of CATEGORIES) {
    const t = g && TOPICS.find((x) => x.cat === c.id && x.g.includes(g));
    if (t) return { href: `/topics/${t.slug}`, verb: "להתחיל", name: t.name };
  }
  return null;
}
