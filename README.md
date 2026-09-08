# Courtroom Chronicles

Build a Multiplayer Jury Courtroom Game — MVP

Create a modern, mobile-first web application for a multiplayer deduction/courtroom game.

1. Game concept

The game is called VERDICT.

One person is the Admin / Game Master and up to 12 people are Jurors.

The Admin controls a case and knows the hidden truth. The jurors receive the case information and evidence, discuss it together, and eventually vote:

GUILTY

NOT GUILTY

The truth and the official outcome remain hidden until the Admin reveals the verdict.

The core experience should feel like a mixture of:

courtroom trial

detective investigation

social deduction

jury deliberation

The game must work particularly well on phones.

2. Technology

Use:

React

TypeScript

Tailwind CSS

Supabase

Use Supabase for:

Authentication

Database

Realtime multiplayer synchronization

Design the architecture so that game state is synchronized in real time between all players.

Do not hard-code the game into the frontend.

3. Landing page

Create a polished landing page.

Brand:

VERDICT

Tagline:

12 jurors. One case. One verdict.

Primary buttons:

CREATE GAME

JOIN GAME

Secondary section explaining:

Examine the evidence. Debate with the jury. Reach your verdict. Then discover whether you were right.

Visual style:

dark courtroom atmosphere

black / charcoal background

subtle gold accents

white typography

elegant but modern

avoid looking like a generic SaaS dashboard

Add a subtle scales-of-justice/courtroom-inspired visual language without making it look old-fashioned.

4. Create Game

Admin clicks CREATE GAME.

Show:

Create a Game

Case:

Select an existing case

Eventually allow creating custom cases

Players:

Maximum 12 jurors

Generate a unique 6-character room code.

Example:

X7K29P

Display:

Share this code with the other jurors.

Admin sees:

Jury

0 / 12 players

As players join, display their chosen names.

Each player gets a randomly assigned juror number:

Juror 01
Juror 02
...

Do not expose real identities unnecessarily.

5. Join Game

Players click JOIN GAME.

Fields:

Room code

Display name

Then enter the lobby.

Prevent duplicate names inside the same room.

Show:

Waiting for the Game Master...

Once the Admin starts the game, everyone transitions simultaneously to the case briefing.

6. Lobby

Create a visually attractive courtroom lobby.

Display:

CASE READY

Case title

Short description

Jury members:

01 — Alex
02 — Sarah
03 — Mike
...

Admin sees:

START CASE

Jurors see:

Waiting for Game Master

7. Case briefing

When the Admin starts the game, every juror sees the same briefing.

Example:

CASE FILE 017

The Death at Blackwood Hotel

Date:
October 14

Time:
Approximately 23:40

Location:
Blackwood Hotel, Room 417

Victim:
Daniel Carter

Defendant:
Michael Reed

Then show:

What happened?

A readable narrative describing the circumstances of the case.

Do NOT reveal the hidden truth.

At the bottom:

Continue to Evidence

8. Evidence Room

This is the main gameplay screen.

Display evidence as individual cards.

Example:

EVIDENCE 01

Security Camera

23:17 — Defendant enters the hotel.

[View Evidence]

EVIDENCE 02

Fingerprint

A fingerprint matching the defendant was discovered on a glass inside Room 417.

EVIDENCE 03

Phone Records

The defendant's phone connected to a nearby cell tower at 23:31.

Evidence should be unlockable by the Admin.

Initially, some evidence can be locked.

Locked evidence:

🔒 Evidence will be revealed by the Game Master.

When the Admin releases evidence, all players receive it simultaneously.

9. Evidence details

Clicking an evidence card opens a detailed view.

Each piece of evidence can contain:

Title

Description

Images

Documents

timestamps

witness statements

forensic information

metadata

Players can classify evidence:

My assessment

🟢 Supports GUILTY

🔴 Supports NOT GUILTY

⚪ NEUTRAL

This classification is private to the player.

Allow players to change their assessment at any time before voting.

10. Jury discussion

Create a real-time jury chat.

Layout:

Evidence / Case information on the main area.

Chat panel on the side on desktop.

Bottom panel on mobile.

Messages should appear instantly for all players.

Show:

Juror 03:

I don't think the phone location proves he was inside the hotel.

Juror 08:

But combined with the CCTV, it becomes much stronger.

Allow:

normal messages

emoji reactions

timestamps

Do not allow the Admin to secretly manipulate player messages.

Admin can moderate/remove inappropriate messages.

11. Personal notes

Every juror should have a private notes section.

Example:

MY NOTES

Timeline doesn't match

Witness 2 seems unreliable

Need explanation for fingerprint

Check 23:31 phone record

Notes are private and are not visible to other jurors.

Autosave them.

12. Timeline

Include a timeline tab.

Players can see known events chronologically.

Example:

23:02 — Victim enters hotel
23:17 — Defendant enters hotel
23:24 — Witness sees defendant
23:31 — Phone connects to tower
23:40 — Estimated time of death
23:52 — Body discovered

Evidence can add new timeline events.

13. Deliberation phase

The Admin starts:

BEGIN DELIBERATION

The interface changes.

Display:

JURY DELIBERATION

Discuss the evidence and decide whether the prosecution has proven the case beyond a reasonable doubt.

Show all 12 jurors.

Each player can indicate:

READY TO VOTE

Do not reveal what their intended vote is.

When everyone is ready, the Admin can open voting.

14. Voting

Each juror privately selects:

YOUR VERDICT

GUILTY

or

NOT GUILTY

Require confirmation:

Are you sure? Your vote cannot be changed after submission.

Once submitted:

Vote recorded.

Do not reveal individual votes.

Show only:

12 / 12 votes submitted

The Admin can see vote totals but cannot reveal them yet.

15. Verdict reveal

Admin has a large button:

REVEAL VERDICT

When pressed, all players simultaneously see an animation.

First reveal:

THE JURY HAS DECIDED

Then display:

JURY VERDICT

GUILTY

or

NOT GUILTY

Then:

ACTUAL TRUTH

Reveal what actually happened.

Then:

OFFICIAL CASE OUTCOME

Show the real-world/defined case outcome.

16. Results

Create a results screen.

Example:

CASE COMPLETE

Jury verdict:

GUILTY

Actual outcome:

GUILTY

Jury result

9 / 12 correct

75%

Display a vote breakdown:

GUILTY — 9
NOT GUILTY — 3

Do not identify which individual jurors voted incorrectly unless the game configuration allows it.

17. Case explanation

After revealing the verdict, show the complete explanation.

Sections:

What actually happened?

Detailed explanation.

The key evidence

Highlight the most important evidence.

Evidence analysis

Explain what each major piece of evidence meant.

Why the alternative theory failed

Explain contradictions and weaknesses.

Jury performance

Show how accurately the jury interpreted the evidence.

18. Admin dashboard

Create a dedicated Admin interface.

Admin can:

CASE

Select case

View hidden truth

View official verdict

View all evidence

View private case notes

GAME

Start game

Pause game

Resume game

Release evidence

Start deliberation

Open voting

Reveal verdict

End game

PLAYERS

See connected players

See juror numbers

Remove player

Reconnect player

VOTES

Before reveal:

Show total submitted votes

Show vote distribution only to Admin

After reveal:

Show complete vote breakdown

19. Case database

Create a proper database structure for cases.

Each case should have:

id

title

difficulty

summary

date

location

victim

defendant

charges

case_story

hidden_truth

official_verdict

explanation

created_at

Evidence table:

id

case_id

title

type

description

content

order

is_locked

released_at

Witness table:

id

case_id

name

role

statement

credibility_notes

Timeline table:

id

case_id

timestamp

description

evidence_id

20. Game database

Create tables for:

games

id

room_code

case_id

admin_id

status

created_at

started_at

ended_at

Players:

id

game_id

user_id

display_name

juror_number

connected

ready

vote

vote_submitted

Notes:

id

game_id

player_id

content

Evidence assessments:

id

game_id

player_id

evidence_id

assessment

Chat messages:

id

game_id

player_id

message

created_at

21. Security

This is extremely important.

Jurors must NEVER be able to retrieve:

hidden_truth

official_verdict

admin-only case notes

unreleased evidence

other players' private notes

other players' private evidence assessments

individual votes before reveal

Use Supabase Row Level Security.

The frontend must NOT simply download the complete case and hide the secret information with CSS or JavaScript.

Secret information must be protected server-side.

22. Realtime behavior

Use Supabase Realtime so that:

players joining appear immediately

evidence releases immediately

chat messages appear immediately

ready status updates immediately

voting progress updates immediately

Admin state changes synchronize immediately

verdict reveal happens for everyone

If a player disconnects and reconnects, they should return to the current game state.

23. Responsive design

Mobile-first.

The game must be comfortable on:

Android phones

iPhones

tablets

desktop

The jury chat should be especially easy to use on mobile.

Avoid tiny buttons.

Use large touch targets.

24. Game state machine

Implement clear game states:

LOBBY

BRIEFING

EVIDENCE

DELIBERATION

VOTING

REVEAL

RESULTS

ENDED

Only allow valid transitions.

For example:

LOBBY → BRIEFING

BRIEFING → EVIDENCE

EVIDENCE → DELIBERATION

DELIBERATION → VOTING

VOTING → REVEAL

REVEAL → RESULTS

25. Demo case

Create one fictional demo case so the application is immediately playable.

Case:

The Blackwood Hotel Case

Difficulty:
Medium

Create approximately:

8 evidence items

4 witnesses

10 timeline events

3 plausible theories

1 actual culprit

a hidden truth

an official verdict

a detailed explanation

Make the evidence genuinely ambiguous.

The correct answer should NOT be obvious from the first few pieces of evidence.

Include contradictory evidence so that jurors must discuss and reason.

26. Important design principle

The game should NOT feel like a normal detective game where players simply search for "the clue."

There should be enough uncertainty that reasonable players can disagree.

The central question should be:

"Has the evidence established guilt beyond a reasonable doubt?"

not simply:

"Who looks suspicious?"

27. UI components

Create reusable components:

CaseHeader

EvidenceCard

EvidenceModal

WitnessCard

Timeline

JuryList

JuryChat

PrivateNotes

VerdictSelector

VoteProgress

AdminControls

RevealAnimation

ResultsCard

CaseExplanation

28. Visual quality

Make this feel like a polished commercial game, not a basic CRUD application.

Use:

elegant typography

subtle animations

cards

smooth transitions

clear hierarchy

courtroom-inspired design

dark interface

restrained gold accent

excellent mobile UX

Avoid excessive gradients, excessive rounded cards, or generic AI-generated SaaS aesthetics.

29. Important implementation rule

Build the functional MVP first.

Prioritize:

Create room

Join room

12-player lobby

Admin controls

Case briefing

Evidence release

Real-time chat

Deliberation

Private voting

Verdict reveal

Results

Secure hidden truth

Do not spend excessive time building secondary features before the complete multiplayer game loop works.

The final result should allow me to open the website, create a game as Admin, send the room code to 12 players, play through a complete case, vote, and reveal the result.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://verdict-chambers.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/f1069455-8a04-4dbe-b513-715b695e0f96).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
