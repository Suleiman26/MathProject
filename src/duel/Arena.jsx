'use client';
/* Duels: the live arena (mockup screen 4). Dark HUD on top (./Hud.jsx), then
   the meta row (question n of 15 · streak · "ויתור"), the QUESTION CARD (white,
   fills the space, its content centred: words → formula rows → the asked
   quantity, or the answer slot for a typed answer, then a status line), and
   the answers under the thumb: four buttons or the keypad.
   Feedback (question UI spec 2026-11-10 §4.4–4.5): a tap marks the button /
   slot "sent" at once (before the server answers); right = green + "נכון! +N";
   wrong = red + shake, the right one shown, "התשובה: …" in the card, and the 2-s
   lock (from lock_until, server time): no overlay — the other answers / keys fade,
   and a calm "ממשיכים · 2" pill drains where the send button is (typed: the send
   button itself) — the card and the right answer stay in full view. Banners: last question ×2, overtake (+ one screen shake),
   being overtaken. When I finish first: a calm "מחכים ל…" panel in the card while
   the opponent's lane keeps moving. Time up while the server still says live:
   "מסיימים…" — the result is never decided on the phone. Everything here is
   drawn from props; Play.jsx owns the state (only what is typed / tapped before
   the server answers lives here). */
import { useLayoutEffect, useRef, useState } from "react";
import { Avatar } from "@/account/ui";
import { serverNow } from "./clock";
import { lockLeft, streakLabel, keypadFor, QUESTIONS, toName, andName } from "./arena-core";
import { Hud } from "./Hud";
import { MathText, MathSpan } from "./MathText";
import { Keypad, Typed, LockBar } from "./Keypad";
import { mathLength, promptSize, fitPrompt, withUnit, promptLines, tidyLines, lineRole, targetParts } from "./math-core";
import { Sheet } from "./Sheet";

const unitOf = (q) => (q && q.payload && q.payload.display && q.payload.display.unit) || "";
/* a unit as math markup for the slot ("√3" → \sqrt{3}) */
const unitMath = (u) => (u === "√3" ? "\\sqrt{3}" : u || "");
/* the server's typed answer ("-3", "3/8") as math: real minus, a stacked fraction */
function answerMath(right) {
  const s = String(right).replace(/^-/, "−");
  const m = /^(−?)(\d+)\/(\d+)$/.exec(s);
  return m ? `${m[1]}\\frac{${m[2]}}{${m[3]}}` : s;
}

/* "רצף 3 · ×1.2": the multiplier is an LTR run ("×1.2", not "1.2×" in an RTL line) */
const ltrTimes = (t) => String(t).split(/(×[\d.]+)/).map((p, i) => (i % 2 ? <span key={i} dir="ltr">{p}</span> : p));

/* Shrink-to-fit before paint, formula rows only (question UI §4.2): the words keep their step; a
   formula row (nowrap) wider than the card shrinks — all formula rows together, so two equations stay
   alike — never under 1.35rem; only if even that can't hold it, the row wraps, and then only before an
   operator (MathText mathBreaks). An island inside the words that can't fit lets that line wrap too.
   Re-fits when the card's width changes and once the font has loaded. */
const FLOOR_PX = 21.6;
function useFitPrompt(boxRef, key) {
  useLayoutEffect(() => {
    const box = boxRef.current;
    const h = box && box.querySelector(".dar-prompt");
    if (!h) return;
    let lastW = -1, raf = 0, alive = true;
    const widest = (row) => Math.max(0, ...[...row.querySelectorAll(":scope > .dmx")].map((e) => e.getBoundingClientRect().width));
    const fit = (force) => {
      if (!alive) return;
      const avail = h.clientWidth;
      if (!force && avail === lastW) return;
      lastW = avail;
      const rows = [...h.querySelectorAll(".dmx-line.eq, .dmx-line.target")];
      const asks = [...h.querySelectorAll(".dmx-line.ask")];
      for (const r of [...rows, ...asks]) { r.style.fontSize = ""; delete r.dataset.fit; }
      if (!avail) return;
      for (const kind of ["eq", "target"]) {
        const set = rows.filter((r) => r.classList.contains(kind));
        if (!set.length) continue;
        const fits = set.map((r) => {
          const w = widest(r), fontPx = parseFloat(getComputedStyle(r).fontSize);
          return { r, w, fontPx, ...fitPrompt({ widest: w, avail, fontPx, floorPx: FLOOR_PX }) };
        });
        const size = Math.min(...fits.map((f) => f.fontPx));
        for (const f of fits) {
          if (size < parseFloat(getComputedStyle(f.r).fontSize)) f.r.style.fontSize = size + "px";
          if (f.wrap || f.w * size / f.fontPx > avail) f.r.dataset.fit = "wrap";
        }
      }
      for (const a of asks) if (widest(a) > avail) a.dataset.fit = "wrap";
    };
    fit(true);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => fit(true));
    let ro = null;
    if (typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(() => { cancelAnimationFrame(raf); raf = requestAnimationFrame(() => fit(false)); });
      ro.observe(box);
    }
    return () => { alive = false; if (ro) ro.disconnect(); cancelAnimationFrame(raf); };
  }, [boxRef, key]);
}

/* the four answers. sent = the one I just tapped, from the tap until the server answers */
function Choices({ q, fb, busy, sending, locked, onAnswer }) {
  const unit = unitOf(q);
  const choices = ((q.payload && q.payload.choices) || []).map((c) => withUnit(c, unit));
  const long = choices.some((c) => mathLength(c) > 6);
  const tall = choices.some((c) => /\\frac|\\sqrt/.test(c));
  const [pick, setPick] = useState(null);                // { idx, i }
  const mine = fb && fb.idx === q.idx;
  const sentI = sending && pick && pick.idx === q.idx ? pick.i : null;
  return (
    <div className={"dar-ans" + (long ? " long" : "") + (tall ? " tall" : "") + (sentI != null ? " sending" : "") + (mine ? " done" : "") + (locked ? " locked" : "")}>
      {choices.map((c, i) => {
        const picked = mine && String(fb.given) === String(i);
        const isRight = mine && fb.right != null && String(fb.right) === String(i);
        const cls = "dar-a" + (picked ? (fb.correct ? " good" : " bad") : "") + (!picked && isRight && !fb.correct ? " show" : "") + (sentI === i ? " sent" : "");
        return (
          <button key={i} type="button" className={cls} disabled={busy || !!fb}
            onClick={(e) => { setPick({ idx: q.idx, i }); onAnswer(String(i), e.currentTarget); }}>
            <MathSpan src={c} />
          </button>
        );
      })}
    </div>
  );
}

/* the typed answer, in the card: [b =] [ 12| π ] — replaces the prompt's target line */
function Slot({ target, value, state, unit }) {
  const t = target ? targetParts(target) : null;
  const tail = (t && t.after) || unitMath(unit);
  const caret = state === "idle" || state === "typing";
  return (
    <div className="dar-slot-row" dir="ltr">
      {t && t.before && <MathSpan src={t.before} className="dar-slot-l" />}
      <span className={"dar-slot " + state} aria-live="polite" aria-label={value ? "התשובה שהוקלדה: " + value : "עוד לא הוקלדה תשובה"}>
        <span className="dar-slot-v"><Typed value={value} caret={caret} /></span>
        {tail && <MathSpan src={tail} className="dar-slot-u" />}
      </span>
    </div>
  );
}

export function Arena({ state, offset, question, fb, busy, onAnswer, banner, ping, phase, onGiveUp, lockUntil, rootRef, onHot }) {
  const me = state.me, opp = state.opp;
  const live = state.status === "live";
  const q = question;
  const idx = q ? q.idx : me.idx;
  const lastQ = idx === QUESTIONS - 1 && !me.done;
  const [confirm, setConfirm] = useState(false);
  const [giving, setGiving] = useState(false);
  const locked = lockUntil && lockLeft(lockUntil, serverNow(offset)) > 0;
  const waiting = phase === "waiting", finishing = phase === "finishing";
  const streak = streakLabel(me.streak || 0);
  const sending = busy && !fb;
  const mine = !!(fb && q && fb.idx === q.idx);

  // what is typed belongs to one question: a new question starts empty (no flash of the old value)
  const [typedS, setTypedS] = useState({ idx: -1, v: "" });
  const typed = q && typedS.idx === q.idx ? typedS.v : "";

  const [giveErr, setGiveErr] = useState("");
  const qbRef = useRef(null);
  useFitPrompt(qbRef, q ? q.idx + ":" + q.payload.prompt : "none");
  async function giveUp() {
    setGiving(true); setGiveErr("");
    let msg = null;
    try { msg = await onGiveUp(); } catch { msg = "משהו השתבש. נסו שוב."; }
    setGiving(false);
    if (msg) { setGiveErr(msg); return; }          // stay in the sheet and say so
    setConfirm(false);
  }

  const typedQ = !!(q && q.kind === "number");
  const unit = unitOf(q);
  let target = null;
  if (typedQ) {
    const lines = tidyLines(promptLines(q.payload.prompt));
    const last = lines.length - 1;
    if (last > 0 && lineRole(lines[last], last, lines) === "target") target = lines[last];
  }
  const slotState = mine ? (fb.correct ? "good" : "bad") : sending ? "sent" : typed ? "typing" : "idle";

  // the line under the slot / the target: only once the server has answered
  let status = null;
  if (mine && q) {
    if (fb.correct) status = <p className="dar-status good" role="status"><span>נכון!</span>{fb.points != null && <span className="dar-status-pts" dir="ltr">+{fb.points}</span>}</p>;
    else if (fb.right != null) {
      const right = typedQ ? withUnit(answerMath(fb.right), unit)
        : withUnit(((q.payload && q.payload.choices) || [])[Number(fb.right)] ?? "", unit);
      status = <p className="dar-status bad" role="status">התשובה: <MathSpan src={right} /></p>;
    } else status = <p className="dar-status bad" role="status">לא נכון</p>;
  }

  const giveUpBtn = <button type="button" className="dar-giveup" onClick={() => { setGiveErr(""); setConfirm(true); }}>ויתור</button>;

  return (
    <div className={"dar" + (lastQ ? " lastq" : "")} ref={rootRef}>
      <Hud me={me} opp={opp} myLanes={state.my_lanes} endsAt={state.ends_at} offset={offset} live={live && !finishing} ping={ping} onHot={onHot} />

      <main className="dar-q">
        <div className="dar-meta">
          {!(waiting || finishing) && <span className="dar-count">שאלה {Math.min(QUESTIONS, idx + 1)} מתוך {QUESTIONS}</span>}
          {!(waiting || finishing) && (
            <span className={"dar-streak" + (streak ? " on" : "")} aria-live="polite">
              {streak && <><img src="/home/hero/fire.webp" alt="" width={20} height={20} decoding="async" />{ltrTimes(streak)}</>}
            </span>
          )}
          {giveUpBtn}
        </div>
        {waiting || finishing ? (
          <div className="dar-card wait">
            <div className="dar-wait" role="status" aria-live="polite">
              <Avatar account={opp} size={72} />
              {finishing ? (
                <><b>מסיימים…</b><p>הזמן נגמר. עוד רגע התוצאה.</p></>
              ) : (
                <><b>סיימת! מחכים {toName(opp.username)}…</b>
                  <p><span className="dar-wait-n">{Math.min(QUESTIONS, opp.idx || 0)}</span> מתוך {QUESTIONS} · הניקוד שלך: <span className="dar-wait-n">{me.score}</span></p>
                  <small>אי אפשר לשנות תשובות. כשהדו-קרב ייגמר, התוצאה תופיע פה.</small></>
              )}
            </div>
          </div>
        ) : (
          <>
            <div className="dar-card">
              {q ? (
                <div className="dar-qb" ref={qbRef} key={q.idx}>
                  {lastQ && <span className="dar-x2">שאלה אחרונה · <span dir="ltr">×2</span></span>}
                  <MathText as="h2" className={"dar-prompt sz-" + promptSize(q.payload.prompt)} text={q.payload.prompt} omitTarget={typedQ} />
                  {typedQ && <Slot target={target} value={typed} state={slotState} unit={unit} />}
                  <div className="dar-status-box">{status}</div>
                </div>
              ) : (
                <div className="dar-skel" aria-busy="true" aria-label="טוענים את השאלה"><i /><i /></div>
              )}
            </div>
            <div className="dar-bottom">
              {typedQ ? (
                <Keypad value={typed} onChange={(v) => setTypedS({ idx: q.idx, v })} onSend={(given) => onAnswer(given, null)}
                  disabled={busy || !!fb || !!locked} dim={busy || !!fb || !!locked} sending={sending} keys={keypadFor(q)}
                  lock={locked ? { until: lockUntil, offset } : null} />
              ) : q ? (
                <>
                  <Choices key={q.idx} q={q} fb={fb} busy={busy || !!locked} sending={sending} locked={!!locked} onAnswer={onAnswer} />
                  {/* the 2-s lock's countdown: a calm pill in its own reserved row (never over the answers, no jump) */}
                  <div className="dar-lockrow">{locked && <LockBar until={lockUntil} offset={offset} slim />}</div>
                </>
              ) : (
                <div className="dar-ans ghost"><i /><i /><i /><i /></div>
              )}
            </div>
          </>
        )}
      </main>

      <div className={"dar-banner" + (banner ? " on " + banner.kind : "")} aria-live="assertive" role={banner ? "status" : undefined}>
        {banner ? banner.text : ""}
      </div>

      {confirm && (
        <Sheet open={confirm} onClose={() => setConfirm(false)} label="לוותר על הדו-קרב?" className="dar-confirm">
          <h3 className="dl-sh-t">לוותר על הדו-קרב?</h3>
          <p className="dl-sh-m">זה ייחשב כהפסד, {andName(opp.username)} ינצח/תנצח. אפשר גם להישאר ולהמשיך — כל תשובה נכונה שווה נקודות.</p>
          {giveErr && <p className="dl-err" role="alert">{giveErr}</p>}
          <div className="dl-row">
            <button type="button" className="dl-btn ghost" onClick={() => setConfirm(false)} data-autofocus>להמשיך לשחק</button>
            <button type="button" className="dl-btn warn" disabled={giving} onClick={giveUp}>{giving ? "…" : "כן, לוותר"}</button>
          </div>
        </Sheet>
      )}
    </div>
  );
}
