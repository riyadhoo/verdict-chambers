
-- ============ CASE LIBRARY (server-only) ============
CREATE TABLE public.cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  difficulty text NOT NULL DEFAULT 'Medium',
  summary text NOT NULL,
  case_number text NOT NULL DEFAULT '001',
  case_date text NOT NULL,
  case_time text,
  location text NOT NULL,
  victim text NOT NULL,
  defendant text NOT NULL,
  charges text NOT NULL,
  case_story text NOT NULL,
  hidden_truth text NOT NULL,
  official_verdict text NOT NULL,
  explanation jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.evidence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  title text NOT NULL,
  type text NOT NULL,
  description text NOT NULL,
  content jsonb NOT NULL DEFAULT '{}'::jsonb,
  sort_order int NOT NULL DEFAULT 0,
  default_locked boolean NOT NULL DEFAULT false
);

CREATE TABLE public.witnesses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  name text NOT NULL,
  role text NOT NULL,
  statement text NOT NULL,
  credibility_notes text,
  sort_order int NOT NULL DEFAULT 0
);

CREATE TABLE public.timeline_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  ts_label text NOT NULL,
  description text NOT NULL,
  evidence_id uuid REFERENCES public.evidence(id) ON DELETE SET NULL,
  sort_order int NOT NULL DEFAULT 0
);

GRANT ALL ON public.cases TO service_role;
GRANT ALL ON public.evidence TO service_role;
GRANT ALL ON public.witnesses TO service_role;
GRANT ALL ON public.timeline_events TO service_role;
ALTER TABLE public.cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.witnesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timeline_events ENABLE ROW LEVEL SECURITY;

-- ============ GAMES ============
CREATE TABLE public.games (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_code text NOT NULL UNIQUE,
  case_id uuid NOT NULL REFERENCES public.cases(id),
  admin_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'LOBBY',
  paused boolean NOT NULL DEFAULT false,
  max_players int NOT NULL DEFAULT 12,
  created_at timestamptz NOT NULL DEFAULT now(),
  started_at timestamptz,
  ended_at timestamptz
);

CREATE TABLE public.players (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id uuid NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  display_name text NOT NULL,
  juror_number int NOT NULL,
  connected boolean NOT NULL DEFAULT true,
  removed boolean NOT NULL DEFAULT false,
  ready boolean NOT NULL DEFAULT false,
  vote_submitted boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (game_id, user_id),
  UNIQUE (game_id, juror_number)
);
CREATE UNIQUE INDEX players_unique_name ON public.players (game_id, lower(display_name)) WHERE removed = false;

CREATE TABLE public.votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id uuid NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  player_id uuid NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  vote text NOT NULL CHECK (vote IN ('GUILTY','NOT_GUILTY')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (game_id, player_id)
);

CREATE TABLE public.game_evidence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id uuid NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  evidence_id uuid NOT NULL REFERENCES public.evidence(id) ON DELETE CASCADE,
  released boolean NOT NULL DEFAULT false,
  released_at timestamptz,
  UNIQUE (game_id, evidence_id)
);

CREATE TABLE public.notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id uuid NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  player_id uuid NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  content text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (game_id, player_id)
);

CREATE TABLE public.evidence_assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id uuid NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  player_id uuid NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  evidence_id uuid NOT NULL REFERENCES public.evidence(id) ON DELETE CASCADE,
  assessment text NOT NULL CHECK (assessment IN ('GUILTY','NOT_GUILTY','NEUTRAL')),
  UNIQUE (game_id, player_id, evidence_id)
);

CREATE TABLE public.chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id uuid NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  player_id uuid REFERENCES public.players(id) ON DELETE CASCADE,
  message text NOT NULL,
  deleted boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============ HELPERS ============
CREATE OR REPLACE FUNCTION public.is_game_member(_game uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.games g WHERE g.id = _game AND g.admin_id = auth.uid())
      OR EXISTS (SELECT 1 FROM public.players p WHERE p.game_id = _game AND p.user_id = auth.uid() AND p.removed = false);
$$;

CREATE OR REPLACE FUNCTION public.is_game_admin(_game uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.games g WHERE g.id = _game AND g.admin_id = auth.uid());
$$;

CREATE OR REPLACE FUNCTION public.is_own_player(_player uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.players p WHERE p.id = _player AND p.user_id = auth.uid());
$$;

-- ============ GRANTS + RLS ============
GRANT SELECT ON public.games TO authenticated;
GRANT ALL ON public.games TO service_role;
ALTER TABLE public.games ENABLE ROW LEVEL SECURITY;
CREATE POLICY games_select ON public.games FOR SELECT TO authenticated USING (public.is_game_member(id));

GRANT SELECT ON public.players TO authenticated;
GRANT ALL ON public.players TO service_role;
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;
CREATE POLICY players_select ON public.players FOR SELECT TO authenticated USING (public.is_game_member(game_id));

GRANT ALL ON public.votes TO service_role;
ALTER TABLE public.votes ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.game_evidence TO authenticated;
GRANT ALL ON public.game_evidence TO service_role;
ALTER TABLE public.game_evidence ENABLE ROW LEVEL SECURITY;
CREATE POLICY ge_select ON public.game_evidence FOR SELECT TO authenticated USING (public.is_game_member(game_id));

GRANT SELECT, INSERT, UPDATE ON public.notes TO authenticated;
GRANT ALL ON public.notes TO service_role;
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY notes_own ON public.notes FOR ALL TO authenticated
  USING (public.is_own_player(player_id)) WITH CHECK (public.is_own_player(player_id));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.evidence_assessments TO authenticated;
GRANT ALL ON public.evidence_assessments TO service_role;
ALTER TABLE public.evidence_assessments ENABLE ROW LEVEL SECURITY;
CREATE POLICY ea_own ON public.evidence_assessments FOR ALL TO authenticated
  USING (public.is_own_player(player_id)) WITH CHECK (public.is_own_player(player_id));

GRANT SELECT, INSERT, UPDATE ON public.chat_messages TO authenticated;
GRANT ALL ON public.chat_messages TO service_role;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY chat_select ON public.chat_messages FOR SELECT TO authenticated USING (public.is_game_member(game_id));
CREATE POLICY chat_insert ON public.chat_messages FOR INSERT TO authenticated
  WITH CHECK (public.is_game_member(game_id) AND public.is_own_player(player_id));
CREATE POLICY chat_moderate ON public.chat_messages FOR UPDATE TO authenticated
  USING (public.is_game_admin(game_id)) WITH CHECK (public.is_game_admin(game_id));

ALTER PUBLICATION supabase_realtime ADD TABLE public.games;
ALTER PUBLICATION supabase_realtime ADD TABLE public.players;
ALTER PUBLICATION supabase_realtime ADD TABLE public.game_evidence;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
ALTER TABLE public.games REPLICA IDENTITY FULL;
ALTER TABLE public.players REPLICA IDENTITY FULL;
ALTER TABLE public.game_evidence REPLICA IDENTITY FULL;
ALTER TABLE public.chat_messages REPLICA IDENTITY FULL;

-- ============ DEMO CASE ============
INSERT INTO public.cases (id, title, difficulty, summary, case_number, case_date, case_time, location, victim, defendant, charges, case_story, hidden_truth, official_verdict, explanation)
VALUES (
 '11111111-1111-1111-1111-111111111111',
 $ct$The Death at Blackwood Hotel$ct$,
 $ct$Medium$ct$,
 $ct$A businessman is found dead in Room 417. The man who argued with him hours earlier stands accused of murder.$ct$,
 $ct$017$ct$,
 $ct$October 14$ct$,
 $ct$Approximately 23:40$ct$,
 $ct$Blackwood Hotel, Room 417$ct$,
 $ct$Daniel Carter, 41$ct$,
 $ct$Michael Reed, 38$ct$,
 $ct$Murder in the second degree$ct$,
 $ct$On the night of October 14, Daniel Carter was found dead on the floor of Room 417 of the Blackwood Hotel. He had suffered a severe blow to the back of the head. A heavy glass ashtray, wiped clean, lay near the window.

Carter and the defendant, Michael Reed, had been business partners for nine years. Three weeks before the death, Carter initiated a buyout that would have left Reed with nothing. Witnesses describe a loud confrontation between the two men in a restaurant on October 9, during which Reed was heard to say that Carter would regret it.

On the night in question, the hotel security camera recorded Reed entering the lobby at 23:17. He did not sign the guest register. A camera covering the fourth-floor corridor had been out of service since October 2, awaiting repair. Reed left the building at 23:44 through a side exit.

Reed does not deny being in the hotel. He states that he came to speak with Carter one last time, that they spoke for roughly ten minutes in Room 417, that the conversation was tense but not violent, and that Carter was alive when he left. He says he used the side exit because he did not want to be seen leaving the room of a man he had publicly quarrelled with.

The body was discovered at 23:52 by a night porter delivering a room service order that Carter had placed at 23:35. The medical examiner placed the time of death between 23:20 and 00:10 - a window that includes, but is not limited to, the period Reed was in the building.

The prosecution argues motive, opportunity, and consciousness of guilt. The defence argues that at least two other people had access to the fourth floor that night, that nothing physically ties Reed to the fatal blow, and that the state has not eliminated reasonable doubt.$ct$,
 $ct$Michael Reed did not kill Daniel Carter.

Reed argued with Carter, was refused, and left at 23:44 exactly as he described. Carter was alive and had already ordered room service.

At 23:47 Elena Vasquez, the hotel's night manager, went to Room 417. Carter had discovered three days earlier that she had been skimming from the hotel accounts through a supplier company registered in her sister's name, and he had told her that evening that he intended to inform the owners in the morning. She went up to persuade him. He refused, turned his back on her to pick up the telephone, and she struck him once with the ashtray in a moment of panic. She wiped the ashtray, took the stairs down, and returned to the front desk at 23:50.

The porter found the body two minutes later. Vasquez was the person who "helpfully" told police about Reed within minutes of their arrival, and she was the one who had signed off on the corridor camera repair being postponed twice.

The fingerprint on the glass, the phone tower ping and the CCTV footage are all true and all irrelevant: they establish only that Reed was where he already admitted being.$ct$,
 $ct$NOT GUILTY$ct$,
 $ct${
  "what_happened": "Michael Reed left Room 417 at 23:44 with Daniel Carter alive. Three minutes later the hotel night manager, Elena Vasquez, entered the room. Carter had uncovered her theft from the hotel accounts and intended to report it the following morning. When he refused to reconsider and turned away to use the telephone, she struck him once with the glass ashtray, wiped it, and returned to the front desk by 23:50.",
  "key_evidence": "The room service order placed at 23:35 and the front desk log gap between 23:45 and 23:50. Together they show that Carter was alive and behaving normally minutes before Reed left, and that the one person with unrestricted, uncounted access to the fourth floor cannot account for the exact window in which he died.",
  "evidence_analysis": [
    { "title": "Security Camera", "meaning": "Proves only presence in the building - a fact Reed volunteered himself. Presence is not participation." },
    { "title": "Fingerprint on the Glass", "meaning": "Consistent with a ten-minute conversation. There were no prints of any kind on the ashtray, which was wiped." },
    { "title": "Phone Records", "meaning": "The cell tower covers four city blocks including the street outside. It cannot place anyone inside a room." },
    { "title": "The Restaurant Argument", "meaning": "Establishes motive, not action. Motive without a physical link is the weakest form of proof." },
    { "title": "Room Service Order", "meaning": "A man who has just been threatened does not order a club sandwich. This places Carter alive and calm at 23:35." },
    { "title": "Front Desk Log", "meaning": "The five-minute gap in the night manager's log is the only unexplained absence in the entire timeline." },
    { "title": "The Wiped Ashtray", "meaning": "Wiping removes prints from everyone. It exonerates nobody, but it does show the killer had time and composure - which does not match a man who left by a side exit two minutes later." },
    { "title": "Corridor Camera Outage", "meaning": "The repair was postponed twice, both times signed off by the night manager." }
  ],
  "why_alternative_failed": "The prosecution theory required Reed to strike Carter, wipe the ashtray, compose himself and leave - all within a window that ends at 23:44, while Carter had ordered food at 23:35 and the porter arrived at 23:52. It also required the jury to treat presence and motive as proof of the act, when no forensic evidence connected Reed to the weapon or to the blow.",
  "jury_note": "A vote of GUILTY is not unreasonable here - the motive and opportunity are real. But the standard is proof beyond a reasonable doubt, and the five unexplained minutes belonged to someone else."
 }$ct$::jsonb
);

INSERT INTO public.evidence (id, case_id, title, type, description, content, sort_order, default_locked) VALUES
('e1111111-0000-0000-0000-000000000001','11111111-1111-1111-1111-111111111111',$ct$Security Camera$ct$,$ct$Video$ct$,$ct$23:17 - The defendant enters the hotel lobby through the main doors.$ct$,$ct${"timestamp":"23:17","details":"Lobby camera, fixed angle on the main entrance. Reed enters alone, wearing a dark coat, carrying nothing. He does not approach the front desk. He walks directly to the elevators and is out of frame by 23:18. A second clip at 23:44 shows him leaving through the west side exit.","metadata":"Camera 1 (Lobby) operational. Camera 7 (Floor 4 corridor) out of service since 02 October."}$ct$::jsonb,1,false),
('e1111111-0000-0000-0000-000000000002','11111111-1111-1111-1111-111111111111',$ct$Fingerprint on a Glass$ct$,$ct$Forensic$ct$,$ct$A fingerprint matching the defendant was found on a drinking glass inside Room 417.$ct$,$ct${"timestamp":"Collected 01:20","details":"Right index and middle finger, clear match to the defendant. Recovered from one of two tumblers on the desk. The second tumbler carried the victim's prints. No prints of any kind were recovered from the glass ashtray identified as the likely weapon; it had been wiped with a cloth.","metadata":"Forensic report BW-4417. Defendant concedes he was in the room and was offered a drink."}$ct$::jsonb,2,false),
('e1111111-0000-0000-0000-000000000003','11111111-1111-1111-1111-111111111111',$ct$Phone Records$ct$,$ct$Document$ct$,$ct$The defendant's phone connected to a nearby cell tower at 23:31.$ct$,$ct${"timestamp":"23:31","details":"Handset registered to Michael Reed connected to tower NW-12 at 23:31 and remained on that tower until 23:58. No calls were made or received.","metadata":"Tower NW-12 has an effective radius covering approximately four city blocks, including the hotel, the street outside it, and two adjacent buildings. It cannot establish position within a building."}$ct$::jsonb,3,false),
('e1111111-0000-0000-0000-000000000004','11111111-1111-1111-1111-111111111111',$ct$The Restaurant Argument$ct$,$ct$Witness$ct$,$ct$Five days before the death, the two men argued publicly over the buyout.$ct$,$ct${"timestamp":"October 9, 20:50","details":"Two restaurant staff and one diner describe raised voices. Reported phrases vary between witnesses: one recalls Reed saying the victim would regret it, another recalls he would pay for it, a third could not hear the words at all. All three agree the victim remained seated and that Reed left first.","metadata":"No physical contact was reported by any witness."}$ct$::jsonb,4,false),
('e1111111-0000-0000-0000-000000000005','11111111-1111-1111-1111-111111111111',$ct$Room Service Order$ct$,$ct$Document$ct$,$ct$The victim placed a room service order at 23:35.$ct$,$ct${"timestamp":"23:35","details":"Order logged by the kitchen at 23:35: one club sandwich, one bottle of sparkling water. The kitchen ticket records the call as lasting 41 seconds. The porter states the victim sounded ordinary and unhurried.","metadata":"Order prepared at 23:48 and taken up at 23:51. The porter knocked, received no answer, used a pass key, and found the body at 23:52."}$ct$::jsonb,5,true),
('e1111111-0000-0000-0000-000000000006','11111111-1111-1111-1111-111111111111',$ct$Front Desk Log$ct$,$ct$Document$ct$,$ct$The night manager's own log has an unexplained five-minute gap.$ct$,$ct${"timestamp":"23:45 - 23:50","details":"Blackwood policy requires the duty manager to initial the desk log every fifteen minutes. Entries exist at 23:15, 23:30 and 23:50. The 23:45 entry is missing. The night manager, Elena Vasquez, states she was checking a reported noise complaint on the second floor, but no complaint was recorded that night.","metadata":"Vasquez holds a master key with access to every floor. Her key card usage is not logged for master keys."}$ct$::jsonb,6,true),
('e1111111-0000-0000-0000-000000000007','11111111-1111-1111-1111-111111111111',$ct$The Wiped Ashtray$ct$,$ct$Forensic$ct$,$ct$The likely weapon was cleaned before police arrived.$ct$,$ct${"timestamp":"Collected 00:40","details":"A heavy cut-glass ashtray, 1.4 kg, recovered from the floor beneath the window. Blood and hair consistent with the victim were found in the crevices of the cut pattern. All surfaces show cloth wipe marks. A hotel face towel recovered from the bathroom bin tested positive for trace blood.","metadata":"The medical examiner considers a single blow from behind consistent with the wound. No defensive injuries were found on the victim."}$ct$::jsonb,7,true),
('e1111111-0000-0000-0000-000000000008','11111111-1111-1111-1111-111111111111',$ct$Financial Audit Extract$ct$,$ct$Document$ct$,$ct$The victim had flagged irregularities in the hotel's supplier accounts.$ct$,$ct${"timestamp":"Recovered from the victim's laptop","details":"An open spreadsheet on the victim's laptop, last saved at 22:11, compares hotel linen supplier invoices against market rates. Three highlighted rows involve a company called Meridian Linens, incorporated eighteen months ago. An unsent email drafted at 22:40 is addressed to the hotel ownership group and begins: I need to raise something before it goes further.","metadata":"The victim was a private investor in the Blackwood group as well as the defendant's business partner. Meridian Linens is registered to R. Vasquez."}$ct$::jsonb,8,true);

INSERT INTO public.witnesses (case_id, name, role, statement, credibility_notes, sort_order) VALUES
('11111111-1111-1111-1111-111111111111',$ct$Elena Vasquez$ct$,$ct$Night Manager$ct$,$ct$I saw Mr Reed come in around quarter past eleven. He looked agitated. I did not see him leave. I was away from the desk for a few minutes checking a noise complaint on the second floor. When the porter shouted, I called the police immediately and told them about the man who had come in earlier.$ct$,$ct$No noise complaint was logged that night. She volunteered the defendant's description before police asked about visitors.$ct$,1),
('11111111-1111-1111-1111-111111111111',$ct$Tomas Neri$ct$,$ct$Night Porter$ct$,$ct$I took the order up at about ten to twelve. I knocked twice, nobody answered, so I used the pass key because the order was paid. He was on the floor by the desk. I did not touch anything except the door.$ct$,$ct$Consistent account, no known connection to any party. His hands and clothing were tested and were clean.$ct$,2),
('11111111-1111-1111-1111-111111111111',$ct$Priya Anand$ct$,$ct$Guest, Room 412$ct$,$ct$I heard two men talking loudly next door. Not screaming, just loud. It stopped and I heard a door. Later, maybe five or ten minutes later, I heard the door again but only one set of footsteps, lighter ones.$ct$,$ct$Could not give reliable times; had taken a sleeping tablet at 23:00. The lighter footsteps detail was not in her first statement and appeared only in the second interview.$ct$,3),
('11111111-1111-1111-1111-111111111111',$ct$Gregory Kwan$ct$,$ct$Business Associate$ct$,$ct$Michael was finished and he knew it. Daniel structured the buyout so Michael walked away with nothing but debt. I have known Michael twelve years and I have never seen him raise a hand to anyone, but I have also never seen him that desperate.$ct$,$ct$Stands to benefit from the defendant's company if the buyout collapses. Testimony cuts both ways and he acknowledges it.$ct$,4);

INSERT INTO public.timeline_events (case_id, ts_label, description, evidence_id, sort_order) VALUES
('11111111-1111-1111-1111-111111111111',$ct$22:11$ct$,$ct$Victim last saves the supplier audit spreadsheet on his laptop.$ct$,'e1111111-0000-0000-0000-000000000008',1),
('11111111-1111-1111-1111-111111111111',$ct$22:40$ct$,$ct$Victim drafts an unsent email to the hotel ownership group.$ct$,'e1111111-0000-0000-0000-000000000008',2),
('11111111-1111-1111-1111-111111111111',$ct$23:02$ct$,$ct$Victim returns to the hotel and takes the elevator to the fourth floor.$ct$,NULL,3),
('11111111-1111-1111-1111-111111111111',$ct$23:17$ct$,$ct$Defendant enters the lobby and goes directly to the elevators.$ct$,'e1111111-0000-0000-0000-000000000001',4),
('11111111-1111-1111-1111-111111111111',$ct$23:24$ct$,$ct$Guest in Room 412 hears two men talking loudly next door.$ct$,NULL,5),
('11111111-1111-1111-1111-111111111111',$ct$23:31$ct$,$ct$Defendant's phone connects to cell tower NW-12.$ct$,'e1111111-0000-0000-0000-000000000003',6),
('11111111-1111-1111-1111-111111111111',$ct$23:35$ct$,$ct$Victim places a room service order by telephone.$ct$,'e1111111-0000-0000-0000-000000000005',7),
('11111111-1111-1111-1111-111111111111',$ct$23:40$ct$,$ct$Estimated time of death (medical range 23:20 - 00:10).$ct$,NULL,8),
('11111111-1111-1111-1111-111111111111',$ct$23:44$ct$,$ct$Defendant leaves the hotel through the west side exit.$ct$,'e1111111-0000-0000-0000-000000000001',9),
('11111111-1111-1111-1111-111111111111',$ct$23:45$ct$,$ct$Front desk log entry missing; night manager away from the desk.$ct$,'e1111111-0000-0000-0000-000000000006',10),
('11111111-1111-1111-1111-111111111111',$ct$23:52$ct$,$ct$Night porter finds the body in Room 417.$ct$,'e1111111-0000-0000-0000-000000000005',11);
