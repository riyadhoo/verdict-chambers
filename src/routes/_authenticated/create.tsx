import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { createGame, listCases } from "@/lib/game.functions";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/create")({
  head: () => ({
    meta: [
      { title: "Host a Trial — VERDICT" },
      {
        name: "description",
        content: "Choose a case file and open a live jury room for up to twelve players.",
      },
      { property: "og:title", content: "Host a Trial — VERDICT" },
      { property: "og:description", content: "Choose a case file and open a jury room." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CreatePage,
});

function CreatePage() {
  const navigate = useNavigate();
  const fetchCases = useServerFn(listCases);
  const create = useServerFn(createGame);
  const [maxPlayers, setMaxPlayers] = useState(12);

  const { data: cases, isLoading } = useQuery({
    queryKey: ["cases"],
    queryFn: () => fetchCases(),
  });

  const mut = useMutation({
    mutationFn: (caseId: string) => create({ data: { caseId, maxPlayers } }),
    onSuccess: (game) => navigate({ to: "/game/$gameId", params: { gameId: game.id } }),
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not open the room."),
  });

  return (
    <main className="mx-auto min-h-screen max-w-2xl px-5 py-12">
      <p className="label-caps">Game Master</p>
      <h1 className="mt-2 text-5xl">Select a case file</h1>
      <div className="gold-rule my-6" />

      <div className="panel mb-6 flex items-center justify-between p-4">
        <div>
          <p className="label-caps">Jury size</p>
          <p className="text-sm text-muted-foreground">Between 2 and 12 jurors.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setMaxPlayers((n) => Math.max(2, n - 1))}
          >
            −
          </Button>
          <span className="w-8 text-center font-mono text-xl">{maxPlayers}</span>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setMaxPlayers((n) => Math.min(12, n + 1))}
          >
            +
          </Button>
        </div>
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Pulling the docket…</p>}
      <div className="grid gap-4">
        {(cases ?? []).map((c) => (
          <div key={c.id} className="panel p-5">
            <div className="flex items-center justify-between">
              <p className="label-caps">Case No. {c.case_number}</p>
              <span className="label-caps text-gold">{c.difficulty}</span>
            </div>
            <h2 className="mt-1 text-3xl">{c.title}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{c.summary}</p>
            <Button
              className="mt-4"
              disabled={mut.isPending}
              onClick={() => mut.mutate(c.id)}
            >
              {mut.isPending ? "Opening room…" : "Open the courtroom"}
            </Button>
          </div>
        ))}
      </div>
    </main>
  );
}
