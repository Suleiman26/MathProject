'use client';
/* Duels: the preset emotes after the end (spec §6 — a fixed list, no free text).
   <EmoteChips>  three chips (משחק טוב / וואו! / עוד אחד?), each can be sent once;
                 a tap marks the chip at once and reverts if the server said no.
   <EmoteBubble> a small speech bubble by a player's avatar on the podium; a new
                 emote from the same side re-pops it (keyed by the count).
   The other side learns about an emote from the realtime hint `emote` →
   duel_state.emotes (Play.jsx re-fetches); nothing here trusts the socket.
   Styles: src/styles/duel-arena.css (.drs-emo*, .drs-bub*). */
import { useState } from "react";
import { EMOTES } from "./result-core";
import { toName } from "./arena-core";

export function EmoteChips({ sent, onSend, name }) {
  const [pending, setPending] = useState([]);     // tapped, server not answered yet
  const [err, setErr] = useState("");
  async function send(id) {
    if (sent.includes(id) || pending.includes(id) || !onSend) return;
    setErr("");
    setPending((p) => [...p, id]);
    let r;
    try { r = await onSend(id); } catch { r = { error: "network" }; }
    setPending((p) => p.filter((x) => x !== id));
    if (r && r.error) setErr(r.message || "לא נשלח. נסו שוב");
  }
  return (
    <div className="drs-emo">
      <div className="drs-emo-row" role="group" aria-label={`תגובה מהירה ${toName(name || "")}`}>
        {EMOTES.map((e) => {
          const on = sent.includes(e.id) || pending.includes(e.id);
          return (
            <button key={e.id} type="button" className={"drs-emo-b" + (on ? " on" : "")} aria-pressed={on} disabled={on}
              onClick={(ev) => { ev.stopPropagation(); send(e.id); }}>
              {on && (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
              )}
              <span>{e.label}</span>
            </button>
          );
        })}
      </div>
      {err && <p className="drs-emo-err" role="alert">{err}</p>}
    </div>
  );
}

export function EmoteBubble({ emote, side }) {
  if (!emote) return null;
  return (
    <span key={emote.n} className={"drs-bub " + side} aria-hidden="true">
      <span>{emote.label}</span>
    </span>
  );
}
