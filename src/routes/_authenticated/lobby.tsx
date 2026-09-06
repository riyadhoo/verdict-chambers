import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useQueryClient } from "@tanstack/react-query";

export const Route = createFileRoute("/_authenticated/lobby")({
  head: () => ({
    meta: [
      { title: "Your Courthouse — VERDICT" },
      {
        name: "description",
        content: "Host a new trial or join an existing jury room with a six-letter code.",
      },
      { property: "og:title", content: "Your Courthouse — VERDICT" },
      { property: "og:description", content: "Host a new trial or join a jury room." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LobbyPage,
});

function LobbyPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center px-5 py-14">
      <div className="animate-gavel">
        <p className="label-caps">Courthouse</p>
        <h1 className="mt-2 text-5xl">Take your seat</h1>
        <div className="gold-rule my-6" />
        <div className="grid gap-4">
          <Link to="/create" className="panel block p-5 transition-colors hover:border-gold-dim">
            <p className="label-caps">Game Master</p>
            <p className="mt-1 text-2xl">Host a trial</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Pick a case, open a room, control the pace of evidence.
            </p>
          </Link>
          <Link to="/join" className="panel block p-5 transition-colors hover:border-gold-dim">
            <p className="label-caps">Juror</p>
            <p className="mt-1 text-2xl">Join with a code</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Enter the six-letter room code your Game Master gave you.
            </p>
          </Link>
        </div>
        <Button variant="ghost" className="mt-8" onClick={signOut}>
          Sign out
        </Button>
      </div>
    </main>
  );
}
