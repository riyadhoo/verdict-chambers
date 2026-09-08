import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { adminAction, getGameView, setReady, submitVote, type Json } from "@/lib/game.functions";
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
  const [tab, setTab] = useState<"case" | "evidence" | "floor">("case");

  const { data, isLoading, error } = useQuery({
    queryKey: ["game", gameId],
    queryFn: () => view({ data: { gameId } }),
    refetchInterval: 8000,
  });

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

  const runAction = useMutation({
    mutationFn: (input: Parameters<typeof act>[0]["data"]) => act({ data: input }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["game", gameId] }),
    onError: (e) => toast.error(e instanceof Error ? e.message : "That move isn't allowed."),
  });

  const toggleReady = useMutation({
    mutationFn: (r: boolean) => ready({ data: { gameId, ready: r } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["game", gameId] }),
  });

  const castVote = useMutation({
    mutationFn: (v: "GUILTY" | "NOT_GUILTY") => vote({ data: { gameId, vote: v } }),
    onSuccess: () => {
      toast.success("Your ballot is sealed.");
      queryClient.invalidateQueries({ queryKey: ["game", gameId] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Vote not recorded."),
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

  const { game, isAdmin, me, brief, evidence, witnesses, timeline, players, tally, secrets, results } =
    data;
  const names = Object.fromEntries(
    players.map((p) => [p.id, { name: p.display_name, number: p.juror_number }]),
  );
  const canPost = game.status === "DELIBERATION" && !game.paused;

  return (
    <main className="mx-auto max-w-6xl px-4 py-6 pb-24">
      {/* Header */}
      <header className="panel flex flex-wrap items-center justify-between gap-3 p-4">
        <div>
          <p className="label-caps">
            Room <span className="text-gold">{game.room_code}</span> · Case No.{" "}
            {brief.case_number}
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
        <p className="mt-3 panel animate-seal p-3 text-center text-sm text-gold">
          The Game Master has called a recess.
        </p>
      )}

      {/* Admin panel */}
      {isAdmin && (
        <section className="panel mt-4 p-4">
          <p className="label-caps">Game Master bench</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {[
              ["START_CASE", "Start case"],
              ["TO_EVIDENCE", "Open evidence"],
              ["BEGIN_DELIBERATION", "Begin deliberation"],
              ["OPEN_VOTING", "Open voting"],
              ["REVEAL", "Reveal the truth"],
              ["TO_RESULTS", "Show results"],
            ].map(([action, label]) => (
              <Button
                key={action}
                size="sm"
                variant="outline"
                onClick={() => runAction.mutate({ gameId, action: action as never })}
              >
                {label}
              </Button>
            ))}
            <Button
              size="sm"
              variant="secondary"
              onClick={() =>
                runAction.mutate({ gameId, action: game.paused ? "RESUME" : "PAUSE" })
              }
            >
              {game.paused ? "Resume" : "Recess"}
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => runAction.mutate({ gameId, action: "RELEASE_ALL" })}
            >
              Release all exhibits
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => runAction.mutate({ gameId, action: "END_GAME" })}
            >
              Adjourn
            </Button>
          </div>
          {tally && (
            <p className="mt-3 font-mono text-xs text-muted-foreground">
              Ballots sealed: {tally.submitted} · Guilty {tally.guilty} · Not guilty{" "}
              {tally.notGuilty}
            </p>
          )}
        </section>
      )}

      <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_20rem]">
        <div>
          {/* Tabs */}
          <div className="mb-4 flex gap-2">
            {(["case", "evidence", "floor"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`label-caps rounded border px-3 py-2 transition-colors ${
                  tab === t ? "border-gold text-gold" : "border-border hover:border-gold-dim"
                }`}
              >
                {t === "case" ? "Case file" : t === "evidence" ? "Exhibits" : "Floor"}
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
                <p className="text-sm text-muted-foreground">
                  The full brief is sealed until the Game Master starts the case.
                </p>
              )}
            </section>
          )}

          {tab === "evidence" && (
            <section className="space-y-3">
              {evidence.map((e) => (
                <div key={e.id} className="panel animate-gavel p-4">
                  {e.locked ? (
                    <p className="label-caps">Exhibit sealed</p>
                  ) : (
                    <>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="label-caps">{e.type}</p>
                          <h3 className="text-2xl">{e.title}</h3>
                        </div>
                        {isAdmin && e.adminOnlyLocked && (
                          <Button
                            size="sm"
                            onClick={() =>
                              runAction.mutate({
                                gameId,
                                action: "RELEASE_EVIDENCE",
                                evidenceId: e.id,
                              })
                            }
                          >
                            Release
                          </Button>
                        )}
                      </div>
                      <p className="mt-2 text-sm text-muted-foreground">{e.description}</p>
                      <ExhibitContent content={e.content} />

                    </>
                  )}
                </div>
              ))}
              {witnesses.length > 0 && (
                <>
                  <p className="label-caps pt-2">Witness statements</p>
                  {witnesses.map((w) => (
                    <div key={w.id} className="panel p-4">
                      <p className="label-caps">{w.role}</p>
                      <h3 className="text-xl">{w.name}</h3>
                      <p className="mt-2 text-sm italic text-muted-foreground">“{w.statement}”</p>
                      {w.credibility_notes && (
                        <p className="mt-2 text-xs text-gold-dim">{w.credibility_notes}</p>
                      )}
                    </div>
                  ))}
                </>
              )}
              {timeline.length > 0 && (
                <>
                  <p className="label-caps pt-2">Timeline</p>
                  <div className="panel p-4">
                    {timeline.map((t) => (
                      <div key={t.id} className="flex gap-3 border-b border-border py-2 last:border-0">
                        <span className="w-20 shrink-0 font-mono text-xs text-gold-dim">
                          {t.ts_label}
                        </span>
                        <span className="text-sm">{t.description}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </section>
          )}

          {tab === "floor" && (
            <div className="space-y-4">
              <Chat
                gameId={gameId}
                playerId={me?.id ?? null}
                isAdmin={isAdmin}
                names={names}
                canPost={canPost}
                onDelete={(id) => runAction.mutate({ gameId, action: "DELETE_MESSAGE", messageId: id })}
              />
              {me && <Notes gameId={gameId} playerId={me.id} />}
            </div>
          )}

          {/* Voting */}
          {game.status === "VOTING" && me && (
            <section className="panel animate-gavel mt-4 p-5 text-center">
              <p className="label-caps">Sealed ballot</p>
              {me.vote_submitted ? (
                <p className="mt-3 text-lg text-gold">Your ballot is sealed.</p>
              ) : (
                <div className="mt-4 flex justify-center gap-3">
                  <Button
                    className="bg-guilty text-primary-foreground hover:bg-guilty/90"
                    disabled={castVote.isPending}
                    onClick={() => castVote.mutate("GUILTY")}
                  >
                    Guilty
                  </Button>
                  <Button
                    className="bg-not-guilty text-primary-foreground hover:bg-not-guilty/90"
                    disabled={castVote.isPending}
                    onClick={() => castVote.mutate("NOT_GUILTY")}
                  >
                    Not guilty
                  </Button>
                </div>
              )}
            </section>
          )}

          {/* Reveal / results */}
          {secrets && (
            <section className="panel animate-gavel mt-4 space-y-3 p-5">
              <p className="label-caps">The hidden truth</p>
              <p className="whitespace-pre-line text-sm leading-relaxed">{secrets.hidden_truth}</p>
              <div className="gold-rule" />
              <p className="label-caps">Official verdict</p>
              <p className="text-2xl text-gold">{secrets.official_verdict.replace("_", " ")}</p>
              {results && (
                <>
                  <div className="gold-rule" />
                  <p className="label-caps">Your jury</p>
                  <p className="text-lg">
                    {results.juryVerdict.replace("_", " ")} — {results.breakdown.guilty} guilty ·{" "}
                    {results.breakdown.notGuilty} not guilty
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {results.percent}% of the jury matched the official verdict.
                  </p>
                </>
              )}
              {secrets.explanation && <Explanation data={secrets.explanation as Json} />}
            </section>
          )}
        </div>

        {/* Jury box */}
        <aside className="space-y-4">
          <div className="panel p-4">
            <p className="label-caps">Jury box</p>
            <ul className="mt-3 space-y-2">
              {players.map((p) => (
                <li key={p.id} className="flex items-center justify-between text-sm">
                  <span>
                    <span className="font-mono text-xs text-gold-dim">#{p.juror_number}</span>{" "}
                    {p.display_name}
                    {me?.id === p.id && <span className="text-muted-foreground"> (you)</span>}
                  </span>
                  <span className="flex items-center gap-2">
                    {game.status === "LOBBY" && p.ready && (
                      <span className="label-caps text-not-guilty">Ready</span>
                    )}
                    {p.vote_submitted && <span className="label-caps text-gold">Voted</span>}
                    {isAdmin && (
                      <button
                        className="text-xs text-muted-foreground hover:text-destructive"
                        onClick={() =>
                          runAction.mutate({ gameId, action: "REMOVE_PLAYER", playerId: p.id })
                        }
                      >
                        Dismiss
                      </button>
                    )}
                  </span>
                </li>
              ))}
              {players.length === 0 && (
                <li className="text-sm text-muted-foreground">The box is empty.</li>
              )}
            </ul>
            {game.status === "LOBBY" && me && (
              <Button
                className="mt-4 w-full"
                variant={me.ready ? "secondary" : "default"}
                onClick={() => toggleReady.mutate(!me.ready)}
              >
                {me.ready ? "Stand down" : "I'm ready"}
              </Button>
            )}
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

function isRecord(v: unknown): v is Record<string, Json> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function ExhibitContent({ content }: { content: Json | undefined }) {
  if (!isRecord(content) || Object.keys(content).length === 0) return null;
  const entries = Object.entries(content).filter(
    ([, v]) => typeof v === "string" && v.trim().length > 0,
  ) as [string, string][];
  if (entries.length === 0) return null;
  return (
    <dl className="mt-3 space-y-2 rounded border border-border bg-secondary/50 p-3">
      {entries.map(([k, v]) => (
        <div key={k}>
          <dt className="label-caps">{k.replace(/_/g, " ")}</dt>
          <dd className="text-sm leading-relaxed">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

function Explanation({ data }: { data: Json }) {
  if (!isRecord(data)) return null;
  const text = (k: string) => (typeof data[k] === "string" ? (data[k] as string) : null);
  const analysis = Array.isArray(data["evidence_analysis"])
    ? (data["evidence_analysis"] as Json[]).filter(isRecord)
    : [];
  return (
    <div className="space-y-4">
      {[
        ["What happened", text("what_happened")],
        ["Key evidence", text("key_evidence")],
        ["Why the other theory fails", text("why_alternative_failed")],
        ["A note for the jury", text("jury_note")],
      ]
        .filter(([, v]) => v)
        .map(([label, v]) => (
          <div key={label as string}>
            <p className="label-caps">{label}</p>
            <p className="mt-1 text-sm leading-relaxed">{v}</p>
          </div>
        ))}
      {analysis.length > 0 && (
        <div>
          <p className="label-caps">Exhibit by exhibit</p>
          <div className="mt-2 space-y-2">
            {analysis.map((a, i) => (
              <div key={i} className="border-l-2 border-gold-dim pl-3">
                <p className="text-sm text-gold">{String(a["title"] ?? "")}</p>
                <p className="text-sm text-muted-foreground">{String(a["meaning"] ?? "")}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
