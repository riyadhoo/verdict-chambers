import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { Json } from "@/lib/game.functions";
import type { GameView } from "./types";

export function RevealView({ data }: { data: GameView }) {
  const { secrets, results, game } = data;
  const [stage, setStage] = useState(game.status === "RESULTS" ? 3 : 0);
  if (!secrets) return null;

  return (
    <section className="panel animate-gavel mt-4 space-y-4 p-5">
      <p className="label-caps">The reveal</p>

      {stage === 0 && (
        <div className="py-8 text-center">
          <p className="animate-seal text-3xl text-gold">The jury has reached a decision.</p>
          <Button className="mt-6" onClick={() => setStage(1)}>
            Read the jury's verdict
          </Button>
        </div>
      )}

      {stage >= 1 && results && (
        <div className="text-center">
          <p className="label-caps">Your jury</p>
          <p className="text-4xl text-gold">{results.juryVerdict.replace("_", " ")}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {results.breakdown.guilty} guilty · {results.breakdown.notGuilty} not guilty ·{" "}
            {results.total} ballots
          </p>
          {stage === 1 && (
            <Button className="mt-5" onClick={() => setStage(2)}>
              Open the sealed record
            </Button>
          )}
        </div>
      )}

      {stage >= 2 && (
        <>
          <div className="gold-rule" />
          <div className="text-center">
            <p className="label-caps">The truth of the matter</p>
            <p className="text-4xl text-gold">{secrets.official_verdict.replace("_", " ")}</p>
            {results && (
              <p className="mt-1 text-sm text-muted-foreground">
                {results.percent}% of the jury matched the record.
              </p>
            )}
          </div>
          <div className="gold-rule" />
          <p className="label-caps">What really happened</p>
          <p className="whitespace-pre-line text-sm leading-relaxed">{secrets.hidden_truth}</p>
          {stage === 2 && (
            <div className="text-center">
              <Button variant="outline" onClick={() => setStage(3)}>
                Read the full explanation
              </Button>
            </div>
          )}
        </>
      )}

      {stage >= 3 && secrets.explanation && (
        <>
          <div className="gold-rule" />
          <Explanation data={secrets.explanation as Json} />
        </>
      )}
    </section>
  );
}

function isRecord(v: unknown): v is Record<string, Json> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

export function Explanation({ data }: { data: Json }) {
  if (!isRecord(data)) return null;
  const text = (k: string) => (typeof data[k] === "string" ? (data[k] as string) : null);
  const analysis = Array.isArray(data["evidence_analysis"])
    ? (data["evidence_analysis"] as Json[]).filter(isRecord)
    : [];
  return (
    <div className="space-y-4">
      {[
        ["What happened", text("what_happened")],
        ["The contradictions", text("contradictions")],
        ["Key evidence", text("key_evidence")],
        ["Why the other theory fails", text("why_alternative_failed")],
        ["A note for the jury", text("jury_note")],
      ]
        .filter(([, v]) => v)
        .map(([label, v]) => (
          <div key={label as string}>
            <p className="label-caps">{label}</p>
            <p className="mt-1 whitespace-pre-line text-sm leading-relaxed">{v}</p>
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
