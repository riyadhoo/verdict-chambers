# VERDICT — from prototype to reliable 12-player MVP

## What the audit found

The foundation is sound and will be kept. The hidden parts of the case (the truth, the official
outcome, the explanation, sealed exhibits, witness notes) are already stored in tables that jurors
cannot read at all — every game screen is assembled on the server, which only sends a juror what
their current phase allows. Private notes are readable only by their owner, and votes cannot be read
by any player. The case content is in place: 1 case, 8 exhibits, 4 witnesses, 11 timeline entries.

So this is a finishing job, not a rebuild. The real gaps are in the game experience and a few
robustness details.

Gaps to close:

- No way for a juror to privately mark an exhibit as pointing to guilty / not guilty.
- The Game Master's controls are all clickable at all times, including "Reveal" during the lobby,
  and nothing asks for confirmation before revealing or ending the game.
- No proper lobby screen: no big room code, no "waiting for the Game Master", no live seat count.
- "Ready to vote" appears in the lobby instead of during deliberation, and there is no "8 / 12 ready".
- The reveal is one flat panel; there is no staged moment and no dedicated results screen.
- The explanation has no "contradictions" section.
- The Game Master currently sees running guilty/not-guilty totals during voting.
- Room codes still use S and 5, which sound alike over a call.
- "Connected" status is never updated, so the jury list can't show who is actually present.
- The database is missing helper indexes on the columns every query filters by.

## What I will build

**Lobby.** A dedicated pre-game screen: VERDICT wordmark, the room code in large type, numbered jury
seats filling in live up to 12, and a footer that reads "Start case" for the Game Master and
"Waiting for the Game Master" for everyone else.

**Game Master bench.** A clear dashboard: current case, difficulty, exhibits released out of total,
phase, jurors connected, jurors ready, ballots sealed. Only the one action valid right now is
enabled; the rest are visibly disabled. Revealing the verdict and ending the game each ask for
confirmation first. During voting the bench shows only "9 / 12 ballots sealed" — totals stay hidden
until the reveal.

**Exhibits.** Each released exhibit gets three private buttons: points to guilty, points to not
guilty, neutral. The choice is saved instantly, can be changed until voting closes, and no other
player or the Game Master can read it.

**Deliberation.** A proper deliberation view with the charge to the jury, the live chat, the private
notebook, a "Ready to vote" toggle and a "8 / 12 ready" counter — never showing which way anyone leans.

**Reveal and results.** A short staged sequence — "The jury has decided", then the jury's verdict,
then what actually happened, then the official outcome — followed by a results screen with accuracy
(e.g. 9 / 12, 75%) and the vote split, then the full case explanation broken into: what actually
happened, key evidence, evidence analysis, contradictions, why the wrong theory failed.

**Reliability.** Presence tracking so the jury list shows who is actually online; a refresh by anyone
(including the Game Master) restores the exact phase, notes, assessments and locked vote; clear
messages for a full jury, a bad code, an ended game, and a late arrival.

**Room codes.** Drop S and 5 as well as O/0/I/1.

## Technical notes

- Add a `contradictions` field to the case explanation and write it for the Blackwood Hotel case;
  add indexes on `players.game_id`, `chat_messages(game_id, created_at)`, `votes.game_id`,
  `evidence.case_id`, `witnesses.case_id`, `timeline_events.case_id`,
  `evidence_assessments(game_id, player_id)`, `notes.game_id`, `game_evidence.game_id`, and a
  case-insensitive unique index on `games.room_code`. One migration, no destructive changes.
- Extend the existing server view (`src/lib/game.functions.ts`) to return: my own assessments, ready
  count, released/total exhibit counts, connected count, and a voting-phase tally reduced to
  `submitted` only. Add a `setAssessment` server function and a heartbeat that updates `connected`.
- Gate `adminAction` transitions on the current phase server-side (already partly done) and reject
  `REVEAL` unless the game is in VOTING.
- Split `game.$gameId.tsx` into phase views (Lobby, Briefing, Evidence, Deliberation, Voting, Reveal,
  Results) under `src/components/game/`, keeping the current dark-courtroom styling untouched.
- Keep chat, notes and assessments on the direct RLS-protected client path; everything sensitive
  stays behind the server functions.

## Verification before I call it done

A scripted 12-juror playthrough in the preview: host creates a room, twelve jurors join, all see the
lobby, case starts, exhibits released one by one and appearing live, chat, private notes and
assessments, deliberation with ready counts, twelve sealed votes, no vote changed, reveal, results
and explanation. Plus direct-query attempts as an ordinary juror against the hidden truth,
unreleased exhibits, another juror's notes, assessments and votes — each must come back empty.
