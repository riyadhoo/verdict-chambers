import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "VERDICT — Multiplayer Jury Courtroom Game" },
      {
        name: "description",
        content:
          "Host or join a live jury room for up to 12 players. Weigh the evidence, argue the case, and deliver your verdict before the truth is revealed.",
      },
      { property: "og:title", content: "VERDICT — Multiplayer Jury Courtroom Game" },
      {
        property: "og:description",
        content:
          "A real-time deduction game: 12 jurors, contradictory evidence, one hidden truth.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

function Landing() {
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSignedIn(!!data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSignedIn(!!s));
    return () => sub.subscription.unsubscribe();
  }, []);

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center px-5 py-16">
      <div className="animate-gavel">
        <p className="label-caps">Case File No. 001 · Now in session</p>
        <h1 className="mt-3 text-6xl leading-none tracking-tight sm:text-8xl">VERDICT</h1>
        <div className="gold-rule my-6" />
        <p className="max-w-xl text-lg text-muted-foreground">
          A live courtroom for up to twelve jurors. One Game Master releases the evidence,
          the jury argues in real time, and every vote is sealed until the truth is read
          aloud.
        </p>

        <div className="mt-9 flex flex-wrap gap-3">
          {signedIn ? (
            <>
              <Button asChild size="lg">
                <Link to="/create">Host a trial</Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/join">Join with a code</Link>
              </Button>
            </>
          ) : (
            <Button asChild size="lg">
              <Link to="/auth">Enter the courthouse</Link>
            </Button>
          )}
        </div>

        <div className="mt-14 grid gap-4 sm:grid-cols-3">
          {[
            ["Sealed evidence", "Locked exhibits stay on the server until the Game Master releases them."],
            ["Sealed votes", "No one sees the tally — not even other jurors — before the reveal."],
            ["Hidden truth", "Every case hides a reading the official verdict got wrong."],
          ].map(([t, d]) => (
            <div key={t} className="panel p-4">
              <p className="label-caps">{t}</p>
              <p className="mt-2 text-sm text-muted-foreground">{d}</p>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
