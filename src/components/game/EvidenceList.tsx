import { Button } from "@/components/ui/button";
import type { Assessment, Json } from "@/lib/game.functions";
import type { GameView } from "./types";

const CHOICES: { value: Assessment; label: string; className: string }[] = [
  { value: "GUILTY", label: "Points to guilt", className: "border-guilty text-guilty" },
  { value: "NEUTRAL", label: "Inconclusive", className: "border-gold-dim text-gold" },
  { value: "NOT_GUILTY", label: "Points to innocence", className: "border-not-guilty text-not-guilty" },
];

export function EvidenceList({
  data,
  canAssess,
  onAssess,
  onRelease,
}: {
  data: GameView;
  canAssess: boolean;
  onAssess: (evidenceId: string, assessment: Assessment) => void;
  onRelease: (evidenceId: string) => void;
}) {
  const { evidence, witnesses, timeline, isAdmin, me } = data;

  return (
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
                  <Button size="sm" onClick={() => onRelease(e.id)}>
                    Release
                  </Button>
                )}
              </div>
              {isAdmin && e.adminOnlyLocked && (
                <p className="mt-1 text-xs text-gold-dim">
                  Not yet released — jurors cannot see this exhibit.
                </p>
              )}
              <p className="mt-2 text-sm text-muted-foreground">{e.description}</p>
              <ExhibitContent content={e.content} />

              {me && !e.adminOnlyLocked && (
                <div className="mt-3">
                  <p className="label-caps">Your private reading</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {CHOICES.map((c) => {
                      const active = e.myAssessment === c.value;
                      return (
                        <button
                          key={c.value}
                          disabled={!canAssess}
                          onClick={() => onAssess(e.id, c.value)}
                          className={`label-caps rounded border px-3 py-1.5 transition-colors disabled:opacity-40 ${
                            active ? c.className : "border-border text-muted-foreground hover:border-gold-dim"
                          }`}
                        >
                          {c.label}
                        </button>
                      );
                    })}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Only you can see this. You can change it until voting closes.
                  </p>
                </div>
              )}
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
                <span className="w-20 shrink-0 font-mono text-xs text-gold-dim">{t.ts_label}</span>
                <span className="text-sm">{t.description}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </section>
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
