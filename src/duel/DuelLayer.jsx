'use client';
/* Duels: the one layer every signed-in page carries (mounted lazily by
   DuelLayerMount from app/layout.tsx, never on /admin, /classic or /dev):
   - the presence heartbeat (usePresence: online + pending invites every 20 s);
   - on /duel pages also the inbox realtime channel, so an invite shows at once
     (spec §7.3: the socket is open only on duel pages);
   - the invite drop-in (InviteDrop) for the first live invite — a card, never a
     modal — "לא עכשיו" declines, "קבל/י" accepts and goes to /duel/<id>;
   - a slim "חזרה לדו-קרב" pill when I have a live duel and I'm not on a duel page.
   Styles: src/styles/duel-arena.css (.dinv*, .dar-pill; hidden while the topic keypad is open) + duel.css (.dl-btn). */
import "../styles/duel.css";
import "../styles/duel-arena.css";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAccount } from "@/lib/account";
import { duelApi } from "./api";
import { usePresence } from "./presence";
import { subscribe } from "./live";
import { InviteDrop } from "./InviteDrop";
import { inviteLeft } from "./arena-core";
import { serverNow } from "./clock";

export default function DuelLayer() {
  const path = usePathname() || "/";
  const router = useRouter();
  const { account } = useAccount();
  const presence = usePresence();
  const [hidden, setHidden] = useState([]);       // invite ids I answered or dismissed
  const [busy, setBusy] = useState("");
  const [shown, setShown] = useState(null);       // the card on screen (keeps a vanished invite for a moment, as "gone")
  const goneT = useRef(null);

  // instant invites while on duel pages
  const onDuel = path.startsWith("/duel");
  const inbox = account && account.inbox;
  useEffect(() => {
    if (!inbox || !onDuel) return;
    return subscribe(inbox, (ev) => { if (ev === "invite" || ev === "invite_cancelled" || ev === "sync") presence.refresh(); });
  }, [inbox, onDuel]); // eslint-disable-line react-hooks/exhaustive-deps

  const now = serverNow(presence.offset);
  const invite = (presence.invites || []).find((i) => !hidden.includes(i.id) && inviteLeft(i.expires_at, now) > 0 && path !== `/duel/${i.id}`);

  useEffect(() => {
    clearTimeout(goneT.current);
    if (invite) { setShown(invite); return; }
    setShown((s) => {
      if (!s || s.gone) return s && s.gone ? s : null;
      if (hidden.includes(s.id)) return null;
      // it vanished under us (cancelled / expired / answered elsewhere): say so briefly
      goneT.current = setTimeout(() => setShown(null), 1600);
      return { ...s, gone: "gone" };
    });
  }, [invite && invite.id, hidden]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => clearTimeout(goneT.current), []);

  async function answer(yes) {
    if (!shown || busy) return;
    const id = shown.id;
    setBusy(yes ? "yes" : "no");
    const r = await duelApi.answerInvite(id, yes);
    setBusy("");
    if (r && r.error) {
      setShown((s) => (s && s.id === id ? { ...s, gone: "gone" } : s));
      goneT.current = setTimeout(() => { setHidden((h) => [...h, id]); setShown(null); }, 1600);
      presence.refresh();
      return;
    }
    setHidden((h) => [...h, id]);
    setShown(null);
    presence.refresh();
    if (yes) router.push(`/duel/${id}`);
  }

  // screen readers: one always-mounted, empty live region gets the line when a NEW invite drops in
  // (a card that mounts with its text already inside is often not read)
  const [said, setSaid] = useState("");
  const shownId = shown && !shown.gone ? shown.id : null;
  useEffect(() => {
    if (!shownId || !shown) { setSaid(""); return; }
    setSaid(`${shown.from && shown.from.username ? shown.from.username : ""} מאתגר/ת אותך לדו-קרב`);
  }, [shownId]); // eslint-disable-line react-hooks/exhaustive-deps

  // the pill: only away from the duel pages (a duel page shows its own state — e.g. the rematch's waiting card
  // right after a result, while the last ping still remembers the finished duel as live)
  const pill = presence.liveId && !path.startsWith("/duel") ? presence.liveId : null;
  // the remembered live duel may have ended since the last ping (20 s): ask again when the page changes
  const liveKnown = !!presence.liveId;
  useEffect(() => { if (liveKnown) presence.refresh(); }, [path]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      <div className="dar-sr" role="status" aria-live="polite" aria-atomic="true">{said}</div>
      {shown && (
        <InviteDrop key={shown.id} invite={shown} offset={presence.offset} busy={busy} gone={shown.gone}
          onAccept={() => answer(true)} onDecline={() => answer(false)} />
      )}
      {pill && (
        <Link className="dar-pill" href={`/duel/${pill}`} aria-label="חזרה לדו-קרב">
          <span className="dar-pill-dot" aria-hidden="true" />
          <span aria-hidden="true">חזרה לדו-קרב</span>
        </Link>
      )}
    </>
  );
}
