'use client';
/* Duels: the result (spec §4.6, mockup screen 5) — the big moment.
   Staged reveal: one calm beat, then both columns rise together while the
   scores count up (1.4 s, the same curve so they land together); then the
   headline pops, a crown drops onto the winner's head (mine — the loser's
   screen never crowns the other side) and confetti fires ONCE (winner only,
   once per duel per tab; none with reduced motion). A draw crowns both, small.
   Tap anywhere skips to the end. Reduced motion: everything at its final value.

   Below: the duel XP from the server (and why it is 0, gently), the facts
   (right /15, best streak, average seconds), a comeback / perfect moment, the
   preset emotes (the opponent's appear as a bubble by their avatar), "what to
   review" (up to 3: the prompt, my answer struck, the right one, a link into
   that chapter), and under the thumb "חזרה" + the rematch (same subject).
   "⋯" → report (fixed reasons, confirm). The result sentence is announced once.

   Interface (Play.jsx): <Result state={duel_state} onRematch rematchBusy rematchError
     rematchUntil onEmote(id) → Promise<{error?, message?}> onReport(reason) → Promise<…> />
   Rules: ./result-core.js (tested). Styles: src/styles/duel-arena.css (.drs*). */
import Link from "next/link";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Avatar } from "@/account/ui";
import { confettiAt } from "@/lib/progress";
import { MathText, MathSpan } from "./MathText";
import { EmoteChips, EmoteBubble } from "./Emotes";
import { Sheet, radioKeys } from "./Sheet";
import { REPORT_REASONS } from "./FriendRow";
import { reduced, sfx } from "./fx";
import {
  outcome, headline, xpNote, facts, reviewItems, columnShares, countAt, easeOut, emotesOf, lastEmote, announce,
  rematchLabel, waitLeft, REVEAL_MS, REVEAL_DELAY, EMOTE_LABEL,
} from "./result-core";

/* the reveal: columns + numbers driven straight on the DOM (no React render per frame) */
function useReveal(rootRef, targets) {
  const [done, setDone] = useState(false);
  const skipRef = useRef(() => {});
  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const cols = [...root.querySelectorAll(".drs-rise")];
    const nums = [...root.querySelectorAll(".drs-num")];
    const grows = cols.map((c) => {
      const bar = c.querySelector(".drs-col-bar");
      return bar ? Math.max(0, bar.offsetHeight - parseFloat(getComputedStyle(bar).minHeight || "0")) : 0;
    });
    let raf = 0, t = 0, over = false;
    const paint = (k) => {
      const e = easeOut(k);
      cols.forEach((c, i) => { c.style.transform = e >= 1 ? "" : `translate3d(0, ${((1 - e) * grows[i]).toFixed(1)}px, 0)`; });
      nums.forEach((n, i) => { n.textContent = String(countAt(targets[i], k)); });
    };
    const finish = () => {
      if (over) return;
      over = true;
      clearTimeout(t); cancelAnimationFrame(raf);
      paint(1);
      setDone(true);
    };
    skipRef.current = finish;
    if (reduced()) { finish(); return () => { skipRef.current = () => {}; }; }
    paint(0);
    t = setTimeout(() => {
      const t0 = performance.now();
      const step = (now) => {
        const k = (now - t0) / REVEAL_MS;
        if (k >= 1) { finish(); return; }
        paint(k);
        raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
    }, REVEAL_DELAY);
    return () => { clearTimeout(t); cancelAnimationFrame(raf); skipRef.current = () => {}; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps -- once per mount: a re-fetch (emotes) never replays it
  return { done, skip: () => skipRef.current() };
}

function Crown({ small }) {
  return (
    <svg className={"drs-crown" + (small ? " sm" : "")} viewBox="0 0 64 50" aria-hidden="true">
      <defs>
        <linearGradient id="drs-gold" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fde68a" /><stop offset=".45" stopColor="#fbbf24" /><stop offset="1" stopColor="#d97706" />
        </linearGradient>
      </defs>
      <path d="M5 16l13.5 11L32 5l13.5 22L59 16l-6 27H11z" fill="url(#drs-gold)" stroke="#b45309" strokeWidth="1.6" strokeLinejoin="round" />
      <rect x="10" y="41" width="44" height="7" rx="3.5" fill="#d97706" />
      <circle cx="32" cy="30" r="3.6" fill="#fff7ed" /><circle cx="19.5" cy="33" r="2.4" fill="#fff7ed" opacity=".85" /><circle cx="44.5" cy="33" r="2.4" fill="#fff7ed" opacity=".85" />
      <circle cx="5" cy="15" r="3.2" fill="#fbbf24" /><circle cx="32" cy="5" r="3.6" fill="#fbbf24" /><circle cx="59" cy="15" r="3.2" fill="#fbbf24" />
    </svg>
  );
}

function Column({ who, player, label, share, target, crown, emote }) {
  return (
    <div className={"drs-col " + who + (crown ? " crowned" : "")} style={{ "--f": share }}>
      <div className="drs-rise">
        <div className="drs-col-head">
          {crown && <Crown small={crown === "half"} />}
          <Avatar account={player} size={62} />
          <EmoteBubble emote={emote} side={who} />
          <small className="drs-col-name" dir="auto">{label}</small>
        </div>
        <div className="drs-col-bar">
          <b className="drs-num">{target}</b>
        </div>
      </div>
    </div>
  );
}

function ReportSheet({ open, onClose, player, onReport }) {
  const name = player.username;
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [sent, setSent] = useState(false);
  const close = () => { onClose(); setTimeout(() => { setReason(""); setErr(""); setSent(false); }, 250); };
  async function send() {
    if (!reason || busy) return;
    setBusy(true); setErr("");
    let r;
    try { r = await onReport(reason); } catch { r = { error: "network" }; }
    setBusy(false);
    if (r && r.error) { setErr(r.message || "לא הצלחנו לשלוח. נסו שוב"); return; }
    setSent(true);
    setTimeout(close, 1400);
  }
  return (
    <Sheet open={open} onClose={close} label={`דיווח על ${name}`} className="dl-menu">
      <div className="dl-menu-h"><Avatar account={player} size={44} /><div><b dir="auto">{name}</b><small>דיווח לצוות האתר</small></div></div>
      {sent ? (
        <p className="dl-done" role="status">תודה. הדיווח הגיע לצוות</p>
      ) : (
        <div className="dl-confirm">
          <h3>מה קרה?</h3>
          <div className="dl-reasons" role="radiogroup" aria-label="סיבת הדיווח">
            {REPORT_REASONS.map((r, i) => (
              <button key={r.id} type="button" role="radio" data-id={r.id} aria-checked={reason === r.id}
                tabIndex={reason ? (reason === r.id ? 0 : -1) : (i === 0 ? 0 : -1)}
                className={reason === r.id ? "on" : ""} onClick={() => setReason(r.id)}
                onKeyDown={(e) => radioKeys(e, REPORT_REASONS.map((x) => x.id), r.id, setReason)}>{r.label}</button>
            ))}
          </div>
          <p className="dl-sh-m">הדיווח מגיע לצוות האתר בלבד, בלי ש{name} ידע/תדע.</p>
          {err && <p className="dl-err" role="alert">{err}</p>}
          <div className="dl-row">
            <button type="button" className="dl-btn ghost" onClick={close} disabled={busy}>ביטול</button>
            <button type="button" className="dl-btn warn" disabled={!reason || busy} onClick={send}>{busy ? "שולחים…" : "שליחת הדיווח"}</button>
          </div>
        </div>
      )}
    </Sheet>
  );
}

function ReviewItem({ it }) {
  return (
    <li className="drs-li">
      <MathText as="p" className="drs-li-q" text={it.prompt} />
      <p className="drs-li-a">
        {it.wrong ? (
          <span className="drs-given"><small>ענית</small><s>{it.given != null ? <MathSpan src={it.given} /> : "—"}</s></span>
        ) : (
          <span className="drs-given none"><small>לא הספקת</small></span>
        )}
        {it.right != null && <span className="drs-right"><small>התשובה</small><b><MathSpan src={it.right} /></b></span>}
      </p>
      {it.href && (
        <Link className="drs-li-go" href={it.href}>
          <span>לתרגל: {it.label}</span>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 6l-6 6 6 6" /></svg>
        </Link>
      )}
    </li>
  );
}

export default function Result({ state, onRematch, rematchBusy, rematchError, rematchUntil, rematchInvite, onAcceptRematch, onEmote, onReport }) {
  const me = state.me || {}, opp = state.opp || {};
  const o = outcome(state);
  const h = headline(state);
  const xp = xpNote(state);
  const f = facts(state);
  const rv = reviewItems(state);
  const shares = columnShares(o.my, o.their);
  const rootRef = useRef(null);
  const { done, skip } = useReveal(rootRef, [o.my, o.their]);
  const [menu, setMenu] = useState(false);

  // crown + confetti once, for my win; a soft chord for a win or a draw (nothing for a loss)
  const fired = useRef(false);
  useEffect(() => {
    if (!done || fired.current) return;
    fired.current = true;
    if (o.kind === "lose") return;
    sfx("end");
    if (o.kind !== "win" || reduced()) return;
    const key = "duel-cf:" + (state.id || "");
    try { if (sessionStorage.getItem(key)) return; sessionStorage.setItem(key, "1"); } catch {}
    const c = rootRef.current && rootRef.current.querySelector(".drs-col.me .drs-crown, .drs-col.me .acct-av");
    const r = c ? c.getBoundingClientRect() : null;
    setTimeout(() => confettiAt(r ? r.left + r.width / 2 : window.innerWidth / 2, r ? r.top + r.height / 2 : 200, 56), 180);
  }, [done]); // eslint-disable-line react-hooks/exhaustive-deps

  // the opponent's newest emote: a bubble by their avatar + one polite line for screen readers (new ones only)
  const oppEmote = lastEmote(state, opp.id);
  const myEmote = lastEmote(state, me.id);
  const seenOpp = useRef(oppEmote ? oppEmote.n : 0);
  const [heard, setHeard] = useState("");
  useEffect(() => {
    if (oppEmote && oppEmote.n > seenOpp.current) {
      seenOpp.current = oppEmote.n;
      setHeard(`${opp.username}: ${EMOTE_LABEL[oppEmote.id]}`);
    }
  }, [oppEmote && oppEmote.n]); // eslint-disable-line react-hooks/exhaustive-deps

  // the two bubbles both point in toward the middle: if mine would meet theirs (columns of similar height),
  // mine drops below theirs, keeping a small gap
  // (measured once the pop-in has finished: its scale would shrink the boxes)
  useEffect(() => {
    const root = rootRef.current;
    const place = () => {
      const mine = root && root.querySelector(".drs-bub.me"), theirs = root && root.querySelector(".drs-bub.op");
      if (!mine) return;
      mine.style.marginTop = "";
      if (!theirs) return;
      const a = mine.getBoundingClientRect(), b = theirs.getBoundingClientRect();
      const gapX = Math.max(b.left - a.right, a.left - b.right), gapY = Math.max(b.top - a.bottom, a.top - b.bottom);
      if (gapX < 10 && gapY < 8) mine.style.marginTop = Math.ceil(b.bottom + 8 - a.top) + "px";
    };
    const t = setTimeout(place, reduced() ? 0 : 500);
    window.addEventListener("resize", place);
    return () => { clearTimeout(t); window.removeEventListener("resize", place); };
  }, [myEmote && myEmote.n, oppEmote && oppEmote.n, done]); // eslint-disable-line react-hooks/exhaustive-deps

  // the 30-s send cooldown, counted down on the button
  const [now, setNow] = useState(() => Date.now());
  const wait = waitLeft(rematchUntil || 0, now);
  useEffect(() => {
    if (!rematchUntil || rematchUntil <= Date.now()) return;
    const t = setInterval(() => { const n = Date.now(); setNow(n); if (n >= rematchUntil) clearInterval(t); }, 250);
    return () => clearInterval(t);
  }, [rematchUntil]);

  const crownMe = o.kind === "win" ? "full" : o.kind === "draw" ? "half" : null;
  const crownOpp = o.kind === "draw" ? "half" : null;
  const cls = "drs drs-" + o.kind + (done ? " done" : "") + (o.perfect ? " perfect" : "");

  return (
    <div className={cls} ref={rootRef} onPointerDown={done ? undefined : skip}>
      <div className="drs-glow" aria-hidden="true" />
      <div className="drs-in">
        <div className="drs-topbar">
          {onReport && <button type="button" className="drs-more" aria-label="עוד אפשרויות" aria-haspopup="dialog" onClick={(e) => { e.stopPropagation(); setMenu(true); }}>
            <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="5" cy="12" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="19" cy="12" r="2" /></svg>
          </button>}
        </div>

        <header className="drs-head">
          <h1 className="drs-title">{h.title}</h1>
          <p className="drs-sub">{h.sub}</p>
          {xp.zero ? (
            <p className="drs-xp zero">{xp.text}</p>
          ) : (
            <p className="drs-xp"><img src="/home/hero/star.webp" alt="" width={30} height={30} decoding="async" /><b>{xp.text}</b></p>
          )}
        </header>

        <div className="drs-podium" aria-hidden="true">
          {o.kind === "win" && <i className="drs-rays" />}
          <Column who="me" player={me} label="את/ה" share={shares[0]} target={o.my} crown={crownMe} emote={myEmote} />
          <Column who="op" player={opp} label={opp.username} share={shares[1]} target={o.their} crown={crownOpp} emote={oppEmote} />
        </div>

        {onEmote && <EmoteChips sent={emotesOf(state, me.id)} onSend={onEmote} name={opp.username} />}

        <dl className="drs-facts">
          <div><dt>נכונות</dt><dd dir="ltr"><b>{f.ok}</b><small>/15</small></dd></div>
          <div><dt>רצף הכי ארוך</dt><dd><b>{f.best}</b></dd></div>
          <div><dt>ממוצע לשאלה</dt><dd>{f.avg != null ? <><b>{f.avg}</b><small>שנ׳</small></> : <b>—</b>}</dd></div>
        </dl>

        {o.comeback && (
          <p className="drs-moment"><img src="/home/hero/fire.webp" alt="" width={34} height={34} decoding="async" />
            <span><b>קאמבק!</b> היית מאחור בשאלה 10 — וניצחת</span></p>
        )}

        {o.perfect ? (
          <p className="drs-moment gold"><img src="/home/hero/star.webp" alt="" width={34} height={34} decoding="async" />
            <span><b>15 מתוך 15.</b> אף טעות — דו-קרב מושלם</span></p>
        ) : rv.items.length > 0 && (
          <section className="drs-learn" aria-labelledby="drs-learn-t">
            <h2 id="drs-learn-t">מה כדאי לחזור עליו</h2>
            {rv.nWrong + rv.nUnreached > rv.items.length && (
              <p className="drs-learn-n">הנה {rv.items.length} מתוך {rv.nWrong + rv.nUnreached}</p>
            )}
            <ol className="drs-list">{rv.items.map((it) => <ReviewItem key={it.idx} it={it} />)}</ol>
          </section>
        )}
      </div>

      <footer className="drs-foot">
        <div className="drs-foot-in">
          {rematchInvite ? (
            <p className="drs-foot-note" role="status">{rematchInvite.name} כבר הזמין/ה אותך לסיבוב נוסף</p>
          ) : wait > 0 ? (
            <p className="drs-foot-note" role="status">אפשר לשלוח אתגר אחד כל 30 שניות</p>
          ) : rematchError ? (
            <p className="dl-err" role="alert">{rematchError}</p>
          ) : null}
          <div className="drs-btns">
            <Link className="dl-btn ghost drs-back" href="/duel">חזרה</Link>
            {rematchInvite && onAcceptRematch ? (
              <button type="button" className="dl-btn accent drs-again" disabled={!!rematchBusy}
                onClick={(e) => { e.stopPropagation(); onAcceptRematch(); }}>
                {rematchBusy ? "רגע…" : "לקבל את ההזמנה"}
              </button>
            ) : onRematch && opp.id && (
              <button type="button" className={"dl-btn accent drs-again" + (wait > 0 ? " cd" : "")} disabled={!!rematchBusy || wait > 0}
                onClick={(e) => { e.stopPropagation(); onRematch(); }}>
                {rematchBusy ? "שולחים…" : wait > 0 ? <span className="drs-wait">אפשר שוב בעוד {wait} שנ׳</span> : rematchLabel(state)}
              </button>
            )}
          </div>
        </div>
      </footer>

      <p className="dar-sr" role="status" aria-live="polite" aria-atomic="true">{done ? announce(state) : ""}</p>
      <p className="dar-sr" aria-live="polite" aria-atomic="true">{heard}</p>
      {onReport && <ReportSheet open={menu} onClose={() => setMenu(false)} player={opp} onReport={onReport} />}
    </div>
  );
}
