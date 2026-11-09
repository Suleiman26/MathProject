'use client';
/* Duels: the hub at /duel — my code, friends, requests, recent duels, and the
   challenge sheet. HubView draws everything from props (the dev page feeds it
   sample data); Hub below wires it to the account, duelApi, presence and realtime.
   Styles: src/styles/duel.css. Spec §4.1–4.2, mockup screen 1.
   Colours: "me" = --me-* (set once on .duel from the student's colour); a friend's
   colour appears only on their avatar and on their half of a tug pill. */
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAccount } from "@/lib/account";
import { AccountMenu, Avatar, LegalFooter } from "@/account/ui";
import { duelApi, duelError } from "./api";
import { usePresence } from "./presence";
import { subscribe } from "./live";
import { SUBJECT_LABEL } from "./subjects";
import { MyCode, AddFriendForm, cleanCode, useShareCode } from "./AddFriend";
import { FriendRow, FriendMenu, FriendAvatar, Tug, toName, SEP } from "./FriendRow";
import { ChallengeSheet, WaitRing, preloadEngine } from "./ChallengeSheet";
import { serverNow } from "./clock";
import { fmtCode } from "./QR";
import EnablePush from "./EnablePush";

const PENDING_KEY = "mp:duel:add";   // a friend code opened from a link while signed out
const REFRESH_MS = 30000;
const POLL_MS = 3000;

/* ── the page frame: soft wash of my colour, glass top row ──────────────────── */
export function DuelShell({ account, children, back = "/", next, className = "" }) {
  return (
    <div className={"duel" + (className ? " " + className : "")} data-topic={(account && account.avatar) || "teal"}>
      <div className="dl-bg" aria-hidden="true" />
      <div className="dl-in">
        <header className="dl-top">
          <Link href={back} className="dl-back" aria-label="לעמוד הבית">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6" /></svg>
            <img src="/brand/logo-loop.png" alt="" width={30} height={30} />
            <span>מתמטיקה חט״ב</span>
          </Link>
          {account ? <AccountMenu account={account} trigger="icon" /> : <Link className="dl-pill" href={loginHref("/login", next)}>התחברות</Link>}
        </header>
        {children}
      </div>
      <LegalFooter />
    </div>
  );
}
/** /login or /signup, carrying a safe return path (only /duel/… is honoured by Login/Signup) */
function loginHref(base, next) { return next ? `${base}?next=${encodeURIComponent(next)}` : base; }

function ago(t) {
  const s = (Date.now() - new Date(t).getTime()) / 1000;
  if (!Number.isFinite(s)) return "";
  if (s < 90) return "עכשיו";
  if (s < 3600) return `לפני ${Math.round(s / 60)} דק׳`;
  if (s < 86400) return `לפני ${Math.round(s / 3600)} שע׳`;
  const d = Math.round(s / 86400);
  return d === 1 ? "אתמול" : d < 7 ? `לפני ${d} ימים` : new Date(t).toLocaleDateString("he-IL", { day: "numeric", month: "short" });
}

const MI = {
  swords: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M14.5 17.5L3 6V3h3l11.5 11.5" /><path d="M13 19l6-6" /><path d="M16 16l4 4" /><path d="M19 21l2-2" /><path d="M9.5 6.5L21 3v3l-8.5 8.5" /><path d="M5 14l-2 2 4 4 2-2" /></svg>,
  x: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>,
  more: <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="5" cy="12" r="2.1" /><circle cx="12" cy="12" r="2.1" /><circle cx="19" cy="12" r="2.1" /></svg>,
  share: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 3v13" /><path d="M7.5 7.5L12 3l4.5 4.5" /><path d="M5 12v6a3 3 0 003 3h8a3 3 0 003-3v-6" /></svg>,
};

/* ── guests / switch off / loading ─────────────────────────────────────────── */
export function GuestView({ next }) {
  return (
    <DuelShell account={null} next={next}>
      <section className="dl-hero">
        <p className="dl-kicker">דו-קרב</p>
        <h1>15 שאלות. 5 דקות. מי מנצח?</h1>
        <p className="dl-lead">אותן שאלות לשניכם, בזמן אמת, אחד מול אחד — עם החברים שלכם.</p>
      </section>
      <section className="dl-card dl-guest">
        <ol className="dl-steps">
          <li><b>1</b><span>פותחים חשבון (שם משתמש וסיסמה, בלי מייל)</span></li>
          <li><b>2</b><span>מחליפים קוד חבר עם מי שרוצים לשחק נגדו</span></li>
          <li><b>3</b><span>שולחים אתגר — ומשחקים</span></li>
        </ol>
        <div className="dl-row">
          <Link className="dl-btn ghost" href={loginHref("/login", next)}>כבר יש לי חשבון</Link>
          <Link className="dl-btn accent" href={loginHref("/signup", next)}>פתיחת חשבון</Link>
        </div>
      </section>
    </DuelShell>
  );
}

export function SoonView({ account }) {
  return (
    <DuelShell account={account}>
      <section className="dl-hero">
        <p className="dl-kicker">דו-קרב</p>
        <h1>בקרוב</h1>
        <p className="dl-lead">דו-קרבים בין חברים עוד לא פתוחים לכולם. אנחנו בודקים אותם עם קבוצה קטנה — ואז פותחים.</p>
      </section>
      <section className="dl-card dl-soon">
        <img src="/home/hero/target.webp" alt="" width={88} height={88} decoding="async" />
        <div><b>מה יהיה שם?</b><p>15 שאלות, 5 דקות, שניכם על אותן שאלות. ניקוד על מהירות ורצפים, ומאזן מול כל חבר.</p></div>
        <Link className="dl-btn dark" href="/">בינתיים — לתרגול</Link>
      </section>
    </DuelShell>
  );
}

function Skeleton() {
  return (
    <div className="dl-skel" aria-busy="true" aria-label="טוען">
      <div className="dl-hero"><i style={{ width: 60 }} /><i style={{ width: "70%", height: 34 }} /><i style={{ width: 160 }} /></div>
      <div className="dl-card"><i style={{ width: "40%" }} /><i style={{ width: "100%", height: 60 }} /><i style={{ width: "100%", height: 60 }} /></div>
      <div className="dl-card"><i style={{ width: "30%" }} /><i style={{ width: "60%", height: 64 }} /></div>
    </div>
  );
}

/* ── hero pieces ───────────────────────────────────────────────────────────── */
/** my record as a two-tone bar: wins (my colour, right) | draws (thin, neutral) | losses (neutral), with duel XP beside it.
    No games yet → a calm line instead of a "0 | 0" bar. */
function Record({ stats }) {
  const w = Number(stats.wins) || 0, l = Number(stats.losses) || 0, d = Number(stats.draws) || 0;
  if (!(w + l + d)) return <div className="dl-rec"><p className="dl-rec-empty">עוד לא שיחקת — אתגרו חבר/ה</p></div>;
  const p = w + l ? Math.max(16, Math.min(84, Math.round((w / (w + l)) * 100))) : 50;
  const label = `המאזן שלי: ${w} ניצחונות, ${l} הפסדים${d ? `, ${d} תיקו` : ""}`;
  return (
    <div className="dl-rec">
      <div className={"dl-rec-bar" + (d ? " has-d" : "")} role="img" aria-label={label} style={{ "--p": p + "%" }}>
        <span className="dl-rec-w" aria-hidden="true"><i><b>{w}</b><small>ניצחונות</small></i></span>
        {d ? <span className="dl-rec-d" aria-hidden="true"><i><b>{d}</b><small>תיקו</small></i></span> : null}
        <span className="dl-rec-l" aria-hidden="true"><i><b>{l}</b><small>הפסדים</small></i></span>
      </div>
    </div>
  );
}
/** duel XP as a small chip beside the kicker (keeps the record row to the bar alone) */
function XpChip({ xp }) {
  if (!xp) return null;
  return <span className="dl-rec-xp" role="img" aria-label={`${xp} נקודות דו-קרב`}><img src="/home/hero/star.webp" alt="" width={22} height={22} /><b aria-hidden="true">{xp}</b><small aria-hidden="true">נק׳ דו-קרב</small></span>;
}

/** "מחוברים עכשיו": the online friends as big avatars, tap → challenge; none → a line + share CTA */
function OnlineNow({ friends, me, onPick, onShare, canShare, hasFriends }) {
  const online = friends.filter((f) => f.online);
  return (
    <section className="dl-now" aria-labelledby="dl-now-h">
      <div className="dl-now-h">
        <h2 id="dl-now-h"><i className="dl-online-i" aria-hidden="true" />מחוברים עכשיו</h2>
        {online.length > 0 && <span className="dl-count">{online.length}</span>}
      </div>
      {online.length ? (
        <ul className="dl-now-list">
          {online.map((f) => (
            <li key={f.id}>
              <button type="button" className="dl-now-f" onClick={() => onPick(f)} aria-label={`לאתגר את ${f.username}`}>
                <FriendAvatar friend={f} size={60} />
                <span dir="auto">{f.username}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <div className="dl-now-empty">
          <p>{hasFriends ? "אף אחד מהחברים לא מחובר כרגע. אפשר לשלוח אתגר בכל זאת — ההזמנה מחכה דקה." : "עוד אין חברים מחוברים. שלחו את הקוד שלכם — וכשיאשרו, הם יופיעו כאן."}</p>
          <button type="button" className="dl-pill" onClick={onShare}>{MI.share}<span>{canShare ? "שיתוף הקוד" : "העתקת הקישור"}</span></button>
        </div>
      )}
    </section>
  );
}

/* ── the open invite: polls duel_state while waiting (even with the sheet closed) ── */
function useInviteWatch({ wait, setWait, api, onLive, liveId, sheetRef }) {
  const check = useCallback(async () => {
    if (!wait || wait.phase !== "waiting" || !wait.invite || !api || !api.state) return;
    const r = await api.state(wait.invite.id);
    if (!r) return;
    const st = r.error ? (r.error === "gone" ? "expired" : null) : r.status;
    if (st === "accepted" || st === "live") { onLive?.(wait.invite.id); return; }
    if (st === "declined" || st === "expired" || st === "cancelled") {
      setWait((w) => (w && w.invite && w.invite.id === wait.invite.id ? { ...w, phase: st === "declined" ? "declined" : "expired" } : w));
    }
  }, [wait, api, onLive, setWait]);
  useEffect(() => {
    if (!wait || wait.phase !== "waiting") return;
    const t = setInterval(check, POLL_MS);
    return () => clearInterval(t);
  }, [wait, check]);
  useEffect(() => { if (wait && wait.phase === "waiting" && liveId) onLive?.(liveId); }, [wait, liveId, onLive]);
  useEffect(() => { if (sheetRef) sheetRef.current = { poke: check }; }, [sheetRef, check]);
}

/* ── the hub itself ────────────────────────────────────────────────────────── */
export function HubView({ account, data, history, presence, actions, state, error, cooldownUntil, onCooldown, onLive, sheetRef, initialSheet, pendingCode, onRetry }) {
  const [sheet, setSheet] = useState(initialSheet ? { friend: initialSheet.friend } : null);   // which friend's sheet is open
  const [wait, setWait] = useState(initialSheet && initialSheet.waiting
    ? { friend: initialSheet.friend, invite: initialSheet.waiting, subject: "random", phase: "waiting" } : null);
  const [reqMenu, setReqMenu] = useState(null);
  const [showBlocked, setShowBlocked] = useState(false);
  const [reqBusy, setReqBusy] = useState("");
  const [reqErr, setReqErr] = useState("");
  const [, setTick] = useState(0);
  const [announce, setAnnounce] = useState("");   // one hidden live region: phase changes only, never the seconds
  const { share, canShare, copied } = useShareCode(data && data.code);
  const waitPhase = wait ? wait.phase + ":" + wait.friend.id : "";
  // the question engine (which worlds a pair has questions for) loads at idle, in its own chunk,
  // once there is a friend to challenge — so the sheet opens with the right worlds at once
  const hasFriends = !!(data && data.friends && data.friends.length);
  useEffect(() => {
    if (!hasFriends) return;
    const w = window;
    if (typeof w.requestIdleCallback === "function") { const h = w.requestIdleCallback(() => preloadEngine(), { timeout: 2000 }); return () => w.cancelIdleCallback(h); }
    const t = setTimeout(preloadEngine, 800);
    return () => clearTimeout(t);
  }, [hasFriends]);
  useEffect(() => {
    if (!wait) { setAnnounce((a) => (a ? "" : a)); return; }
    const n = wait.friend.username;
    setAnnounce(wait.phase === "waiting" ? `ההזמנה נשלחה. מחכים ${toName(n)}` : wait.phase === "declined" ? `${n} לא יכול/ה עכשיו` : "הזמן עבר, ההזמנה פגה");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [waitPhase]);
  useInviteWatch({ wait, setWait, api: actions, onLive, liveId: presence && presence.liveId, sheetRef });
  // the waiting pill's ring ticks while the sheet is closed
  useEffect(() => {
    if (!wait || wait.phase !== "waiting" || sheet) return;
    const t = setInterval(() => setTick((n) => n + 1), 500);
    return () => clearInterval(t);
  }, [wait, sheet]);

  if (state === "guest") return <GuestView next="/duel" />;
  if (state === "soon") return <SoonView account={account} />;

  const friends = (data && data.friends) || [];
  const incoming = (data && data.incoming) || [];
  const outgoing = (data && data.outgoing) || [];
  const blocked = (data && data.blocked) || [];
  const stats = (history && history.stats) || {};
  const recent = (history && history.recent) || [];
  const online = friends.filter((f) => f.online).length;
  const sheetFriend = sheet && (friends.find((f) => f.id === sheet.friend.id) || sheet.friend);
  const offset = (presence && presence.offset) || 0;
  const pillLeft = wait && wait.invite ? Math.max(0, (Date.parse(wait.invite.expires_at) - serverNow(offset)) / 1000) : 0;

  async function answer(f, accept) {
    setReqBusy(f.id + (accept ? "y" : "n")); setReqErr("");
    const r = await actions.answerFriend(f.id, accept);
    setReqBusy("");
    if (r && r.error) setReqErr(r.message);
  }
  async function cancelWait() {
    const id = wait && wait.invite && wait.invite.id;
    setWait(null);
    if (id) await actions.cancel(id);
  }
  const openSheet = (f) => setSheet({ friend: f });

  return (
    <DuelShell account={account} className={wait && !sheet ? "has-pill" : ""}>
      <p className="dl-sr" role="status" aria-live="polite">{announce}</p>
      {state === "loading" && !data ? <Skeleton /> : (
        <>
          <section className="dl-hero">
            <div className="dl-kick-row"><p className="dl-kicker">דו-קרב</p><XpChip xp={stats.duel_xp} /></div>
            <h1>{friends.length ? "את מי מאתגרים?" : "מתחילים עם חבר/ה"}</h1>
            <Record stats={stats} />
          </section>

          {error && <div className="dl-alert" role="alert"><span>{error}</span>{onRetry && <button type="button" className="dl-pill" onClick={onRetry}>לנסות שוב</button>}</div>}

          {presence && presence.liveId && (
            <Link className="dl-live-ban" href={`/duel/${presence.liveId}`}>
              <span className="dl-live-dot" aria-hidden="true" />
              <b>יש לך דו-קרב פעיל</b><span>להמשיך</span>
            </Link>
          )}

          {/* no friends yet: the friends card already says what to do (and the code is right below) — no second empty box */}
          {friends.length > 0 && <OnlineNow friends={friends} me={account} onPick={openSheet} onShare={share} canShare={canShare} hasFriends />}
          <p className="dl-live dl-live-top" role="status" aria-live="polite">{copied === "link" ? "הקישור הועתק" : copied === "code" ? "הקוד הועתק" : " "}</p>

          <div className="dl-cols">
            <div className="dl-main">
              {incoming.length > 0 && (
                <section className="dl-card dl-req" aria-labelledby="dl-req-h">
                  <div className="dl-card-h"><h2 id="dl-req-h">בקשות חברות</h2><span className="dl-count">{incoming.length}</span></div>
                  <ul className="dl-list">
                    {incoming.map((f) => (
                      <li key={f.id} className="dl-req-row">
                        <Avatar account={f} size={44} />
                        <div className="dl-fr-t"><b dir="auto">{f.username}</b><small>רוצה להתחבר{SEP}{ago(f.created_at)}</small></div>
                        <div className="dl-req-acts">
                          <button type="button" className="dl-btn accent sm" disabled={!!reqBusy} onClick={() => answer(f, true)}>{reqBusy === f.id + "y" ? "…" : "אישור"}</button>
                          <button type="button" className="dl-more" aria-label={`לדחות את הבקשה של ${f.username}`} disabled={!!reqBusy} onClick={() => answer(f, false)}>{MI.x}</button>
                          <button type="button" className="dl-more" aria-label={`עוד פעולות עבור ${f.username}`} onClick={() => setReqMenu({ f, pending: "incoming" })}>{MI.more}</button>
                        </div>
                      </li>
                    ))}
                  </ul>
                  {reqErr && <p className="dl-err" role="alert">{reqErr}</p>}
                </section>
              )}

              <section className="dl-card dl-friends" aria-labelledby="dl-fr-h">
                <div className="dl-card-h">
                  <h2 id="dl-fr-h">החברים</h2>
                  {friends.length > 0 && <span className="dl-count">{online ? <><i className="dl-online-i" aria-hidden="true" />{online === 1 ? "1 מחובר/ת" : `${online} מחוברים`}{SEP}</> : null}{friends.length}</span>}
                </div>
                {friends.length === 0 ? (
                  <div className="dl-empty">
                    <img src="/home/hero/target.webp" alt="" width={96} height={96} decoding="async" />
                    <b>עוד אין פה אף אחד</b>
                    <p>שלחו את הקוד שלכם לחבר/ה. כשיאשרו — הם יופיעו כאן, ואפשר יהיה לאתגר אותם.</p>
                  </div>
                ) : (
                  <ul className="dl-list">
                    {friends.map((f) => (
                      <FriendRow key={f.id} friend={f} me={account} onChallenge={openSheet}
                        onRemove={(fr) => actions.removeFriend(fr.id)} onBlock={(fr) => actions.block(fr.id)} onReport={(fr, reason) => actions.report(fr.id, reason)} />
                    ))}
                  </ul>
                )}
                {outgoing.length > 0 && (
                  <div className="dl-out">
                    <h3>בקשות ששלחתי</h3>
                    <ul className="dl-list">
                      {outgoing.map((f) => (
                        <li key={f.id} className="dl-out-row">
                          <Avatar account={f} size={38} />
                          <div className="dl-fr-t"><b dir="auto">{f.username}</b><small>ממתין/ה לאישור…{SEP}{ago(f.created_at)}</small></div>
                          <button type="button" className="dl-pill sm" onClick={() => setReqMenu({ f, pending: "outgoing" })}>ביטול</button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </section>

              {recent.length > 0 && (
                <section className="dl-card dl-recent" aria-labelledby="dl-rc-h">
                  <div className="dl-card-h"><h2 id="dl-rc-h">דו-קרבים אחרונים</h2></div>
                  <ul className="dl-list">
                    {recent.map((d) => (
                      <li key={d.id} className={"dl-rc " + d.result}>
                        <Avatar account={d.opp} size={38} />
                        <div className="dl-fr-t"><b dir="auto">{d.opp.username}</b><small>{SUBJECT_LABEL[d.subject] || d.subject}{SEP}{ago(d.at)}</small></div>
                        <Tug mine={d.my} theirs={d.their} me={account} other={d.opp} size="score"
                          label={`התוצאה: ${d.my} לך, ${d.their} ${toName(d.opp.username)} — ${d.result === "win" ? "ניצחון" : d.result === "loss" ? "הפסד" : "תיקו"}`} />
                        <span className="dl-chip" aria-hidden="true">{d.result === "win" ? "ניצחון" : d.result === "loss" ? "הפסד" : "תיקו"}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </div>

            <aside className="dl-side">
              <MyCode code={data && data.code} />
              <AddFriendForm onAdd={actions.addFriend} initial={pendingCode || ""} title={pendingCode ? "קוד מהקישור שפתחת" : undefined} />
              <EnablePush account={account} played={stats.played} />
              {blocked.length > 0 && (
                <section className="dl-card dl-blocked">
                  <button type="button" className="dl-card-h as-btn" aria-expanded={showBlocked} onClick={() => setShowBlocked(!showBlocked)}>
                    <h2>חסומים</h2><span className="dl-count">{blocked.length}</span>
                    <svg className="dl-chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>
                  </button>
                  {showBlocked && (
                    <ul className="dl-list">
                      {blocked.map((b) => (
                        <li key={b.id} className="dl-out-row">
                          <Avatar account={b} size={38} />
                          <div className="dl-fr-t"><b dir="auto">{b.username}</b><small>חסום/ה</small></div>
                          <button type="button" className="dl-pill sm" onClick={() => actions.unblock(b.id)}>ביטול חסימה</button>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              )}
            </aside>
          </div>
        </>
      )}

      {/* the open invite while the sheet is closed: a compact pill at the bottom */}
      {wait && !sheet && (
        <div className={"dl-waitpill" + (wait.phase !== "waiting" ? " ended" : "")}>
          <button type="button" className="dl-waitpill-main" onClick={() => setSheet({ friend: wait.friend })} aria-label={wait.phase === "waiting" ? `מחכים ${toName(wait.friend.username)}, עוד ${Math.ceil(pillLeft)} שניות. לפתיחה` : "לפתיחה"}>
            <WaitRing friend={wait.friend} left={pillLeft} size={44} quiet={wait.phase !== "waiting"} />
            <span className="dl-waitpill-t">
              <b>{wait.phase === "waiting" ? `מחכים ${toName(wait.friend.username)}…` : wait.phase === "declined" ? `${wait.friend.username} לא יכול/ה עכשיו` : "הזמן עבר"}</b>
              <small>{wait.phase === "waiting" ? `עוד ${Math.ceil(pillLeft)} שנ׳${SEP}${SUBJECT_LABEL[wait.subject] || "הפתעה"}` : "לחיצה לפרטים"}</small>
            </span>
          </button>
          <button type="button" className="dl-pill sm" onClick={wait.phase === "waiting" ? cancelWait : () => setWait(null)}>{wait.phase === "waiting" ? "ביטול" : "סגירה"}</button>
        </div>
      )}

      {sheetFriend && (
        <ChallengeSheet open={!!sheet} onClose={() => setSheet(null)} friend={sheetFriend} me={account} offset={offset}
          api={{ invite: actions.invite, cancel: actions.cancel }} cooldownUntil={cooldownUntil} onCooldown={onCooldown}
          wait={wait} onWait={setWait} onCancel={cancelWait} onAgain={() => setWait(null)} />
      )}
      {reqMenu && (
        <FriendMenu open={!!reqMenu} onClose={() => setReqMenu(null)} friend={reqMenu.f} pending={reqMenu.pending}
          onRemove={(fr) => reqMenu.pending === "incoming" ? actions.answerFriend(fr.id, false) : actions.removeFriend(fr.id)}
          onBlock={(fr) => actions.block(fr.id)} onReport={(fr, reason) => actions.report(fr.id, reason)} />
      )}
    </DuelShell>
  );
}

/* ── wiring to the real thing ──────────────────────────────────────────────── */
export default function Hub() {
  const router = useRouter();
  const { ready, account } = useAccount();
  const presence = usePresence();
  const [data, setData] = useState(null);
  const [history, setHistory] = useState(null);
  const [state, setState] = useState("loading");   // loading | ok | soon | guest
  const [error, setError] = useState("");
  const [cooldownUntil, setCooldownUntil] = useState(0);
  const [pendingCode, setPendingCode] = useState("");
  const sheetRef = useRef(null);
  const gen = useRef(0);
  const hasData = useRef(false);
  const accountId = account && account.id;

  // no stale closures: every update is functional / through refs; a history error never wipes the list
  const load = useCallback(async () => {
    if (!accountId) return;
    const my = ++gen.current;
    const [f, h] = await Promise.all([duelApi.friends(), duelApi.history()]);
    if (my !== gen.current) return;
    if (f.error) {
      if (f.error === "off") { setState("soon"); return; }
      if (f.error === "signed_out") { setState("guest"); return; }
      setError(duelError(f));
      setState(hasData.current ? "ok" : "loading");
      return;
    }
    hasData.current = true;
    setError(""); setData(f);
    setHistory((prev) => (h && !h.error ? h : prev));
    setState("ok");
  }, [accountId]);

  useEffect(() => {
    if (!ready) return;
    if (!account) { setState("guest"); return; }
    setState((s) => (s === "guest" ? "loading" : s));
    load();
    try { const c = cleanCode(sessionStorage.getItem(PENDING_KEY)); if (c.length === 6) { setPendingCode(c); sessionStorage.removeItem(PENDING_KEY); } } catch {}
  }, [ready, accountId, load]);   // eslint-disable-line react-hooks/exhaustive-deps

  // fresh online dots / requests: every 30 s while visible, and when the tab comes back
  useEffect(() => {
    if (state !== "ok") return;
    const t = setInterval(() => { if (document.visibilityState === "visible") load(); }, REFRESH_MS);
    const vis = () => { if (document.visibilityState === "visible") load(); };
    document.addEventListener("visibilitychange", vis);
    return () => { clearInterval(t); document.removeEventListener("visibilitychange", vis); };
  }, [state, load]);

  // realtime hints on my inbox: an answer to my invite, a new invite → re-fetch
  const inbox = data && data.inbox;
  const refresh = presence.refresh;
  useEffect(() => {
    if (!inbox) return;
    return subscribe(inbox, (ev) => {
      if (ev === "invite_answer" || ev === "sync") sheetRef.current?.poke?.();
      refresh();
      if (ev === "sync") load();
    });
  }, [inbox, refresh, load]);

  const actions = useMemo(() => {
    const wrap = (fn, reload) => async (...a) => {
      const r = await fn(...a);
      if (r && r.error) {
        if (r.error === "off") setState("soon");
        return { ...r, message: duelError(r) };
      }
      if (reload) load();
      return r;
    };
    return {
      addFriend: wrap((code) => duelApi.addFriend(code), true),
      answerFriend: wrap((id, ok) => duelApi.answerFriend(id, ok), true),
      removeFriend: wrap((id) => duelApi.removeFriend(id), true),
      block: wrap((id) => duelApi.block(id), true),
      unblock: wrap((id) => duelApi.unblock(id), true),
      report: wrap((id, reason) => duelApi.report(id, reason), false),
      invite: wrap((fid, subject) => duelApi.invite(fid, subject), false),
      cancel: wrap((id) => duelApi.cancel(id), false),
      state: (id) => duelApi.state(id),
    };
  }, [load]);

  const onLive = useCallback((id) => { router.push(`/duel/${id}`); }, [router]);

  return (
    <HubView account={account} data={data} history={history} presence={presence} actions={actions} state={state} error={error}
      cooldownUntil={cooldownUntil} onCooldown={setCooldownUntil} onLive={onLive} sheetRef={sheetRef} pendingCode={pendingCode} onRetry={load} />
  );
}

/* ── /duel/add/<code>: a friend's link ─────────────────────────────────────── */
export function AddByLink({ code }) {
  const { ready, account } = useAccount();
  const c = cleanCode(code);
  const next = `/duel/add/${c}`;
  const [r, setR] = useState(null);
  const [busy, setBusy] = useState(false);
  const [soon, setSoon] = useState(false);
  useEffect(() => { if (ready && !account) { try { sessionStorage.setItem(PENDING_KEY, c); } catch {} } }, [ready, account, c]);

  async function add() {
    setBusy(true);
    const x = await duelApi.addFriend(c);
    setBusy(false);
    if (x && x.error === "off") { setSoon(true); return; }
    setR(x && x.error ? { error: x.error, message: duelError(x) } : x);
  }
  if (ready && !account) {
    return (
      <DuelShell account={null} back="/duel" next={next}>
        <section className="dl-hero"><p className="dl-kicker">דו-קרב · הזמנה</p><h1>חבר/ה מזמין/ה אותך <span className="dl-nb">לדו-קרב</span></h1><p className="dl-lead">כדי להתחבר צריך חשבון (שם משתמש וסיסמה, בלי מייל). אחרי ההתחברות חוזרים לכאן ומשלימים את ההוספה.</p></section>
        <section className="dl-card dl-guest">
          <p className="dl-code-txt center" dir="ltr">{fmtCode(c)}</p>
          <div className="dl-row"><Link className="dl-btn ghost" href={loginHref("/login", next)}>כבר יש לי חשבון</Link><Link className="dl-btn accent" href={loginHref("/signup", next)}>פתיחת חשבון</Link></div>
        </section>
      </DuelShell>
    );
  }
  if (soon) return <SoonView account={account} />;
  return (
    <DuelShell account={account} back="/duel">
      <section className="dl-hero"><p className="dl-kicker">דו-קרב · הזמנה</p><h1>{r && !r.error ? (r.state === "accepted" ? "אתם חברים" : r.state === "already" ? "כבר חברים" : "הבקשה נשלחה") : "להוסיף חבר/ה?"}</h1></section>
      <section className="dl-card dl-guest">
        {!r || r.error ? (
          <>
            <p className="dl-sh-m">הקוד מהקישור:</p>
            <p className="dl-code-txt center" dir="ltr">{fmtCode(c) || "—"}</p>
            {r && r.error && <p className="dl-err" role="alert">{r.message}</p>}
            <div className="dl-row">
              <Link className="dl-btn ghost" href="/duel">לא עכשיו</Link>
              <button type="button" className="dl-btn accent" disabled={!ready || busy || c.length !== 6} onClick={add} data-autofocus>{busy ? "שולחים…" : "שליחת בקשת חברות"}</button>
            </div>
          </>
        ) : (
          <>
            <p className="dl-sh-m">{r.state === "sent" ? "כשיאשרו — תופיעו זה אצל זה ואפשר יהיה לאתגר." : "אפשר כבר לשלוח אתגר."}</p>
            <Link className="dl-btn accent wide" href="/duel">{MI.swords}<span>לדו-קרב</span></Link>
          </>
        )}
      </section>
    </DuelShell>
  );
}
