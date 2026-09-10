import { Button } from "@/components/ui/button";
import type { GameView } from "./types";

export function LobbyView({
  data,
  onlineIds,
  onStart,
  starting,
}: {
  data: GameView;
  onlineIds: Set<string>;
  onStart: () => void;
  starting: boolean;
}) {
  const { game, players, isAdmin, me } = data;
  const seats = Array.from({ length: game.max_players }, (_, i) => players[i] ?? null);

  return (
    <section className="animate-gavel">
      <div className="panel p-6 text-center">
        <p className="label-caps">Verdict</p>
        <h1 className="mt-1 text-4xl">Jury assembly</h1>
        <div className="gold-rule my-5" />
        <p className="label-caps">Room code</p>
        <p className="mt-1 font-mono text-5xl tracking-[0.35em] text-gold">{game.room_code}</p>
        <p className="mt-2 text-sm text-muted-foreground">
          Read this aloud to your jurors — capitals are not required.
        </p>
      </div>

      <div className="panel mt-4 p-5">
        <div className="flex items-baseline justify-between">
          <p className="label-caps">The jury box</p>
          <p className="font-mono text-xs text-muted-foreground">
            {players.length} / {game.max_players} seated
          </p>
        </div>
        <ul className="mt-4 grid gap-2 sm:grid-cols-2">
          {seats.map((p, i) => (
            <li
              key={p?.id ?? `empty-${i}`}
              className={`flex items-center justify-between rounded border px-3 py-2 text-sm ${
                p ? "border-gold-dim" : "border-dashed border-border text-muted-foreground"
              }`}
            >
              <span>
                <span className="font-mono text-xs text-gold-dim">
                  Juror {String(p?.juror_number ?? i + 1).padStart(2, "0")}
                </span>{" "}
                {p ? p.display_name : "— empty seat —"}
                {p && me?.id === p.id && <span className="text-muted-foreground"> (you)</span>}
              </span>
              {p && (
                <span className="label-caps text-xs">
                  {onlineIds.size === 0 || onlineIds.has(p.id) ? (
                    <span className="text-not-guilty">Present</span>
                  ) : (
                    <span className="text-muted-foreground">Away</span>
                  )}
                </span>
              )}
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-5 text-center">
        {isAdmin ? (
          <Button size="lg" disabled={players.length < 1 || starting} onClick={onStart}>
            Start case
          </Button>
        ) : (
          <p className="label-caps animate-seal text-gold">Waiting for the Game Master</p>
        )}
      </div>
    </section>
  );
}
