import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { joinGame } from "@/lib/game.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/join")({
  head: () => ({
    meta: [
      { title: "Join a Jury — VERDICT" },
      {
        name: "description",
        content: "Enter your room code and juror name to take a seat in a live trial.",
      },
      { property: "og:title", content: "Join a Jury — VERDICT" },
      { property: "og:description", content: "Enter your room code to take a seat." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: JoinPage,
});

function JoinPage() {
  const navigate = useNavigate();
  const join = useServerFn(joinGame);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");

  const mut = useMutation({
    mutationFn: () => join({ data: { code, displayName: name } }),
    onSuccess: (r) => navigate({ to: "/game/$gameId", params: { gameId: r.gameId } }),
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not seat you."),
  });

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-5 py-12">
      <div className="animate-gavel panel p-6">
        <p className="label-caps">Juror check-in</p>
        <h1 className="mt-2 text-4xl">Take your seat</h1>
        <div className="gold-rule my-5" />
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            mut.mutate();
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="code">Room code</Label>
            <Input
              id="code"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              maxLength={6}
              required
              className="text-center font-mono text-2xl tracking-[0.4em]"
              placeholder="ABC123"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="name">Your juror name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={24}
              required
              placeholder="e.g. Marguerite"
            />
          </div>
          <Button type="submit" className="w-full" disabled={mut.isPending}>
            {mut.isPending ? "Checking in…" : "Enter the courtroom"}
          </Button>
        </form>
      </div>
    </main>
  );
}
