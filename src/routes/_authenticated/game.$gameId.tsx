import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { adminAction, getGameView, setAssessment, setReady, submitVote, type Assessment } from "@/lib/game.functions";
import { LobbyView } from "@/components/game/LobbyView";
import { AdminBench } from "@/components/game/AdminBench";
import { EvidenceList } from "@/components/game/EvidenceList";
import { RevealView } from "@/components/game/RevealView";
import { Button } from "@/components/ui/button";
import { Chat } from "@/components/game/Chat";
import { Notes } from "@/components/game/Notes";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/game/$gameId")({
  head: () => ({
    meta: [
      { title: "In Session — VERDICT" },
      {
        name: "description",
        content:
          "The live courtroom: evidence, deliberation, sealed voting and the final reveal.",
      },
      { property: "og:title", content: "In Session — VERDICT" },
      { property: "og:description", content: "The live courtroom for your jury room." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: GameScreen,
});

const PHASE_LABEL: Record<string, string> = {
  LOBBY: "Jury assembly",
  BRIEFING: "Case briefing",
  EVIDENCE: "Evidence room",
  DELIBERATION: "Deliberation",
  VOTING: "Sealed ballot",
  REVEAL: "The reveal",
  RESULTS: "Verdict recorded",
  ENDED: "Court adjourned",
};

function GameScreen() {
  const { gameId } = useParams({ from: "/_authenticated/game/$gameId" });
  const queryClient = useQueryClient();
  const view = useServerFn(getGameView);
  const act = useServerFn(adminAction);
  const ready = useServerFn(setReady);
  const vote = useServerFn(submitVote);
  const assess = useServerFn(setAssessment);
  const [tab, setTab] = useState<"case" | "evidence" | "floor">("case");
  const [onlineIds, setOnlineIds] = useState<Set<string>>(new Set());

  const { data, isLoading, error } = useQuery({
    queryKey: ["game", gameId],
    queryFn: () => view({ data: { gameId } }),
    refetchInterval: 8000,
    refetchOnWindowFocus: true,
  });
  const myPlayerId = data?.me?.id ?? null;

  useEffect(() => {
    const invalidate = () => queryClient.invalidateQueries({ queryKey: ["game", gameId] });
    const channel = supabase
      .channel(`game:${gameId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "games", filter: `id=eq.${gameId}` }, invalidate)
      .on("postgres_changes", { event: "*", schema: "public", table: "players", filter: `game_id=eq.${gameId}` }, invalidate)
      .on("postgres_changes", { event: "*", schema: "public", table: "game_evidence", filter: `game_id=eq.${gameId}` }, invalidate)
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [gameId, queryClient]);

  // Presence: who currently has the courtroom open (no database writes).
  useEffect(() => {
    const ch = supabase.channel(`presence:${gameId}`, {
      config: { presence: { key: myPlayerId ?? "host" } },
    });
    ch.on("presence", { event: "sync" }, () => {
      setOnlineIds(new Set(Object.keys(ch.presenceState())));
    }).subscribe((status) => {
      if (status === "SUBSCRIBED") ch.track({ at: Date.now() });
    });
    return () => {
      supabase.removeChannel(ch);
    };
  }, [gameId, myPlayerId]);

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["game", gameId] });
  const fail = (e: unknown) => toast.error(e instanceof Error ? e.message : "That move isn't allowed.");

  const runAction = useMutation({
    mutationFn: (input: Omit<Parameters<typeof act>[0]["data"], "gameId">) =>
      act({ data: { gameId, ...input } }),
    onSuccess: refresh,
    onError: fail,
  });
  const toggleReady = useMutation({
    mutationFn: (r: boolean) => ready({ data: { gameId, ready: r } }),
    onSuccess: refresh,
    onError: fail,
  });
  const castVote = useMutation({
    mutationFn: (v: "GUILTY" | "NOT_GUILTY") => vote({ data: { gameId, vote: v } }),
    onSuccess: () => {
      toast.success("Your ballot is sealed.");
      refresh();
    },
    onError: fail,
  });
  const saveAssessment = useMutation({
    mutationFn: (a: { evidenceId: string; assessment: Assessment }) =>
      assess({ data: { gameId, ...a } }),
    onSuccess: refresh,
    onError: fail,
  });

  if (isLoading)
    return <main className="p-8 text-sm text-muted-foreground">Entering the courtroom…</main>;
  if (error)
    return (
      <main className="mx-auto max-w-md px-5 py-16 text-center">
        <h1 className="text-3xl">You can't enter this room</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {error instanceof Error ? error.message : "Unknown error."}
        </p>
        <Button asChild className="mt-6">
          <Link to="/lobby">Back to the courthouse</Link>
        </Button>
      </main>
    );
  if (!data) return null;

  const { game, isAdmin, me, brief, players, secrets, counts } = data;
  const names = Object.fromEntries(
    players.map((p) => [p.id, { name: p.display_name, number: p.juror_number }]),
  );
  const canPost = (game.status === "EVIDENCE" || game.status === "DELIBERATION") && !game.paused;
  const canAssess = ["EVIDENCE", "DELIBERATION", "VOTING"].includes(game.status) && !game.paused;
  const revealed = game.status === "REVEAL" || game.status === "RESULTS" || game.status === "ENDED";

  if (game.status === "LOBBY")
    return (
      <main className="mx-auto max-w-3xl px-4 py-8 pb-24">
        <LobbyView
          data={data}
          onlineIds={onlineIds}
          starting={runAction.isPending}
          onStart={() => runAction.mutate({ action: "START_CASE" })}
        />
        {isAdmin && (
          <AdminBench data={data} pending={runAction.isPending} onAction={(a) => runAction.mutate(a as never)} />
        )}
        <Button asChild variant="ghost" className="mt-6 w-full">
          <Link to="/lobby">Leave the room</Link>
        </Button>
      </main>
    );

  return (
    <main className="mx-auto max-w-6xl px-4 py-6 pb-24">
      <header className="panel flex flex-wrap items-center justify-between gap-3 p-4">
        <div>
          <p className="label-caps">
            Room <span className="text-gold">{game.room_code}</span> · Case No. {brief.case_number}
          </p>
          <h1 className="text-3xl leading-tight">{brief.title}</h1>
        </div>
        <div className="text-right">
          <p className="label-caps">{game.paused ? "Recess" : "In session"}</p>
          <p className="font-mono text-sm text-gold">{PHASE_LABEL[game.status]}</p>
          <p className="text-xs text-muted-foreground">
            {players.length}/{game.max_players} jurors
          </p>
        </div>
      </header>

      {game.paused && (
        <p className="panel animate-seal mt-3 p-3 text-center text-sm text-gold">
          The Game Master has called a recess.
        </p>
      )}
      {game.status === "ENDED" && (
        <p className="panel mt-3 p-3 text-center text-sm text-gold">Court is adjourned. This room is closed.</p>
      )}

      {isAdmin && (
        <AdminBench data={data} pending={runAction.isPending} onAction={(a) => runAction.mutate(a as never)} />
      )}

      {revealed && secrets && (isAdmin ? game.status !== "VOTING" : true) && <RevealView data={data} />}

      <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_20rem]">
        <div>
          {game.status === "DELIBERATION" && me && (
            <section className="panel animate-gavel mb-4 flex flex-wrap items-center justify-between gap-3 p-4">
              <div>
                <p className="label-caps">Deliberation</p>
                <p className="text-sm text-muted-foreground">
                  {counts.ready} of {counts.jurors} jurors are ready to vote.
                </p>
              </div>
              <Button
                variant={me.ready ? "secondary" : "default"}
                disabled={toggleReady.isPending}
                onClick={() => toggleReady.mutate(!me.ready)}
              >
                {me.ready ? "I need more time" : "I'm ready to vote"}
              </Button>
            </section>
          )}

          {game.status === "VOTING" && me && (
            <section className="panel animate-gavel mb-4 p-5 text-center">
              <p className="label-caps">Sealed ballot</p>
              {me.vote_submitted ? (
                <p className="mt-3 text-lg text-gold">
                  Your ballot is sealed. {counts.votesSubmitted} / {counts.jurors} jurors have voted.
                </p>
              ) : (
                <>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Your vote is private and final once sealed.
                  </p>
                  <div className="mt-4 flex justify-center gap-3">
                    <Button
                      className="bg-guilty text-primary-foreground hover:bg-guilty/90"
                      disabled={castVote.isPending || game.paused}
                      onClick={() => castVote.mutate("GUILTY")}
                    >
                      Guilty
                    </Button>
                    <Button
                      className="bg-not-guilty text-primary-foreground hover:bg-not-guilty/90"
                      disabled={castVote.isPending || game.paused}
                      onClick={() => castVote.mutate("NOT_GUILTY")}
                    >
                      Not guilty
                    </Button>
                  </div>
                </>
              )}
            </section>
          )}

          <div className="mb-4 flex gap-2">
            {(["case", "evidence", "floor"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`label-caps rounded border px-3 py-2 transition-colors ${
                  tab === t ? "border-gold text-gold" : "border-border hover:border-gold-dim"
                }`}
              >
                {t === "case" ? "Case file" : t === "evidence" ? `Exhibits ${counts.evidenceReleased}/${counts.evidenceTotal}` : "Jury room"}
              </button>
            ))}
          </div>

          {tab === "case" && (
            <section className="panel animate-gavel space-y-4 p-5">
              <p className="text-sm text-muted-foreground">{brief.summary}</p>
              {"case_story" in brief && brief.case_story ? (
                <>
                  <div className="gold-rule" />
                  <dl className="grid grid-cols-2 gap-3 text-sm">
                    <Field label="Date" value={`${brief.case_date} ${brief.case_time ?? ""}`} />
                    <Field label="Location" value={brief.location!} />
                    <Field label="Victim" value={brief.victim!} />
                    <Field label="Defendant" value={brief.defendant!} />
                  </dl>
                  <p className="label-caps">Charges</p>
                  <p className="text-sm">{brief.charges}</p>
                  <div className="gold-rule" />
                  <p className="whitespace-pre-line text-sm leading-relaxed">{brief.case_story}</p>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">The full brief is sealed until the case starts.</p>
              )}
            </section>
          )}

          {tab === "evidence" &&
            (game.status === "BRIEFING" && !isAdmin ? (
              <p className="panel p-5 text-sm text-muted-foreground">
                The evidence room opens after the briefing.
              </p>
            ) : (
              <EvidenceList
                data={data}
                canAssess={canAssess}
                onAssess={(evidenceId, assessment) => saveAssessment.mutate({ evidenceId, assessment })}
                onRelease={(evidenceId) => runAction.mutate({ action: "RELEASE_EVIDENCE", evidenceId })}
              />
            ))}

          {tab === "floor" && (
            <div className="space-y-4">
              <Chat
                gameId={gameId}
                playerId={me?.id ?? null}
                isAdmin={isAdmin}
                names={names}
                canPost={canPost}
                onDelete={(id) => runAction.mutate({ action: "DELETE_MESSAGE", messageId: id })}
              />
              {me && <Notes gameId={gameId} playerId={me.id} />}
            </div>
          )}
        </div>

        <aside className="space-y-4">
          <div className="panel p-4">
            <p className="label-caps">Jury box</p>
            <ul className="mt-3 space-y-2">
              {players.map((p) => (
                <li key={p.id} className="flex items-center justify-between text-sm">
                  <span>
                    <span
                      className={`mr-1 inline-block h-2 w-2 rounded-full ${
                        onlineIds.has(p.id) ? "bg-not-guilty" : "bg-muted"
                      }`}
                    />
                    <span className="font-mono text-xs text-gold-dim">#{p.juror_number}</span> {p.display_name}
                    {me?.id === p.id && <span className="text-muted-foreground"> (you)</span>}
                  </span>
                  <span className="flex items-center gap-2">
                    {game.status === "DELIBERATION" && p.ready && (
                      <span className="label-caps text-not-guilty">Ready</span>
                    )}
                    {p.vote_submitted && <span className="label-caps text-gold">Voted</span>}
                    {isAdmin && !revealed && (
                      <button
                        className="text-xs text-muted-foreground hover:text-destructive"
                        onClick={() => {
                          if (confirm(`Dismiss ${p.display_name} from the jury?`))
                            runAction.mutate({ action: "REMOVE_PLAYER", playerId: p.id });
                        }}
                      >
                        Dismiss
                      </button>
                    )}
                  </span>
                </li>
              ))}
              {players.length === 0 && <li className="text-sm text-muted-foreground">The box is empty.</li>}
            </ul>
          </div>
          <Button asChild variant="ghost" className="w-full">
            <Link to="/lobby">Leave the room</Link>
          </Button>
        </aside>
      </div>
    </main>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="label-caps">{label}</dt>
      <dd className="text-sm">{value}</dd>
    </div>
  );
}

