'use client';
/* Duels: calls to the database functions + Hebrew errors.
   The logic lives in ./api-core.js (tested with node --test); this file only
   plugs in the session token (src/lib/account.js), mpData.rpc and the config.

   API (every call resolves, never throws: the JSON from the database, or
   { error: '<code>' } → show duelError(result)):
     duelApi.friends()                     friends_me → {status, code, inbox, friends[], incoming[], outgoing[], blocked[]}
     duelApi.addFriend(code)               friend_add → {ok, state:'sent'|'accepted'|'already'}
     duelApi.answerFriend(id, accept)      friend_answer
     duelApi.removeFriend(id)              friend_remove
     duelApi.block(id) / unblock(id)       friend_block / friend_unblock
     duelApi.report(id, reason, duelId?)   friend_report (reason: name | spam | other)
     duelApi.ping()                        presence_ping → {now, invites[], live} (+ _sent/_recv)
     duelApi.invite(friendId, subject)     duel_invite → {id, expires_at} | {error:'cooldown', wait_s}
     duelApi.cancel(id)                    duel_cancel
     duelApi.answerInvite(id, accept)      duel_answer_invite → {status:'accepted'|'declined'}
     duelApi.start(id)                     POST {functionsUrl}/duel-start {tok, id} → {ok:true} | {error}
     duelApi.state(id)                     duel_state → {now, status, start_at, ends_at, me, opp, questions, …} (+ _sent/_recv)
     duelApi.answer(id, idx, given)        duel_answer → {correct, right, points, score, streak, lock_until}
     duelApi.giveUp(id)                    duel_give_up
     duelApi.emote(id, emote)              duel_emote (gg | wow | again)
     duelApi.history()                     duel_history → {stats, recent[]}
     duelApi.online()                      duel_online → {online, friends, faces[]} (home tile)
   _sent/_recv are local times (clock.js localNow) around the request:
     clockOffset(r.now, r._sent, r._recv).
   A second identical invite/answer/answerInvite/start/giveUp while the first is
   still on its way returns the first one's promise (double taps). */
import { mpData } from "../lib/mp-data";
import { sessionToken, sessionLost } from "../lib/account";
import { getConfig } from "../lib/config";
import { makeDuelApi, duelError, DUEL_ERRORS, GENERIC_ERROR } from "./api-core";

export const duelApi = makeDuelApi({
  token: () => sessionToken(),
  rpc: (fn, args) => mpData.rpc(fn, args),
  fetch: (url, init) => fetch(url, init),
  config: () => getConfig(),
  // the server says the session is dead → forget it here too, so the header and the duel screens agree
  onAuthLost: () => sessionLost(),
});

export { duelError, DUEL_ERRORS, GENERIC_ERROR };
