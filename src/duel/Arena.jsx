'use client';
/* Duels: the live arena (mockup screen 4). Dark HUD on top (./Hud.jsx), the
   question big in the middle, four answer buttons (or the keypad) under the
   thumb. Feedback: green / red + a small shake on the button, "+142" floats
   up, a wrong answer brings the 2-s lock overlay (from lock_until, server
   time). Banners: last question ×2 (with a heartbeat on the card), overtake
   (+ one screen shake), being overtaken (banner only). When I finish first:
   a calm "מחכים ל…" panel while the opponent's lane keeps moving. Time up
   while the server still says live: "מסיימים…" — the result is never decided
   on the phone. Everything here is drawn from props; Play.jsx owns the state. */
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Avatar } from "@/account/ui";
import { serverNow } from "./clock";
import { lockLeft, streakLabel, keypadFor, QUESTIONS, toName, andName } from "./arena-core";
import { Hud } from "./Hud";
import { MathText, MathSpan } from "./MathText";
import { Keypad } from "./Keypad";
import { mathLength, promptSize, fitPrompt, withUnit } from "./math-core";
import { Sheet } from "./Sheet";

const unitOf = (q) => (q && q.payload && q.payload.display && q.payload.display.unit) || "";

function LockOverlay({ until, offset, right, kind, unit }) {
  const [left, setLeft] = useState(() => lockLeft(until, serverNow(offset)));
  useEffect(() => {
    const tick = () => setLeft(lockLeft(until, serverNow(offset)));
    tick();
    const t = setInterval(tick, 100);
    return () => clearInterval(t);
  }, [until, offset]);
  const n = Math.max(1, Math.ceil(left / 1000));
  return (
    <div className="dar-lock" role="alert">
      <div>
        <b key={n}>{n}</b>
        <span>טעות — נעילה קצרה</span>
        {right != null && kind === "number" && <small>התשובה: <MathSpan src={withUnit(String(right).replace(/^-/, "−"), unit)} /></small>}
      </div>
    </div>
  );
}

/* Shrink-to-fit before paint: a math island (nowrap) wider than the card makes the whole prompt smaller
   (floor ≈ 1.2rem); only if even that can't hold it, the island wraps — and then only before an operator
   (MathText mathBreaks). Re-fits when the card's width changes and once the font has loaded. */
function useFitPrompt(boxRef, key) {
  useLayoutEffect(() => {
    const box = boxRef.current;
    const h = box && box.querySelector(".dar-prompt");
    if (!h) return;
    let lastW = -1, raf = 0, alive = true;
    const fit = (force) => {
      if (!alive) return;
      const avail = box.clientWidth;
      if (!force && avail === lastW) return;
      lastW = avail;
      h.style.fontSize = ""; h.style.maxWidth = ""; delete h.dataset.fit;
      const isl = [...h.querySelectorAll(".dmx")];
      if (!isl.length || !avail) return;
      const widest = Math.max(...isl.map((e) => e.getBoundingClientRect().width));
      if (widest > h.clientWidth) h.style.maxWidth = "none";
      const fontPx = parseFloat(getComputedStyle(h).fontSize);
      const r = fitPrompt({ widest, avail, fontPx });
      if (r.fontPx !== fontPx) h.style.fontSize = r.fontPx + "px";
      if (r.wrap) h.dataset.fit = "wrap";
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

function Choices({ q, fb, busy, onAnswer }) {
  const unit = unitOf(q);
  const choices = ((q.payload && q.payload.choices) || []).map((c) => withUnit(c, unit));
  const long = choices.some((c) => mathLength(c) > 6);
  const tall = choices.some((c) => /\\frac|\\sqrt/.test(c));
  return (
    <div className={"dar-ans" + (long ? " long" : "") + (tall ? " tall" : "")}>
      {choices.map((c, i) => {
        const picked = fb && fb.idx === q.idx && String(fb.given) === String(i);
        const isRight = fb && fb.idx === q.idx && fb.right != null && String(fb.right) === String(i);
        const cls = "dar-a" + (picked ? (fb.correct ? " good" : " bad") : "") + (!picked && isRight && !fb.correct ? " show" : "");
        return (
          <button key={i} type="button" className={cls} disabled={busy || !!fb} onClick={(e) => onAnswer(String(i), e.currentTarget)}>
            <MathSpan src={c} />
          </button>
        );
      })}
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

  return (
    <div className={"dar" + (lastQ ? " lastq" : "")} ref={rootRef}>
      <Hud me={me} opp={opp} myLanes={state.my_lanes} endsAt={state.ends_at} offset={offset} live={live && !finishing} ping={ping} onHot={onHot} />

      <main className="dar-q">
        {waiting || finishing ? (
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
        ) : (
          <>
            <div className="dar-meta">
              <span>שאלה {Math.min(QUESTIONS, idx + 1)} מתוך {QUESTIONS}</span>
              <span className={"dar-streak" + (streak ? " on" : "")} aria-live="polite">
                {streak && <><img src="/home/hero/fire.webp" alt="" width={20} height={20} decoding="async" />{streak}</>}
              </span>
            </div>
            <div className="dar-card" key={q ? q.idx : "none"}>
              {q ? (
                <div className="dar-qb" ref={qbRef}>
                  <MathText as="h2" className={"dar-prompt sz-" + promptSize(q.payload.prompt)} text={q.payload.prompt} />
                  {(lastQ || q.kind === "number") && <p className="dar-sub">{lastQ ? "שאלה אחרונה — שווה כפול!" : "הקלידו את התשובה"}</p>}
                </div>
              ) : (
                <div className="dar-skel" aria-busy="true" aria-label="טוענים את השאלה"><i /><i /></div>
              )}
            </div>
            <div className="dar-bottom">
              {q && q.kind === "number" ? (
                <Keypad onSend={(given) => onAnswer(given, null)} disabled={busy || !!fb || !!locked} dim={!!locked} sending={busy && !fb}
                  keys={keypadFor(q)} unit={unitOf(q)} resetKey={q.idx} />
              ) : q ? (
                <Choices q={q} fb={fb} busy={busy || !!locked} onAnswer={onAnswer} />
              ) : (
                <div className="dar-ans ghost"><i /><i /><i /><i /></div>
              )}
              {fb && fb.idx === idx && q && q.kind === "number" && (
                <p className={"dar-typed " + (fb.correct ? "good" : "bad")} role="status">{fb.correct ? "נכון!" : "לא נכון"}</p>
              )}
            </div>
            {locked && <LockOverlay until={lockUntil} offset={offset} right={fb && !fb.correct ? fb.right : null} kind={q && q.kind} unit={unitOf(q)} />}
          </>
        )}
      </main>

      <footer className="dar-foot">
        <button type="button" className="dar-giveup" onClick={() => { setGiveErr(""); setConfirm(true); }}>ויתור</button>
      </footer>

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
