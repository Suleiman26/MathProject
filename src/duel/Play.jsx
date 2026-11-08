'use client';
/* Duels: /duel/<id> — the state machine around one duel.
   loading → (invited: sender waits / invitee gets the card) → accepted
   (face-off "מכינים…", the INVITEE calls duelApi.start once) → faceoff
   (3-2-1 from start_at) → arena → waiting (I finished first) → finishing
   (time up, server not done yet) → done (Result) · ended (failed / expired /
   cancelled / declined).

   Truth = duel_state. Re-fetched on mount, on every realtime hint, when the
   tab comes back, on reconnect, after every answer (the next question only
   arrives with my new idx — no reading ahead), and on a poll: every 3 s while
   the socket isn't connected, 1.5 s while accepted or finishing. Times come
   from the server's now() through clock.js (Review Focus 1 + 2); the answer
   buttons stay disabled until duel_answer returns (Review Focus 3); nothing
   here ever decides a result (Review Focus 5).
   PlayView takes the api / subscribe so the dev lab can feed it a fake duel. */
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { useAccount } from "@/lib/account";
import { Avatar } from "@/account/ui";
import { duelApi, duelError } from "./api";
import { subscribe } from "./live";
import { createClock, serverNow } from "./clock";
import {
  phaseOf, parseTs, mergeState, applyAnswer, feedbackMs, overtake, oppPing, currentQuestion, colorVars, inviteLeft,
  GO_MS, PING_MS, QUESTIONS, INVITE_MS, toName, atName,
} from "./arena-core";
import { FaceOff } from "./FaceOff";
import { Arena } from "./Arena";
import { InviteCard } from "./InviteDrop";
import Result from "./Result";
import { SUBJECT_LABEL } from "./samples";
import { sfx, shake, floatPoints, usePaintStatusBar, armSound } from "./fx";

const POLL_MS = 3000, FAST_POLL_MS = 1500, DARK = "#0b1020";
const RING_R = 52, RING_C = 2 * Math.PI * RING_R;

export default function Play({ id }) {
  const { ready, account } = useAccount();
  return <PlayView id={id} ready={ready} account={account} api={duelApi} subscribeFn={subscribe} />;
}

/* ── small screens around the arena ──────────────────────────────────────── */
function Shell({ children, dark, vars, avatar }) {
  return (
    <div className={"duel-play" + (dark ? " dark" : "")} style={vars} data-topic={avatar || "teal"}>
      {children}
    </div>
  );
}

function Card({ title, lead, children }) {
  return (
    <div className="ar-end">
      <section className="ar-end-card">
        {title && <h1>{title}</h1>}
        {lead && <p>{lead}</p>}
        {children}
      </section>
    </div>
  );
}

/* the sender waiting for the friend to answer (direct link to /duel/<id>) */
function SenderWait({ st, offset, onCancel }) {
  const [left, setLeft] = useState(() => inviteLeft(st.expires_at, serverNow(offset)));
  useEffect(() => {
    const t = setInterval(() => setLeft(inviteLeft(st.expires_at, serverNow(offset))), 250);
    return () => clearInterval(t);
  }, [st.expires_at, offset]);
  const s = Math.ceil(left / 1000);
  return (
    <Card title={`מחכים ${toName(st.opp.username)}…`} lead={`${SUBJECT_LABEL[st.subject] || ""} · 15 שאלות · 5 דקות`}>
      <div className="dl-ring" style={{ "--me-500": "var(--op-5)" }} role="timer" aria-label={`עוד ${s} שניות`}>
        <svg viewBox="0 0 120 120" aria-hidden="true">
          <circle cx="60" cy="60" r={RING_R} className="dl-ring-bg" />
          <circle cx="60" cy="60" r={RING_R} className="dl-ring-fg" strokeDasharray={RING_C} strokeDashoffset={RING_C * (1 - Math.min(1, left / INVITE_MS))} />
        </svg>
        <span className="dl-ring-av"><Avatar account={st.opp} size={64} /></span>
        <b className="dl-ring-n">{s}</b>
      </div>
      <div className="dl-row"><button type="button" className="dl-btn ghost" onClick={onCancel}>ביטול</button></div>
    </Card>
  );
}

/* ── the duel ─────────────────────────────────────────────────────────────── */
export function PlayView({ id, ready, account, api, subscribeFn }) {
  const router = useRouter();
  const [st, setSt] = useState(null);
  const [err, setErr] = useState(null);           // { code, message }: the duel can't be shown
  const [net, setNet] = useState(false);          // the last state() had no connection
  const [offset, setOffset] = useState(0);
  const clock = useRef(createClock());
  const [conn, setConn] = useState(false);
  const [, setTick] = useState(0);
  const gen = useRef(0);
  const started = useRef(false);
  const stRef = useRef(null);
  stRef.current = st;
  useEffect(() => { armSound(); }, []);

  const refetch = useCallback(async () => {
    if (!account) return null;
    const my = ++gen.current;
    const r = await api.state(id);
    if (my !== gen.current) return r;              // a newer request is already on its way
    if (!r || r.error) {
      if (r && r.error === "network") { setNet(true); return r; }
      setErr({ code: r ? r.error : "network", message: duelError(r) });
      return r;
    }
    setNet(false);
    if (r.now && r._sent) setOffset(clock.current.sample(parseTs(r.now), r._sent, r._recv));
    setSt((prev) => mergeState(prev, r));
    return r;
  }, [id, account && account.id, api]);

  useEffect(() => { if (ready && account) refetch(); }, [ready, account && account.id, refetch]);

  // realtime hints on the duel's channel → re-fetch
  const channel = st && st.channel;
  useEffect(() => {
    if (!channel) return;
    return subscribeFn(channel, () => { refetch(); }, { onStatus: setConn });
  }, [channel, subscribeFn, refetch]);

  // the tab comes back / the browser is online again → re-fetch (live.js also sends 'sync', once subscribed)
  useEffect(() => {
    const f = () => { if (document.visibilityState === "visible") refetch(); };
    document.addEventListener("visibilitychange", f);
    window.addEventListener("online", f);
    window.addEventListener("pageshow", f);
    return () => { document.removeEventListener("visibilitychange", f); window.removeEventListener("online", f); window.removeEventListener("pageshow", f); };
  }, [refetch]);

  const now = serverNow(offset);
  const phase = err ? "error" : phaseOf(st, now);
  const terminal = phase === "done" || phase === "ended" || phase === "error";

  // polling: the socket is the fast path, this is the truth path
  useEffect(() => {
    if (terminal || !account) return;
    const ms = phase === "accepted" || phase === "finishing" ? FAST_POLL_MS : (!conn || phase === "invited" || net) ? POLL_MS : 0;
    if (!ms) return;
    const t = setInterval(() => { if (document.visibilityState === "visible") refetch(); }, ms);
    return () => clearInterval(t);
  }, [terminal, conn, phase, net, refetch, account]);

  // the invitee makes the questions happen (duel-start), once; whatever it answers, the state tells the truth
  useEffect(() => {
    if (!st || st.status !== "accepted" || st.i_invited || started.current) return;
    started.current = true;
    api.start(id).then((r) => {
      // the switch is off → say so kindly; anything else (incl. errors) → the state tells the truth
      if (r && r.error === "off") setErr({ code: "off", message: duelError(r) });
      refetch();
    }, () => refetch());
  }, [st && st.status, st && st.i_invited, api, id, refetch]);

  // re-render exactly when the phase flips: 3 s before start, at start, after "יאללה!", at ends_at, and after the grace
  useEffect(() => {
    if (!st || st.status !== "live") return;
    const s = parseTs(st.start_at), e = parseTs(st.ends_at), n = serverNow(offset);
    const ts = [s - 3000 - n, s - n, s + GO_MS - n, e - n, e + 2500 - n]
      .filter((d) => d > 0 && d < 1e7)
      .map((d) => setTimeout(() => setTick((t) => t + 1), d + 15));
    return () => ts.forEach(clearTimeout);
  }, [st && st.status, st && st.start_at, st && st.ends_at, offset, phase]);

  /* ── answering ─────────────────────────────────────────────────────────── */
  const [busy, setBusy] = useState(false);
  const [fb, setFb] = useState(null);             // { idx, given, correct, right, points }
  const fbTimer = useRef(null);
  const rootRef = useRef(null);
  const [toast, setToast] = useState("");
  useEffect(() => () => clearTimeout(fbTimer.current), []);
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(""), 2200); return () => clearTimeout(t); }, [toast]);

  const viewIdx = fb ? fb.idx : st && st.me ? st.me.idx : 0;
  const question = currentQuestion(st, viewIdx);

  // the next question hasn't arrived yet (slow state after an answer) → ask again every second
  useEffect(() => {
    if (phase !== "arena" || question || fb) return;
    const t = setInterval(refetch, 1000);
    return () => clearInterval(t);
  }, [phase, question, fb, refetch]);

  const answer = useCallback(async (given, el) => {
    const s = stRef.current;
    if (!s || !s.me || busy || fb) return;
    const idx = s.me.idx;
    setBusy(true);
    const r = await api.answer(id, idx, given);
    if (!r || r.error) {
      setBusy(false);
      if (r && r.error === "network") setToast("אין חיבור כרגע… מנסים שוב");
      refetch();                                     // 'order' / 'locked' / 'time': the state knows
      return;
    }
    const n = serverNow(offset);
    setFb({ idx, given, correct: !!r.correct, right: r.right, points: r.points });
    setSt((p) => applyAnswer(p, idx, r));
    sfx(r.correct ? "ok" : "bad");
    const target = el || (rootRef.current && rootRef.current.querySelector(".kp-in"));
    if (r.correct) floatPoints(target, "+" + r.points);
    else shake(target);
    refetch();                                       // brings the next question
    clearTimeout(fbTimer.current);
    fbTimer.current = setTimeout(() => { setFb(null); setBusy(false); }, feedbackMs(r, n));
  }, [api, id, busy, fb, offset, refetch]);

  /* ── the opponent's ping, overtakes, the last question ──────────────────── */
  const prev = useRef(null);
  const [ping, setPing] = useState(null);
  const pingT = useRef(null);
  const [banner, setBanner] = useState(null);
  const bannerT = useRef(null);
  const showBanner = (kind, text, ms) => { clearTimeout(bannerT.current); setBanner({ kind, text }); bannerT.current = setTimeout(() => setBanner(null), ms); };
  useEffect(() => {
    if (!st || !st.me || !st.opp) return;
    const p = prev.current;
    prev.current = st;
    if (!p || !p.me || !p.opp || st.status !== "live") return;
    const pg = oppPing(p.opp, st.opp);
    if (pg) { setPing(pg); clearTimeout(pingT.current); pingT.current = setTimeout(() => setPing(null), PING_MS); }
    const ov = overtake({ my: p.me.score, opp: p.opp.score }, { my: st.me.score, opp: st.opp.score });
    if (ov === "me") { showBanner("ov", `עקפת ${atName(st.opp.username)}!`, 1000); shake(rootRef.current, true); sfx("over"); }
    else if (ov === "opp") showBanner("lost", `${st.opp.username} עקפ/ה אותך`, 900);
  }, [st]);
  const x2 = useRef(false);
  useEffect(() => {
    if (phase === "arena" && viewIdx === QUESTIONS - 1 && !x2.current) { x2.current = true; showBanner("x2", "שאלה אחרונה ×2", 1200); sfx("x2"); }
  }, [phase, viewIdx]);
  useEffect(() => () => { clearTimeout(pingT.current); clearTimeout(bannerT.current); }, []);

  /* ── actions ───────────────────────────────────────────────────────────── */
  const [inviteBusy, setInviteBusy] = useState("");
  const [gone, setGone] = useState(null);
  async function acceptInvite(yes) {
    setInviteBusy(yes ? "yes" : "no");
    const r = await api.answerInvite(id, yes);
    setInviteBusy("");
    if (r && r.error) { setGone(r.error === "gone" ? "gone" : r.error); refetch(); return; }
    if (!yes) { router.push("/duel"); return; }
    refetch();
  }
  async function cancelInvite() { await api.cancel(id); router.push("/duel"); }
  async function giveUp() { await api.giveUp(id); await refetch(); }
  const [rematchBusy, setRematchBusy] = useState(false);
  const [rematchErr, setRematchErr] = useState("");
  async function rematch() {
    if (!st || !st.opp) return;
    setRematchBusy(true); setRematchErr("");
    const r = await api.invite(st.opp.id, st.subject);
    setRematchBusy(false);
    if (!r || r.error) { setRematchErr(duelError(r)); return; }
    router.push(`/duel/${r.id}`);
  }

  /* ── render ────────────────────────────────────────────────────────────── */
  const dark = ["loading", "accepted", "faceoff", "arena", "waiting", "finishing"].includes(phase) && !err;
  usePaintStatusBar(DARK, dark);
  const me = (st && st.me) || account || {};
  const opp = (st && st.opp) || {};
  const vars = colorVars(account && account.avatar, opp.avatar);

  if (!ready) return <Shell dark vars={vars} />;
  if (!account) {
    return (
      <Shell vars={vars}>
        <Card title="צריך להתחבר" lead="דו-קרב משחקים עם חשבון. התחברו — וחוזרים ישר לפה.">
          <div className="dl-row"><Link className="dl-btn ghost" href="/duel">לדו-קרב</Link><Link className="dl-btn accent" href="/login">התחברות</Link></div>
        </Card>
      </Shell>
    );
  }
  if (phase === "error") {
    const code = err.code;
    const title = code === "gone" ? "הדו-קרב הזה לא נמצא" : code === "off" ? "הדו-קרבים כבויים כרגע" : code === "signed_out" ? "צריך להתחבר שוב" : "משהו השתבש";
    return (
      <Shell vars={vars} avatar={account.avatar}>
        <Card title={title} lead={code === "gone" ? "אולי הקישור ישן, או שהדו-קרב של מישהו אחר." : err.message}>
          <div className="dl-row">
            <Link className="dl-btn ghost" href="/duel">לדו-קרב</Link>
            {code !== "gone" && code !== "off" && <button type="button" className="dl-btn accent" onClick={() => { setErr(null); refetch(); }}>לנסות שוב</button>}
          </div>
        </Card>
      </Shell>
    );
  }
  if (phase === "loading") {
    return (
      <Shell dark vars={vars} avatar={account.avatar}>
        <div className="ar-loading" role="status" aria-live="polite"><span className="fo-dots"><i /><i /><i /></span>{net ? "אין חיבור… מנסים שוב" : "נכנסים לזירה…"}</div>
      </Shell>
    );
  }
  if (phase === "invited") {
    if (st.i_invited) return <Shell vars={vars} avatar={account.avatar}><SenderWait st={st} offset={offset} onCancel={cancelInvite} /></Shell>;
    const invite = { id: st.id, from: st.opp, subject: st.subject, expires_at: st.expires_at, h2h: null };
    return (
      <Shell vars={vars} avatar={account.avatar}>
        <div className="ar-end"><InviteCard invite={invite} offset={offset} inline busy={inviteBusy} gone={gone} onAccept={() => acceptInvite(true)} onDecline={() => acceptInvite(false)} />
          {gone && <div className="dl-row" style={{ maxWidth: 420, margin: "14px auto 0" }}><Link className="dl-btn ghost" href="/duel">לדו-קרב</Link></div>}
        </div>
      </Shell>
    );
  }
  if (phase === "ended") {
    const s = st.status;
    const iAm = st.i_invited;
    const title = s === "failed" ? "משהו השתבש — נסו שוב" : s === "declined" ? (iAm ? `${opp.username} לא פנוי/ה כרגע` : "דחית את ההזמנה") : s === "cancelled" ? "ההזמנה בוטלה" : "ההזמנה כבר לא פעילה";
    const lead = s === "failed" ? "לא הצלחנו להכין את השאלות בזמן. זה לא נספר לאף אחד — אפשר לנסות סיבוב חדש." : s === "expired" ? "עברו 60 שניות בלי תשובה." : s === "declined" && iAm ? "אולי בפעם אחרת. אפשר לנסות שוב בעוד רגע." : "";
    return (
      <Shell vars={vars} avatar={account.avatar}>
        <Card title={title} lead={lead}>
          {rematchErr && <p className="dl-err" role="alert">{rematchErr}</p>}
          <div className="dl-row">
            <Link className="dl-btn ghost" href="/duel">חזרה</Link>
            {opp.id && s !== "declined" && <button type="button" className="dl-btn accent" disabled={rematchBusy} onClick={rematch}>{rematchBusy ? "שולחים…" : "עוד סיבוב"}</button>}
            {opp.id && s === "declined" && iAm && <button type="button" className="dl-btn accent" disabled={rematchBusy} onClick={rematch}>{rematchBusy ? "שולחים…" : "לנסות שוב"}</button>}
          </div>
        </Card>
      </Shell>
    );
  }
  if (phase === "done") {
    return <Shell vars={vars} avatar={account.avatar}><Result state={st} onRematch={rematch} rematchBusy={rematchBusy} rematchError={rematchErr} /></Shell>;
  }
  if (phase === "accepted" || phase === "faceoff") {
    const waitedMs = st.accepted_at ? now - parseTs(st.accepted_at) : 0;
    return (
      <Shell dark vars={vars} avatar={account.avatar}>
        <FaceOff me={{ ...account, ...me }} opp={opp} startAt={st.status === "live" ? st.start_at : null} offset={offset} preparing={phase === "accepted"} failedSoon={waitedMs > 6000} />
      </Shell>
    );
  }
  // arena / waiting / finishing
  return (
    <Shell dark vars={vars} avatar={account.avatar}>
      {(net || !conn) && phase !== "finishing" && <div className={"ar-net" + (net ? " off" : "")} role="status">{net ? "אין חיבור… מנסים להתחבר" : ""}</div>}
      <Arena state={st} offset={offset} question={question} fb={fb} busy={busy} onAnswer={answer} banner={banner} ping={ping}
        phase={phase} onGiveUp={giveUp} lockUntil={st.me.lock_until} rootRef={rootRef} />
      {toast && <div className="ar-toast" role="status">{toast}</div>}
    </Shell>
  );
}
