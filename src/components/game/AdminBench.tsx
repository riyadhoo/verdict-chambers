import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { GameView } from "./types";

type Action =
  | "START_CASE"
  | "TO_EVIDENCE"
  | "BEGIN_DELIBERATION"
  | "OPEN_VOTING"
  | "REVEAL"
  | "TO_RESULTS"
  | "END_GAME"
  | "RELEASE_ALL";

const CONTROLS: { action: Action; label: string; from: string; confirm?: string }[] = [
  { action: "START_CASE", label: "Start case", from: "LOBBY" },
  { action: "TO_EVIDENCE", label: "Open the evidence room", from: "BRIEFING" },
  { action: "BEGIN_DELIBERATION", label: "Begin deliberation", from: "EVIDENCE" },
  { action: "OPEN_VOTING", label: "Open voting", from: "DELIBERATION" },
  {
    action: "REVEAL",
    label: "Reveal the verdict",
    from: "VOTING",
    confirm:
      "Are you sure you want to reveal the verdict? Every juror will see the truth and this cannot be undone.",
  },
  { action: "TO_RESULTS", label: "Show results", from: "REVEAL" },
];

export function AdminBench({
  data,
  onAction,
  pending,
}: {
  data: GameView;
  onAction: (a: { action: Action; evidenceId?: string }) => void;
  pending: boolean;
}) {
  const [confirm, setConfirm] = useState<{ action: Action; text: string } | null>(null);
  const { game, counts, brief, difficulty } = data;
  const allReleased = counts.evidenceReleased >= counts.evidenceTotal;

  return (
    <section className="panel mt-4 p-5">
      <p className="label-caps">Game Master bench</p>

      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-4">
        <Stat label="Case" value={brief.title} />
        <Stat label="Difficulty" value={difficulty} />
        <Stat label="Exhibits released" value={`${counts.evidenceReleased} / ${counts.evidenceTotal}`} />
        <Stat label="Phase" value={game.status} />
        <Stat label="Jurors" value={`${counts.jurors} / ${game.max_players}`} />
        <Stat label="Ready to vote" value={`${counts.ready} / ${counts.jurors}`} />
        <Stat label="Ballots sealed" value={`${counts.votesSubmitted} / ${counts.jurors}`} />
        <Stat label="Session" value={game.paused ? "In recess" : "In session"} />
      </dl>

      <div className="gold-rule my-4" />

      <div className="flex flex-wrap gap-2">
        {CONTROLS.map((c) => {
          const enabled = game.status === c.from && !pending;
          return (
            <Button
              key={c.action}
              size="sm"
              variant={enabled ? "default" : "outline"}
              disabled={!enabled}
              onClick={() =>
                c.confirm ? setConfirm({ action: c.action, text: c.confirm }) : onAction({ action: c.action })
              }
            >
              {c.label}
            </Button>
          );
        })}
        <Button
          size="sm"
          variant="secondary"
          disabled={allReleased || game.status === "LOBBY" || pending}
          onClick={() => onAction({ action: "RELEASE_ALL" })}
        >
          Release all exhibits
        </Button>
        <Button
          size="sm"
          variant="secondary"
          disabled={pending}
          onClick={() => onAction({ action: (game.paused ? "RESUME" : "PAUSE") as Action })}
        >
          {game.paused ? "Resume" : "Call a recess"}
        </Button>
        <Button
          size="sm"
          variant="destructive"
          disabled={game.status === "ENDED" || pending}
          onClick={() =>
            setConfirm({
              action: "END_GAME",
              text: "End the game for everyone? The room closes and cannot be reopened.",
            })
          }
        >
          End game
        </Button>
      </div>

      {game.status === "VOTING" && (
        <p className="mt-3 font-mono text-xs text-muted-foreground">
          {counts.votesSubmitted} / {counts.jurors} ballots sealed — totals stay hidden until the reveal.
        </p>
      )}

      <AlertDialog open={confirm !== null} onOpenChange={(o) => !o && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>One moment, Game Master</AlertDialogTitle>
            <AlertDialogDescription>{confirm?.text}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Go back</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (confirm) onAction({ action: confirm.action });
                setConfirm(null);
              }}
            >
              Yes, continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="label-caps">{label}</dt>
      <dd className="font-mono text-xs text-gold">{value}</dd>
    </div>
  );
}
